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
    console.log('[LocalOCR] Rendering with bounds (for reference):', clipBounds);
  }

  // Don't clip individual points - just use all points from strokes that intersect bounds
  // This prevents cutting off parts of characters
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const normalized = strokes.map((stroke) => {
    const pts = stroke?.points || stroke?.strokePoints || [];
    const points = pts.map((p) => ({ x: Number(p.x ?? p[0] ?? 0), y: Number(p.y ?? p[1] ?? 0) }));
    
    points.forEach(({ x, y }) => {
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    });
    return points;
  }).filter(points => points.length > 0);

  if (clipBounds) {
    console.log(`[LocalOCR] Rendering ${normalized.length} complete strokes (no point clipping)`);
    console.log(`[LocalOCR] Stroke bounds: minX=${minX}, maxX=${maxX}, width=${maxX - minX}`);
    console.log(`[LocalOCR] Stroke bounds: minY=${minY}, maxY=${maxY}, height=${maxY - minY}`);
  }

  if (!Number.isFinite(minX) || normalized.length === 0) return null;

  const width = Math.max(1, Math.ceil((maxX - minX) * scale + padding * 2));
  const height = Math.max(1, Math.ceil((maxY - minY) * scale + padding * 2));
  
  // Limit canvas size to prevent memory issues with very large drawings
  const MAX_DIMENSION = 2048; // Maximum width or height
  let renderScale = scale;
  let scaledLineWidth = lineWidth;
  
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scaleDownFactor = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    renderScale = scale * scaleDownFactor;
    // IMPORTANT: Scale line width proportionally to maintain stroke visibility
    scaledLineWidth = lineWidth / scaleDownFactor;
    console.warn(`[LocalOCR] Canvas too large (${width}x${height}), scaling down by ${scaleDownFactor.toFixed(2)}`);
    console.log(`[LocalOCR] Adjusted line width from ${lineWidth} to ${scaledLineWidth.toFixed(2)}`);
  }
  
  const finalWidth = Math.max(1, Math.ceil((maxX - minX) * renderScale + padding * 2));
  const finalHeight = Math.max(1, Math.ceil((maxY - minY) * renderScale + padding * 2));

  console.log(`[LocalOCR] Final canvas size: ${finalWidth}x${finalHeight}`);

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = scaledLineWidth; // Use scaled line width
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  normalized.forEach((points) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo((points[0].x - minX) * renderScale + padding, (points[0].y - minY) * renderScale + padding);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo((points[i].x - minX) * renderScale + padding, (points[i].y - minY) * renderScale + padding);
    }
    ctx.stroke();
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    bounds: { minX, minY, maxX, maxY, padding, scale: renderScale },
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
