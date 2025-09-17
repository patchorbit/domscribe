/**
 * ID Stabilizer types for HMR-stable element ID generation
 * @module @domscribe/manifest/id-stabilizer/types
 */

import { z } from 'zod';
import type { SourcePosition } from '@domscribe/core';

/**
 * Interface for element ID generators
 *
 * Defines the contract for components that generate stable element IDs
 * for DOM elements during the transform process.
 */
export interface IDGenerator {
  /**
   * Initialize the ID generator (load caches, setup resources, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Generate a stable ID for an element at a specific position in a file
   *
   * @param fileIdentity - File path and content
   * @param position - Source position of the element
   * @returns Stable element ID (typically 8-char nanoid)
   */
  getStableId(fileIdentity: FileIdentity, position: SourcePosition): string;

  /**
   * Get the file hash for a previously processed file.
   * Returns undefined if the file has not been processed yet.
   */
  getFileHash(filePath: string): string | undefined;

  /**
   * Save the cache to disk.
   * Call this when transforms are complete (e.g., build end, server shutdown).
   */
  saveCache(): void;

  /**
   * Close the ID generator, persisting cache and allowing re-creation.
   */
  close(): void;
}

/**
 * Interface for cache lifecycle management
 *
 * Provides control over cache persistence, statistics,
 * and manual operations. Typically used by tests,
 * shutdown hooks, and debugging tools.
 */
export interface IDCacheControl {
  /**
   * Manually load cache from disk
   * (normally called automatically by initialize())
   */
  loadCache(): void;

  /**
   * Manually save cache to disk.
   * Call this when transforms are complete (e.g., build end, server shutdown).
   */
  saveCache(): void;

  /**
   * Clear all cached entries and statistics
   */
  clearCache(): void;

  /**
   * Get cache performance statistics
   */
  getCacheStats(): IDCacheStats;

  /**
   * Close the stabilizer, persisting cache and allowing singleton re-creation
   */
  close(): void;
}

/**
 * Cache entry for a single file's element IDs
 */
export interface IDCacheEntry {
  /** xxhash64 hash of file content (hex string) */
  fileHash: string;
  /** Absolute file path */
  filePath: string;
  /** Map of "line:column[:offset]" → element ID (8-char nanoid) */
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
 * Serialized cache entry (JSON-compatible)
 */
export const SerializedIDCacheEntrySchema = z.object({
  fileHash: z.string(),
  filePath: z.string(),
  /** Object form of ids map for JSON serialization */
  ids: z.record(z.string(), z.string()),
  timestamp: z.number(),
});

export type SerializedIDCacheEntry = z.infer<
  typeof SerializedIDCacheEntrySchema
>;

/**
 * Serialized cache format for persistence
 */
export const SerializedIDCacheSchema = z.object({
  /** Schema version for forward compatibility */
  version: z.string(),
  /** Timestamp when cache was generated */
  generatedAt: z.string(),
  /** Array of serialized cache entries */
  entries: z.array(SerializedIDCacheEntrySchema),
});

export type SerializedIDCache = z.infer<typeof SerializedIDCacheSchema>;

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

/**
 * Identity tuple for a source file, used to determine cache validity
 */
export interface FileIdentity {
  filePath: string;
  fileContent: string;
}
