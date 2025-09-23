/**
 * Unit tests for TransformStats
 *
 * Tests follow Arrange-Act-Assert methodology.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransformStats } from './stats.js';
import type { FileMetrics, AggregateMetrics } from './types.js';

/**
 * Helper to create a FileMetrics object with defaults
 */
function createFileMetrics(overrides: Partial<FileMetrics> = {}): FileMetrics {
  return {
    file: overrides.file ?? 'src/test.tsx',
    timings: {
      sourceMapConsumerMs: 0,
      parseMs: 0,
      traversalMs: 0,
      totalTransformMs: 0,
      ...overrides.timings,
    },
    counts: {
      elementsFound: 0,
      elementsInjected: 0,
      ...overrides.counts,
    },
  };
}

describe('TransformStats', () => {
  let stats: TransformStats;

  beforeEach(() => {
    stats = new TransformStats();
  });

  describe('Constructor', () => {
    it('should initialize with zero values', () => {
      // Arrange & Act
      const newStats = new TransformStats();
      const aggregate = newStats.getAggregate();

      // Assert
      expect(aggregate.filesTransformed).toBe(0);
      expect(aggregate.elementsFound).toBe(0);
      expect(aggregate.elementsInjected).toBe(0);
      expect(aggregate.totalTimeMs).toBe(0);
    });
  });

  describe('record()', () => {
    it('should increment filesTransformed counter', () => {
      // Arrange
      const metrics = createFileMetrics({
        counts: { elementsFound: 5, elementsInjected: 5 },
        timings: { totalTransformMs: 10.5 },
      });

      // Act
      stats.record(metrics);

      // Assert
      expect(stats.getAggregate().filesTransformed).toBe(1);
    });

    it('should accumulate filesTransformed across multiple calls', () => {
      // Arrange & Act
      stats.record(createFileMetrics({ file: 'a.tsx' }));
      stats.record(createFileMetrics({ file: 'b.tsx' }));
      stats.record(createFileMetrics({ file: 'c.tsx' }));

      // Assert
      expect(stats.getAggregate().filesTransformed).toBe(3);
    });

    it('should accumulate elementsInjected', () => {
      // Arrange & Act
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 5, elementsInjected: 5 },
        }),
      );
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 3, elementsInjected: 3 },
        }),
      );

      // Assert
      expect(stats.getAggregate().elementsInjected).toBe(8);
    });

    it('should accumulate totalTimeMs', () => {
      // Arrange & Act
      stats.record(createFileMetrics({ timings: { totalTransformMs: 10.5 } }));
      stats.record(createFileMetrics({ timings: { totalTransformMs: 7.3 } }));

      // Assert
      expect(stats.getAggregate().totalTimeMs).toBeCloseTo(17.8, 2);
    });

    it('should handle zero element count', () => {
      // Arrange & Act
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 0, elementsInjected: 0 },
          timings: { totalTransformMs: 5 },
        }),
      );

      // Assert
      expect(stats.getAggregate().elementsInjected).toBe(0);
      expect(stats.getAggregate().filesTransformed).toBe(1);
    });

    it('should handle zero duration', () => {
      // Arrange & Act
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 5, elementsInjected: 5 },
          timings: { totalTransformMs: 0 },
        }),
      );

      // Assert
      expect(stats.getAggregate().totalTimeMs).toBe(0);
      expect(stats.getAggregate().filesTransformed).toBe(1);
    });
  });

  describe('getAggregate()', () => {
    it('should return zero values when no files recorded', () => {
      // Act
      const aggregate = stats.getAggregate();

      // Assert
      expect(aggregate).toEqual<AggregateMetrics>({
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
      });
    });

    it('should calculate average time correctly for single file', () => {
      // Arrange
      stats.record(createFileMetrics({ timings: { totalTransformMs: 15.5 } }));

      // Act
      const aggregate = stats.getAggregate();

      // Assert
      expect(aggregate.avgTimePerFileMs).toBe(15.5);
    });

    it('should calculate average time correctly for multiple files', () => {
      // Arrange
      stats.record(createFileMetrics({ timings: { totalTransformMs: 10 } }));
      stats.record(createFileMetrics({ timings: { totalTransformMs: 20 } }));
      stats.record(createFileMetrics({ timings: { totalTransformMs: 30 } }));

      // Act
      const aggregate = stats.getAggregate();

      // Assert
      expect(aggregate.avgTimePerFileMs).toBe(20);
    });

    it('should calculate percentiles correctly', () => {
      // Arrange - add 10 files with increasing times
      for (let i = 1; i <= 10; i++) {
        stats.record(createFileMetrics({ timings: { totalTransformMs: i } }));
      }

      // Act
      const aggregate = stats.getAggregate();

      // Assert
      expect(aggregate.p50Ms).toBe(5);
      expect(aggregate.p95Ms).toBe(10);
      expect(aggregate.p99Ms).toBe(10);
    });

    it('should accumulate timing breakdown', () => {
      // Arrange
      stats.record(
        createFileMetrics({
          timings: {
            parseMs: 2,
            traversalMs: 1,
            sourceMapConsumerMs: 3,
            totalTransformMs: 6.5,
          },
        }),
      );
      stats.record(
        createFileMetrics({
          timings: {
            parseMs: 3,
            traversalMs: 2,
            sourceMapConsumerMs: 4,
            totalTransformMs: 10,
          },
        }),
      );

      // Act
      const aggregate = stats.getAggregate();

      // Assert
      expect(aggregate.breakdown.parseMs).toBe(5);
      expect(aggregate.breakdown.traversalMs).toBe(3);
      expect(aggregate.breakdown.sourceMapConsumerMs).toBe(7);
    });
  });

  describe('getFileMetrics()', () => {
    it('should return empty array when no files recorded', () => {
      // Act
      const files = stats.getFileMetrics();

      // Assert
      expect(files).toEqual([]);
    });

    it('should return all recorded file metrics', () => {
      // Arrange
      const metrics1 = createFileMetrics({ file: 'a.tsx' });
      const metrics2 = createFileMetrics({ file: 'b.tsx' });
      stats.record(metrics1);
      stats.record(metrics2);

      // Act
      const files = stats.getFileMetrics();

      // Assert
      expect(files).toHaveLength(2);
      expect(files[0].file).toBe('a.tsx');
      expect(files[1].file).toBe('b.tsx');
    });

    it('should return readonly array', () => {
      // Arrange
      stats.record(createFileMetrics());

      // Act
      const files = stats.getFileMetrics();

      // Assert - the array reference should be stable but contents shouldn't be mutable
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should reset all counters to zero', () => {
      // Arrange
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 5, elementsInjected: 5 },
        }),
      );
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 3, elementsInjected: 3 },
        }),
      );

      // Act
      stats.reset();

      // Assert
      const aggregate = stats.getAggregate();
      expect(aggregate.filesTransformed).toBe(0);
      expect(aggregate.elementsInjected).toBe(0);
      expect(aggregate.totalTimeMs).toBe(0);
    });

    it('should clear file metrics', () => {
      // Arrange
      stats.record(createFileMetrics());
      stats.reset();

      // Act
      const files = stats.getFileMetrics();

      // Assert
      expect(files).toHaveLength(0);
    });

    it('should allow recording after reset', () => {
      // Arrange
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 5, elementsInjected: 5 },
        }),
      );
      stats.reset();

      // Act
      stats.record(
        createFileMetrics({
          counts: { elementsFound: 3, elementsInjected: 3 },
          timings: { totalTransformMs: 5 },
        }),
      );

      // Assert
      const aggregate = stats.getAggregate();
      expect(aggregate.filesTransformed).toBe(1);
      expect(aggregate.elementsInjected).toBe(3);
      expect(aggregate.totalTimeMs).toBe(5);
    });
  });
});
