/**
 * Recognition Cache System
 * 
 * LRU cache with localStorage persistence for OCR results.
 * Reduces redundant recognition calls by caching stroke patterns.
 */

import CryptoJS from 'crypto-js';

const CACHE_STORAGE_KEY = 'intellinote:recognition:cache';
const METRICS_STORAGE_KEY = 'intellinote:recognition:metrics';
const MAX_CACHE_SIZE = 50; // Reduced from 100 to avoid quota issues
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * LRU Cache with localStorage persistence
 */
class RecognitionCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRecognitions: 0,
      totalTime: 0,
      errors: [],
      successfulRecognitions: 0,
    };
    this.isDirty = false; // Track if cache needs persistence
    this.load();
    
    // Auto-persist every 30 seconds if dirty
    this.persistTimer = setInterval(() => {
      if (this.isDirty) {
        this.persist();
        this.isDirty = false;
      }
    }, 30000);
  }

  /**
   * Generate cache key from strokes using SHA-256 hash
   */
  generateKey(strokes) {
    if (!Array.isArray(strokes) || strokes.length === 0) {
      return 'empty';
    }

    const sha = CryptoJS.algo.SHA256.create();
    
    strokes.forEach((stroke) => {
      const id = stroke?.id ?? 'stroke';
      sha.update(String(id));
      
      const points = stroke?.points || stroke?.strokePoints || [];
      points.forEach((point) => {
        if (!point) return;
        
        // Round to 2 decimals to handle minor variations
        const x = Math.round((point.x ?? point[0] ?? 0) * 100) / 100;
        const y = Math.round((point.y ?? point[1] ?? 0) * 100) / 100;
        
        sha.update(String(x));
        sha.update(String(y));
      });
    });
    
    return sha.finalize().toString(CryptoJS.enc.Hex);
  }

  /**
   * Get cached result
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp;
    if (age > MAX_AGE_MS) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.metrics.hits++;
    return entry.result;
  }

  /**
   * Set cache entry
   */
  set(key, result, confidence = 0) {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      confidence,
      timestamp: Date.now(),
    });

    // Mark as dirty for next periodic persist
    this.isDirty = true;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age <= MAX_AGE_MS;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.isDirty = true;
    this.persist();
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > MAX_AGE_MS) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.isDirty = true;
      this.persist();
    }

    return removedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0;

    const avgTime = this.metrics.totalRecognitions > 0
      ? this.metrics.totalTime / this.metrics.totalRecognitions
      : 0;

    const successRate = this.metrics.totalRecognitions > 0
      ? this.metrics.successfulRecognitions / this.metrics.totalRecognitions
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: hitRate * 100,
      totalRecognitions: this.metrics.totalRecognitions,
      avgTime,
      successRate: successRate * 100,
      errors: this.metrics.errors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Record recognition metrics
   */
  recordRecognition(duration, success, error = null) {
    this.metrics.totalRecognitions++;
    this.metrics.totalTime += duration;

    if (success) {
      this.metrics.successfulRecognitions++;
    }

    if (error) {
      this.metrics.errors.push({
        message: error,
        timestamp: Date.now(),
      });
      
      // Keep only last 50 errors
      if (this.metrics.errors.length > 50) {
        this.metrics.errors = this.metrics.errors.slice(-50);
      }
    }

    this.persistMetrics();
  }

  /**
   * Load cache from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Convert array back to Map
      if (Array.isArray(data.entries)) {
        this.cache = new Map(data.entries);
        this.cleanup(); // Remove expired entries on load
      }

      // Load metrics
      const metricsStored = localStorage.getItem(METRICS_STORAGE_KEY);
      if (metricsStored) {
        const metrics = JSON.parse(metricsStored);
        this.metrics = { ...this.metrics, ...metrics };
      }
    } catch (error) {
      console.warn('[RecognitionCache] Failed to load cache:', error);
      this.cache = new Map();
    }
  }

  /**
   * Persist cache to localStorage
   */
  persist() {
    try {
      const data = {
        entries: Array.from(this.cache.entries()),
        timestamp: Date.now(),
      };
      
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('[RecognitionCache] Storage quota exceeded, clearing cache');
        // Clear cache and try again with empty cache
        this.cache.clear();
        try {
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({
            entries: [],
            timestamp: Date.now(),
          }));
        } catch (retryError) {
          console.error('[RecognitionCache] Failed to clear and persist:', retryError);
        }
      } else {
        console.warn('[RecognitionCache] Failed to persist cache:', error);
      }
    }
  }

  /**
   * Persist metrics to localStorage
   */
  persistMetrics() {
    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('[RecognitionCache] Failed to persist metrics:', error);
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRecognitions: 0,
      totalTime: 0,
      errors: [],
      successfulRecognitions: 0,
    };
    this.persistMetrics();
  }

  /**
   * Export diagnostic data
   */
  exportDiagnostics() {
    return {
      cache: {
        size: this.cache.size,
        maxSize: this.maxSize,
        entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
          key: key.substring(0, 16) + '...',
          confidence: entry.confidence,
          age: Date.now() - entry.timestamp,
          latex: entry.result?.latex || '',
        })),
      },
      metrics: this.metrics,
      stats: this.getStats(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
const recognitionCache = new RecognitionCache();

// Cleanup expired entries every hour
setInterval(() => {
  const removed = recognitionCache.cleanup();
  if (removed > 0) {
    console.log(`[RecognitionCache] Cleaned up ${removed} expired entries`);
  }
}, 60 * 60 * 1000);

export default recognitionCache;
export { RecognitionCache };
