/**
 * Spatial Context Helper
 * 
 * Provides spatial awareness for canvas objects, enabling context-aware
 * mathematical solving by finding related equations and text based on
 * proximity on the canvas.
 */

/**
 * Calculate Euclidean distance between two points
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Get the center point of a canvas object
 */
function getObjectCenter(obj) {
  return {
    x: obj.left + (obj.width || 0) / 2,
    y: obj.top + (obj.height || 0) / 2
  };
}

/**
 * Check if an object is a text or math object
 */
function isTextObject(obj) {
  return obj.type === 'text' || 
         obj.type === 'i-text' || 
         obj.type === 'textbox' ||
         (obj.customType === 'mathEquation') ||
         (obj.customType === 'mathSolution');
}

/**
 * Extract text content from a canvas object
 */
function extractTextContent(obj) {
  if (obj.text) return obj.text;
  if (obj.equation) return obj.equation;
  if (obj.result) return obj.result;
  return '';
}

/**
 * Find nearby objects within a given radius
 * 
 * @param {Object} targetObject - The reference object (with left, top, width, height)
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {number} radius - Search radius in pixels (default: 300)
 * @returns {Array} Array of nearby objects with their distances
 */
export function getNearbyObjects(targetObject, canvas, radius = 300) {
  if (!canvas || !targetObject) return [];
  
  const targetCenter = getObjectCenter(targetObject);
  const nearby = [];
  
  const objects = canvas.getObjects();
  
  objects.forEach(obj => {
    // Skip the target object itself
    if (obj === targetObject) return;
    
    // Only consider text and math objects
    if (!isTextObject(obj)) return;
    
    const objCenter = getObjectCenter(obj);
    const dist = distance(targetCenter.x, targetCenter.y, objCenter.x, objCenter.y);
    
    if (dist <= radius) {
      nearby.push({
        object: obj,
        distance: dist,
        center: objCenter
      });
    }
  });
  
  // Sort by distance (closest first)
  nearby.sort((a, b) => a.distance - b.distance);
  
  return nearby;
}

/**
 * Extract all text content from a circular area on the canvas
 * 
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {number} x - Center X coordinate
 * @param {number} y - Center Y coordinate
 * @param {number} radius - Search radius in pixels (default: 300)
 * @returns {Array} Array of text content with positions
 */
export function extractTextFromArea(canvas, x, y, radius = 300) {
  if (!canvas) return [];
  
  const textItems = [];
  const objects = canvas.getObjects();
  
  objects.forEach(obj => {
    if (!isTextObject(obj)) return;
    
    const objCenter = getObjectCenter(obj);
    const dist = distance(x, y, objCenter.x, objCenter.y);
    
    if (dist <= radius) {
      const content = extractTextContent(obj);
      if (content && content.trim()) {
        textItems.push({
          text: content,
          distance: dist,
          position: objCenter,
          object: obj,
          type: obj.customType || obj.type
        });
      }
    }
  });
  
  // Sort by distance
  textItems.sort((a, b) => a.distance - b.distance);
  
  return textItems;
}

/**
 * Extract equations (text containing '=') from area
 */
export function extractEquationsFromArea(canvas, x, y, radius = 300) {
  const textItems = extractTextFromArea(canvas, x, y, radius);
  return textItems.filter(item => item.text.includes('='));
}

/**
 * Build a solving context from a canvas area
 * Uses the mathEngine to extract variables and formulas
 * 
 * @param {Object} mathEngine - MathEngine instance
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {Object} position - {x, y} center position
 * @param {number} radius - Search radius (default: 300)
 * @returns {Object} Context object with variables, formulas, and equations
 */
export function buildContextFromArea(mathEngine, canvas, position, radius = 300) {
  const { x, y } = position;
  
  // Get nearby text and equations
  const textItems = extractTextFromArea(canvas, x, y, radius);
  const equations = textItems.filter(item => item.text.includes('='));
  
  // Build context object
  const context = {
    variables: new Map(),
    formulas: new Map(),
    equations: [],
    nearbyText: textItems,
    position: { x, y },
    radius
  };
  
  // Extract variables and formulas from nearby equations
  equations.forEach(item => {
    const equation = item.text.trim();
    
    // Check if it's a simple assignment (variable = value)
    const assignmentMatch = equation.match(/^([a-zA-Z_]\w*)\s*=\s*([^=]+)$/);
    if (assignmentMatch) {
      const [, varName, value] = assignmentMatch;
      
      // Try to evaluate the value
      try {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          context.variables.set(varName, {
            value: numValue,
            source: item.object,
            distance: item.distance,
            raw: value
          });
        } else {
          // It might be a formula
          context.formulas.set(varName, {
            expression: value.trim(),
            source: item.object,
            distance: item.distance
          });
        }
      } catch {
        // Store as formula if can't parse as number
        context.formulas.set(varName, {
          expression: value.trim(),
          source: item.object,
          distance: item.distance
        });
      }
    } else {
      // Store as general equation
      context.equations.push({
        equation,
        source: item.object,
        distance: item.distance
      });
    }
  });
  
  return context;
}

/**
 * Find all math-related objects on the canvas
 */
export function findAllMathObjects(canvas) {
  if (!canvas) return [];
  
  return canvas.getObjects().filter(obj => 
    obj.customType === 'mathEquation' || 
    obj.customType === 'mathSolution' ||
    (isTextObject(obj) && extractTextContent(obj).includes('='))
  );
}

/**
 * Create a highlighting overlay for referenced equations
 * Returns overlay config objects that can be used to create fabric objects
 */
export function createHighlightOverlay(objects, color = 'rgba(59, 130, 246, 0.3)') {
  const overlays = [];
  
  objects.forEach(obj => {
    const overlay = {
      left: obj.left - 10,
      top: obj.top - 10,
      width: (obj.width || 100) + 20,
      height: (obj.height || 50) + 20,
      fill: color,
      stroke: color.replace('0.3', '0.8'),
      strokeWidth: 2,
      selectable: false,
      evented: false,
      rx: 8,
      ry: 8
    };
    
    overlays.push(overlay);
  });
  
  return overlays;
}

/**
 * Get spatial relationship description
 */
export function getRelationshipDescription(sourceObj, targetObj) {
  const sourceCenter = getObjectCenter(sourceObj);
  const targetCenter = getObjectCenter(targetObj);
  
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  
  // Determine direction
  let direction = '';
  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? 'to the right' : 'to the left';
  } else {
    direction = dy > 0 ? 'below' : 'above';
  }
  
  return {
    distance: Math.round(dist),
    direction,
    description: `${Math.round(dist)}px ${direction}`
  };
}

export default {
  getNearbyObjects,
  extractTextFromArea,
  extractEquationsFromArea,
  buildContextFromArea,
  findAllMathObjects,
  createHighlightOverlay,
  getRelationshipDescription
};
