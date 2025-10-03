/**
 * IDStabilizer - HMR-stable element ID generator
 *
 * Generates stable element IDs based on file content hashing and position caching.
 * IDs remain stable across HMR cycles when file content and element positions are unchanged.
 *
 * Algorithm:
 * 1. Compute xxhash64 of file content
 * 2. Check cache for file hash match
 * 3. If match, return existing ID for position
 * 4. If no match or new position, generate new ID and cache it
 *
 * Performance:
 * - File hash computation: <1ms for typical files (xxhash-wasm)
 * - Cache lookup: O(1), <0.1ms
 * - Target cache hit rate: >80% during HMR
 *
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import xxhash from 'xxhash-wasm';
import { generateElementId, SourcePosition } from '@domscribe/core';
import type {
  IDCacheEntry,
  IDStabilizerOptions,
  IDCacheStats,
  SerializedIDCache,
  SerializedIDCacheEntry,
} from './types.js';

const CACHE_SCHEMA_VERSION = '1.0.0';

const DEFAULT_CACHE_FILE = 'id-cache.json';

export class IDStabilizer {
  /** In-memory cache: filePath → cache entry */
  private cache: Map<string, IDCacheEntry> = new Map();

  /** Cache statistics */
  private stats = { hits: 0, misses: 0 };

  /** Cache file path */
  private readonly cacheFilePath: string;

  /** Options */
  private readonly options: Required<IDStabilizerOptions>;

  /** xxhash hasher instance (initialized lazily) */
  private hasher: Awaited<ReturnType<typeof xxhash>> | undefined;

  constructor(
    private cacheDir: string,
    options?: IDStabilizerOptions,
  ) {
    this.options = {
      debug: options?.debug ?? false,
      cacheFileName: options?.cacheFileName ?? DEFAULT_CACHE_FILE,
    };
    this.cacheFilePath = join(this.cacheDir, this.options.cacheFileName);
  }

  async computeFileHash(fileContent: string): Promise<string> {
    // Initialize hasher if not already done
    if (!this.hasher) {
      this.hasher = await xxhash();
    }

    // Compute xxhash64
    const hash = this.hasher.h64(fileContent);

    return hash.toString(16);
  }

  async initialize(): Promise<void> {
    if (this.hasher) {
      return;
    }

    this.hasher = await xxhash();
  }

  computeFileHashSync(content: string): string {
    if (!this.hasher) {
      throw new Error(
        'IDStabilizer not initialized. Call initialize() first to initialize.',
      );
    }

    const hash = this.hasher.h64(content);
    return hash.toString(16);
  }

  getStableId(
    filePath: string,
    fileHash: string,
    position: SourcePosition,
  ): string {
    const { line, column, offset } = position;
    const positionKey = `${line}:${column}${offset ? `:${offset}` : ''}`;

    const entry = this.cache.get(filePath);

    // Case 1: File not in cache OR file hash changed (content changed)
    if (!entry || entry.fileHash !== fileHash) {
      const newId = generateElementId();
      const newEntry: IDCacheEntry = {
        fileHash,
        filePath,
        ids: new Map([[positionKey, newId]]),
        timestamp: Date.now(),
      };
      this.cache.set(filePath, newEntry);
      this.stats.misses++;

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] Cache miss (${entry ? 'hash changed' : 'new file'}): ${filePath} → ${newId}`,
        );
      }

      return newId;
    }

    // Case 2: File hash matches (content unchanged), check position
    const existingId = entry.ids.get(positionKey);

    if (existingId) {
      this.stats.hits++;

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] Cache hit: ${filePath}:${line}:${column} → ${existingId}`,
        );
      }

      return existingId;
    }

    // Case 3: New position in existing file
    const newId = generateElementId();
    entry.ids.set(positionKey, newId);
    entry.timestamp = Date.now();
    this.stats.misses++;

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][id-stabilizer] Cache miss (new position): ${filePath}:${line}:${column} → ${newId}`,
      );
    }

    return newId;
  }

  async loadCache(): Promise<void> {
    if (!existsSync(this.cacheFilePath)) {
      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] No cache file found at ${this.cacheFilePath}, starting fresh`,
        );
      }
      return;
    }

    try {
      const content = await readFile(this.cacheFilePath, 'utf-8');
      const serialized: SerializedIDCache = JSON.parse(content);

      // Validate schema version
      if (serialized.version !== CACHE_SCHEMA_VERSION) {
        console.warn(
          `[domscribe-manifest][id-stabilizer] Cache schema version mismatch (expected ${CACHE_SCHEMA_VERSION}, got ${serialized.version}), starting fresh`,
        );
        return;
      }

      // Deserialize entries
      for (const entry of serialized.entries) {
        const { filePath, fileHash, ids, timestamp } = entry;

        this.cache.set(filePath, {
          fileHash,
          filePath,
          ids: new Map(Object.entries(ids)),
          timestamp,
        });
      }

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] Loaded ${this.cache.size} entries from cache`,
        );
      }
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][id-stabilizer] Failed to load cache, starting fresh:',
          error instanceof Error ? error.message : String(error),
        );
      }
      this.cache.clear();
    }
  }

  async saveCache(): Promise<void> {
    try {
      // Ensure cache directory exists
      await mkdir(this.cacheDir, { recursive: true });

      // Serialize cache entries
      const entries: SerializedIDCacheEntry[] = [];
      for (const entry of this.cache.values()) {
        const { fileHash, filePath, ids, timestamp } = entry;

        entries.push({
          fileHash,
          filePath,
          ids: Object.fromEntries(ids),
          timestamp,
        });
      }

      const serialized: SerializedIDCache = {
        version: CACHE_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        entries,
      };

      // Write to file
      const content = JSON.stringify(serialized, null, 2);
      await writeFile(this.cacheFilePath, content, 'utf-8');

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] Saved ${entries.length} entries to cache`,
        );
      }
    } catch (error) {
      console.error(
        '[domscribe-manifest][id-stabilizer] Failed to save cache:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;

    if (this.options.debug) {
      console.log('[domscribe-manifest][id-stabilizer] Cache cleared');
    }
  }

  getCacheStats(): IDCacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate,
    };
  }
}
