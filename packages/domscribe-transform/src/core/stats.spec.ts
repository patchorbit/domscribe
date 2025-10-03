/**
 * Unit tests for TransformStats class
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransformStats, createTransformStats } from './stats.js';

describe('TransformStats', () => {
  let stats: TransformStats;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stats = new TransformStats();
    consoleLogSpy = vi.spyOn(console, 'log');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('recordTransform', () => {
    it('should increment filesTransformed counter', () => {
      stats.recordTransform(5, 10);
      expect(stats.getData().filesTransformed).toBe(1);

      stats.recordTransform(3, 5);
      expect(stats.getData().filesTransformed).toBe(2);
    });

    it('should accumulate elementsInjected', () => {
      stats.recordTransform(5, 10);
      expect(stats.getData().elementsInjected).toBe(5);

      stats.recordTransform(3, 5);
      expect(stats.getData().elementsInjected).toBe(8);
    });

    it('should accumulate totalTimeMs', () => {
      stats.recordTransform(5, 10.5);
      expect(stats.getData().totalTimeMs).toBe(10.5);

      stats.recordTransform(3, 7.3);
      expect(stats.getData().totalTimeMs).toBe(17.8);
    });

    it('should handle zero element count', () => {
      stats.recordTransform(0, 5);
      expect(stats.getData().elementsInjected).toBe(0);
      expect(stats.getData().filesTransformed).toBe(1);
    });

    it('should handle zero duration', () => {
      stats.recordTransform(5, 0);
      expect(stats.getData().totalTimeMs).toBe(0);
      expect(stats.getData().filesTransformed).toBe(1);
    });
  });

  describe('getAverageTimeMs', () => {
    it('should return 0 when no files transformed', () => {
      expect(stats.getAverageTimeMs()).toBe(0);
    });

    it('should calculate average time correctly', () => {
      stats.recordTransform(5, 10);
      stats.recordTransform(3, 20);
      stats.recordTransform(7, 30);

      expect(stats.getAverageTimeMs()).toBe(20); // (10 + 20 + 30) / 3
    });

    it('should handle single file', () => {
      stats.recordTransform(5, 15.5);
      expect(stats.getAverageTimeMs()).toBe(15.5);
    });

    it('should handle fractional times', () => {
      stats.recordTransform(1, 3.33);
      stats.recordTransform(1, 6.67);

      expect(stats.getAverageTimeMs()).toBeCloseTo(5.0, 2);
    });
  });

  describe('getAverageElementsPerFile', () => {
    it('should return 0 when no files transformed', () => {
      expect(stats.getAverageElementsPerFile()).toBe(0);
    });

    it('should calculate average elements correctly', () => {
      stats.recordTransform(5, 10);
      stats.recordTransform(3, 20);
      stats.recordTransform(7, 30);

      expect(stats.getAverageElementsPerFile()).toBe(5); // (5 + 3 + 7) / 3
    });

    it('should handle single file', () => {
      stats.recordTransform(10, 15);
      expect(stats.getAverageElementsPerFile()).toBe(10);
    });

    it('should handle files with zero elements', () => {
      stats.recordTransform(0, 5);
      stats.recordTransform(0, 10);

      expect(stats.getAverageElementsPerFile()).toBe(0);
    });

    it('should handle fractional averages', () => {
      stats.recordTransform(5, 10);
      stats.recordTransform(3, 20);

      expect(stats.getAverageElementsPerFile()).toBe(4); // (5 + 3) / 2
    });
  });

  describe('getData', () => {
    it('should return a copy of the data', () => {
      stats.recordTransform(5, 10);
      const data = stats.getData();

      expect(data).toEqual({
        filesTransformed: 1,
        elementsInjected: 5,
        totalTimeMs: 10,
      });

      // Mutating returned data should not affect stats
      (data as { filesTransformed: number }).filesTransformed = 999;
      expect(stats.getData().filesTransformed).toBe(1);
    });

    it('should return readonly data', () => {
      const data = stats.getData();

      // TypeScript should enforce readonly, but verify at runtime
      expect(() => {
        (data as { filesTransformed: number }).filesTransformed = 999;
      }).not.toThrow();

      // Verify original data is unchanged
      expect(stats.getData().filesTransformed).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all counters to zero', () => {
      stats.recordTransform(5, 10);
      stats.recordTransform(3, 20);

      stats.reset();

      expect(stats.getData()).toEqual({
        filesTransformed: 0,
        elementsInjected: 0,
        totalTimeMs: 0,
      });
    });

    it('should allow recording after reset', () => {
      stats.recordTransform(5, 10);
      stats.reset();
      stats.recordTransform(3, 5);

      expect(stats.getData()).toEqual({
        filesTransformed: 1,
        elementsInjected: 3,
        totalTimeMs: 5,
      });
    });
  });

  describe('print', () => {
    it('should print "no files" message when no files transformed', () => {
      stats.print('test-adapter');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n[test-adapter] No files transformed',
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should print formatted statistics', () => {
      stats.recordTransform(5, 10);
      stats.recordTransform(3, 20);

      stats.print('test-adapter');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n[test-adapter] Transform Statistics:',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('  Files transformed: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Elements injected: 8');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Total time: 30.00ms');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Average time per file: 15.00ms',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Average elements per file: 4.0',
      );
    });

    it('should include manager stats when provided', () => {
      stats.recordTransform(5, 10);

      const managerStats = {
        entryCount: 42,
        filesIndexed: 10,
        lastFlush: '2025-09-30T12:00:00.000Z',
      };

      stats.print('test-adapter', managerStats);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Manifest entries written: 42',
      );
    });

    it('should not include manager stats when null', () => {
      stats.recordTransform(5, 10);

      stats.print('test-adapter', null);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Manifest entries written'),
      );
    });

    it('should not include manager stats when undefined', () => {
      stats.recordTransform(5, 10);

      stats.print('test-adapter');

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Manifest entries written'),
      );
    });

    it('should format decimal places correctly', () => {
      stats.recordTransform(7, 3.456);

      stats.print('test-adapter');

      // Total time should be rounded to 2 decimal places
      expect(consoleLogSpy).toHaveBeenCalledWith('  Total time: 3.46ms');

      // Average time should be rounded to 2 decimal places
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Average time per file: 3.46ms',
      );

      // Average elements should be rounded to 1 decimal place
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Average elements per file: 7.0',
      );
    });

    it('should use custom prefix', () => {
      stats.recordTransform(1, 1);

      stats.print('custom-prefix');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n[custom-prefix] Transform Statistics:',
      );
    });
  });

  describe('createTransformStats', () => {
    it('should create a new instance', () => {
      const instance = createTransformStats();
      expect(instance).toBeInstanceOf(TransformStats);
    });

    it('should create independent instances', () => {
      const stats1 = createTransformStats();
      const stats2 = createTransformStats();

      stats1.recordTransform(5, 10);

      expect(stats1.getData().filesTransformed).toBe(1);
      expect(stats2.getData().filesTransformed).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      stats.recordTransform(1000000, 500000);

      expect(stats.getData().elementsInjected).toBe(1000000);
      expect(stats.getData().totalTimeMs).toBe(500000);
    });

    it('should handle very small numbers', () => {
      stats.recordTransform(1, 0.001);

      expect(stats.getData().totalTimeMs).toBe(0.001);
      expect(stats.getAverageTimeMs()).toBe(0.001);
    });

    it('should handle negative numbers (edge case - should not happen in practice)', () => {
      // This tests robustness, even though negative values don't make sense
      stats.recordTransform(-5, -10);

      expect(stats.getData().elementsInjected).toBe(-5);
      expect(stats.getData().totalTimeMs).toBe(-10);
    });

    it('should handle many transformations', () => {
      for (let i = 0; i < 1000; i++) {
        stats.recordTransform(5, 10);
      }

      expect(stats.getData().filesTransformed).toBe(1000);
      expect(stats.getData().elementsInjected).toBe(5000);
      expect(stats.getData().totalTimeMs).toBe(10000);
    });
  });

  describe('immutability', () => {
    it('should not expose internal state via getData', () => {
      stats.recordTransform(5, 10);
      const data1 = stats.getData();
      const data2 = stats.getData();

      expect(data1).toEqual(data2);
      expect(data1).not.toBe(data2); // Different objects
    });

    it('should preserve data across multiple getData calls', () => {
      stats.recordTransform(5, 10);

      const data1 = stats.getData();
      stats.recordTransform(3, 20);
      const data2 = stats.getData();

      expect(data1.filesTransformed).toBe(1);
      expect(data2.filesTransformed).toBe(2);
    });
  });
});
