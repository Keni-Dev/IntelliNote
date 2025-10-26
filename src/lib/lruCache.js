/**
 * LRU (Least Recently Used) Cache implementation
 * Automatically evicts least recently used items when capacity is reached
 */
class LRUCache {
  constructor(capacity = 100) {
    this.capacity = Math.max(1, capacity);
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {*} value or undefined if not found
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end (most recently used)
    this.cache.set(key, value);
    
    // Evict least recently used if over capacity
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Remove key from cache
   * @param {string} key
   * @returns {boolean} true if key existed
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Get all keys in order (least to most recently used)
   * @returns {Array<string>}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in order (least to most recently used)
   * @returns {Array<*>}
   */
  values() {
    return Array.from(this.cache.values());
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  stats() {
    return {
      size: this.cache.size,
      capacity: this.capacity,
      utilization: (this.cache.size / this.capacity * 100).toFixed(1) + '%',
    };
  }
}

export default LRUCache;
