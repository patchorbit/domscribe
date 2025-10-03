import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchWriter } from './batch-writer.js';
import type { ManifestEntry } from '@domscribe/core';

const appendFile = vi.fn();
const mkdir = vi.fn();

// Mock fs module
vi.mock('fs/promises', () => ({
  mkdir: async (...args: unknown[]) => mkdir(...args),
  appendFile: async (...args: unknown[]) => appendFile(...args),
}));

describe('BatchWriter', () => {
  let writer: BatchWriter;
  const testPath = '/tmp/test-manifest.jsonl';

  const entry1: ManifestEntry = {
    id: 'abc12345',
    file: 'Button.tsx',
    start: { line: 10, column: 2 },
    tagName: 'button',
  };

  const entry2: ManifestEntry = {
    id: 'def67890',
    file: 'Input.tsx',
    start: { line: 5, column: 0 },
    tagName: 'input',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mkdir.mockResolvedValue(undefined);
    appendFile.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (writer) {
      await writer.stop();
    }
  });

  describe('lifecycle', () => {
    it('should start successfully', () => {
      writer = new BatchWriter(testPath);
      writer.start();

      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(0);
      expect(stats.totalWritten).toBe(0);
    });

    it('should not start twice', () => {
      writer = new BatchWriter(testPath);
      writer.start();
      writer.start(); // Second start should be no-op

      expect(writer.getStats()).toBeDefined();
    });

    it('should stop and flush remaining entries', async () => {
      writer = new BatchWriter(testPath);
      writer.start();
      await writer.append([entry1]);

      await writer.stop();

      expect(appendFile).toHaveBeenCalled();
      expect(writer.getStats().bufferSize).toBe(0);
    });

    it('should throw if append called before start', async () => {
      writer = new BatchWriter(testPath);

      await expect(writer.append([entry1])).rejects.toThrow(
        'BatchWriter not started. Call start() first.',
      );
    });
  });

  describe('buffering', () => {
    it('should buffer entries until batch size reached', async () => {
      writer = new BatchWriter(testPath, { batchSize: 3 });
      writer.start();

      await writer.append([entry1, entry2]); // Buffer: 2 entries
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not flush yet
      expect(appendFile).not.toHaveBeenCalled();
      expect(writer.getStats().bufferSize).toBe(2);
    });

    it('should auto-flush when batch size reached', async () => {
      writer = new BatchWriter(testPath, { batchSize: 2 });
      writer.start();

      await writer.append([entry1, entry2]); // Reaches batch size
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(appendFile).toHaveBeenCalled();
      expect(writer.getStats().totalWritten).toBe(2);
    });

    it('should auto-flush on interval', async () => {
      writer = new BatchWriter(testPath, {
        flushIntervalMs: 50,
        batchSize: 100, // High threshold
      });
      writer.start();

      await writer.append([entry1]);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(appendFile).toHaveBeenCalled();
      expect(writer.getStats().totalWritten).toBe(1);
    });
  });

  describe('flushing', () => {
    it('should write JSONL format', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.append([entry1, entry2]);
      await writer.flush();

      const writeCall = appendFile.mock.calls[0];
      const content = writeCall[1] as string;

      // Should be valid JSONL
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);

      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);

      expect(parsed1.id).toBe('abc12345');
      expect(parsed2.id).toBe('def67890');
    });

    it('should create directory if missing', async () => {
      writer = new BatchWriter('/new/path/manifest.jsonl');
      writer.start();

      await writer.append([entry1]);
      await writer.flush();

      expect(mkdir).toHaveBeenCalledWith('/new/path', {
        recursive: true,
      });
    });

    it('should handle multiple flushes', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.append([entry1]);
      await writer.flush();

      await writer.append([entry2]);
      await writer.flush();

      expect(appendFile).toHaveBeenCalledTimes(2);
      expect(writer.getStats().totalWritten).toBe(2);
      expect(writer.getStats().flushCount).toBe(2);
    });

    it('should not flush when buffer is empty', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.flush();

      expect(appendFile).not.toHaveBeenCalled();
    });

    it('should handle flush errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      writer = new BatchWriter(testPath, { debug: true });
      writer.start();

      appendFile.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await writer.append([entry1]);
      await writer.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[domscribe-manifest][batch-writer] Flush failed:',
        'Write failed',
      );

      // Entry should be back in buffer for retry
      expect(writer.getStats().bufferSize).toBe(1);
    });
  });

  describe('statistics', () => {
    it('should track total written', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.append([entry1, entry2]);
      await writer.flush();

      const stats = writer.getStats();
      expect(stats.totalWritten).toBe(2);
      expect(stats.flushCount).toBe(1);
      expect(stats.bufferSize).toBe(0);
    });

    it('should track buffer size', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.append([entry1, entry2]);

      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(2);
    });

    it('should track flush count', async () => {
      writer = new BatchWriter(testPath);
      writer.start();

      await writer.append([entry1]);
      await writer.flush();

      await writer.append([entry2]);
      await writer.flush();

      const stats = writer.getStats();
      expect(stats.flushCount).toBe(2);
    });
  });

  describe('debug mode', () => {
    it('should log when debug enabled', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      writer = new BatchWriter(testPath, { debug: true });
      writer.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[domscribe-manifest][batch-writer] Started'),
      );

      await writer.append([entry1]);
      await writer.flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-manifest][batch-writer] Flushed 1 entries',
        ),
      );

      await writer.stop();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[domscribe-manifest][batch-writer] Stopped'),
      );

      consoleSpy.mockRestore();
    });

    it('should not log when debug disabled', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      writer = new BatchWriter(testPath, { debug: false });
      writer.start();
      await writer.append([entry1]);
      await writer.flush();
      await writer.stop();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
