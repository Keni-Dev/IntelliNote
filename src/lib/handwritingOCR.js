import StrokeAnalyzer from './strokeAnalyzer';
import { detectEqualSign as detectEqualSignRobust } from './equalSignDetection';
import {
  getOCRConfig,
  getOCRCache,
  pushRecognitionHistory,
} from '../config/ocr';
import { recognizeHandwriting as recognizeWithOpenRouter } from './openrouterOCR';
import { recognizeHandwriting as recognizeWithLocal } from './localOCR';
import recognitionCache from './recognitionCache';

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// Stroke filtering thresholds
const MIN_STROKE_POINTS = 3; // Skip strokes with fewer points
const MAX_TOUCH_AREA = 10000; // Skip large palm/hand strokes (pixels²)
const DEBOUNCE_DELAY = 1500; // Wait 1.5s after last stroke before recognizing

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 8000; // 8 seconds

/**
 * Filter out invalid or non-math strokes
 */
const filterStrokes = (strokes, analyzer) => {
  if (!Array.isArray(strokes)) return [];
  
  return strokes.filter((stroke) => {
    const points = stroke?.points || stroke?.strokePoints || [];
    
    // Skip very short strokes
    if (points.length < MIN_STROKE_POINTS) {
      return false;
    }
    
    // Calculate touch area (bounding box)
    const features = stroke.features || analyzer.analyzeStroke(points);
    const bounds = features.bounds;
    
    if (bounds) {
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const area = width * height;
      
      // Skip very large strokes (likely palm/hand)
      if (area > MAX_TOUCH_AREA) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Sleep for exponential backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, attempt),
        MAX_RETRY_DELAY
      );
      
      console.warn(`[HandwritingOCR] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error.message);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

const ensureStroke = (stroke, analyzer) => {
  if (!stroke) {
    return null;
  }
  const candidate = stroke;
  if (!candidate.points && Array.isArray(candidate.strokePoints)) {
    candidate.points = candidate.strokePoints;
  }
  if (!candidate.features) {
    candidate.features = analyzer.analyzeStroke(candidate.points || []);
  }
  if (!candidate.bounds) {
    candidate.bounds = candidate.features.bounds;
  }
  return candidate;
};

const MIN_CONFIDENCE_DEFAULT = 0.7;

const nowMs = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

export const recognizeEquationHybrid = async (strokes, options = {}) => {
  const config = getOCRConfig();
  const mode = (options.mode || config.mode || 'hybrid').toLowerCase();
  const threshold = options.minConfidence ?? config.minConfidence ?? MIN_CONFIDENCE_DEFAULT;
  const includeHistory = options.includeHistory !== false;
  const analyzer = options.analyzer || new StrokeAnalyzer();
  
  // Filter out invalid strokes
  const filteredStrokes = filterStrokes(strokes, analyzer);
  if (filteredStrokes.length === 0) {
    return {
      equation: '',
      latex: '',
      confidence: 0,
      method: 'filtered',
      error: 'No valid strokes after filtering',
    };
  }
  
  const signature = options.signature || options.cacheKey || recognitionCache.generateKey(filteredStrokes);
  const startTick = nowMs();
  const startedAt = Date.now();
  
  // Check cache first
  const cached = recognitionCache.get(signature);
  if (cached && !options.forceRefresh) {
    console.log('[HandwritingOCR] Cache hit:', cached.latex);
    return {
      ...cached,
      method: 'cached',
      fromCache: true,
    };
  }

  const local = options.localResult || recognizeEquationLocal(filteredStrokes, options);
  const hasStrokes = filteredStrokes.length > 0;

  let equation = local.equation;
  let confidence = local.confidence ?? 0;
  let method = 'local';
  let remoteResult = null;
  let error = null;

  const shouldUseRemote = mode === 'cloud' || (mode === 'hybrid' && confidence < threshold && hasStrokes);

  if (shouldUseRemote) {
    try {
      const configProvider = (getOCRConfig().provider || 'openrouter').toLowerCase();
      const recognizer = configProvider === 'local' 
        ? recognizeWithLocal 
        : recognizeWithOpenRouter;
      
      // Retry with exponential backoff on failure
      remoteResult = await retryWithBackoff(async () => {
        return await recognizer(filteredStrokes, {
          cache: getOCRCache(),
          cacheKey: signature,
          bypassCache: options.forceRefresh,
          fabricCanvas: options.fabricCanvas, // Pass fabric canvas for screenshot
          bounds: options.bounds, // Pass bounds for cropping
        });
      });

      if (remoteResult && !remoteResult.usedFallback && (remoteResult.latex || remoteResult.equation)) {
        equation = (remoteResult.latex || remoteResult.equation || '').trim();
        confidence = remoteResult.confidence ?? Math.max(confidence, threshold);
        method = 'cloud';
      } else if (remoteResult?.usedFallback) {
        method = 'local-fallback';
      } else if (remoteResult?.error) {
        // Provider returned error; use local and mark as fallback
        method = 'local-fallback';
        error = remoteResult.error;
      }
    } catch (cloudError) {
      // Network or provider failure; stay local and record error
      error = cloudError;
      method = mode === 'cloud' ? 'cloud-error' : 'local-fallback';
      console.error('[HandwritingOCR] Cloud recognition failed after retries:', cloudError);
    }
  }

  const durationMs = nowMs() - startTick;
  const finalConfidence = clamp01(confidence);

  const result = {
    ...local,
    equation,
    latex: equation,
    confidence: finalConfidence,
    method,
    remote: remoteResult,
    error,
    signature,
    mode,
    threshold,
    shouldUseRemote,
    durationMs,
    startedAt,
    localResult: local,
    // Pass through debug info from recognizer
    debugImage: remoteResult?.debugImage,
    debugInfo: remoteResult?.debugInfo,
  };
  
  // Cache successful results
  if (equation && confidence > 0 && method !== 'cached') {
    recognitionCache.set(signature, result, confidence);
  }
  
  // Record metrics
  const success = equation && equation.length > 0 && !error;
  recognitionCache.recordRecognition(durationMs, success, error?.message || error);

  if (includeHistory) {
    pushRecognitionHistory({
      id: signature,
      equation,
      latex: equation,
      method,
      mode,
      strokes: filteredStrokes,
      localConfidence: local.confidence ?? 0,
      remoteConfidence: remoteResult?.confidence ?? null,
      confidence: finalConfidence,
      durationMs,
      timestamp: startedAt,
      threshold,
      shouldUseRemote,
      error: error ? (error.message || String(error)) : null,
    });
  }

  return result;
};

const uniqueId = () => `stroke-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const extractStrokes = (source, startTime, endTime, options = {}) => {
  const analyzer = options.analyzer || new StrokeAnalyzer(options);

  const withinRange = (timestamp) => {
    if (startTime && timestamp < startTime) {
      return false;
    }
    if (endTime && timestamp > endTime) {
      return false;
    }
    return true;
  };

  if (Array.isArray(source)) {
    return source
      .map((stroke) => ensureStroke(stroke, analyzer))
      .filter((stroke) => stroke && withinRange(stroke.createdAt || 0));
  }

  if (!source || typeof source.getObjects !== 'function') {
    return [];
  }

  return source
    .getObjects()
    .filter((obj) => obj?.type === 'path')
    .map((obj) => {
      const meta = obj.strokeMeta || obj.data?.strokeMeta || {};
      const createdAt = meta.createdAt || obj.createdAt || Date.now();
      if (!withinRange(createdAt)) {
        return null;
      }
      const points = Array.isArray(meta.points) ? meta.points : [];
      const stroke = {
        id: meta.id || obj.id || uniqueId(),
        createdAt,
        path: obj,
        object: obj,
        points,
        strokePoints: points,
        features: meta.features,
        bounds: meta.bounds,
      };
      const analysed = ensureStroke(stroke, analyzer);
      if (analysed && obj.set) {
        const enrichedMeta = {
          ...meta,
          id: analysed.id,
          createdAt,
          points: analysed.points,
          features: analysed.features,
          bounds: analysed.bounds,
        };
        if (typeof obj.set === 'function') {
          obj.set('strokeMeta', enrichedMeta);
          obj.set('data', {
            ...(obj.data || {}),
            strokeMeta: enrichedMeta,
          });
        }
      }
      return analysed;
    })
    .filter(Boolean);
};

export const detectEqualsSign = (strokes, options = {}) => {
  // Use the new robust detection system
  return detectEqualSignRobust(strokes, {
    ...options,
    debug: options.debug || false,
  });
};

const recognizeEquationLocal = (strokes, options = {}) => {
  const analyzer = options.analyzer || new StrokeAnalyzer(options);
  const prepared = (Array.isArray(strokes) ? strokes : [])
    .map((stroke) => ensureStroke(stroke, analyzer))
    .filter(Boolean);

  if (!prepared.length) {
    return {
      equation: '',
      symbols: [],
      groups: [],
      confidence: 0,
    };
  }

  const groupDistance = options.maxGroupDistance ?? 36;
  const groups = analyzer.groupStrokes(prepared, groupDistance);

  const recognitions = groups.map((group) => {
    const detection = analyzer.detectSymbol(group);
    return {
      ...detection,
      group,
      bounds: group.bounds,
      center: group.center,
      strokes: group.strokes,
    };
  });

  const filtered = recognitions.filter((entry) => entry.symbol);

  const rows = [];
  const rowTolerance = options.rowTolerance ?? 0.45;

  filtered
    .slice()
    .sort((a, b) => a.bounds.centerY - b.bounds.centerY)
    .forEach((symbol) => {
      const tolerance = Math.max(symbol.bounds.height, symbol.bounds.width) * rowTolerance + 12;
      const match = rows.find((row) => Math.abs(row.centerY - symbol.bounds.centerY) <= tolerance);
      if (match) {
        match.items.push(symbol);
        match.centerY = (match.centerY * (match.items.length - 1) + symbol.bounds.centerY) / match.items.length;
      } else {
        rows.push({ centerY: symbol.bounds.centerY, items: [symbol] });
      }
    });

  rows.sort((a, b) => a.centerY - b.centerY);
  rows.forEach((row) => {
    row.items.sort((a, b) => a.bounds.centerX - b.bounds.centerX);
  });

  const orderedSymbols = rows.flatMap((row) => row.items);
  const equation = orderedSymbols.map((item) => item.symbol).join('');
  
  // Boost confidence if we detected an equals sign (strong signal of equation intent)
  const hasEqualsSign = equation.includes('=');
  const baseConfidence = orderedSymbols.length
    ? orderedSymbols.reduce((sum, item) => sum + item.confidence, 0) / orderedSymbols.length
    : 0;
  const confidence = hasEqualsSign ? Math.min(1, baseConfidence + 0.15) : baseConfidence;

  return {
    equation,
    symbols: orderedSymbols,
    groups,
    confidence: clamp01(confidence),
  };
};

export const recognizeEquation = recognizeEquationLocal;
export { recognizeEquationLocal };

export const getContextArea = (source, position, radius = 180, options = {}) => {
  if (!position) {
    return extractStrokes(source, options.startTime, options.endTime, options);
  }

  const analyzer = options.analyzer || new StrokeAnalyzer(options);
  const strokes = extractStrokes(source, options.startTime, options.endTime, { analyzer });

  // Use elliptical selection strongly favoring horizontal direction
  // Math equations are typically horizontal, so we need much wider horizontal reach
  const horizontalRadius = radius * 2.5;  // 2.5x wider horizontally (was 1.5x)
  const verticalRadius = radius * 0.75;   // Keep vertical the same

  return strokes.filter((stroke) => {
    if (!stroke || !stroke.bounds) {
      return false;
    }
    const dx = stroke.bounds.centerX - position.x;
    const dy = stroke.bounds.centerY - position.y;
    
    // Add stroke size to effective radius
    const strokeSize = Math.max(stroke.bounds.width, stroke.bounds.height) / 2;
    const effectiveHorizontal = horizontalRadius + strokeSize;
    const effectiveVertical = verticalRadius + strokeSize;
    
    // Elliptical distance check (strongly favor horizontal)
    const normalizedDx = dx / effectiveHorizontal;
    const normalizedDy = dy / effectiveVertical;
    return (normalizedDx * normalizedDx + normalizedDy * normalizedDy) <= 1;
  });
};

// Recognize multiple equation candidates across a large canvas by grouping strokes into clusters
// and running the hybrid recognizer per group. This avoids full-canvas OCR and scales with content.
export const recognizeGroupsHybrid = async (allStrokes = [], options = {}) => {
  const analyzer = options.analyzer || new StrokeAnalyzer(options);
  const prepared = (Array.isArray(allStrokes) ? allStrokes : [])
    .map((s) => ensureStroke(s, analyzer))
    .filter(Boolean);

  if (!prepared.length) return [];

  const groupDistance = options.maxGroupDistance ?? 42;
  const groups = analyzer.groupStrokes(prepared, groupDistance);

  const results = [];
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    try {
      const res = await recognizeEquationHybrid(group.strokes, {
        ...options,
        includeHistory: options.includeHistory ?? false,
      });
      results.push({
        index: i,
        bounds: group.bounds,
        strokes: group.strokes,
        equation: res?.equation || res?.latex || '',
        method: res?.method || 'local',
        confidence: res?.confidence ?? 0,
        mode: res?.mode,
      });
    } catch (err) {
      results.push({ index: i, bounds: group.bounds, strokes: group.strokes, equation: '', method: 'error', confidence: 0, error: String(err) });
    }
  }

  return results;
};

export default {
  extractStrokes,
  recognizeEquation,
  recognizeEquationHybrid,
  recognizeEquationLocal,
  detectEqualsSign,
  getContextArea,
  recognizeGroupsHybrid,
};
