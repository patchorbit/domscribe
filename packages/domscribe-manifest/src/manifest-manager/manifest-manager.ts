/**
 * ManifestManager - Central manifest coordinator (singleton per workspace)
 *
 * Coordinates all manifest operations for a workspace:
 * - Batch writing via BatchWriter
 * - In-memory index for fast lookups
 * - Entry lifecycle management
 *
 * Performance:
 * - Singleton prevents multiple writers per workspace
 * - In-memory index for O(1) lookups
 * - Batch writing reduces fs ops by ~50x
 */
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PATHS, type ManifestEntry, type ManifestIndex } from '@domscribe/core';
import { BatchWriter } from '../batch-writer/batch-writer.js';
import { IDStabilizer } from '../id-stabilizer/id-stabilizer.js';
import { ManagerOptions, ManagerStats } from './types.js';

export class ManifestManager {
  private static instances = new Map<string, ManifestManager>();
  private options: Required<ManagerOptions>;

  private readonly idStabilizer: IDStabilizer;
  private writer: BatchWriter | undefined;
  private index: ManifestIndex | undefined;
  private isInitialized = false;

  private constructor(
    private workspaceRoot: string,
    options?: ManagerOptions,
  ) {
    const cacheDir = join(this.workspaceRoot, PATHS.TRANSFORM_CACHE);
    this.options = {
      manifestPath: options?.manifestPath ?? PATHS.MANIFEST_FILE,
      batchSize: options?.batchSize ?? 50,
      flushIntervalMs: options?.flushIntervalMs ?? 100,
      debug: options?.debug ?? false,
    };
    this.idStabilizer = new IDStabilizer(cacheDir, {
      debug: options?.debug ?? false,
    });
  }

  static getInstance(
    workspaceRoot: string,
    options?: ManagerOptions,
  ): ManifestManager {
    const key = resolve(workspaceRoot); // Normalize to absolute path

    if (!this.instances.has(key)) {
      this.instances.set(key, new ManifestManager(key, options));
    }

    // Update options if provided
    const instance = this.instances.get(key);

    if (!instance) {
      throw new Error('ManifestManager instance not found');
    }

    instance.options = { ...instance.options, ...options };

    return instance;
  }

  static resetInstance(workspaceRoot?: string): void {
    if (workspaceRoot) {
      const key = resolve(workspaceRoot);
      const instance = this.instances.get(key);

      if (instance?.isInitialized) {
        // Cleanup before removing
        instance.writer?.stop();
      }
      this.instances.delete(key);
      return;
    }

    // Reset all instances
    for (const instance of this.instances.values()) {
      if (instance.isInitialized) {
        instance.writer?.stop();
      }
    }

    this.instances.clear();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const manifestPath = this.getManifestPath();

    // Load existing entries
    const entries = await this.loadEntries(manifestPath);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][manifest-manager] Loaded ${entries.length} existing entries from ${manifestPath}`,
      );
    }

    // Build in-memory index
    this.buildIndex(entries);

    if (!this.index) {
      throw new Error('Failed to build index');
    }

    // Initialize ID stabilizer
    this.initializeIDStabilizer();

    // Initialize batch writer
    this.initializeWriter();

    if (!this.writer) {
      throw new Error('Failed to initialize writer');
    }

    this.writer.start();
    this.setIsInitialized(true);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][manifest-manager] Initialized (entries: ${entries.length}, files: ${this.index.fileToIds.size})`,
      );
    }
  }

  async appendEntries(entries: ManifestEntry[]): Promise<void> {
    if (!this.writer || !this.index) {
      throw new Error(
        'ManifestManager not initialized. Call initialize() first.',
      );
    }

    if (entries.length === 0) {
      return;
    }

    // Add to writer buffer
    await this.appendWithWriter(this.writer, entries);

    // Update in-memory index
    this.buildIndex(entries);

    if (this.options.debug) {
      console.log(
        `[domscribe-manifest][manifest-manager] Appended ${entries.length} entries (total: ${this.index.entryCount})`,
      );
    }
  }

  async flush(): Promise<void> {
    if (!this.writer) {
      throw new Error(
        'ManifestManager not initialized. Call initialize() first.',
      );
    }

    await this.flushWriter(this.writer);
  }

  async close(): Promise<void> {
    if (!this.isInitialized || !this.writer) {
      return;
    }

    // Save ID cache before closing
    try {
      await this.idStabilizer.saveCache();
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][manifest-manager] Failed to save ID cache:',
          error,
        );
      }
    }

    await this.stopWriter(this.writer);
    this.clearWriter();
    this.setIsInitialized(false);

    if (this.options.debug) {
      console.log('[domscribe-manifest][manifest-manager] Closed');
    }
  }

  resolveId(id: string): string | undefined {
    if (!this.index) {
      throw new Error(
        'ManifestManager not initialized. Call initialize() first.',
      );
    }

    return this.index.idToFile.get(id);
  }

  getIndex(): ManifestIndex {
    if (!this.index) {
      throw new Error(
        'ManifestManager not initialized. Call initialize() first.',
      );
    }

    return this.index;
  }

  getEntriesByFile(file: string): string[] {
    if (!this.index) {
      throw new Error(
        'ManifestManager not initialized. Call initialize() first.',
      );
    }

    return this.index.fileToIds.get(file) ?? [];
  }

  getStats(): ManagerStats {
    const { entryCount, fileToIds, lastRebuild } = this.index ?? {};

    return {
      entryCount: entryCount ?? 0,
      filesIndexed: fileToIds?.size ?? 0,
      lastFlush: lastRebuild ?? null,
    };
  }

  getIDStabilizer(): IDStabilizer {
    return this.idStabilizer;
  }

  // Private helpers
  private setIsInitialized(value: boolean) {
    this.isInitialized = value;
  }

  private initializeIDStabilizer() {
    // Load ID cache asynchronously (non-blocking)
    this.idStabilizer.loadCache().catch((err) => {
      if (this.options.debug) {
        console.warn(
          '[domscribe-manifest][manifest-manager] Failed to load ID cache:',
          err,
        );
      }

      // Continue without cache - will start fresh
    });
  }

  private initializeWriter() {
    this.writer = new BatchWriter(this.getManifestPath(), {
      batchSize: this.options.batchSize,
      flushIntervalMs: this.options.flushIntervalMs,
      debug: this.options.debug,
    });
  }

  private async appendWithWriter(
    writer: BatchWriter,
    entries: ManifestEntry[],
  ): Promise<void> {
    try {
      await writer.append(entries);
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][manifest-manager] Append entries failed:',
          error,
        );
      }
    }
  }

  private async flushWriter(writer: BatchWriter) {
    try {
      await writer.flush();
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][manifest-manager] Flush writer failed:',
          error,
        );
      }
    }
  }

  private async stopWriter(writer: BatchWriter) {
    try {
      await writer.stop();
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][manifest-manager] Stop writer failed:',
          error,
        );
      }
    }
  }

  private clearWriter() {
    this.writer = undefined;
  }

  private getManifestPath(): string {
    return join(
      this.workspaceRoot,
      this.options.manifestPath ?? PATHS.MANIFEST_FILE,
    );
  }

  private async loadEntries(path: string): Promise<ManifestEntry[]> {
    if (!existsSync(path)) {
      // File doesn't exist yet - this is normal on first run
      return [];
    }

    const content = await readFile(path, 'utf-8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ManifestEntry);
  }

  private buildIndex(entries: ManifestEntry[]) {
    let { idToFile, fileToIds, componentToIds, entryCount } = this.index ?? {};

    idToFile = idToFile ?? new Map<string, string>();
    fileToIds = fileToIds ?? new Map<string, string[]>();
    componentToIds = componentToIds ?? new Map<string, string[]>();
    entryCount = entryCount ?? 0;

    for (const entry of entries) {
      const { id, file, componentName } = entry;

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

    this.index = {
      idToFile,
      fileToIds,
      componentToIds,
      lastRebuild: new Date().toISOString(),
      entryCount: entryCount + entries.length,
    };
  }
}
