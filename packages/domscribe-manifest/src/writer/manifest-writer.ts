/**
 * ManifestWriter - Writes manifest entries during transforms (singleton per workspace)
 *
 * Coordinates manifest write operations for a workspace:
 * - Batch writing via BatchWriter
 * - In-memory index for deduplication
 * - Entry lifecycle management
 */
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path, { dirname } from 'path';
import { PATHS, type ManifestEntry, type ManifestIndex } from '@domscribe/core';
import { IWriter } from '../batch-writer/types.js';
import { BatchWriter } from '../batch-writer/batch-writer.js';
import { ManifestCompactor } from '../compactor/manifest-compactor.js';
import type { CompactionResult } from '../compactor/types.js';
import {
  GetWriterInstanceOptions,
  WriterOptions,
  ManifestWriterStats,
} from './types.js';

export class ManifestWriter {
  private static instances = new Map<string, ManifestWriter>();
  private options: Required<WriterOptions>;
  private isClosed = false;

  /** Tracks the latest fileHash per file for stale entry eviction */
  private fileHashIndex: Map<string, string> = new Map();
  private sourceHashIndex = new Map<string, string>();

  private index: ManifestIndex = {
    idToFile: new Map(),
    fileToIds: new Map(),
    componentToIds: new Map(),
    lastRebuild: '',
    entryCount: 0,
  };

  private constructor(
    private workspaceRoot: string,
    private writer: IWriter,
    options?: WriterOptions,
  ) {
    this.options = {
      manifestPath: options?.manifestPath ?? PATHS.MANIFEST_FILE,
      debug: options?.debug ?? false,
      compactionThreshold: options?.compactionThreshold ?? 500,
    };

    this.initialize();
  }

  /**
   * Initialize the ManifestWriter. This will load existing entries and build the in-memory index.
   *
   */
  initialize(): void {
    const manifestPath = ManifestWriter.getManifestPath(this.workspaceRoot, {
      manifestPath: this.options.manifestPath,
    });

    // Ensure manifest directory exists
    mkdirSync(dirname(manifestPath), { recursive: true });

    // Load existing entries
    const entries = this.loadEntries(manifestPath);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][writer] Loaded ${entries.length} existing entries from ${manifestPath}`,
      );
    }

    // Build in-memory index
    this.addToIndex(entries);

    this.writer.start();

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][writer] Initialized (entries: ${entries.length}, files: ${this.index.fileToIds.size})`,
      );
    }
  }

  /**
   * Get or create a singleton ManifestWriter for the given workspace root.
   * A closed instance is replaced with a fresh one automatically.
   *
   * @param workspaceRoot - Absolute path to the workspace root
   * @param options - Writer and batch-writer options (only used on first call)
   */
  static getInstance(
    workspaceRoot: string,
    options?: GetWriterInstanceOptions,
  ): ManifestWriter {
    const key = path.resolve(workspaceRoot); // Normalize to absolute path
    const existing = this.instances.get(key);

    if (!existing || existing.isClosed) {
      const manifestPath = this.getManifestPath(workspaceRoot, {
        manifestPath: options?.manifestPath,
      });
      const writer = new BatchWriter(manifestPath, {
        batchSize: options?.batchSize ?? 50,
        flushIntervalMs: options?.flushIntervalMs ?? 100,
        debug: options?.debug ?? false,
      });
      this.instances.set(
        key,
        new ManifestWriter(key, writer, {
          manifestPath: options?.manifestPath,
          debug: options?.debug,
        }),
      );
    }

    const instance = this.instances.get(key);

    if (!instance) {
      throw new Error('ManifestWriter instance not found');
    }

    return instance;
  }

  /**
   * Resolve the absolute manifest file path for a workspace.
   */
  static getManifestPath(
    workspaceRoot: string,
    options?: Pick<WriterOptions, 'manifestPath'>,
  ): string {
    return path.join(
      workspaceRoot,
      options?.manifestPath ?? PATHS.MANIFEST_FILE,
    );
  }

  /**
   * Append entries to the manifest file.
   * Entries that already exist in the index are skipped (deduplication).
   *
   * @param entries - Manifest entries to append
   */
  appendEntries(entries: ManifestEntry[]): void {
    // Check if entries are already in the index (deduplication)
    entries = entries.filter(
      (entry) =>
        !this.index.idToFile.has(entry.id) ||
        (entry.sourceHash !== undefined &&
          this.index.idToFile.get(entry.id) === entry.file &&
          this.sourceHashIndex.get(entry.id) !== entry.sourceHash),
    );

    if (entries.length === 0) {
      return;
    }

    this.writer.append(entries);

    // Update in-memory index
    this.addToIndex(entries);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][writer] Appended ${entries.length} entries (total: ${this.index.entryCount})`,
      );
    }
  }

  /**
   * Close the writer and flush any pending entries.
   */
  close(): void {
    // Mark as closed FIRST so getInstance() creates a fresh instance
    // even if writer.stop() or compaction throws.
    this.isClosed = true;

    try {
      this.writer.stop();
    } catch (error) {
      if (this.options.debug) {
        console.error('[domscribe-manifest][writer] Close failed:', error);
      }

      throw error;
    }

    this.tryCompact();
  }

  private tryCompact(): CompactionResult | null {
    try {
      const manifestPath = ManifestWriter.getManifestPath(this.workspaceRoot, {
        manifestPath: this.options.manifestPath,
      });

      const result = ManifestCompactor.compact(
        manifestPath,
        this.workspaceRoot,
        {
          entryCountThreshold: this.options.compactionThreshold,
          currentEntryCount: this.index.entryCount,
          debug: this.options.debug,
        },
      );

      if (result && !result.skipped && result.entriesRemoved > 0) {
        this.rebuildIndex(manifestPath);
      }

      return result;
    } catch (error) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-manifest][writer] Compaction failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }

  private rebuildIndex(manifestPath: string): void {
    // Clear existing index
    this.index.idToFile.clear();
    this.index.fileToIds.clear();
    this.index.componentToIds.clear();
    this.index.entryCount = 0;
    this.sourceHashIndex.clear();

    // Reload from compacted file
    const entries = this.loadEntries(manifestPath);
    this.addToIndex(entries);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][writer] Index rebuilt after compaction (entries: ${entries.length}, files: ${this.index.fileToIds.size})`,
      );
    }
  }

  /**
   * Check if an ID exists in the index.
   *
   * @param id - Element ID to check
   * @returns The file path if found, undefined otherwise
   */
  resolveId(id: string): string | undefined {
    return this.index.idToFile.get(id);
  }

  /**
   * Get all element IDs in a file.
   *
   * @param file - File path
   * @returns Array of element IDs
   */
  getEntriesByFile(file: string): string[] {
    return this.index.fileToIds.get(file) ?? [];
  }

  /**
   * Get writer statistics.
   */
  getStats(): ManifestWriterStats {
    const { entryCount, fileToIds, lastRebuild } = this.index;

    return {
      entryCount: entryCount,
      filesIndexed: fileToIds.size,
      lastRebuild: lastRebuild,
      writerStats: this.writer.getStats(),
    };
  }

  private loadEntries(manifestPath: string): ManifestEntry[] {
    if (!existsSync(manifestPath)) {
      // File doesn't exist yet - this is normal on first run
      return [];
    }

    const content = readFileSync(manifestPath, 'utf-8');
    const allEntries = content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ManifestEntry);

    // Determine latest fileHash per file (last seen in append-order wins)
    const latestFileHash = new Map<string, string>();
    for (const entry of allEntries) {
      if (entry.fileHash) {
        latestFileHash.set(entry.file, entry.fileHash);
      }
    }

    // Filter: keep only entries with latest fileHash (or no fileHash for legacy)
    return allEntries.filter((entry) => {
      const latestHash = latestFileHash.get(entry.file);
      return !latestHash || !entry.fileHash || entry.fileHash === latestHash;
    });
  }

  private addToIndex(entries: ManifestEntry[]) {
    // Evict stale entries for files with new fileHashes
    const fileHashUpdates = new Map<string, string>();
    for (const entry of entries) {
      if (entry.fileHash) {
        fileHashUpdates.set(entry.file, entry.fileHash);
      }
    }

    for (const [file, newHash] of fileHashUpdates) {
      const existingHash = this.fileHashIndex.get(file);
      if (existingHash && existingHash !== newHash) {
        this.evictFileEntries(file);
      }
      this.fileHashIndex.set(file, newHash);
    }

    const { idToFile, fileToIds, componentToIds } = this.index;

    for (const entry of entries) {
      const { id, file, componentName } = entry;
      if (entry.sourceHash) this.sourceHashIndex.set(id, entry.sourceHash);
      else this.sourceHashIndex.delete(id);
      if (idToFile.get(id) === file) continue;

      // id → file mapping
      idToFile.set(id, file);

      // file → ids[] mapping
      const fileIds = fileToIds.get(file) ?? [];
      fileIds.push(id);
      fileToIds.set(file, fileIds);

      // component → ids[] mapping
      if (componentName) {
        const compIds = componentToIds.get(componentName) ?? [];
        compIds.push(id);
        componentToIds.set(componentName, compIds);
      }
    }

    this.index.entryCount = idToFile.size;
    this.index.lastRebuild = new Date().toISOString();
  }

  /**
   * Remove all index entries for a file (used when fileHash changes).
   */
  private evictFileEntries(file: string): void {
    const oldIds = this.index.fileToIds.get(file);
    if (!oldIds) return;

    const oldIdSet = new Set(oldIds);

    for (const id of oldIds) {
      this.index.idToFile.delete(id);
      this.sourceHashIndex.delete(id);
    }
    this.index.fileToIds.delete(file);

    // Clean componentToIds
    for (const [comp, ids] of this.index.componentToIds) {
      const filtered = ids.filter((id) => !oldIdSet.has(id));
      if (filtered.length === 0) {
        this.index.componentToIds.delete(comp);
      } else {
        this.index.componentToIds.set(comp, filtered);
      }
    }

    this.index.entryCount -= oldIds.length;
  }
}
