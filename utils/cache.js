// utils/cache.js - Smart Caching System

class SmartCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get cached value if not expired
   */
  get(key, maxAge = 3600000) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < maxAge) {
        this.stats.hits++;
        return cached.data;
      }
      // Expired, delete it
      this.cache.delete(key);
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set cache value with timestamp
   */
  set(key, data, ttl = 3600000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    this.stats.sets++;

    // Auto-cleanup after TTL
    setTimeout(() => {
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.timestamp >= ttl) {
          this.cache.delete(key);
        }
      }
    }, ttl);

    return data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key, maxAge = 3600000) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      return Date.now() - cached.timestamp < maxAge;
    }
    return false;
  }

  /**
   * Delete specific key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

// Create singleton instance
const cache = new SmartCache();

export default cache;
export { SmartCache };