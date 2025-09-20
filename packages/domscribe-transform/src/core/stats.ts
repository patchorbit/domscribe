/**
 * Transform statistics tracking
 *
 * Tracks per-file metrics and computes aggregate statistics including
 * timing breakdown and percentiles for consistent comparison across
 * Vite and Webpack implementations.
 *
 * @module @domscribe/transform/core/stats
 */

import type { ManifestWriterStats } from '@domscribe/manifest';
import type { FileMetrics, AggregateMetrics } from './types.js';
import path from 'path';

/**
 * Statistics tracker for transform operations
 *
 * Records per-file metrics and computes aggregate statistics
 * including timing breakdown and percentiles.
 *
 * @example
 * ```typescript
 * const stats = new TransformStats();
 *
 * // Record file metrics
 * stats.record({
 *   file: 'src/App.tsx',
 *   timings: { parseMs: 2.5, traversalMs: 0.5, ... },
 *   counts: { elementsFound: 10, elementsInjected: 10 },
 * });
 *
 * // Get aggregate statistics
 * const aggregate = stats.getAggregate();
 *
 * // Print formatted output
 * stats.print('vite-plugin', managerStats);
 * ```
 */
export class TransformStats {
  private static instances: Map<string, TransformStats> = new Map();
  private files: FileMetrics[] = [];

  /**
   * Get or create a singleton TransformStats instance for a workspace.
   */
  static getInstance(workspaceRoot: string): TransformStats {
    const key = path.resolve(workspaceRoot);
    if (!this.instances.has(key)) {
      this.instances.set(key, new TransformStats());
    }
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error('TransformStats instance not found');
    }
    return instance;
  }

  /**
   * Record metrics for a single file transform
   */
  record(metrics: FileMetrics): void {
    this.files.push(metrics);
  }

  /**
   * Get aggregate statistics from all recorded file metrics
   */
  getAggregate(): AggregateMetrics {
    if (this.files.length === 0) {
      return this.empty();
    }

    const times = this.files.map((f) => f.timings.totalTransformMs);
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      filesTransformed: this.files.length,
      elementsFound: this.files.reduce((s, f) => s + f.counts.elementsFound, 0),
      elementsInjected: this.files.reduce(
        (s, f) => s + f.counts.elementsInjected,
        0,
      ),
      totalTimeMs: sum,
      avgTimePerFileMs: sum / this.files.length,
      p50Ms: this.percentile(sorted, 50),
      p95Ms: this.percentile(sorted, 95),
      p99Ms: this.percentile(sorted, 99),
      breakdown: {
        sourceMapConsumerMs: this.files.reduce(
          (s, f) => s + f.timings.sourceMapConsumerMs,
          0,
        ),
        parseMs: this.files.reduce((s, f) => s + f.timings.parseMs, 0),
        traversalMs: this.files.reduce((s, f) => s + f.timings.traversalMs, 0),
      },
    };
  }

  /**
   * Get all recorded file metrics
   */
  getFileMetrics(): readonly FileMetrics[] {
    return this.files;
  }

  /**
   * Reset all recorded metrics
   */
  reset(): void {
    this.files = [];
  }

  /**
   * Print formatted statistics to console
   */
  print(prefix: string, writerStats?: ManifestWriterStats | null): void {
    const a = this.getAggregate();

    if (a.filesTransformed === 0) {
      console.log(`\n[${prefix}] No files transformed`);
      return;
    }

    console.log(`\n[${prefix}] Transform Statistics:`);
    console.log(`  Files: ${a.filesTransformed}`);
    console.log(
      `  Elements: ${a.elementsFound} found, ${a.elementsInjected} injected`,
    );
    console.log(`  Total: ${a.totalTimeMs.toFixed(2)}ms`);
    console.log(`  Avg: ${a.avgTimePerFileMs.toFixed(2)}ms`);
    console.log(
      `  p50: ${a.p50Ms.toFixed(2)}ms, p95: ${a.p95Ms.toFixed(2)}ms, p99: ${a.p99Ms.toFixed(2)}ms`,
    );
    console.log(
      `  Breakdown: parse=${a.breakdown.parseMs.toFixed(2)}ms, traverse=${a.breakdown.traversalMs.toFixed(2)}ms, smConsumer=${a.breakdown.sourceMapConsumerMs.toFixed(2)}ms`,
    );

    if (writerStats) {
      console.log(`  Manifest: ${writerStats.entryCount} entries`);

      if (writerStats.writerStats) {
        console.log(
          `  Writer: ${writerStats.writerStats.totalWritten} written, ${writerStats.writerStats.flushCount} flushed`,
        );
        console.log(
          `  Writer: ${writerStats.writerStats.appendTimeMs.toFixed(2)}ms append, ${writerStats.writerStats.flushTimeMs.toFixed(2)}ms flush`,
        );
      }
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private empty(): AggregateMetrics {
    return {
      filesTransformed: 0,
      elementsFound: 0,
      elementsInjected: 0,
      totalTimeMs: 0,
      avgTimePerFileMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      breakdown: {
        sourceMapConsumerMs: 0,
        parseMs: 0,
        traversalMs: 0,
      },
    };
  }
}
