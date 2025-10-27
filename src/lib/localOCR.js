/**
 * Local TrOCR Service Client
 * 
 * Communicates with the local Python FastAPI server (ocr_service.py) running
 * the TrOCR model for handwritten math equation recognition.
 * 
 * Server endpoint: POST /recognize
 * Model: fhswf/TrOCR_Math_handwritten (Hugging Face)
 */

import { getOCRConfig, getOCRCache, setOCRStatus, createStrokeSignature } from '../config/ocr';

// Render strokes to a cropped PNG data URL
const renderStrokesToImage = (strokes = [], options = {}) => {
  const padding = options.padding ?? 16;
  const lineWidth = options.lineWidth ?? 3;
  const scale = options.scale ?? 1;
  const clipBounds = options.bounds; // Optional bounds to clip strokes

  if (!Array.isArray(strokes) || strokes.length === 0) return null;

  if (clipBounds) {
    console.log('[LocalOCR] Clipping to bounds:', clipBounds);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let totalPointsBefore = 0;
  let totalPointsAfter = 0;
  
  const normalized = strokes.map((stroke) => {
    const pts = stroke?.points || stroke?.strokePoints || [];
    let points = pts.map((p) => ({ x: Number(p.x ?? p[0] ?? 0), y: Number(p.y ?? p[1] ?? 0) }));
    totalPointsBefore += points.length;
    
    // If bounds are provided, filter points to only those within bounds
    if (clipBounds) {
      points = points.filter(({ x, y }) => 
        x >= clipBounds.minX && x <= clipBounds.maxX &&
        y >= clipBounds.minY && y <= clipBounds.maxY
      );
      totalPointsAfter += points.length;
    } else {
      totalPointsAfter += points.length;
    }
    
    points.forEach(({ x, y }) => {
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    });
    return points;
  }).filter(points => points.length > 0); // Remove strokes with no points in bounds

  if (clipBounds) {
    console.log(`[LocalOCR] Clipped ${totalPointsBefore} points to ${totalPointsAfter} points`);
    console.log(`[LocalOCR] Rendering ${normalized.length} strokes (from ${strokes.length} input strokes)`);
  }

  if (!Number.isFinite(minX) || normalized.length === 0) return null;

  const width = Math.max(1, Math.ceil((maxX - minX) * scale + padding * 2));
  const height = Math.max(1, Math.ceil((maxY - minY) * scale + padding * 2));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  normalized.forEach((points) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo((points[0].x - minX) * scale + padding, (points[0].y - minY) * scale + padding);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo((points[i].x - minX) * scale + padding, (points[i].y - minY) * scale + padding);
    }
    ctx.stroke();
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    bounds: { minX, minY, maxX, maxY, padding, scale },
  };
};

export const recognizeHandwriting = async (strokes, options = {}) => {
  const config = getOCRConfig();
  const cache = options.cache || getOCRCache();
  const cacheKey = options.cacheKey || createStrokeSignature(strokes);

  if (!Array.isArray(strokes) || strokes.length === 0) return null;

  const useCache = config.cacheEnabled && !options.bypassCache;
  if (useCache && cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), cached: true };
  }

  // Pass bounds to renderStrokesToImage to clip strokes
  const renderingOptions = {
    ...(options.rendering || { padding: 16, lineWidth: 3, scale: 1 }),
    bounds: options.bounds // Add bounds for clipping
  };
  
  const rendered = renderStrokesToImage(strokes, renderingOptions);
  if (!rendered || !rendered.dataUrl) {
    return { latex: '', confidence: 0, error: 'Unable to render strokes for local OCR.', usedFallback: true };
  }

  setOCRStatus({ state: 'pending', message: 'Contacting local OCR service…' });

  const url = `${config.localServerUrl || 'http://127.0.0.1:8000'}/recognize`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: rendered.dataUrl }),
    });
  } catch (networkError) {
  setOCRStatus({ state: 'error', message: 'Unable to reach local OCR service.', details: networkError.message });
    return { latex: '', confidence: 0, error: networkError.message || 'Network error', usedFallback: true };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (parseError) {
  setOCRStatus({ state: 'error', message: 'Unable to parse OCR response.', details: parseError.message });
    return { latex: '', confidence: 0, error: parseError.message || 'Parse error', usedFallback: true };
  }

  if (!response.ok) {
  let msg = payload?.error || payload?.detail?.error || `OCR request failed with status ${response.status}`;
    
    // Service unavailable (503) means pix2tex not installed
    if (response.status === 503) {
      msg = 'Local OCR service not ready. Install torch and transformers for TrOCR or switch provider.';
    }
    
    setOCRStatus({ state: 'error', message: msg, code: response.status });
    return { latex: '', confidence: 0, error: msg, usedFallback: true, raw: payload };
  }

  const latex = (payload?.latex || '').trim();
  const confidence = typeof payload?.confidence === 'number' ? payload.confidence : (latex ? 0.8 : 0);

  const result = { latex, confidence, boxes: payload?.boxes || null, raw: payload, usedFallback: false };
  if (useCache) cache.set(cacheKey, result);

  setOCRStatus({ state: 'connected', message: 'Local OCR ready.' });
  return result;
};

export default { recognizeHandwriting };
