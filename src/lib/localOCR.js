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
import * as fabric from 'fabric';

/**
 * Capture a screenshot of a specific region from the fabric.js canvas
 * This method correctly handles zoom, pan, and transformation
 * 
 * KEY FACTORS HANDLED:
 * 1. Zoom: Uses viewportTransform[0] to get current zoom level
 * 2. Pan: Uses viewportTransform[4] and [5] for X/Y pan offsets
 * 3. Coordinate Systems:
 *    - Canvas Coordinates (World Space): Where strokes actually are (minX, minY, etc.)
 *    - Screen Coordinates: What you see on screen = canvas coords * zoom + pan
 * 4. Small Equations: Works fine - just captures smaller region
 * 5. Large Equations: Works fine - captures larger region
 * 6. Any Zoom Level: Automatically converts canvas→screen coords using transform
 * 
 * PROCESS:
 * 1. Receive bounds in canvas coordinates (from stroke bounds)
 * 2. Convert to screen coordinates using viewport transform
 * 3. Capture that screen region from the rendered canvas
 * 4. Draw to temporary canvas, unscaling back to original size
 * 5. Return as PNG data URL
 * 
 * @param {fabric.Canvas} fabricCanvas - The fabric.js canvas instance
 * @param {Object} bounds - The bounds in canvas coordinates { minX, minY, maxX, maxY }
 * @param {Object} options - Rendering options { padding, scale }
 * @returns {Object} - { dataUrl, bounds } or null
 */
const captureCanvasRegion = (fabricCanvas, bounds, strokes, options = {}) => {
  if (!fabricCanvas || !bounds) {
    console.error('[LocalOCR] Missing canvas or bounds for screenshot');
    return null;
  }

  // OPTIMIZATION: Reduced padding and configurable image quality
  const padding = options.padding ?? 8;  // Reduced from 16 to 8
  const imageQuality = options.quality ?? 0.85;  // WebP quality (0-1)
  const maxDimension = options.maxDimension ?? 384;  // TrOCR optimal size

  // Bounds are in canvas coordinates (world space)
  const { minX, minY, maxX, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  console.log('[LocalOCR] Screenshot - Canvas bounds:', { minX, minY, maxX, maxY, width, height });

  if (width <= 0 || height <= 0) {
    console.error('[LocalOCR] Invalid bounds dimensions');
    return null;
  }

  // Get viewport transform for debugging
  const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const currentZoom = vpt[0];
  const panX = vpt[4];
  const panY = vpt[5];

  console.log('[LocalOCR] Viewport transform:', { zoom: currentZoom, panX, panY });

  // Create output canvas
  const tempCanvas = document.createElement('canvas');
  const croppedWidth = Math.ceil(width + padding * 2);
  const croppedHeight = Math.ceil(height + padding * 2);
  
  tempCanvas.width = croppedWidth;
  tempCanvas.height = croppedHeight;
  
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    console.error('[LocalOCR] Failed to get canvas context');
    return null;
  }

  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, croppedWidth, croppedHeight);

  try {
    // PREFERRED: Pixel-accurate screenshot from the rendered fabric canvas
    const lowerCanvas = fabricCanvas.lowerCanvasEl;
    if (!lowerCanvas) {
      console.error('[LocalOCR] lowerCanvasEl not found, cannot capture screenshot');
      throw new Error('lowerCanvasEl missing');
    }

    // Fabric applies retina scaling to the internal canvas; account for it
    const retina = typeof fabricCanvas.getRetinaScaling === 'function'
      ? fabricCanvas.getRetinaScaling()
      : (window.devicePixelRatio || 1);

    // Transform world-space bounds to screen-space (before retina scaling)
    const tl = fabric.util.transformPoint(new fabric.Point(minX, minY), vpt);
    const br = fabric.util.transformPoint(new fabric.Point(maxX, maxY), vpt);

    // Convert to canvas pixel coordinates (after retina scaling) and add padding in screen space
    const padScreen = padding * currentZoom * retina;
    let sx = Math.floor(tl.x * retina - padScreen);
    let sy = Math.floor(tl.y * retina - padScreen);
    let sWidth = Math.ceil((br.x - tl.x) * retina + padScreen * 2);
    let sHeight = Math.ceil((br.y - tl.y) * retina + padScreen * 2);

    const srcMaxW = lowerCanvas.width;
    const srcMaxH = lowerCanvas.height;

    // Clamp to source canvas bounds
    if (sx < 0) { sWidth += sx; sx = 0; }
    if (sy < 0) { sHeight += sy; sy = 0; }
    sWidth = Math.max(1, Math.min(sWidth, srcMaxW - sx));
    sHeight = Math.max(1, Math.min(sHeight, srcMaxH - sy));

    // Destination size in world pixels (unscaled back from screen)
    const dw = Math.max(1, Math.round(sWidth / (currentZoom * retina)));
    const dh = Math.max(1, Math.round(sHeight / (currentZoom * retina)));

    // If our temp canvas size doesn't match due to clamping, resize to match
    if (tempCanvas.width !== dw || tempCanvas.height !== dh) {
      tempCanvas.width = dw;
      tempCanvas.height = dh;
      // reset background after resize
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, dw, dh);
    }

    // Finally, copy pixels and unscale to world size
    ctx.drawImage(lowerCanvas, sx, sy, sWidth, sHeight, 0, 0, dw, dh);

    console.log('[LocalOCR] Screenshot crop:', {
      retina, vptZoom: currentZoom,
      sx, sy, sWidth, sHeight,
      dw, dh,
      srcCanvas: { w: srcMaxW, h: srcMaxH },
    });

    // OPTIMIZATION: Smart downscaling to TrOCR's optimal size (384x384)
    let finalCanvas = tempCanvas;
    let scaledDown = false;
    
    if (dw > maxDimension || dh > maxDimension) {
      const scaleRatio = Math.min(maxDimension / dw, maxDimension / dh);
      const scaledWidth = Math.round(dw * scaleRatio);
      const scaledHeight = Math.round(dh * scaleRatio);
      
      // Create scaled canvas
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = scaledWidth;
      scaledCanvas.height = scaledHeight;
      const scaledCtx = scaledCanvas.getContext('2d');
      
      if (scaledCtx) {
        // Use high-quality image smoothing for downscaling
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'high';
        scaledCtx.fillStyle = '#ffffff';
        scaledCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        scaledCtx.drawImage(tempCanvas, 0, 0, dw, dh, 0, 0, scaledWidth, scaledHeight);
        
        finalCanvas = scaledCanvas;
        scaledDown = true;
        
        console.log(`[LocalOCR] ⚡ Downscaled: ${dw}x${dh} → ${scaledWidth}x${scaledHeight} (${scaleRatio.toFixed(2)}x)`);
      }
    }

    // OPTIMIZATION: Use WebP compression (60% smaller than PNG)
    const finalDataUrl = finalCanvas.toDataURL('image/webp', imageQuality);
    
    console.log('[LocalOCR] Screenshot captured:', {
      originalSize: `${dw}x${dh}`,
      finalSize: `${finalCanvas.width}x${finalCanvas.height}`,
      scaledDown,
      format: 'webp',
      quality: imageQuality,
      strokesRendered: strokes.length,
      dataUrlLength: finalDataUrl.length
    });

    // Return debug metadata along with the image
    return {
      dataUrl: finalDataUrl,
      bounds: { minX, minY, maxX, maxY, padding },
      debug: {
        size: `${tempCanvas.width}x${tempCanvas.height}`,
        corners: {
          TL: `(${Math.round(minX)}, ${Math.round(minY)})`,
          TR: `(${Math.round(maxX)}, ${Math.round(minY)})`,
          BL: `(${Math.round(minX)}, ${Math.round(maxY)})`,
          BR: `(${Math.round(maxX)}, ${Math.round(maxY)})`,
        },
        zoom: currentZoom.toFixed(2),
        pan: `(${Math.round(panX)}, ${Math.round(panY)})`,
        strokesRendered: strokes.length
      }
    };
  } catch (error) {
    console.error('[LocalOCR] Error capturing canvas region:', error);
    return null;
  }
};

// Render strokes to a cropped PNG data URL (OLD METHOD - keeping as fallback)
const renderStrokesToImage = (strokes = [], options = {}) => {
  // OPTIMIZATION: Reduced defaults for faster processing
  const padding = options.padding ?? 8;  // Reduced from 16
  const lineWidth = options.lineWidth ?? 2;  // Reduced from 3
  const scale = options.scale ?? 1;
  const imageQuality = options.quality ?? 0.85;  // WebP quality
  const maxDimension = options.maxDimension ?? 384;  // TrOCR optimal size
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
  
  // OPTIMIZATION: Limit to TrOCR's optimal input size
  const MAX_DIMENSION = maxDimension;
  let renderScale = scale;
  let scaledLineWidth = lineWidth;
  
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scaleDownFactor = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    renderScale = scale * scaleDownFactor;
    // IMPORTANT: Scale line width proportionally to maintain stroke visibility
    scaledLineWidth = lineWidth / scaleDownFactor;
    console.log(`[LocalOCR] ⚡ Downscaling: ${width}x${height} → target max ${MAX_DIMENSION}px (factor: ${scaleDownFactor.toFixed(2)})`);
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

  // OPTIMIZATION: Use WebP compression instead of PNG
  return {
    dataUrl: canvas.toDataURL('image/webp', imageQuality),
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

  let rendered = null;

  // NEW: Try screenshot method first if canvas and bounds are provided
  if (options.fabricCanvas && options.bounds) {
    console.log('[LocalOCR] Using screenshot method (fast & accurate)');
    // OPTIMIZATION: Pass optimized settings to screenshot function
    const renderingOptions = {
      padding: options.rendering?.padding ?? 8,  // Reduced from 16
      quality: options.rendering?.quality ?? 0.85,  // WebP quality
      maxDimension: options.rendering?.maxDimension ?? 384,  // TrOCR optimal
    };
    
    rendered = captureCanvasRegion(options.fabricCanvas, options.bounds, strokes, renderingOptions);
  }

  // Fallback to stroke rendering if screenshot fails or isn't available
  if (!rendered || !rendered.dataUrl) {
    console.log('[LocalOCR] Using stroke rendering method (fallback)');
    // OPTIMIZATION: Pass optimized settings to fallback renderer
    const renderingOptions = {
      padding: options.rendering?.padding ?? 8,  // Reduced from 16
      lineWidth: options.rendering?.lineWidth ?? 2,  // Reduced from 3
      scale: options.rendering?.scale ?? 1,
      quality: options.rendering?.quality ?? 0.85,  // WebP quality
      maxDimension: options.rendering?.maxDimension ?? 384,  // TrOCR optimal
      bounds: options.bounds
    };
    
    rendered = renderStrokesToImage(strokes, renderingOptions);
  }

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

  const result = { 
    latex, 
    confidence, 
    boxes: payload?.boxes || null, 
    raw: payload, 
    usedFallback: false,
    // Include debug info for preview
    debugImage: rendered.dataUrl,
    debugInfo: rendered.debug,
  };
  
  if (useCache) cache.set(cacheKey, result);

  setOCRStatus({ state: 'connected', message: 'Local OCR ready.' });
  return result;
};

export default { recognizeHandwriting };
