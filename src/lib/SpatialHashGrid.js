/**
 * SpatialHashGrid - Ultra-fast spatial indexing for canvas objects
 * 
 * Divides 2D space into a grid of cells for O(1) spatial queries.
 * This enables instant lookups of objects in viewport bounds,
 * critical for rendering thousands of objects smoothly.
 * 
 * Performance: 
 * - Insert: O(k) where k = cells object overlaps (typically 1-4)
 * - Query: O(m) where m = objects in viewport (not total objects!)
 * - Update: O(k) - just remove + insert
 * 
 * @example
 * const grid = new SpatialHashGrid(512);
 * grid.insert(fabricObject);
 * const visible = grid.queryViewport({ left: 0, top: 0, right: 1000, bottom: 1000 });
 */
export class SpatialHashGrid {
  /**
   * @param {number} cellSize - Size of each grid cell in pixels (default: 512)
   */
  constructor(cellSize = 512) {
    this.cellSize = cellSize;
    
    // Map of cell coordinates to Set of objects in that cell
    // Key format: "cellX,cellY"
    this.grid = new Map();
    
    // Map of object to Set of cell keys it occupies
    // Enables fast updates when object moves
    this.objectCells = new Map();
  }

  /**
   * Convert world coordinates to cell key
   * @private
   */
  _getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Get all cell keys that overlap with given bounds
   * @private
   */
  _getCellKeysForBounds(bounds) {
    const keys = new Set();
    const minCellX = Math.floor(bounds.left / this.cellSize);
    const maxCellX = Math.floor(bounds.right / this.cellSize);
    const minCellY = Math.floor(bounds.top / this.cellSize);
    const maxCellY = Math.floor(bounds.bottom / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        keys.add(`${x},${y}`);
      }
    }
    return keys;
  }

  /**
   * Insert object into spatial grid
   * @param {fabric.Object} object - Fabric.js object to insert
   */
  insert(object) {
    if (!object || !object.getBoundingRect) {
      console.warn('SpatialHashGrid: Invalid object for insertion', object);
      return;
    }

    const bounds = object.getBoundingRect(true);
    const cellKeys = this._getCellKeysForBounds(bounds);

    this.objectCells.set(object, cellKeys);

    cellKeys.forEach(key => {
      if (!this.grid.has(key)) {
        this.grid.set(key, new Set());
      }
      this.grid.get(key).add(object);
    });
  }

  /**
   * Remove object from spatial grid
   * @param {fabric.Object} object - Fabric.js object to remove
   */
  remove(object) {
    const cellKeys = this.objectCells.get(object);
    if (!cellKeys) return;

    cellKeys.forEach(key => {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(object);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
    });

    this.objectCells.delete(object);
  }

  /**
   * Update object position in grid (call when object moves)
   * @param {fabric.Object} object - Fabric.js object that moved
   */
  update(object) {
    this.remove(object);
    this.insert(object);
  }

  /**
   * Query all objects that might be visible in viewport bounds
   * Returns unique objects that overlap with any cell in the viewport
   * 
   * @param {Object} viewportBounds - Viewport bounds { left, top, right, bottom }
   * @returns {Array<fabric.Object>} Array of objects in viewport
   */
  queryViewport(viewportBounds) {
    const objects = new Set();
    const cellKeys = this._getCellKeysForBounds(viewportBounds);

    cellKeys.forEach(key => {
      const cell = this.grid.get(key);
      if (cell) {
        cell.forEach(obj => objects.add(obj));
      }
    });

    return Array.from(objects);
  }

  /**
   * Query objects near a point (useful for hit testing)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Search radius in pixels
   * @returns {Array<fabric.Object>} Objects near the point
   */
  queryPoint(x, y, radius = 0) {
    return this.queryViewport({
      left: x - radius,
      top: y - radius,
      right: x + radius,
      bottom: y + radius
    });
  }

  /**
   * Clear all data from grid
   */
  clear() {
    this.grid.clear();
    this.objectCells.clear();
  }

  /**
   * Get statistics about the grid (for debugging)
   * @returns {Object} Grid statistics
   */
  getStats() {
    return {
      totalCells: this.grid.size,
      totalObjects: this.objectCells.size,
      cellSize: this.cellSize,
      avgObjectsPerCell: this.grid.size > 0 
        ? Array.from(this.grid.values()).reduce((sum, cell) => sum + cell.size, 0) / this.grid.size 
        : 0
    };
  }
}
