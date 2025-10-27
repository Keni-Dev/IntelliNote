import { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as fabric from 'fabric';
import StrokeAnalyzer, { mergeBounds } from '../../lib/strokeAnalyzer';
import { detectMostRecentEqualSign } from '../../lib/equalSignDetection';
import { createStrokeSignature } from '../../config/ocr';
import { strokeDebugger } from '../../lib/strokeDebugger';

const DEBUG_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ec4899'];

const ensureArray = (value) => (Array.isArray(value) ? value : []);

// eslint-disable-next-line no-unused-vars
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
  const lastProcessTimeRef = useRef(0); // PERFORMANCE: Track last process time
  const processingRef = useRef(false); // PERFORMANCE: Prevent concurrent processing
  
  const MAX_STROKES_FOR_AUTOMATIC_DETECTION = 120;
  const MAX_WORKING_STROKES = 64;
  const MAX_CONTEXT_STROKES = 48;
  const MIN_ACTIVE_STROKES = 3;
  const MIN_PROCESS_INTERVAL = 300; // PERFORMANCE: Min 300ms between detections

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

  const updateDebugOverlays = useCallback((groups, activeArea = null) => { // eslint-disable-line no-unused-vars
    if (!canvas) {
      return;
    }
    clearDebugOverlays();
    if (!debug) {
      return;
    }

    // Show active writing area if available - DISABLED to make invisible
    // if (activeArea) {
    //   const activeRect = new fabric.Rect({
    //     left: activeArea.minX,
    //     top: activeArea.minY,
    //     width: activeArea.width,
    //     height: activeArea.height,
    //     fill: 'rgba(139, 92, 246, 0.05)',
    //     stroke: '#8b5cf6',
    //     strokeWidth: 2,
    //     strokeDashArray: [5, 5],
    //     selectable: false,
    //     evented: false,
    //     excludeFromExport: true,
    //   });
    //   canvas.add(activeRect);
    //   if (typeof activeRect.sendToBack === 'function') {
    //     activeRect.sendToBack();
    //   }
    //   debugOverlayRef.current.push(activeRect);
    // }

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

    // PERFORMANCE: Prevent concurrent processing
    if (processingRef.current) {
      return;
    }

    // PERFORMANCE: Throttle detection frequency
    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTimeRef.current;
    if (timeSinceLastProcess < MIN_PROCESS_INTERVAL) {
      // Schedule for later instead of processing immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        processDetection();
      }, MIN_PROCESS_INTERVAL - timeSinceLastProcess);
      return;
    }

    processingRef.current = true;
    lastProcessTimeRef.current = now;

    const allStrokes = strokesRef.current;
    if (!allStrokes.length) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      processingRef.current = false;
      return;
    }

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
      processingRef.current = false;
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
      processingRef.current = false;
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
      processingRef.current = false;
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
    // const dynamicRadius = Math.max(horizontalRadius, verticalRadius * 1.5);
    
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
      processingRef.current = false;
      return;
    }

    // Limit to most recent strokes in the focused area for performance
    const workingStrokes = focusedStrokes.slice(-MAX_WORKING_STROKES);

    // STAGE 1: ONLY detect equals sign first - don't run full OCR yet
    // Use the new grouping detection to find the MOST RECENT equal sign only
    // This prevents multiple equal signs from being detected as one
    const equalsCandidate = detectMostRecentEqualSign(workingStrokes, { analyzer, minConfidence: 0.55, debug });
    
    // Debug the detection if enabled
    if (debug) {
      strokeDebugger.debugStrokes(equalsCandidate?.strokes || workingStrokes.slice(-2), canvas, equalsCandidate);
    }
    
    // Only proceed if we have a STRONG equals sign detection
    if (!equalsCandidate || equalsCandidate.confidence < 0.55) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      processingRef.current = false;
      return;
    }

    // Calculate bounds around the equals sign
    const equalsBounds = equalsCandidate.bounds;
    
    // Expand HORIZONTALLY to capture the full equation (left side of equals sign)
    // Start from equals sign and expand left until we stop finding strokes
    const equalsCenter = {
      x: (equalsBounds.minX + equalsBounds.maxX) / 2,
      y: (equalsBounds.minY + equalsBounds.maxY) / 2
    };
    const equalsHeight = equalsBounds.height;
    
    // Find all strokes to the LEFT of the equals sign that are roughly on the same line
    const verticalTolerance = equalsHeight * 3; // Within 3x the equals sign height
    const leftStrokes = allStrokes.filter((stroke) => {
      const strokeBounds = getStrokeBounds(stroke, analyzer);
      if (!strokeBounds) return false;
      
      // Must be to the left of equals sign
      if (strokeBounds.centerX >= equalsBounds.minX) return false;
      
      // Must be on roughly the same horizontal line (vertical alignment)
      const verticalDistance = Math.abs(strokeBounds.centerY - equalsCenter.y);
      return verticalDistance <= verticalTolerance;
    });
    
    // Sort left strokes by X position (rightmost to leftmost)
    leftStrokes.sort((a, b) => {
      const aX = (a.bounds?.centerX ?? a.features?.bounds?.centerX ?? 0);
      const bX = (b.bounds?.centerX ?? b.features?.bounds?.centerX ?? 0);
      return bX - aX;
    });
    
    // Expand left by finding continuous strokes (no large gaps)
    let equationLeftBoundary = equalsBounds.minX;
    let prevStrokeRight = equalsBounds.minX;
    const maxGap = equalsHeight * 4; // Maximum gap between strokes
    
    for (const stroke of leftStrokes) {
      const strokeBounds = getStrokeBounds(stroke, analyzer);
      if (!strokeBounds) continue;
      
      const gap = prevStrokeRight - strokeBounds.maxX;
      
      // If gap is too large, stop expanding
      if (gap > maxGap) {
        break;
      }
      
      // Include this stroke
      equationLeftBoundary = Math.min(equationLeftBoundary, strokeBounds.minX);
      prevStrokeRight = strokeBounds.minX; // Update for next iteration
    }
    
    // Add some padding to the left
    const horizontalPadding = equalsHeight * 0.5;
    equationLeftBoundary -= horizontalPadding;
    
    // Create expanded bounds (horizontal expansion to the left, minimal vertical)
    const expandedBounds = {
      minX: equationLeftBoundary,
      maxX: equalsBounds.maxX + horizontalPadding,
      minY: equalsBounds.minY - verticalTolerance * 0.3,
      maxY: equalsBounds.maxY + verticalTolerance * 0.3,
      get width() { return this.maxX - this.minX; },
      get height() { return this.maxY - this.minY; },
      get centerX() { return (this.minX + this.maxX) / 2; },
      get centerY() { return (this.minY + this.maxY) / 2; }
    };
    
    console.log('[EqualSign] Equals bounds:', equalsBounds);
    console.log('[EqualSign] Found', leftStrokes.length, 'strokes to the left');
    console.log('[EqualSign] Expanded bounds:', expandedBounds);
    
    // Get strokes within expanded bounds (for the full equation context)
    const equationStrokes = allStrokes.filter((stroke) => {
      const strokeBounds = getStrokeBounds(stroke, analyzer);
      if (!strokeBounds) return false;
      return boundsIntersect(strokeBounds, expandedBounds);
    });

    updateDebugOverlays([], activeArea);

    // Validate minimum bounds size
    // Allow wider equations (horizontal) by checking width OR height separately
    const MIN_BOX_AREA = 200; // Reduced from 400 to allow smaller detections
    const MIN_BOX_WIDTH = 10; // Reduced from 15 for smaller equations
    const MIN_BOX_HEIGHT = 5;  // Reduced from 10 for smaller equations
    const MAX_ASPECT_RATIO = 30; // Allow very wide horizontal equations (e.g., 300×10px)
    
    const aspectRatio = expandedBounds ? expandedBounds.width / Math.max(1, expandedBounds.height) : 0;
    const hasValidBounds = expandedBounds && 
      expandedBounds.width > MIN_BOX_WIDTH && 
      expandedBounds.height > MIN_BOX_HEIGHT &&
      (
        // Either meets area requirement OR is a valid wide equation
        (expandedBounds.width * expandedBounds.height) >= MIN_BOX_AREA ||
        (aspectRatio > 2 && aspectRatio <= MAX_ASPECT_RATIO && expandedBounds.width > 30)
      );

    if (!hasValidBounds) {
      if (lastSignatureRef.current !== null) {
        lastSignatureRef.current = null;
        releaseFeedback();
        notifyCandidate(null);
      }
      cancelCloudRequests();
      processingRef.current = false;
      return;
    }
    
    // Create candidate payload with ONLY equals sign info (no OCR yet)
    const strokeSignature = createStrokeSignature(equationStrokes);
    const fallbackSignature = equationStrokes
      .map((stroke) => stroke.id || stroke.path?.data?.strokeMeta?.id || '')
      .sort()
      .join(',');
    const signature = strokeSignature && strokeSignature !== 'empty'
      ? strokeSignature
      : `strokes::${fallbackSignature}`;

    const signatureChanged = lastSignatureRef.current !== signature;

    if (signatureChanged) {
      lastSignatureRef.current = signature;
      highlightStrokes(equationStrokes);
    }

    const basePayload = {
      equation: '=', // Just the equals sign for now
      latex: '=',
      confidence: equalsCandidate.confidence,
      method: 'equals-detected',
      mode: 'local',
      loading: false,
      strokes: equationStrokes,
      bounds: expandedBounds,
      equals: equalsCandidate,
      groups: [],
      releaseHighlight: releaseFeedback,
      signature,
      localConfidence: equalsCandidate.confidence,
      remoteConfidence: null,
      threshold: 0.55,
      timestamp: Date.now(),
      analysis: {
        classification: 'equation-candidate',
        isMathLike: true,
        confidence: equalsCandidate.confidence,
        isEquation: true,
      },
      intent: 'equation-candidate', // New intent type - not a full equation yet
    };

    if (debug) {
      console.debug('[HandwritingDetector]', {
        totalStrokes: allStrokes.length,
        activeStrokes: activeStrokes.length,
        focusedStrokes: focusedStrokes.length,
        workingStrokes: workingStrokes.length,
        equationStrokes: equationStrokes.length,
        hasActiveArea: !!activeArea,
        activeAreaSize: activeArea ? `${Math.round(activeArea.width)}x${Math.round(activeArea.height)}` : 'N/A',
        equalsCandidate: !!equalsCandidate,
        equalsConfidence: equalsCandidate?.confidence ?? 0,
      });
    }

    notifyCandidate(basePayload);

    // PERFORMANCE: Mark processing complete
    processingRef.current = false;
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
