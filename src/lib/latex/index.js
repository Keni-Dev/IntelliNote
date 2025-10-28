/**
 * Custom SVG Math Renderer - Main Integration
 * Phase 4: Ties everything together
 * 
 * LaTeX String → Parser → Layout Engine → SVG Generator → Fabric.js Image
 */

import * as fabric from 'fabric';
import { LaTeXParser } from './latexParser.js';
import { LayoutEngine } from './layoutEngine.js';
import { SVGGenerator } from './svgGenerator.js';

/**
 * Default rendering options
 */
const DEFAULT_OPTIONS = {
  fontSize: 48,
  strokeWidth: 2,
  color: '#eab308',
  fontFamily: "'Gochi Hand', 'Kalam', cursive",
  handwritingVariance: true, // Add slight rotation to characters
  debug: false // Disable debug logging by default for better performance
};

/**
 * Render LaTeX to Fabric.js image object
 * 
 * @param {Object} options - Rendering options
 * @param {string} options.latex - LaTeX string to render
 * @param {number} [options.fontSize=48] - Base font size
 * @param {number} [options.strokeWidth=2] - Stroke width for lines
 * @param {string} [options.color='#eab308'] - Color for math symbols
 * @param {string} [options.fontFamily] - Font family for text
 * @param {boolean} [options.handwritingVariance=true] - Add handwriting effect
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {Promise<fabric.Group>} Fabric.js group object
 */
export async function renderLatexToFabric(options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Validate input
    if (!opts.latex || typeof opts.latex !== 'string') {
      throw new Error('Invalid LaTeX input: must be a non-empty string');
    }
    
    const startTime = performance.now();
    
    // Step 1: Parse LaTeX to AST
    if (opts.debug) console.log('[SVGMathRenderer] Parsing LaTeX:', opts.latex);
    const parser = new LaTeXParser(opts.latex);
    const ast = parser.parse();
    if (opts.debug) console.log('[SVGMathRenderer] AST:', ast);
    
    // Step 2: Calculate layout
    if (opts.debug) console.log('[SVGMathRenderer] Calculating layout...');
    const layoutEngine = new LayoutEngine(ast, {
      fontSize: opts.fontSize,
      strokeWidth: opts.strokeWidth,
      fontFamily: opts.fontFamily,
      color: opts.color
    });
    const layout = layoutEngine.layout();
    if (opts.debug) console.log('[SVGMathRenderer] Layout:', layout);
    
    // Step 3: Generate SVG
    if (opts.debug) console.log('[SVGMathRenderer] Generating SVG...');
    const svgGenerator = new SVGGenerator(layout, {
      fontSize: opts.fontSize,
      strokeWidth: opts.strokeWidth,
      fontFamily: opts.fontFamily,
      color: opts.color,
      handwritingVariance: opts.handwritingVariance
    });
    const svgString = svgGenerator.generate();
    if (opts.debug) {
      console.log('[SVGMathRenderer] SVG length:', svgString.length);
      console.log('[SVGMathRenderer] SVG preview:', svgString.substring(0, 500));
    }
    
    // Step 4: Convert SVG to Fabric.js Image
    if (opts.debug) console.log('[SVGMathRenderer] Converting to Fabric.js...');
    const fabricGroup = await svgToFabric(svgString, opts.debug);
    
    // Validate fabricGroup before setting properties
    if (!fabricGroup) {
      throw new Error('svgToFabric returned null/undefined');
    }
    
    // Check if fabricGroup has set method (is a proper Fabric object)
    if (typeof fabricGroup.set !== 'function') {
      console.error('[SVGMathRenderer] fabricGroup is not a valid Fabric object:', fabricGroup);
      throw new Error('svgToFabric returned invalid Fabric object');
    }
    
    // Set properties
    fabricGroup.set({
      erasable: true,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: 'math-answer'
    });
    
    const endTime = performance.now();
    if (opts.debug) {
      console.log(`[SVGMathRenderer] Rendered in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return fabricGroup;
    
  } catch (error) {
    console.error('[SVGMathRenderer] Rendering error:', error);
    
    // Try fallback: simple text rendering
    if (opts.debug) console.log('[SVGMathRenderer] Attempting fallback...');
    return createFallbackText(opts.latex, opts);
  }
}

/**
 * Convert SVG string to Fabric.js group
 * 
 * @param {string} svgString - SVG markup
 * @param {boolean} debug - Enable debug logging
 * @returns {Promise<fabric.Group>} Fabric.js group
 */
function svgToFabric(svgString, debug = false) {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgEl = svgDoc?.documentElement;
      if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
        reject(new Error('Invalid SVG markup'));
        return;
      }

      const fabricObjects = extractFabricObjectsFromSvg(svgEl, debug);

      if (fabricObjects.length === 0) {
        reject(new Error('No renderable elements found in SVG'));
        return;
      }

      let result;
      if (fabricObjects.length === 1) {
        result = fabricObjects[0];
      } else {
        result = new fabric.Group(fabricObjects, {
          subTargetCheck: true,
          originX: 'left',
          originY: 'top'
        });
      }

      if (debug) {
        console.log('[SVGMathRenderer] Fabric object created:', {
          type: result?.type,
          width: result?.width,
          height: result?.height,
          angle: result?.angle
        });
      }

      resolve(result);
    } catch (error) {
      console.error('[SVGMathRenderer] Error parsing SVG:', error);
      reject(error);
    }
  });
}

function extractFabricObjectsFromSvg(svgEl, debug = false) {
  const objects = [];

  const walk = (node) => {
    if (!node || node.nodeType !== 1) {
      return;
    }

    const tag = (node.tagName || '').toLowerCase();

    if (tag === 'g') {
      Array.from(node.childNodes).forEach(child => walk(child));
      return;
    }

    const obj = convertSvgElementToFabric(node, debug);
    if (obj) {
      objects.push(obj);
    }
  };

  Array.from(svgEl.childNodes).forEach(child => walk(child));

  return objects;
}

function convertSvgElementToFabric(element, debug = false) {
  const tag = (element.tagName || '').toLowerCase();

  switch (tag) {
    case 'text':
      return createFabricText(element, debug);
    case 'line':
      return createFabricLine(element, debug);
    case 'path':
      return createFabricPath(element, debug);
    default:
      if (debug) {
        console.log('[SVGMathRenderer] Unsupported SVG element skipped:', tag);
      }
      return null;
  }
}

function createFabricText(element, debug = false) {
  const value = element.textContent || '';
  if (!value.trim()) {
    return null;
  }

  const x = parseFloat(element.getAttribute('x')) || 0;
  const y = parseFloat(element.getAttribute('y')) || 0;
  const fontSize = parseFloat(element.getAttribute('font-size')) || DEFAULT_OPTIONS.fontSize;
  const fontFamily = element.getAttribute('font-family') || DEFAULT_OPTIONS.fontFamily;
  const fill = element.getAttribute('fill') || DEFAULT_OPTIONS.color;

  const text = new fabric.Text(value, {
    left: x,
    top: y,
    fontSize,
    fontFamily,
    fill,
    originX: 'left',
    originY: 'top'
  });

  applyTransformAttributes(text, element, debug);
  text.setCoords();

  return text;
}

function createFabricLine(element, debug = false) {
  const x1 = parseFloat(element.getAttribute('x1')) || 0;
  const y1 = parseFloat(element.getAttribute('y1')) || 0;
  const x2 = parseFloat(element.getAttribute('x2')) || 0;
  const y2 = parseFloat(element.getAttribute('y2')) || 0;
  const stroke = element.getAttribute('stroke') || DEFAULT_OPTIONS.color;
  const strokeWidth = parseFloat(element.getAttribute('stroke-width')) || DEFAULT_OPTIONS.strokeWidth;
  const strokeLinecap = element.getAttribute('stroke-linecap') || 'round';
  const strokeLinejoin = element.getAttribute('stroke-linejoin') || 'round';

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);

  const line = new fabric.Line([x1 - left, y1 - top, x2 - left, y2 - top], {
    left,
    top,
    stroke,
    strokeWidth,
    strokeLineCap: strokeLinecap,
    strokeLineJoin: strokeLinejoin,
    originX: 'left',
    originY: 'top'
  });

  applyTransformAttributes(line, element, debug);
  line.setCoords();

  return line;
}

function createFabricPath(element, debug = false) {
  const pathData = element.getAttribute('d');
  if (!pathData) {
    return null;
  }

  const fillAttr = element.getAttribute('fill');
  const stroke = element.getAttribute('stroke') || DEFAULT_OPTIONS.color;
  const strokeWidth = parseFloat(element.getAttribute('stroke-width')) || DEFAULT_OPTIONS.strokeWidth;
  const strokeLinecap = element.getAttribute('stroke-linecap') || 'round';
  const strokeLinejoin = element.getAttribute('stroke-linejoin') || 'round';

  const path = new fabric.Path(pathData, {
    fill: fillAttr && fillAttr !== 'none' ? fillAttr : undefined,
    stroke,
    strokeWidth,
    strokeLineCap: strokeLinecap,
    strokeLineJoin: strokeLinejoin,
    originX: 'left',
    originY: 'top'
  });

  applyTransformAttributes(path, element, debug);
  path.setCoords();

  return path;
}

function applyTransformAttributes(object, element, debug = false) {
  const transform = element.getAttribute('transform');
  if (!transform) {
    return;
  }

  const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:\s*,?\s*[-\d.]+)?(?:\s*,?\s*[-\d.]+)?\)/);
  if (rotateMatch) {
    const angle = parseFloat(rotateMatch[1]) || 0;

    object.rotate(angle);
  }

  const translateMatch = transform.match(/translate\(([-\d.]+)(?:\s*,?\s*([-\d.]+))?\)/);
  if (translateMatch) {
    const tx = parseFloat(translateMatch[1]) || 0;
    const ty = translateMatch[2] !== undefined ? parseFloat(translateMatch[2]) : 0;

    const currentLeft = object.left ?? 0;
    const currentTop = object.top ?? 0;

    object.set({
      left: currentLeft + tx,
      top: currentTop + ty
    });
  }

  if (debug) {
    console.log('[SVGMathRenderer] Applied transform:', transform, '->', {
      left: object.left,
      top: object.top,
      angle: object.angle
    });
  }
}

/**
 * Create fallback text object when rendering fails
 * 
 * @param {string} latex - LaTeX string
 * @param {Object} options - Rendering options
 * @returns {fabric.Text} Fabric.js text object
 */
function createFallbackText(latex, options) {
  const text = new fabric.Text(latex, {
    fontSize: options.fontSize,
    fill: options.color,
    fontFamily: options.fontFamily,
    erasable: true,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    name: 'math-answer-fallback'
  });
  
  return Promise.resolve(text);
}

/**
 * Render LaTeX and add to canvas at position
 * 
 * @param {fabric.Canvas} canvas - Fabric.js canvas
 * @param {Object} options - Rendering options (same as renderLatexToFabric)
 * @param {number} options.left - X position on canvas
 * @param {number} options.top - Y position on canvas
 * @returns {Promise<fabric.Group>} Added fabric object
 */
export async function renderLatexToCanvas(canvas, options) {
  if (!canvas) {
    throw new Error('Canvas is required');
  }
  
  const { left, top, ...renderOptions } = options;
  
  const fabricObj = await renderLatexToFabric(renderOptions);
  
  // Set position
  if (left !== undefined) fabricObj.set({ left });
  if (top !== undefined) fabricObj.set({ top });
  
  // Add to canvas
  canvas.add(fabricObj);
  canvas.requestRenderAll();
  
  return fabricObj;
}

/**
 * Test function to verify rendering works
 * 
 * @param {string} latex - LaTeX to test
 * @returns {Promise<string>} SVG string
 */
export async function testRender(latex) {
  try {
    const parser = new LaTeXParser(latex);
    const ast = parser.parse();
    console.log('AST:', JSON.stringify(ast, null, 2));
    
    const layoutEngine = new LayoutEngine(ast, {
      fontSize: 48,
      strokeWidth: 2
    });
    const layout = layoutEngine.layout();
    console.log('Layout:', JSON.stringify(layout, null, 2));
    
    const svgGenerator = new SVGGenerator(layout, {
      fontSize: 48,
      strokeWidth: 2,
      color: '#eab308'
    });
    const svg = svgGenerator.generate();
    console.log('SVG:', svg);
    
    return svg;
  } catch (error) {
    console.error('Test render error:', error);
    throw error;
  }
}

/**
 * Export all for advanced usage
 */
export {
  LaTeXParser,
  LayoutEngine,
  SVGGenerator
};

export default renderLatexToFabric;
