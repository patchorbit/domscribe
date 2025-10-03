/**
 * BatchWriter - Buffered async writer for manifest entries
 *
 * Buffers manifest entries in memory and flushes to disk in batches
 * for efficient I/O. Automatic flushing on:
 * - Batch size threshold (default: 50 entries)
 * - Time interval (default: 100ms)
 * - Process exit
 *
 * Performance:
 * - Target: <2ms per flush (50 entries)
 * - Reduces fs operations by ~50x vs individual writes
 */

import { dirname } from 'path';
import type { ManifestEntry } from '@domscribe/core';
import { interval } from '../utils/interval.js';
import { BatchWriterOptions, WriterStats } from './types.js';
import { mkdir, appendFile } from 'fs/promises';
import { mkdirSync, appendFileSync } from 'fs';

export class BatchWriter {
  private buffer: ManifestEntry[] = [];
  private readonly options: Required<BatchWriterOptions>;

  /*
   * State variables for the batch writer
   */
  private clearInterval = false;
  private isStarted = false;
  private stats = { totalWritten: 0, flushCount: 0 };

  private exitHandler: (() => void) | undefined;

  constructor(
    private manifestPath: string,
    options?: BatchWriterOptions,
  ) {
    this.options = {
      batchSize: options?.batchSize ?? 50,
      flushIntervalMs: options?.flushIntervalMs ?? 100,
      debug: options?.debug ?? false,
    };
  }

  start(): void {
    if (this.isStarted) {
      return;
    }

    // Start interval timer for auto-flush
    this.startFlushInterval();

    // Register process exit handler
    this.registerExitHandler();

    // Set started flag to true
    this.setStarted(true);

    const { batchSize, flushIntervalMs, debug } = this.options;

    if (debug) {
      console.log(
        `[domscribe-manifest][batch-writer] Started (batchSize: ${batchSize}, interval: ${flushIntervalMs}ms)`,
      );
    }
  }

  async append(entries: ManifestEntry[]): Promise<void> {
    if (!this.isStarted) {
      throw new Error('BatchWriter not started. Call start() first.');
    }

    this.pushEntriesToBuffer(entries);

    const { batchSize } = this.options;

    // Check if batch size threshold reached
    if (this.buffer.length >= batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    try {
      // Write entries to file
      const entriesWritten = await this.writeEntriesToFile({
        pushToBufferOnError: true,
      });

      // Update stats
      this.updateStats(entriesWritten, this.stats.flushCount + 1);

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][batch-writer] Flushed ${entriesWritten} entries (total: ${this.stats.totalWritten})`,
        );
      }
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][batch-writer] Flush failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      // Log error but don't throw.
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    // Clear interval timer
    this.clearInterval = true;

    // Unregister exit handler
    this.unregisterExitHandler();

    // Flush remaining entries
    await this.flush();

    // Set started flag to false
    this.setStarted(false);

    if (this.options.debug) {
      console.log('[domscribe-manifest][batch-writer] Stopped');
    }
  }

  getStats(): WriterStats {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
    };
  }

  private setStarted(value: boolean) {
    this.isStarted = value;
  }

  private pushEntriesToBuffer(entries: ManifestEntry[]) {
    this.buffer.push(...entries);
  }

  private updateStats(entriesWritten: number, flushCount: number) {
    this.stats.totalWritten += entriesWritten;
    this.stats.flushCount = flushCount;
  }

  private async startFlushInterval() {
    const flushInterval = async () => {
      const { flushIntervalMs } = this.options;

      for await (const tick of interval(flushIntervalMs)) {
        try {
          await this.flush();
        } catch (err) {
          console.error(
            `[domscribe-manifest][batch-writer] Interval flush failed for tick ${tick}: ${err}`,
          );
        }

        if (this.clearInterval) {
          break;
        }
      }
    };
    flushInterval().catch((error) => {
      console.error(
        '[domscribe-manifest][batch-writer] Interval flush failed:',
        error,
      );
    });
  }

  private async writeEntriesToFile({ pushToBufferOnError = false }) {
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // Write as JSONL (one JSON object per line)
      const content =
        entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';

      await mkdir(dirname(this.manifestPath), { recursive: true });
      await appendFile(this.manifestPath, content, 'utf-8');

      return entries.length;
    } catch (error) {
      if (pushToBufferOnError) {
        // Add entries back to buffer for retry at a later time
        this.buffer.unshift(...entries);
      }
      throw error;
    }
  }

  private writeEntriesToFileSync({ pushToBufferOnError = true }) {
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const content =
        entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';

      mkdirSync(dirname(this.manifestPath), { recursive: true });
      appendFileSync(this.manifestPath, content, 'utf-8');

      return entries.length;
    } catch (error) {
      if (pushToBufferOnError) {
        // Add entries back to buffer for retry at a later time
        this.buffer.unshift(...entries);
      }
      throw error;
    }
  }

  private registerExitHandler() {
    this.exitHandler = this.onExit;
    process.on('exit', this.exitHandler);
  }

  private unregisterExitHandler() {
    if (this.exitHandler) {
      process.off('exit', this.exitHandler);
      this.exitHandler = undefined;
    }
  }

  private onExit() {
    if (this.buffer.length === 0) {
      return;
    }

    // Synchronous flush on exit (async not allowed in process.on('exit'))
    try {
      this.writeEntriesToFileSync({ pushToBufferOnError: false });
    } catch (error) {
      console.error(
        '[domscribe-manifest][batch-writer] Exit flush failed:',
        error,
      );
    }
  }
}
