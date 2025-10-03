/**
 * Configuration options for ManifestManager
 */
export interface ManagerOptions {
  /**
   * Path to manifest file (relative to workspace root)
   *
   * @default '.domscribe/manifest.jsonl'
   */
  manifestPath?: string;

  /**
   * Number of entries to buffer before auto-flush
   *
   * @default 50
   */
  batchSize?: number;

  /**
   * Time interval in ms to auto-flush
   *
   * @default 100
   */
  flushIntervalMs?: number;

  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;
}

/**
 * Statistics tracking for manager operations
 */
export interface ManagerStats {
  entryCount: number;
  filesIndexed: number;
  lastFlush: string | null;
}
