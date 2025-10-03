/**
 * Performance Utilities - Measure and benchmark build performance
 *
 * This utility provides helpers for measuring build time, transform overhead,
 * and other performance metrics.
 */

import type { FixtureBuildResult } from './types.js';

/**
 * Measure average build time over multiple runs
 *
 * @param buildFn - Function that builds the fixture
 * @param iterations - Number of iterations
 * @returns Average build time in milliseconds
 */
export async function measureAverageBuildTime(
  buildFn: () => Promise<FixtureBuildResult>,
  iterations = 5,
): Promise<{
  average: number;
  min: number;
  max: number;
  stdDev: number;
  times: number[];
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = await buildFn();
    times.push(result.buildTime);
  }

  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  // Calculate standard deviation
  const squareDiffs = times.map((time) => Math.pow(time - average, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return {
    average,
    min,
    max,
    stdDev,
    times,
  };
}

/**
 * Calculate build time overhead percentage
 *
 * @param withDomscribe - Build time with Domscribe
 * @param baseline - Build time without Domscribe
 * @returns Overhead percentage
 */
export function calculateOverhead(
  withDomscribe: number,
  baseline: number,
): number {
  return ((withDomscribe - baseline) / baseline) * 100;
}

/**
 * Format time in human-readable format
 *
 * @param ms - Time in milliseconds
 * @returns Formatted string
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

/**
 * Performance assertion helpers
 */
export const performanceAssertions = {
  /**
   * Assert that build time is under a threshold
   */
  buildTimeUnder(buildTime: number, threshold: number, message?: string): void {
    if (buildTime >= threshold) {
      throw new Error(
        message ||
          `Build time ${formatTime(buildTime)} exceeds threshold ${formatTime(threshold)}`,
      );
    }
  },

  /**
   * Assert that overhead is under a percentage
   */
  overheadUnder(
    withDomscribe: number,
    baseline: number,
    maxPercentage: number,
    message?: string,
  ): void {
    const overhead = calculateOverhead(withDomscribe, baseline);
    if (overhead >= maxPercentage) {
      throw new Error(
        message ||
          `Overhead ${overhead.toFixed(2)}% exceeds maximum ${maxPercentage}%`,
      );
    }
  },

  /**
   * Assert that per-file time is under a threshold
   */
  perFileTimeUnder(
    totalTime: number,
    fileCount: number,
    threshold: number,
    message?: string,
  ): void {
    const perFileTime = totalTime / fileCount;
    if (perFileTime >= threshold) {
      throw new Error(
        message ||
          `Per-file time ${formatTime(perFileTime)} exceeds threshold ${formatTime(threshold)}`,
      );
    }
  },
};
