/**
 * Handwriting Synthesis Client
 * 
 * Calls the Python server's /generate_handwriting endpoint to generate
 * authentic handwritten strokes from text using RNN-based synthesis.
 */

import * as fabric from 'fabric';
import { getOCRConfig } from '../config/ocr';

const getServerUrl = () => {
  const config = getOCRConfig();
  return config.localServerUrl || 'http://localhost:8000';
};

/**
 * Generate handwritten strokes for the given text
 * 
 * @param {string} text - The text to render in handwriting
 * @param {object} options - Generation options
 * @param {number} [options.bias=0.5] - Controls randomness (0.1-1.5, lower = more uniform)
 * @param {number} [options.style] - Optional style index from training data
 * @param {number} [options.timeout=2000] - Request timeout in ms
 * @returns {Promise<{strokes: Array<{x: number, y: number, penUp: boolean}>, width: number, height: number, success: boolean, error?: string}>}
 */
export async function generateHandwriting(text, options = {}) {
  const {
    bias = 0.5,
    style = null,
    timeout = 2000
  } = options;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      strokes: [],
      width: 0,
      height: 0,
      success: false,
      error: 'Text cannot be empty'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${getServerUrl()}/generate_handwriting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        bias,
        style
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[HandwritingSynthesis] Request timeout after', timeout, 'ms');
      return {
        strokes: [],
        width: 0,
        height: 0,
        success: false,
        error: 'Timeout: Server took too long to respond'
      };
    }

    console.error('[HandwritingSynthesis] Generation failed:', error);
    return {
      strokes: [],
      width: 0,
      height: 0,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Render handwriting strokes to a fabric.js canvas
 * 
 * @param {fabric.Canvas} canvas - The fabric.js canvas instance
 * @param {Array<{x: number, y: number, penUp: boolean}>} strokes - Stroke data from generateHandwriting()
 * @param {object} options - Rendering options
 * @param {number} options.left - X position on canvas
 * @param {number} options.top - Y position on canvas
 * @param {number} [options.scale=1.0] - Scale factor for the strokes
 * @param {string} [options.color='#2563eb'] - Stroke color (default: blue)
 * @param {number} [options.strokeWidth=2] - Stroke width in pixels
 * @returns {fabric.Path} The rendered path object
 */
export function renderHandwritingToCanvas(canvas, strokes, options) {
  const {
    left,
    top,
    scale = 1.0,
    color = '#2563eb',
    strokeWidth = 2
  } = options;

  if (!strokes || strokes.length === 0) {
    throw new Error('No strokes provided');
  }

  // Build SVG path string from strokes
  const pathCommands = [];
  let currentX = strokes[0].x * scale;
  let currentY = strokes[0].y * scale;
  
  pathCommands.push(`M ${currentX} ${currentY}`);

  for (let i = 1; i < strokes.length; i++) {
    const point = strokes[i];
    const x = point.x * scale;
    const y = point.y * scale;

    if (point.penUp) {
      // Pen lifted - move without drawing
      pathCommands.push(`M ${x} ${y}`);
    } else {
      // Pen down - draw line
      pathCommands.push(`L ${x} ${y}`);
    }
  }

  const pathString = pathCommands.join(' ');

  // Create fabric.Path object
  const path = new fabric.Path(pathString, {
    left,
    top,
    stroke: color,
    strokeWidth,
    fill: null,
    selectable: false,
    evented: false,
    objectCaching: false
  });

  canvas.add(path);
  canvas.requestRenderAll();

  return path;
}

/**
 * Check if handwriting synthesis server is available
 * 
 * @param {number} [timeout=1000] - Request timeout in ms
 * @returns {Promise<boolean>} True if server is ready
 */
export async function checkHandwritingServerAvailable(timeout = 1000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${getServerUrl()}/`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;

  } catch {
    return false;
  }
}
