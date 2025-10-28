/**
 * Debug Logging Utility
 * 
 * Centralized debug logging based on environment variables.
 * Each debug category can be enabled/disabled via .env file.
 * 
 * Usage:
 *   import { debugLog } from './debugLogger';
 *   debugLog('CANVAS', 'Drawing started', { x: 100, y: 200 });
 *   debugLog('MATH_SOLVER', 'Solving equation:', equation);
 */

// Check if master debug is enabled
const DEBUG_ALL = import.meta.env.VITE_DEBUG_ALL === 'true';

// Debug flag mappings
const DEBUG_FLAGS = {
  // Canvas Operations
  CANVAS: import.meta.env.VITE_DEBUG_CANVAS === 'true' || DEBUG_ALL,
  CANVAS_HISTORY: import.meta.env.VITE_DEBUG_CANVAS_HISTORY === 'true' || DEBUG_ALL,
  CANVAS_OPTIMIZER: import.meta.env.VITE_DEBUG_CANVAS_OPTIMIZER === 'true' || DEBUG_ALL,
  
  // Drawing Tools
  BRUSH: import.meta.env.VITE_DEBUG_BRUSH === 'true' || DEBUG_ALL,
  ERASER: import.meta.env.VITE_DEBUG_ERASER === 'true' || DEBUG_ALL,
  SHAPES: import.meta.env.VITE_DEBUG_SHAPES === 'true' || DEBUG_ALL,
  
  // Handwriting Detection & Recognition
  HANDWRITING: import.meta.env.VITE_DEBUG_HANDWRITING === 'true' || DEBUG_ALL,
  EQUALSIGN: import.meta.env.VITE_DEBUG_EQUALSIGN === 'true' || DEBUG_ALL,
  STROKE_ANALYZER: import.meta.env.VITE_DEBUG_STROKE_ANALYZER === 'true' || DEBUG_ALL,
  SPATIAL_CONTEXT: import.meta.env.VITE_DEBUG_SPATIAL_CONTEXT === 'true' || DEBUG_ALL,
  SPATIAL_HASH_GRID: import.meta.env.VITE_DEBUG_SPATIAL_HASH_GRID === 'true' || DEBUG_ALL,
  
  // OCR (Optical Character Recognition)
  OCR: import.meta.env.VITE_DEBUG_OCR === 'true' || DEBUG_ALL,
  OCR_CONFIG: import.meta.env.VITE_DEBUG_OCR_CONFIG === 'true' || DEBUG_ALL,
  OCR_PERFORMANCE: import.meta.env.VITE_DEBUG_OCR_PERFORMANCE === 'true' || DEBUG_ALL,
  LOCAL_OCR: import.meta.env.VITE_DEBUG_LOCAL_OCR === 'true' || DEBUG_ALL,
  OPENROUTER_OCR: import.meta.env.VITE_DEBUG_OPENROUTER_OCR === 'true' || DEBUG_ALL,
  OCR_LEARNING: import.meta.env.VITE_DEBUG_OCR_LEARNING === 'true' || DEBUG_ALL,
  OCR_CACHE: import.meta.env.VITE_DEBUG_OCR_CACHE === 'true' || DEBUG_ALL,
  
  // Math Recognition & Solving
  MATH_DETECTION: import.meta.env.VITE_DEBUG_MATH_DETECTION === 'true' || DEBUG_ALL,
  MATH_SOLVER: import.meta.env.VITE_DEBUG_MATH_SOLVER === 'true' || DEBUG_ALL,
  MATH_ENGINE: import.meta.env.VITE_DEBUG_MATH_ENGINE === 'true' || DEBUG_ALL,
  SMART_MATH_SOLVER: import.meta.env.VITE_DEBUG_SMART_MATH_SOLVER === 'true' || DEBUG_ALL,
  MATH_SIZE_MATCHING: import.meta.env.VITE_DEBUG_MATH_SIZE_MATCHING === 'true' || DEBUG_ALL,
  
  // UI Components
  RESIZE_BOX: import.meta.env.VITE_DEBUG_RESIZE_BOX === 'true' || DEBUG_ALL,
  RECOGNIZE_EQUATION: import.meta.env.VITE_DEBUG_RECOGNIZE_EQUATION === 'true' || DEBUG_ALL,
  MATH_SOLUTION_DISPLAY: import.meta.env.VITE_DEBUG_MATH_SOLUTION_DISPLAY === 'true' || DEBUG_ALL,
  CORRECTION_MODAL: import.meta.env.VITE_DEBUG_CORRECTION_MODAL === 'true' || DEBUG_ALL,
  
  // Symbol & Formula Processing
  SYMBOL_POST_PROCESSING: import.meta.env.VITE_DEBUG_SYMBOL_POST_PROCESSING === 'true' || DEBUG_ALL,
  FORMULA_PATTERNS: import.meta.env.VITE_DEBUG_FORMULA_PATTERNS === 'true' || DEBUG_ALL,
  CONTEXTUAL_CORRECTION: import.meta.env.VITE_DEBUG_CONTEXTUAL_CORRECTION === 'true' || DEBUG_ALL,
  
  // IndexedDB & Storage
  INDEXEDDB: import.meta.env.VITE_DEBUG_INDEXEDDB === 'true' || DEBUG_ALL,
  DB: import.meta.env.VITE_DEBUG_DB === 'true' || DEBUG_ALL,
  
  // Performance & Optimization
  PERFORMANCE: import.meta.env.VITE_DEBUG_PERFORMANCE === 'true' || DEBUG_ALL,
  VIRTUAL_CANVAS: import.meta.env.VITE_DEBUG_VIRTUAL_CANVAS === 'true' || DEBUG_ALL,
};

/**
 * Check if a debug category is enabled
 * @param {string} category - Debug category name
 * @returns {boolean} - True if debug is enabled for this category
 */
export function isDebugEnabled(category) {
  return DEBUG_FLAGS[category] === true;
}

/**
 * Log a debug message if the category is enabled
 * @param {string} category - Debug category name
 * @param {...any} args - Arguments to log
 */
export function debugLog(category, ...args) {
  if (isDebugEnabled(category)) {
    console.log(`[${category}]`, ...args);
  }
}

/**
 * Log a debug warning if the category is enabled
 * @param {string} category - Debug category name
 * @param {...any} args - Arguments to log
 */
export function debugWarn(category, ...args) {
  if (isDebugEnabled(category)) {
    console.warn(`[${category}]`, ...args);
  }
}

/**
 * Log a debug error if the category is enabled
 * @param {string} category - Debug category name
 * @param {...any} args - Arguments to log
 */
export function debugError(category, ...args) {
  if (isDebugEnabled(category)) {
    console.error(`[${category}]`, ...args);
  }
}

/**
 * Log debug timing information if the category is enabled
 * @param {string} category - Debug category name
 * @param {string} label - Timer label
 * @returns {function} - Function to call to end timing
 */
export function debugTime(category, label) {
  if (isDebugEnabled(category)) {
    const fullLabel = `[${category}] ${label}`;
    console.time(fullLabel);
    return () => console.timeEnd(fullLabel);
  }
  return () => {}; // No-op
}

/**
 * Get all enabled debug flags
 * @returns {string[]} - Array of enabled debug category names
 */
export function getEnabledDebugFlags() {
  return Object.keys(DEBUG_FLAGS).filter(key => DEBUG_FLAGS[key]);
}

/**
 * Print debug configuration summary
 */
export function printDebugConfig() {
  const enabled = getEnabledDebugFlags();
  if (enabled.length === 0) {
    console.log('[DEBUG] No debug flags enabled');
  } else if (DEBUG_ALL) {
    console.log('[DEBUG] ALL debug flags enabled');
  } else {
    console.log('[DEBUG] Enabled flags:', enabled.join(', '));
  }
}

// Export individual flags for conditional rendering
export const DEBUG = DEBUG_FLAGS;

export default {
  isDebugEnabled,
  debugLog,
  debugWarn,
  debugError,
  debugTime,
  getEnabledDebugFlags,
  printDebugConfig,
  DEBUG,
};
