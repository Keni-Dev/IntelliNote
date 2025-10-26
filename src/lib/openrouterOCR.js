import { getOCRConfig, getCredentials, getOCRCache, setOCRStatus, createStrokeSignature } from '../config/ocr';

// Render strokes to a cropped PNG data URL for vision models
const renderStrokesToImage = (strokes = [], options = {}) => {
  const padding = options.padding ?? 16;
  const lineWidth = options.lineWidth ?? 3;
  const scale = options.scale ?? 1;

  if (!Array.isArray(strokes) || strokes.length === 0) return null;

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const normalized = strokes.map((stroke) => {
    const pts = stroke?.points || stroke?.strokePoints || [];
    const points = pts.map((p) => ({ x: Number(p.x ?? p[0] ?? 0), y: Number(p.y ?? p[1] ?? 0) }));
    points.forEach(({ x, y }) => {
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    });
    return points;
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

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

  return canvas.toDataURL('image/png');
};

const extractContent = (payload) => {
  try {
    const content = payload?.choices?.[0]?.message?.content || '';
    if (typeof content !== 'string') return '';
    // Heuristically strip markdown fences or prefixes
    const stripped = content.trim()
      .replace(/^```(latex|tex)?/i, '')
      .replace(/```$/i, '')
      .replace(/^\\\[(.*)\\\]$/s, '$1')
      .trim();
    return stripped;
  } catch {
    return '';
  }
};

export const recognizeHandwriting = async (strokes, options = {}) => {
  const config = getOCRConfig();
  const creds = getCredentials();
  const cache = options.cache || getOCRCache();
  const cacheKey = options.cacheKey || createStrokeSignature(strokes);

  if (!Array.isArray(strokes) || strokes.length === 0) return null;

  if (!creds.openrouterApiKey) {
    return { latex: '', confidence: 0, error: 'Missing OpenRouter API key. Set VITE_OPENROUTER_API_KEY or add it in OCR Settings.', usedFallback: true };
  }

  const useCache = config.cacheEnabled && !options.bypassCache;
  if (useCache && cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), cached: true };
  }

  const dataUrl = renderStrokesToImage(strokes, options.rendering || { padding: 16, lineWidth: 3, scale: 1 });
  if (!dataUrl) {
    return { latex: '', confidence: 0, error: 'Unable to render strokes for OCR.', usedFallback: true };
  }

  const model = config.openrouterOCRModel || 'openai/gpt-4o-mini';

  setOCRStatus({ state: 'pending', message: 'Contacting OpenRouter…' });

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.openrouterApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a precise LaTeX OCR for handwritten math. Return ONLY the LaTeX. If there is no math, return NONE.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe this handwritten equation into LaTeX. Only return LaTeX, nothing else.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0,
      }),
    });
  } catch (networkError) {
    setOCRStatus({ state: 'error', message: 'Unable to reach OpenRouter.', details: networkError.message });
    return { latex: '', confidence: 0, error: networkError.message || 'Network error', usedFallback: true };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (parseError) {
    setOCRStatus({ state: 'error', message: 'Unable to parse OpenRouter response.', details: parseError.message });
    return { latex: '', confidence: 0, error: parseError.message || 'Parse error', usedFallback: true };
  }

  if (!response.ok) {
    const msg = payload?.error?.message || `OpenRouter request failed with status ${response.status}`;
    setOCRStatus({ state: 'error', message: msg, code: response.status });
    return { latex: '', confidence: 0, error: msg, usedFallback: true, raw: payload };
  }

  const content = extractContent(payload);
  const latex = (content || '').trim();
  const hasMath = latex && latex.toUpperCase() !== 'NONE';
  // Confidence is heuristic here; you can refine based on model logprobs when available
  const confidence = hasMath ? 0.75 : 0.0;

  const result = { latex: hasMath ? latex : '', confidence, raw: payload, usedFallback: false };

  if (useCache) cache.set(cacheKey, result);

  setOCRStatus({ state: 'connected', message: 'Cloud OCR ready.' });
  return result;
};

export default {
  recognizeHandwriting,
};
