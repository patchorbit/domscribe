/**
 * Configuration options for BatchWriter
 */
export interface BatchWriterOptions {
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
 * Statistics tracking for writer operations
 */
export interface WriterStats {
  totalWritten: number;
  flushCount: number;
  bufferSize: number;
}
