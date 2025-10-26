import { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as fabric from 'fabric';
import StrokeAnalyzer, { mergeBounds } from '../../lib/strokeAnalyzer';
import {
  detectEqualsSign,
  recognizeEquation,
  recognizeEquationHybrid,
  getContextArea,
} from '../../lib/handwritingOCR';
import { createStrokeSignature, getOCRConfig } from '../../config/ocr';
import { analyzeMathContent } from '../../lib/mathDetection';

const DEBUG_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ec4899'];

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const expandBounds = (bounds, padding = 0) => {
  if (!bounds) {
    return null;
  }
  const pad = Math.max(0, padding);
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const maxX = bounds.maxX + pad;
  const maxY = bounds.maxY + pad;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

/**
 * Expand bounds with different padding for horizontal and vertical
 * Equations are typically more horizontal, so we expand more in that direction
 */
const expandBoundsAnisotropic = (bounds, horizontalPad = 0, verticalPad = 0) => {
  if (!bounds) {
    return null;
  }
  const hPad = Math.max(0, horizontalPad);
  const vPad = Math.max(0, verticalPad);
  const minX = bounds.minX - hPad;
  const minY = bounds.minY - vPad;
  const maxX = bounds.maxX + hPad;
  const maxY = bounds.maxY + vPad;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

const boundsIntersect = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
};

const getStrokeBounds = (stroke, analyzer) => {
  if (!stroke) {
    return null;
  }
  if (stroke.bounds) {
    return stroke.bounds;
  }
  if (stroke.features?.bounds) {
    return stroke.features.bounds;
  }
  if (analyzer && (stroke.points || stroke.strokePoints)) {
    return analyzer.analyzeStroke(stroke.points || stroke.strokePoints).bounds;
  }
  return null;
};

/**
 * Calculate the active writing area based on recent strokes
 */
const getActiveWritingArea = (strokes, analyzer, expansionRadius = 100) => {
  if (!strokes || !strokes.length) {
    return null;
  }

  const bounds = strokes
    .map((stroke) => getStrokeBounds(stroke, analyzer))
    .filter(Boolean);

  if (!bounds.length) {
    return null;
  }

  // Merge all bounds to get the active area
  const mergedBounds = mergeBounds(bounds);
  
  // Expand horizontally more than vertically (equations are typically horizontal)
  // Use 2.5x horizontal expansion for typical equation layout
  return expandBoundsAnisotropic(
    mergedBounds, 
    expansionRadius * 2.5,  // Horizontal: wider to catch all parts of equation
    expansionRadius         // Vertical: standard
  );
};

const HandwritingDetector = ({
  canvas,
  strokes,
  strokesVersion, // Version number that increments when strokes change
  pauseDuration = 2000,
  recentWindowMs = 12000,
  activeWritingWindowMs = 5000,
  contextRadius = 180,
  maxGroupDistance = 36,
  debug = false,
  enabled = true,
  onCandidate,
}) => {
  const analyzerRef = useRef(new StrokeAnalyzer({ debug }));
  const strokesRef = useRef([]);
  const timerRef = useRef(null);
  const lastSignatureRef = useRef(null);
  const lastPayloadRef = useRef(null);
  const highlightedRef = useRef([]);
  const debugOverlayRef = useRef([]);
  const cloudTaskRef = useRef({ callId: 0, signature: null });
  const requestCounterRef = useRef(0);
  const MAX_STROKES_FOR_AUTOMATIC_DETECTION = 120;
  const MAX_WORKING_STROKES = 64;
  const MAX_CONTEXT_STROKES = 48;
  const MIN_ACTIVE_STROKES = 3;

  useEffect(() => {
    analyzerRef.current.debug = debug;
  }, [debug]);

  const clearHighlight = useCallback(() => {
    if (!highlightedRef.current.length) {
      return;
    }
    highlightedRef.current.forEach(({ path, shadow, opacity }) => {
      if (!path || typeof path.set !== 'function') {
        return;
      }
      path.set('shadow', shadow || null);
      if (opacity !== undefined) {
        path.set('opacity', opacity);
      }
      path.dirty = true;
    });
    highlightedRef.current = [];
    if (canvas && typeof canvas.requestRenderAll === 'function') {
      canvas.requestRenderAll();
    }
  }, [canvas]);

  const clearDebugOverlays = useCallback(() => {
    if (!canvas || !debugOverlayRef.current.length) {
      debugOverlayRef.current = [];
      return;
    }
    debugOverlayRef.current.forEach((overlay) => {
      if (overlay && typeof canvas.remove === 'function') {
        canvas.remove(overlay);
      }
    });
    debugOverlayRef.current = [];
    if (typeof canvas.requestRenderAll === 'function') {
      canvas.requestRenderAll();
    }
  }, [canvas]);

  useEffect(() => () => {
    clearHighlight();
    clearDebugOverlays();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [clearHighlight, clearDebugOverlays]);

  const releaseFeedback = useCallback(() => {
    clearHighlight();
    clearDebugOverlays();
  }, [clearHighlight, clearDebugOverlays]);

  const highlightStrokes = useCallback((targets) => {
    if (!canvas) {
      return;
    }
    clearHighlight();
    ensureArray(targets).forEach((stroke) => {
      const path = stroke?.path || stroke?.object;
      if (!path || typeof path.set !== 'function') {
        return;
      }
      highlightedRef.current.push({
        path,
        shadow: path.shadow,
        opacity: path.opacity,
      });
      path.set('shadow', new fabric.Shadow({
        color: 'rgba(59, 130, 246, 0.28)',
        blur: 24,
        offsetX: 0,
        offsetY: 0,
      }));
      path.set('opacity', Math.min(1, (path.opacity ?? 1) * 1.05));
      path.dirty = true;
      if (typeof canvas.bringObjectToFront === 'function') {
        canvas.bringObjectToFront(path);
      } else if (typeof path.bringToFront === 'function') {
        path.bringToFront();
      }
    });
    if (typeof canvas.requestRenderAll === 'function') {
      canvas.requestRenderAll();
    }
  }, [canvas, clearHighlight]);

  const updateDebugOverlays = useCallback((groups, activeArea = null) => {
    if (!canvas) {
      return;
    }
    clearDebugOverlays();
    if (!debug) {
      return;
    }

    // Show active writing area if available
    if (activeArea) {
      const activeRect = new fabric.Rect({
        left: activeArea.minX,
        top: activeArea.minY,
        width: activeArea.width,
        height: activeArea.height,
        fill: 'rgba(139, 92, 246, 0.05)',
        stroke: '#8b5cf6',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(activeRect);
      if (typeof activeRect.sendToBack === 'function') {
        activeRect.sendToBack();
      }
      debugOverlayRef.current.push(activeRect);
    }

    ensureArray(groups).forEach((group, index) => {
      if (!group?.bounds) {
        return;
      }
      const color = DEBUG_COLORS[index % DEBUG_COLORS.length];
      const rect = new fabric.Rect({
        left: group.bounds.minX - 6,
        top: group.bounds.minY - 6,
        width: group.bounds.width + 12,
        height: group.bounds.height + 12,
        fill: 'rgba(59, 130, 246, 0.08)',
        stroke: color,
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(rect);
      if (typeof rect.bringToFront === 'function') {
        rect.bringToFront();
      }
      debugOverlayRef.current.push(rect);
    });
    if (typeof canvas.requestRenderAll === 'function') {
      canvas.requestRenderAll();
    }
  }, [canvas, clearDebugOverlays, debug]);

  const cancelCloudRequests = useCallback(() => {
    requestCounterRef.current += 1;
    cloudTaskRef.current = {
      callId: requestCounterRef.current,
      signature: null,
    };
  }, []);

  const notifyCandidate = useCallback((payload) => {
    if (typeof onCandidate === 'function') {
      onCandidate(payload);
    }
    lastPayloadRef.current = payload;
  }, [onCandidate]);

  const processDetection = useCallback(() => {
    if (!canvas) {
      return;
    }

    const allStrokes = strokesRef.current;
    if (!allStrokes.length) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    const now = Date.now();
    const ACTIVE_WRITING_WINDOW = 5000; // Last 5 seconds

    const newestStroke = allStrokes[allStrokes.length - 1] || null;
    const newestAge = newestStroke ? now - (newestStroke.createdAt || 0) : Infinity;

    // PERFORMANCE: Skip automatic detection on large canvases unless user just wrote something
    if (allStrokes.length > MAX_STROKES_FOR_AUTOMATIC_DETECTION && newestAge > ACTIVE_WRITING_WINDOW) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    const analyzer = analyzerRef.current;

    // Focus on the most recent strokes to detect only where user is writing
    const activeStrokes = allStrokes.filter((stroke) => {
      const createdAt = stroke?.createdAt || 0;
      return now - createdAt <= ACTIVE_WRITING_WINDOW;
    }).slice(-MAX_WORKING_STROKES);

    // If no active writing, clear detection
    if (!activeStrokes.length) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    // Calculate the active writing area - this is where the user just drew
    // Use larger expansion to ensure we capture all parts of equations
    const activeArea = getActiveWritingArea(activeStrokes, analyzer, 50);
    
    if (!activeArea) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    // Dynamic detection radius based on the size of what user drew
    // Favor horizontal expansion since equations are typically written horizontally
    const horizontalSpan = activeArea.width;
    const verticalSpan = activeArea.height;
    
    // Base radius calculation - favor the dimension that's larger
    // But ensure we expand more horizontally even for square/vertical content
    const baseHorizontalRadius = Math.max(horizontalSpan * 0.8, 80); // At least 80px horizontal
    const baseVerticalRadius = Math.max(verticalSpan * 0.6, 40);     // At least 40px vertical
    
    // Cap to avoid conflicts with other equations
    const horizontalRadius = Math.min(baseHorizontalRadius, 200);
    const verticalRadius = Math.min(baseVerticalRadius, 100);
    
    // Use the larger of the two for the context search radius
    const dynamicRadius = Math.max(horizontalRadius, verticalRadius * 1.5);
    
    // Smart horizontal boundary detection: Find nearby equations and stop expansion at them
    // This allows long equations to expand but prevents conflicts with adjacent ones
    const findNearbyEquationBoundary = (center, searchRadius, direction) => {
      // direction: 'left' or 'right'
      const sign = direction === 'left' ? -1 : 1;
      let boundaryDistance = searchRadius;
      
      // Get all strokes NOT in the active area (potential other equations)
      const otherStrokes = allStrokes.filter((stroke) => {
        if (!stroke || !stroke.createdAt) return false;
        const createdAt = stroke.createdAt || 0;
        // Only consider strokes that are NOT part of current writing session
        return now - createdAt > ACTIVE_WRITING_WINDOW;
      });
      
      // Find the closest stroke in the specified direction
      for (const stroke of otherStrokes) {
        const strokeBounds = getStrokeBounds(stroke, analyzer);
        if (!strokeBounds) continue;
        
        const dx = strokeBounds.centerX - center.x;
        const dy = Math.abs(strokeBounds.centerY - center.y);
        
        // Only consider strokes in the correct direction and roughly same height
        if ((sign > 0 && dx <= 0) || (sign < 0 && dx >= 0)) continue;
        if (dy > verticalRadius * 2) continue; // Not on same horizontal line
        
        const distance = Math.abs(dx);
        
        // If we found a stroke closer than current boundary, update it
        // Leave some gap (20px) to avoid including it
        if (distance < boundaryDistance) {
          boundaryDistance = Math.max(20, distance - 30);
        }
      }
      
      return boundaryDistance;
    };
    
    // Calculate adaptive horizontal expansion based on nearby equations
    const leftBoundary = findNearbyEquationBoundary(
      { x: activeArea.centerX, y: activeArea.centerY },
      horizontalRadius * 0.5,
      'left'
    );
    const rightBoundary = findNearbyEquationBoundary(
      { x: activeArea.centerX, y: activeArea.centerY },
      horizontalRadius * 0.5,
      'right'
    );
    
    // Expand active area with adaptive boundaries
    const expandedActiveArea = {
      minX: activeArea.minX - leftBoundary,
      minY: activeArea.minY - (verticalRadius * 0.4),
      maxX: activeArea.maxX + rightBoundary,
      maxY: activeArea.maxY + (verticalRadius * 0.4),
      get width() { return this.maxX - this.minX; },
      get height() { return this.maxY - this.minY; },
      get centerX() { return (this.minX + this.maxX) / 2; },
      get centerY() { return (this.minY + this.maxY) / 2; },
    };    // Only look at strokes within the expanded active area
    // This ensures we only detect equations in the region user is currently writing
    const focusedStrokes = allStrokes.filter((stroke) => {
      const strokeBounds = getStrokeBounds(stroke, analyzer);
      if (!strokeBounds) return false;
      return boundsIntersect(strokeBounds, expandedActiveArea);
    });

    // If we don't have enough strokes in the focused area, skip detection
    if (focusedStrokes.length < MIN_ACTIVE_STROKES) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    // Limit to most recent strokes in the focused area for performance
    const workingStrokes = focusedStrokes.slice(-MAX_WORKING_STROKES);

    const equalsCandidate = detectEqualsSign(workingStrokes, { analyzer });

    let focusPosition = equalsCandidate?.position || null;
    if (!focusPosition && workingStrokes.length) {
      const lastStroke = workingStrokes[workingStrokes.length - 1];
      if (lastStroke) {
        const inspectedBounds = lastStroke.bounds
          || lastStroke.features?.bounds
          || analyzer.analyzeStroke(lastStroke.points || lastStroke.strokePoints || []).bounds;
        if (inspectedBounds) {
          focusPosition = { x: inspectedBounds.centerX, y: inspectedBounds.centerY };
        }
      }
    }

    // Get context strokes around the focus position within the dynamic radius
    let contextStrokes = focusPosition
      ? getContextArea(workingStrokes, focusPosition, dynamicRadius, { analyzer })
      : [];

    // If no context found with focus position, use all working strokes
    if (!contextStrokes.length) {
      contextStrokes = workingStrokes;
    }

    // Limit context strokes for performance
    if (contextStrokes.length > MAX_CONTEXT_STROKES) {
      contextStrokes = contextStrokes.slice(-MAX_CONTEXT_STROKES);
    }

    if (!contextStrokes.length) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    const recognition = recognizeEquation(contextStrokes, {
      analyzer,
      maxGroupDistance,
    });

    updateDebugOverlays(recognition.groups, activeArea);

    const trimmed = (recognition.equation || '').trim();
    const fallbackEquation = trimmed || (equalsCandidate ? '=' : '');
    const analysis = analyzeMathContent(fallbackEquation);

    const config = getOCRConfig();
    const mode = (config.mode || 'hybrid').toLowerCase();
    const threshold = config.minConfidence ?? 0.7;

    const rawLocalConfidence = recognition.confidence > 0
      ? recognition.confidence
      : equalsCandidate?.confidence ?? 0;
    const localConfidence = Math.max(0, Math.min(1, rawLocalConfidence));
    const shouldEscalate = mode === 'cloud' || (mode === 'hybrid' && rawLocalConfidence < threshold);
    const hasMeaningfulContent = fallbackEquation.length > 0;

    if (!hasMeaningfulContent && !shouldEscalate) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    const symbolBounds = recognition.symbols.length
      ? recognition.symbols
          .map((symbol) => symbol?.bounds)
          .filter(Boolean)
      : [];

    const combinedSymbolBounds = symbolBounds.length
      ? symbolBounds.reduce((acc, current) => {
          if (!acc) {
            return current;
          }
          return {
            minX: Math.min(acc.minX, current.minX),
            minY: Math.min(acc.minY, current.minY),
            maxX: Math.max(acc.maxX, current.maxX),
            maxY: Math.max(acc.maxY, current.maxY),
            width: Math.max(acc.maxX, current.maxX) - Math.min(acc.minX, current.minX),
            height: Math.max(acc.maxY, current.maxY) - Math.min(acc.minY, current.minY),
            centerX: (Math.min(acc.minX, current.minX) + Math.max(acc.maxX, current.maxX)) / 2,
            centerY: (Math.min(acc.minY, current.minY) + Math.max(acc.maxY, current.maxY)) / 2,
          };
        }, null)
      : null;

    const contextBounds = mergeBounds(contextStrokes.map((stroke) => getStrokeBounds(stroke, analyzer)).filter(Boolean));
    const baseBounds = combinedSymbolBounds
      || equalsCandidate?.bounds
      || contextBounds;

  const paddedBounds = expandBounds(baseBounds, Math.max(12, dynamicRadius * 0.4));

    let primaryStrokes = contextStrokes;
    if (paddedBounds) {
      const filtered = contextStrokes.filter((stroke) => {
        const strokeBounds = getStrokeBounds(stroke, analyzer);
        if (!strokeBounds) {
          return true;
        }
        return boundsIntersect(strokeBounds, paddedBounds);
      });
      if (filtered.length) {
        primaryStrokes = filtered;
      }
    }

    const strokesForProcessing = primaryStrokes.length ? primaryStrokes : contextStrokes;

    const strokeSignature = createStrokeSignature(strokesForProcessing);
    const fallbackSignature = strokesForProcessing
      .map((stroke) => stroke.id || stroke.path?.data?.strokeMeta?.id || '')
      .sort()
      .join(',');
    const signature = strokeSignature && strokeSignature !== 'empty'
      ? strokeSignature
      : `strokes::${fallbackSignature}`;

    const previousPayload = lastPayloadRef.current;
    const classificationChanged = previousPayload?.signature === signature
      ? (previousPayload?.analysis?.isMathLike ?? false) !== (analysis.isMathLike ?? false)
      : false;

    if (lastSignatureRef.current !== signature || classificationChanged) {
      lastSignatureRef.current = signature;
      if (analysis.isMathLike || shouldEscalate) {
        highlightStrokes(strokesForProcessing);
      } else {
        releaseFeedback();
      }
    }
    const bounds = paddedBounds || baseBounds || contextBounds;

    // Filter out tiny or invalid bounding boxes
    const MIN_BOX_AREA = 100; // Minimum 10x10 pixels
    const hasValidBounds = bounds && 
      (bounds.width * bounds.height) >= MIN_BOX_AREA &&
      bounds.width > 5 && bounds.height > 5;

    // Don't create detection if bounds are too small or invalid
    if (!hasValidBounds) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      return;
    }

    const basePayload = {
      equation: fallbackEquation,
      latex: fallbackEquation,
      confidence: localConfidence,
      method: 'local',
      mode,
      loading: shouldEscalate,
      strokes: strokesForProcessing,
      bounds,
      equals: equalsCandidate,
      groups: recognition.groups,
      releaseHighlight: releaseFeedback,
      signature,
      localConfidence: recognition.confidence ?? null,
      remoteConfidence: null,
      threshold,
      timestamp: Date.now(),
      analysis,
      intent: analysis.isMathLike ? 'equation' : 'note',
    };

    if (debug) {
      console.debug('[HandwritingDetector]', {
        totalStrokes: allStrokes.length,
        activeStrokes: activeStrokes.length,
        focusedStrokes: focusedStrokes.length,
        workingStrokes: workingStrokes.length,
        contextStrokes: contextStrokes.length,
        hasActiveArea: !!activeArea,
        activeAreaSize: activeArea ? `${Math.round(activeArea.width)}x${Math.round(activeArea.height)}` : 'N/A',
        equalsCandidate: !!equalsCandidate,
        equalsConfidence: equalsCandidate?.confidence ?? 0,
        recognized: recognition.equation,
        symbolCount: recognition.symbols.length,
        confidence: recognition.confidence,
        mode,
        shouldEscalate,
        classification: analysis.classification,
      });
    }

    notifyCandidate(basePayload);

    const callId = requestCounterRef.current + 1;
    requestCounterRef.current = callId;
    cloudTaskRef.current = { callId, signature };

    recognizeEquationHybrid(strokesForProcessing, {
      localResult: recognition,
      signature,
      includeHistory: true,
      mode,
      minConfidence: threshold,
    })
      .then((result) => {
        if (cloudTaskRef.current.callId !== callId || cloudTaskRef.current.signature !== signature) {
          return;
        }
        if (!result) {
          if (shouldEscalate) {
            notifyCandidate({
              ...basePayload,
              loading: false,
              method: 'cloud-error',
              error: 'Cloud OCR returned no result.',
            });
          }
          return;
        }

  const remoteEquationRaw = (result.equation || result.latex || fallbackEquation || '').trim();
        const remoteEquation = remoteEquationRaw || fallbackEquation;
        const remoteConfidence = Math.max(0, Math.min(1, result.confidence ?? localConfidence));
        const remoteMethod = result.method || (result.shouldUseRemote ? 'cloud' : 'local');
        const remoteAnalysis = analyzeMathContent(remoteEquation);

        const resolvedPayload = {
          ...basePayload,
          equation: remoteEquation,
          latex: result.latex ?? remoteEquation,
          confidence: remoteConfidence,
          method: remoteMethod,
          loading: false,
          remoteConfidence: result.remote?.confidence ?? result.confidence ?? null,
          remote: result.remote,
          ocrResult: result,
          mode: result.mode || mode,
          threshold: result.threshold ?? threshold,
          error: result.error ? (result.error.message || String(result.error)) : null,
          analysis: remoteAnalysis,
          intent: remoteAnalysis.isMathLike ? 'equation' : 'note',
        };

        const meaningfulChange = resolvedPayload.method !== basePayload.method
          || resolvedPayload.loading !== basePayload.loading
          || resolvedPayload.equation !== basePayload.equation
          || Math.abs(resolvedPayload.confidence - basePayload.confidence) > 0.0001
          || (resolvedPayload.analysis?.classification !== basePayload.analysis?.classification)
          || resolvedPayload.error;

        if (meaningfulChange) {
          notifyCandidate(resolvedPayload);
        }
      })
      .catch((error) => {
        if (cloudTaskRef.current.callId !== callId || cloudTaskRef.current.signature !== signature) {
          return;
        }
        notifyCandidate({
          ...basePayload,
          loading: false,
          method: shouldEscalate ? 'cloud-error' : 'local-error',
          error: error?.message || 'OCR failed.',
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, cancelCloudRequests, contextRadius, debug, highlightStrokes, maxGroupDistance, notifyCandidate, recentWindowMs, activeWritingWindowMs, releaseFeedback, updateDebugOverlays]);

  useEffect(() => {
    strokesRef.current = ensureArray(strokes);
  }, [strokes]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const currentStrokes = strokesRef.current;

    if (!currentStrokes.length) {
      lastSignatureRef.current = null;
      releaseFeedback();
      notifyCandidate(null);
      cancelCloudRequests();
      return () => {};
    }

    const latestTimestamp = currentStrokes.reduce((latest, stroke) => {
      const createdAt = stroke?.createdAt || 0;
      return createdAt > latest ? createdAt : latest;
    }, 0);

    if (!latestTimestamp) {
      return () => {};
    }

    const now = Date.now();
    const delay = Math.max(0, pauseDuration - (now - latestTimestamp));

    timerRef.current = setTimeout(() => {
      processDetection();
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cancelCloudRequests, pauseDuration, strokes, strokesVersion, processDetection, releaseFeedback, notifyCandidate, enabled]);

  useEffect(() => {
    // PERFORMANCE: Skip detection updates when disabled
    if (!enabled) return;
    
    if (debug && lastPayloadRef.current) {
      processDetection();
    } else if (!debug) {
      clearDebugOverlays();
    }
  }, [debug, processDetection, clearDebugOverlays, enabled]);

  return null;
};

HandwritingDetector.propTypes = {
  canvas: PropTypes.shape({
    bringObjectToFront: PropTypes.func,
    remove: PropTypes.func,
    add: PropTypes.func,
    requestRenderAll: PropTypes.func,
  }),
  strokes: PropTypes.arrayOf(PropTypes.object),
  pauseDuration: PropTypes.number,
  recentWindowMs: PropTypes.number,
  activeWritingWindowMs: PropTypes.number,
  contextRadius: PropTypes.number,
  maxGroupDistance: PropTypes.number,
  debug: PropTypes.bool,
  enabled: PropTypes.bool,
  onCandidate: PropTypes.func,
};

HandwritingDetector.defaultProps = {
  canvas: null,
  strokes: [],
  pauseDuration: 2000,
  recentWindowMs: 12000,
  activeWritingWindowMs: 5000,
  contextRadius: 180,
  maxGroupDistance: 36,
  debug: false,
  enabled: true,
  onCandidate: null,
};

export default HandwritingDetector;
