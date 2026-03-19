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
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { existsSync } from 'fs';
import path, { join } from 'path';
import xxhash from 'xxhash-wasm';
import { SourcePosition } from '@domscribe/core';
import {
  SerializedIDCacheSchema,
  type IDGenerator,
  type IDCacheEntry,
  type IDStabilizerOptions,
  type IDCacheStats,
  type SerializedIDCache,
  type SerializedIDCacheEntry,
  type FileIdentity,
  type IDCacheControl,
} from './types.js';

const CACHE_SCHEMA_VERSION = '1.0.0';

const DEFAULT_CACHE_FILE = 'id-cache.json';

export class IDStabilizer implements IDGenerator, IDCacheControl {
  /** Alphabet matching core's id-generator.ts (base58, no ambiguous chars) */
  private static readonly ALPHABET =
    '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  private static readonly ALPHABET_LEN = BigInt(IDStabilizer.ALPHABET.length); // 58n
  private static readonly ID_LENGTH = 8;

  /** Singleton instances keyed by normalized cache directory path */
  private static instances = new Map<string, IDStabilizer>();

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

  /** Track if cache has been modified since last save */
  private isDirty = false;

  /** Track if the ID stabilizer has been initialized */
  private isInitialized = false;

  /** Track if the ID stabilizer has been closed */
  private isClosed = false;

  /** Per-file hash cache to avoid redundant hash computations within a single file */
  private cachedFileHash: {
    filePath: string;
    content: string;
    hash: string;
  } | null = null;

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

  /**
   * Get or create a singleton IDStabilizer instance for the given cache directory.
   *
   * This ensures that all callers sharing the same cache directory share
   * the same in-memory cache, preventing data loss from concurrent saves.
   *
   * @param cacheDir - Directory where the cache file is stored
   * @param options - IDStabilizer options (only used on first call for this cacheDir)
   * @returns The singleton IDStabilizer instance for this cache directory
   */
  static getInstance(
    cacheDir: string,
    options?: IDStabilizerOptions,
  ): IDStabilizer {
    const key = path.resolve(cacheDir); // Normalize to absolute path

    const existing = this.instances.get(key);
    if (!existing || existing.isClosed) {
      this.instances.set(key, new IDStabilizer(cacheDir, options));
    }

    const instance = this.instances.get(key);

    if (!instance) {
      throw new Error('IDStabilizer instance not found');
    }

    return instance;
  }

  /**
   * Reset all singleton instances.
   * Primarily used for testing to ensure clean state between tests.
   */
  static resetInstances(): void {
    this.instances.clear();
  }

  get initalized(): boolean {
    return this.isInitialized;
  }

  async initialize(): Promise<void> {
    if (this.initalized) {
      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] IDStabilizer already initialized. Skipping initialization.`,
        );
      }
      return;
    }

    // Ensure cache directory exists
    mkdirSync(this.cacheDir, { recursive: true });

    this.hasher = await xxhash();
    this.loadCache();
    this.isInitialized = true;
  }

  getStableId(fileIdentity: FileIdentity, position: SourcePosition): string {
    const { fileContent, filePath } = fileIdentity;
    const fileHash = this.computeOrCacheFileHash(filePath, fileContent);

    const { line, column, offset } = position;
    const positionKey = `${line}:${column}${offset ? `:${offset}` : ''}`;

    const entry = this.cache.get(filePath);

    // Case 1: File not in cache OR file hash changed (content changed)
    if (!entry || entry.fileHash !== fileHash) {
      const newId = this.generateDeterministicId(`${fileHash}:${positionKey}`);
      const newEntry: IDCacheEntry = {
        fileHash,
        filePath,
        ids: new Map([[positionKey, newId]]),
        timestamp: Date.now(),
      };
      this.cache.set(filePath, newEntry);
      this.isDirty = true;

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
    const newId = this.generateDeterministicId(
      `${entry.fileHash}:${positionKey}`,
    );
    entry.ids.set(positionKey, newId);
    entry.timestamp = Date.now();
    this.stats.misses++;
    this.isDirty = true;

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][id-stabilizer] Cache miss (new position): ${filePath}:${line}:${column} → ${newId}`,
      );
    }

    return newId;
  }

  /**
   * Get the cached file hash for a previously processed file.
   * Returns undefined if the file has not been processed.
   */
  getFileHash(filePath: string): string | undefined {
    return this.cache.get(filePath)?.fileHash;
  }

  /** Clear all cached entries and reset hit/miss statistics. */
  clearCache(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;

    if (this.options.debug) {
      console.log('[domscribe-manifest][id-stabilizer] Cache cleared');
    }
  }

  /** Get cache performance statistics (hits, misses, hit rate). */
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

  /**
   * Load the ID cache from disk. Validates schema version and discards
   * the cache if the version doesn't match. Called automatically by initialize().
   */
  loadCache(): void {
    if (!existsSync(this.cacheFilePath)) {
      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][id-stabilizer] No cache file found at ${this.cacheFilePath}, starting fresh`,
        );
      }
      return;
    }

    try {
      const content = readFileSync(this.cacheFilePath, 'utf-8');
      const serialized = SerializedIDCacheSchema.parse(JSON.parse(content));

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

      // Cache is not dirty after loading (it matches disk state)
      this.isDirty = false;

      if (this.options.debug) {
        const totalIds = Array.from(this.cache.values()).reduce(
          (sum, entry) => sum + entry.ids.size,
          0,
        );
        console.log(
          `[domscribe-manifest][id-stabilizer] Loaded cache: ${this.cache.size} files, ${totalIds} IDs`,
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

  /**
   * Persist the in-memory cache to disk via atomic write (temp → rename).
   * No-op if the cache hasn't been modified since the last save or load.
   */
  saveCache(): void {
    // Skip save if cache hasn't been modified
    if (!this.isDirty) {
      if (this.options.debug) {
        console.log(
          '[domscribe-manifest][id-stabilizer] Skipping save (cache not dirty)',
        );
      }
      return;
    }

    const tempFile = `${this.cacheFilePath}.tmp.${process.pid}`;

    try {
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

      // Atomic write: temp file → rename
      const content = JSON.stringify(serialized, null, 2);
      writeFileSync(tempFile, content, 'utf-8');
      renameSync(tempFile, this.cacheFilePath);

      // Clear dirty flag after successful save
      this.isDirty = false;

      if (this.options.debug) {
        const totalIds = entries.reduce(
          (sum, entry) => sum + Object.keys(entry.ids).length,
          0,
        );
        console.log(
          `[domscribe-manifest][id-stabilizer] Saved cache: ${entries.length} files, ${totalIds} IDs to ${this.cacheFilePath}`,
        );
      }
    } catch (error) {
      console.error(
        '[domscribe-manifest][id-stabilizer] Failed to save cache:',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      // Always clean up temp file (no-op if renamed or never created)
      try {
        unlinkSync(tempFile);
      } catch {
        // noop - file may not exist if rename succeeded
      }
    }
  }

  /**
   * Close the ID stabilizer and persist the cache to disk.
   * Marks the instance as closed so getInstance() creates a fresh one next time.
   */
  close(): void {
    // Mark as closed FIRST so getInstance() creates a fresh instance
    // even if saveCache() throws.
    this.isClosed = true;
    this.saveCache();
  }

  /**
   * Get file hash with per-file caching.
   * Avoids redundant hash computations when processing multiple elements in the same file.
   */
  private computeOrCacheFileHash(
    filePath: string,
    fileContent: string,
  ): string {
    // Check if we have a cached hash for this exact file and content
    if (
      this.cachedFileHash?.filePath === filePath &&
      this.cachedFileHash.content === fileContent
    ) {
      return this.cachedFileHash.hash;
    }

    // Compute hash and cache it
    const hash = this.computeFileHash(fileContent);
    this.cachedFileHash = { filePath, content: fileContent, hash };
    return hash;
  }

  private computeFileHash(fileContent: string): string {
    if (!this.hasher) {
      throw new Error('Hasher not initialized. Call initialize() first.');
    }

    return this.hasher.h64(fileContent).toString(16).padStart(16, '0');
  }

  /**
   * Derive a deterministic 8-character ID from a seed string.
   * Uses xxhash64 to hash the seed, then maps the 64-bit result
   * to the ID alphabet via repeated modulo division.
   */
  private generateDeterministicId(seed: string): string {
    if (!this.hasher) {
      throw new Error('Hasher not initialized. Call initialize() first.');
    }
    const hash = this.hasher.h64(seed);
    return IDStabilizer.hashToAlphabetId(hash);
  }

  private static hashToAlphabetId(hash: bigint): string {
    const chars: string[] = [];
    let value = hash < 0n ? -hash : hash;
    for (let i = 0; i < IDStabilizer.ID_LENGTH; i++) {
      chars.push(
        IDStabilizer.ALPHABET[Number(value % IDStabilizer.ALPHABET_LEN)],
      );
      value = value / IDStabilizer.ALPHABET_LEN;
    }
    return chars.join('');
  }
}
