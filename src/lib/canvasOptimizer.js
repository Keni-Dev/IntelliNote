/**
 * Canvas Performance Optimizer
 * 
 * Provides utilities to optimize Fabric.js canvas performance with many objects:
 * - Batched rendering
 * - Viewport culling
 * - Object simplification
 * - Memory management
 */

/**
 * Batch multiple canvas operations to reduce render calls
 */
export class RenderBatcher {
  constructor(canvas) {
    this.canvas = canvas;
    this.scheduled = false;
    this.operations = [];
  }

  /**
   * Schedule a canvas operation and batch the render
   */
  schedule(operation) {
    if (typeof operation === 'function') {
      this.operations.push(operation);
    }

    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  /**
   * Execute all queued operations and render once
   */
  flush() {
    if (this.operations.length > 0) {
      // Execute all operations without rendering
      this.operations.forEach(op => {
        if (typeof op === 'function') {
          op();
        }
      });
    }

    // Single render call for all operations
    if (this.canvas && typeof this.canvas.requestRenderAll === 'function') {
      this.canvas.requestRenderAll();
    }

    this.operations = [];
    this.scheduled = false;
  }

  /**
   * Clear all pending operations
   */
  clear() {
    this.operations = [];
    this.scheduled = false;
  }

  /**
   * Request a render without additional operations
   */
  requestRender() {
    this.schedule();
  }
}

/**
 * Check if an object is within the viewport bounds
 */
export function isInViewport(object, canvas) {
  if (!object || !canvas) return false;

  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();
  
  // Get viewport bounds in canvas coordinates
  const viewportLeft = -vpt[4] / zoom;
  const viewportTop = -vpt[5] / zoom;
  const viewportRight = viewportLeft + canvas.width / zoom;
  const viewportBottom = viewportTop + canvas.height / zoom;

  // Get object bounds
  const bounds = object.getBoundingRect(true); // absolute coords
  const objLeft = bounds.left / zoom;
  const objTop = bounds.top / zoom;
  const objRight = objLeft + bounds.width / zoom;
  const objBottom = objTop + bounds.height / zoom;

  // Check for intersection
  return !(objRight < viewportLeft || 
           objLeft > viewportRight || 
           objBottom < viewportTop || 
           objTop > viewportBottom);
}

/**
 * Simplify objects that are far from the viewport
 * Reduces detail for better performance
 */
export function simplifyDistantObjects(canvas, detailThreshold = 0.3) {
  if (!canvas) return;

  const objects = canvas.getObjects();
  const zoom = canvas.getZoom();

  objects.forEach(obj => {
    if (!obj || obj.excludeFromExport) return;

    const inViewport = isInViewport(obj, canvas);
    
    // If object is in viewport and zoom is high, use full detail
    if (inViewport && zoom >= detailThreshold) {
      if (obj._simplified) {
        obj.set({
          opacity: obj._originalOpacity ?? 1,
          strokeWidth: obj._originalStrokeWidth ?? obj.strokeWidth,
        });
        obj._simplified = false;
      }
    } 
    // If object is distant or zoom is low, simplify
    else if (!obj._simplified && zoom < detailThreshold) {
      obj._originalOpacity = obj.opacity;
      obj._originalStrokeWidth = obj.strokeWidth;
      obj.set({
        opacity: Math.max(0.5, obj.opacity ?? 1),
        strokeWidth: Math.max(1, (obj.strokeWidth ?? 1) * 0.7),
      });
      obj._simplified = true;
    }
  });
}

/**
 * Clean up old cached data from objects
 * Helps prevent memory leaks with many objects
 */
export function cleanupObjectCache(canvas, maxAge = 300000) { // 5 minutes default
  if (!canvas) return;

  const now = Date.now();
  const objects = canvas.getObjects();

  objects.forEach(obj => {
    if (!obj) return;

    const createdAt = obj.strokeMeta?.createdAt || obj.data?.strokeMeta?.createdAt;
    
    // If object is old and has cached data, clear it
    if (createdAt && (now - createdAt) > maxAge) {
      if (obj._cacheCanvas) {
        obj.dirty = true; // Force recache on next render
      }
    }
  });
}

/**
 * Optimize canvas settings based on object count
 */
export function autoOptimizeCanvas(canvas) {
  if (!canvas) return;

  const objectCount = canvas.getObjects().length;

  // Adjust settings based on object count
  if (objectCount > 500) {
    // Heavy optimization for many objects
    canvas.renderOnAddRemove = false;
    canvas.skipOffscreen = true;
    canvas.enableRetinaScaling = false; // Disable for performance
  } else if (objectCount > 200) {
    // Moderate optimization
    canvas.renderOnAddRemove = false;
    canvas.skipOffscreen = true;
    canvas.enableRetinaScaling = true;
  } else {
    // Light optimization (default)
    canvas.renderOnAddRemove = false;
    canvas.skipOffscreen = true;
    canvas.enableRetinaScaling = true;
  }
}

/**
 * Debounce function for expensive operations
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for frequent operations
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Batch add objects to canvas efficiently
 */
export function batchAddObjects(canvas, objects) {
  if (!canvas || !Array.isArray(objects) || objects.length === 0) return;

  // Disable rendering during batch add
  const wasRendering = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;

  objects.forEach(obj => {
    canvas.add(obj);
  });

  canvas.renderOnAddRemove = wasRendering;
  canvas.requestRenderAll();
}

/**
 * Get canvas memory usage estimate
 */
export function getCanvasMemoryUsage(canvas) {
  if (!canvas) return 0;

  const objects = canvas.getObjects();
  let totalSize = 0;

  objects.forEach(obj => {
    // Rough estimate based on cache canvas size
    if (obj._cacheCanvas) {
      const width = obj._cacheCanvas.width || 0;
      const height = obj._cacheCanvas.height || 0;
      totalSize += width * height * 4; // 4 bytes per pixel (RGBA)
    }
    
    // Add estimate for path data
    if (obj.path && Array.isArray(obj.path)) {
      totalSize += obj.path.length * 32; // Rough estimate
    }
  });

  return totalSize; // bytes
}

export default {
  RenderBatcher,
  isInViewport,
  simplifyDistantObjects,
  cleanupObjectCache,
  autoOptimizeCanvas,
  debounce,
  throttle,
  batchAddObjects,
  getCanvasMemoryUsage,
};
