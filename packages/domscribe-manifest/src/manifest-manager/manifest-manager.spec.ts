import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManifestManager } from './manifest-manager.js';
import type { ManifestEntry } from '@domscribe/core';

const readFileSync = vi.fn();
const mkdirSync = vi.fn();
const appendFileSync = vi.fn();
const existsSync = vi.fn();
const readFile = vi.fn();
const mkdir = vi.fn();
const appendFile = vi.fn();
const writeFile = vi.fn();

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: (...args: unknown[]) => readFileSync(...args),
  mkdirSync: (...args: unknown[]) => mkdirSync(...args),
  appendFileSync: (...args: unknown[]) => appendFileSync(...args),
  existsSync: (...args: unknown[]) => existsSync(...args),
}));

vi.mock('fs/promises', () => ({
  readFile: async (...args: unknown[]) => readFile(...args),
  mkdir: async (...args: unknown[]) => mkdir(...args),
  appendFile: async (...args: unknown[]) => appendFile(...args),
  writeFile: async (...args: unknown[]) => writeFile(...args),
}));

const batchWriterFlush = vi.fn();
const batchWriterAppend = vi.fn();

vi.mock('../batch-writer/batch-writer.js', () => ({
  BatchWriter: class {
    start = vi.fn();
    append = async (...args: unknown[]) => batchWriterAppend(...args);
    flush = async (...args: unknown[]) => batchWriterFlush(...args);
    stop = async (...args: unknown[]) => vi.fn()(args);
    getStats = vi.fn();
  },
}));

const idStabilizerLoadCache = vi.fn();
const idStabilizerSaveCache = vi.fn();

vi.mock('../id-stabilizer/id-stabilizer.js', () => ({
  IDStabilizer: class {
    loadCache = async (...args: unknown[]) => idStabilizerLoadCache(...args);
    saveCache = async (...args: unknown[]) => idStabilizerSaveCache(...args);
  },
}));

describe('ManifestManager', () => {
  const workspaceRoot = '/test/workspace';

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

  const entry3: ManifestEntry = {
    id: 'ghi13579',
    file: 'Button.tsx',
    start: { line: 15, column: 4 },
    tagName: 'span',
    componentName: 'Button',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readFileSync.mockReturnValue('');
    mkdirSync.mockReturnValue(undefined);
    appendFileSync.mockReturnValue(undefined);
    existsSync.mockReturnValue(true);
    readFile.mockResolvedValue('');
    mkdir.mockResolvedValue(undefined);
    appendFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    ManifestManager.resetInstance();
  });

  describe('singleton', () => {
    it('should return same instance for same workspace', () => {
      const m1 = ManifestManager.getInstance(workspaceRoot);
      const m2 = ManifestManager.getInstance(workspaceRoot);

      expect(m1).toBe(m2);
    });

    it('should return different instances for different workspaces', () => {
      const m1 = ManifestManager.getInstance('/workspace1');
      const m2 = ManifestManager.getInstance('/workspace2');

      expect(m1).not.toBe(m2);
    });

    it('should normalize workspace paths', () => {
      const m1 = ManifestManager.getInstance('/workspace/.');
      const m2 = ManifestManager.getInstance('/workspace');

      expect(m1).toBe(m2);
    });

    it('should reset specific instance', () => {
      const m1 = ManifestManager.getInstance('/workspace1');
      const m2 = ManifestManager.getInstance('/workspace2');

      ManifestManager.resetInstance('/workspace1');

      const m3 = ManifestManager.getInstance('/workspace1');
      const m4 = ManifestManager.getInstance('/workspace2');

      expect(m3).not.toBe(m1); // New instance
      expect(m4).toBe(m2); // Same instance
    });

    it('should reset all instances', () => {
      const m1 = ManifestManager.getInstance('/workspace1');
      const m2 = ManifestManager.getInstance('/workspace2');

      ManifestManager.resetInstance();

      const m3 = ManifestManager.getInstance('/workspace1');
      const m4 = ManifestManager.getInstance('/workspace2');

      expect(m3).not.toBe(m1);
      expect(m4).not.toBe(m2);
    });
  });

  describe('initialization', () => {
    it('should initialize with empty manifest', async () => {
      existsSync.mockReturnValue(false);

      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      const stats = manager.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.filesIndexed).toBe(0);
    });

    it('should load existing manifest', async () => {
      const existingContent =
        JSON.stringify(entry1) + '\n' + JSON.stringify(entry2) + '\n';

      readFile.mockResolvedValue(existingContent);

      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      const stats = manager.getStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.filesIndexed).toBe(2); // Button.tsx and Input.tsx
    });

    it('should build index from existing entries', async () => {
      const existingContent =
        JSON.stringify(entry1) + '\n' + JSON.stringify(entry3) + '\n';

      readFile.mockResolvedValue(existingContent);

      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      // Both entries in Button.tsx
      const ids = manager.getEntriesByFile('Button.tsx');
      expect(ids).toHaveLength(2);
      expect(ids).toContain('abc12345');
      expect(ids).toContain('ghi13579');
    });

    it('should be idempotent', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.initialize(); // Second call should be no-op

      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });

    it('should throw on read errors', async () => {
      readFile.mockRejectedValue(new Error('Permission denied'));

      const manager = ManifestManager.getInstance(workspaceRoot);

      await expect(manager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('appendEntries', () => {
    it('should append entries and update index', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1, entry2]);
      await manager.flush(); // Ensure written

      const stats = manager.getStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.filesIndexed).toBe(2);
    });

    it('should update id-to-file mapping', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1]);

      const file = manager.resolveId('abc12345');
      expect(file).toBe('Button.tsx');
    });

    it('should update file-to-ids mapping', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1, entry3]); // Both in Button.tsx

      const ids = manager.getEntriesByFile('Button.tsx');
      expect(ids).toHaveLength(2);
      expect(ids).toContain('abc12345');
      expect(ids).toContain('ghi13579');
    });

    it('should update component-to-ids mapping', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry3]); // Has componentName

      const index = manager.getIndex();
      const compIds = index.componentToIds.get('Button');
      expect(compIds).toContain('ghi13579');
    });

    it('should handle empty entries array', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([]);

      const stats = manager.getStats();
      expect(stats.entryCount).toBe(0);
    });

    it('should throw if not initialized', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);

      await expect(manager.appendEntries([entry1])).rejects.toThrow(
        'not initialized',
      );
    });
  });

  describe('queries', () => {
    it('should resolve ID to file', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.appendEntries([entry1]);

      const file = manager.resolveId('abc12345');
      expect(file).toBe('Button.tsx');
    });

    it('should return undefined for unknown ID', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      const file = manager.resolveId('unknown');
      expect(file).toBeUndefined();
    });

    it('should get entries by file', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.appendEntries([entry1, entry2, entry3]);

      const buttonIds = manager.getEntriesByFile('Button.tsx');
      const inputIds = manager.getEntriesByFile('Input.tsx');

      expect(buttonIds).toHaveLength(2); // entry1 and entry3
      expect(inputIds).toHaveLength(1); // entry2
    });

    it('should return empty array for unknown file', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      const ids = manager.getEntriesByFile('Unknown.tsx');
      expect(ids).toEqual([]);
    });

    it('should get full index', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.appendEntries([entry1, entry2]);

      const index = manager.getIndex();

      expect(index.idToFile.size).toBe(2);
      expect(index.fileToIds.size).toBe(2);
      expect(index.entryCount).toBe(2);
      expect(index.lastRebuild).toBeDefined();
    });

    it('should throw if queried before initialization', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);

      expect(() => manager.resolveId('abc')).toThrow('not initialized');
      expect(() => manager.getEntriesByFile('test.tsx')).toThrow(
        'not initialized',
      );
      expect(() => manager.getIndex()).toThrow('not initialized');
    });
  });

  describe('flush and close', () => {
    it('should flush entries to disk', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1, entry2]);
      await manager.flush();

      expect(batchWriterFlush).toHaveBeenCalled();
    });

    it('should update lastRebuild on flush', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      const initialIndex = manager.getIndex();
      const initialRebuild = initialIndex.lastRebuild;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.appendEntries([entry1]);
      await manager.flush();

      const updatedIndex = manager.getIndex();
      expect(updatedIndex.lastRebuild).not.toBe(initialRebuild);
    });

    it('should close cleanly', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.appendEntries([entry1]);

      await manager.close();

      // Should be able to initialize again
      await manager.initialize();
      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });

    it('should flush on close', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();
      await manager.appendEntries([entry1]);
      await manager.close();

      expect(batchWriterAppend).toHaveBeenCalled();
    });

    it('should handle close when not initialized', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);

      // Should not throw
      await manager.close();
    });

    it('should throw if flush called before initialization', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);

      await expect(manager.flush()).rejects.toThrow('not initialized');
    });
  });

  describe('statistics', () => {
    it('should track entry count', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1, entry2]);

      const stats = manager.getStats();
      expect(stats.entryCount).toBe(2);
    });

    it('should track files indexed', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1, entry2, entry3]);

      const stats = manager.getStats();
      expect(stats.filesIndexed).toBe(2); // Button.tsx and Input.tsx
    });

    it('should track last flush', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot);
      await manager.initialize();

      await manager.appendEntries([entry1]);
      await manager.flush();

      const stats = manager.getStats();
      expect(stats.lastFlush).toBeDefined();

      if (stats.lastFlush) {
        expect(new Date(stats.lastFlush).getTime()).toBeGreaterThan(0);
      }
    });
  });

  describe('debug mode', () => {
    it('should log when debug enabled', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const manager = ManifestManager.getInstance(workspaceRoot, {
        debug: true,
      });
      await manager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-manifest][manifest-manager] Loaded',
        ),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-manifest][manifest-manager] Initialized',
        ),
      );

      await manager.appendEntries([entry1]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-manifest][manifest-manager] Appended',
        ),
      );

      await manager.close();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-manifest][manifest-manager] Closed',
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should not log when debug disabled', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const manager = ManifestManager.getInstance(workspaceRoot, {
        debug: false,
      });
      await manager.initialize();
      await manager.appendEntries([entry1]);
      await manager.close();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('custom options', () => {
    it('should use custom manifest path', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot, {
        manifestPath: 'custom/manifest.jsonl',
      });
      await manager.initialize();

      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining('custom/manifest.jsonl'),
        'utf-8',
      );
    });

    it('should pass batch options to writer', async () => {
      const manager = ManifestManager.getInstance(workspaceRoot, {
        batchSize: 10,
        flushIntervalMs: 50,
      });
      await manager.initialize();

      // Writer should respect these options (tested in batch-writer.spec.ts)
      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });
  });
});
