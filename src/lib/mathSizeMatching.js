/**
 * Math Size Matching Algorithm
 * 
 * Calculates scale factor to match handwritten input size to rendered output size
 * (like Apple Notes handwritten math behavior)
 * 
 * Strategy:
 * 1. Analyze input strokes to extract character bounding boxes
 * 2. Identify core symbols (numbers, letters) vs decorators (exponents, subscripts)
 * 3. Compute weighted average height of core symbols
 * 4. Measure corresponding output LaTeX character heights
 * 5. Calculate scale factor: inputAvgHeight / outputAvgHeight
 * 
 * Special handling:
 * - Ignore superscripts/subscripts (they're intentionally smaller)
 * - Weight fractions by denominator size
 * - Use median instead of mean to handle outliers
 * - Clamp scale factor to reasonable range (0.5x - 3.0x)
 */

/**
 * Extract bounding boxes from canvas strokes
 * @param {Array} strokes - Array of stroke objects with points
 * @returns {Array} Array of bounding boxes {x, y, width, height}
 */
export function extractStrokeBounds(strokes) {
  if (!strokes || strokes.length === 0) return [];
  
  return strokes.map(stroke => {
    if (!stroke.points || stroke.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    stroke.points.forEach(point => {
      const x = point.x || point[0];
      const y = point.y || point[1];
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  });
}

/**
 * Group strokes into character clusters based on proximity
 * @param {Array} bounds - Array of bounding boxes
 * @param {number} threshold - Distance threshold for grouping (default: 20px)
 * @returns {Array} Array of character clusters
 */
export function groupIntoCharacters(bounds, threshold = 20) {
  if (bounds.length === 0) return [];
  
  // Sort by x position (left to right)
  const sorted = [...bounds].sort((a, b) => a.x - b.x);
  
  const clusters = [];
  let currentCluster = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = currentCluster[currentCluster.length - 1];
    const curr = sorted[i];
    
    // Check if current stroke is close to previous cluster
    const distance = curr.x - (prev.x + prev.width);
    
    if (distance < threshold) {
      currentCluster.push(curr);
    } else {
      // Start new cluster
      clusters.push(mergeBounds(currentCluster));
      currentCluster = [curr];
    }
  }
  
  // Add last cluster
  if (currentCluster.length > 0) {
    clusters.push(mergeBounds(currentCluster));
  }
  
  return clusters;
}

/**
 * Merge multiple bounding boxes into one
 */
function mergeBounds(bounds) {
  if (bounds.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  if (bounds.length === 1) return bounds[0];
  
  const minX = Math.min(...bounds.map(b => b.x));
  const minY = Math.min(...bounds.map(b => b.y));
  const maxX = Math.max(...bounds.map(b => b.x + b.width));
  const maxY = Math.max(...bounds.map(b => b.y + b.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Filter out decorators (superscripts, subscripts) based on vertical position
 * @param {Array} characters - Character bounding boxes
 * @returns {Object} { core: [], superscripts: [], subscripts: [] }
 */
export function categorizeCharacters(characters) {
  if (characters.length === 0) {
    return { core: [], superscripts: [], subscripts: [] };
  }
  
  // Calculate median y position and height
  const yPositions = characters.map(c => c.y);
  const heights = characters.map(c => c.height);
  
  const medianY = median(yPositions);
  const medianHeight = median(heights);
  
  const core = [];
  const superscripts = [];
  const subscripts = [];
  
  characters.forEach(char => {
    const relativeY = char.y - medianY;
    const relativeHeight = char.height / medianHeight;
    
    // Superscript: significantly above baseline and smaller
    if (relativeY < -medianHeight * 0.3 && relativeHeight < 0.7) {
      superscripts.push(char);
    }
    // Subscript: significantly below baseline and smaller
    else if (relativeY > medianHeight * 0.3 && relativeHeight < 0.7) {
      subscripts.push(char);
    }
    // Core character
    else {
      core.push(char);
    }
  });
  
  return { core, superscripts, subscripts };
}

/**
 * Calculate average height of core characters (ignoring outliers)
 * @param {Array} characters - Core character bounding boxes
 * @returns {number} Average height in pixels
 */
export function calculateAverageHeight(characters) {
  if (characters.length === 0) return 0;
  
  const heights = characters.map(c => c.height);
  
  // Use median to be robust against outliers
  return median(heights);
}

/**
 * Measure rendered LaTeX character height
 * @param {string} latex - LaTeX expression
 * @param {string} fontFamily - Font family to measure with
 * @param {number} baseFontSize - Base font size in pixels (default: 16)
 * @returns {number} Average character height in pixels
 */
export function measureLatexHeight(latex, fontFamily = 'Gochi Hand, cursive', baseFontSize = 16) {
  // Create temporary measurement div
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'absolute';
  measureDiv.style.visibility = 'hidden';
  measureDiv.style.fontSize = `${baseFontSize}px`;
  measureDiv.style.fontFamily = fontFamily;
  measureDiv.style.whiteSpace = 'nowrap';
  document.body.appendChild(measureDiv);
  
  // Extract plain characters from LaTeX (simplified)
  const plainText = latex
    .replace(/\\[a-zA-Z]+/g, '') // Remove LaTeX commands
    .replace(/[{}^_]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove whitespace
    .trim();
  
  if (plainText.length === 0) {
    document.body.removeChild(measureDiv);
    return baseFontSize * 0.8; // Default height
  }
  
  // Measure individual characters
  const heights = [];
  
  for (const char of plainText) {
    measureDiv.textContent = char;
    const height = measureDiv.offsetHeight;
    if (height > 0) heights.push(height);
  }
  
  document.body.removeChild(measureDiv);
  
  return heights.length > 0 ? median(heights) : baseFontSize * 0.8;
}

/**
 * Calculate scale factor to match input drawing size to output size
 * @param {Array} inputStrokes - Canvas strokes from user input
 * @param {string} outputLatex - LaTeX expression to render
 * @param {Object} options - Configuration options
 * @returns {number} Scale factor (1.0 = no scaling, 2.0 = 2x larger, etc.)
 */
export function calculateScaleFactor(inputStrokes, outputLatex, options = {}) {
  const {
    minScale = 0.5,
    maxScale = 3.0,
    defaultScale = 1.0,
    fontFamily = 'Gochi Hand, cursive',
    baseFontSize = 16,
    groupingThreshold = 20,
  } = options;
  
  // Validate inputs
  if (!inputStrokes || inputStrokes.length === 0) {
    return defaultScale;
  }
  
  if (!outputLatex || outputLatex.trim() === '') {
    return defaultScale;
  }
  
  try {
    // Step 1: Extract stroke bounding boxes
    const strokeBounds = extractStrokeBounds(inputStrokes);
    
    if (strokeBounds.length === 0) {
      return defaultScale;
    }
    
    // Step 2: Group strokes into characters
    const characters = groupIntoCharacters(strokeBounds, groupingThreshold);
    
    if (characters.length === 0) {
      return defaultScale;
    }
    
    // Step 3: Categorize into core vs decorators
    const { core } = categorizeCharacters(characters);
    
    if (core.length === 0) {
      // No core characters, use all characters
      const avgInputHeight = calculateAverageHeight(characters);
      const outputHeight = measureLatexHeight(outputLatex, fontFamily, baseFontSize);
      
      if (outputHeight === 0) return defaultScale;
      
      const scale = avgInputHeight / outputHeight;
      return clamp(scale, minScale, maxScale);
    }
    
    // Step 4: Calculate average input height (core only)
    const avgInputHeight = calculateAverageHeight(core);
    
    // Step 5: Measure output LaTeX height
    const outputHeight = measureLatexHeight(outputLatex, fontFamily, baseFontSize);
    
    if (outputHeight === 0 || avgInputHeight === 0) {
      return defaultScale;
    }
    
    // Step 6: Calculate scale factor
    const scale = avgInputHeight / outputHeight;
    
    // Step 7: Clamp to reasonable range
    return clamp(scale, minScale, maxScale);
    
  } catch (error) {
    console.warn('Error calculating scale factor:', error);
    return defaultScale;
  }
}

/**
 * Calculate scale factor from canvas element
 * @param {HTMLCanvasElement} canvas - Canvas with handwritten input
 * @param {string} outputLatex - LaTeX to render
 * @param {Object} options - Configuration options
 * @returns {number} Scale factor
 */
export function calculateScaleFromCanvas(canvas, outputLatex, options = {}) {
  if (!canvas) return options.defaultScale || 1.0;
  
  // Extract strokes from canvas (this depends on your canvas implementation)
  // For now, return a simplified version based on canvas dimensions
  const canvasHeight = canvas.height;
  const estimatedCharHeight = canvasHeight * 0.6; // Assume chars are ~60% of canvas
  
  const outputHeight = measureLatexHeight(
    outputLatex, 
    options.fontFamily || 'Gochi Hand, cursive',
    options.baseFontSize || 16
  );
  
  if (outputHeight === 0) return options.defaultScale || 1.0;
  
  const scale = estimatedCharHeight / outputHeight;
  
  return clamp(
    scale,
    options.minScale || 0.5,
    options.maxScale || 3.0
  );
}

/**
 * Smart scale calculation with multiple heuristics
 * @param {Object} context - Recognition context
 * @returns {number} Recommended scale factor
 */
export function smartScale(context) {
  const {
    strokes = [],
    latex = '',
    canvasWidth = 0,
    canvasHeight = 0,
    options = {},
  } = context;
  
  // Method 1: Stroke-based calculation
  let strokeScale = 1.0;
  if (strokes.length > 0 && latex) {
    strokeScale = calculateScaleFactor(strokes, latex, options);
  }
  
  // Method 2: Canvas dimension heuristic
  let canvasScale = 1.0;
  if (canvasHeight > 0) {
    const avgCharHeight = canvasHeight * 0.5; // Heuristic: chars are ~50% of canvas
    const baseOutputHeight = options.baseFontSize || 16;
    canvasScale = avgCharHeight / baseOutputHeight;
    canvasScale = clamp(canvasScale, 0.5, 3.0);
  }
  
  // Method 3: Content complexity adjustment
  let complexityFactor = 1.0;
  if (latex) {
    const hasFractions = latex.includes('\\frac');
    const hasSqrt = latex.includes('\\sqrt');
    const hasIntegral = latex.includes('\\int');
    const hasSummation = latex.includes('\\sum');
    
    // Complex expressions might need slightly smaller scale
    if (hasFractions || hasSqrt || hasIntegral || hasSummation) {
      complexityFactor = 0.9;
    }
  }
  
  // Combine methods (weighted average)
  const weights = {
    stroke: 0.6,
    canvas: 0.3,
    complexity: 0.1,
  };
  
  const finalScale = 
    strokeScale * weights.stroke +
    canvasScale * weights.canvas +
    complexityFactor * weights.complexity;
  
  return clamp(finalScale, options.minScale || 0.5, options.maxScale || 3.0);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate median of array
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Remove outliers using IQR method
 */
export function removeOutliers(arr) {
  if (arr.length < 4) return arr;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return arr.filter(val => val >= lowerBound && val <= upperBound);
}

export default {
  extractStrokeBounds,
  groupIntoCharacters,
  categorizeCharacters,
  calculateAverageHeight,
  measureLatexHeight,
  calculateScaleFactor,
  calculateScaleFromCanvas,
  smartScale,
  removeOutliers,
};
