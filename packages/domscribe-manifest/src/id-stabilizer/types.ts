/**
 * ID Stabilizer types for HMR-stable element ID generation
 * @module @domscribe/manifest/id-stabilizer/types
 */

/**
 * Cache entry for a single file's element IDs
 */
export interface IDCacheEntry {
  /** xxhash64 hash of file content (hex string) */
  fileHash: string;
  /** Absolute file path */
  filePath: string;
  /** Map of "line:column" → element ID (8-char nanoid) */
  ids: Map<string, string>;
  /** Last update timestamp (Date.now()) */
  timestamp: number;
}

/**
 * Options for IDStabilizer initialization
 */
export interface IDStabilizerOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom cache file name (default: 'id-cache.json') */
  cacheFileName?: string;
}

/**
 * Serialized cache format for persistence
 */
export interface SerializedIDCache {
  /** Schema version for forward compatibility */
  version: string;
  /** Timestamp when cache was generated */
  generatedAt: string;
  /** Array of serialized cache entries */
  entries: SerializedIDCacheEntry[];
}

/**
 * Serialized cache entry (JSON-compatible)
 */
export interface SerializedIDCacheEntry {
  fileHash: string;
  filePath: string;
  /** Object form of ids map for JSON serialization */
  ids: Record<string, string>;
  timestamp: number;
}

/**
 * Statistics about cache performance
 */
export interface IDCacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Total number of cached entries */
  entries: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
}
