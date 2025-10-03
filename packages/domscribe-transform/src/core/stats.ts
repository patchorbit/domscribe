/**
 * Shared statistics tracking for transform adapters
 *
 * Provides consistent stats tracking and formatted output across:
 * - Vite adapter
 * - Webpack loader
 * - Webpack plugin
 *
 * This eliminates code duplication and ensures consistent behavior.
 */

import type { ManagerStats } from '@domscribe/manifest';
import { TransformStatsData } from './types.js';

/**
 * Statistics tracker for transform operations
 *
 * Tracks files transformed, elements injected, and timing information.
 * Provides formatted console output for debug mode.
 *
 * @example
 * ```typescript
 * const stats = new TransformStats();
 *
 * // Record a transformation
 * stats.recordTransform(5, 3.45);
 *
 * // Print statistics
 * stats.print('domscribe-vite');
 *
 * // Reset for testing
 * stats.reset();
 * ```
 */
export class TransformStats {
  private data: TransformStatsData = {
    filesTransformed: 0,
    elementsInjected: 0,
    totalTimeMs: 0,
  };

  recordTransform(elementCount: number, durationMs: number): void {
    this.data.filesTransformed++;
    this.data.elementsInjected += elementCount;
    this.data.totalTimeMs += durationMs;
  }

  getAverageTimeMs(): number {
    return this.data.filesTransformed > 0
      ? this.data.totalTimeMs / this.data.filesTransformed
      : 0;
  }

  getAverageElementsPerFile(): number {
    return this.data.filesTransformed > 0
      ? this.data.elementsInjected / this.data.filesTransformed
      : 0;
  }

  getData(): Readonly<TransformStatsData> {
    return { ...this.data };
  }

  reset(): void {
    this.data = {
      filesTransformed: 0,
      elementsInjected: 0,
      totalTimeMs: 0,
    };
  }

  print(prefix: string, managerStats?: ManagerStats | null): void {
    if (this.data.filesTransformed === 0) {
      console.log(`\n[${prefix}] No files transformed`);
      return;
    }

    console.log(`\n[${prefix}] Transform Statistics:`);
    console.log(`  Files transformed: ${this.data.filesTransformed}`);
    console.log(`  Elements injected: ${this.data.elementsInjected}`);
    console.log(`  Total time: ${this.data.totalTimeMs.toFixed(2)}ms`);
    console.log(
      `  Average time per file: ${this.getAverageTimeMs().toFixed(2)}ms`,
    );
    console.log(
      `  Average elements per file: ${this.getAverageElementsPerFile().toFixed(1)}`,
    );

    if (managerStats) {
      console.log(`  Manifest entries written: ${managerStats.entryCount}`);
    }
  }
}

export function createTransformStats(): TransformStats {
  return new TransformStats();
}
