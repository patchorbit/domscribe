/**
 * Tests for IDStabilizer
 *
 * Tests the HMR-stable element ID generator that uses file content hashing
 * and position caching to maintain stable IDs across HMR cycles.
 *
 * This test suite focuses on testing the business logic of IDStabilizer only,
 * with all external dependencies mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDStabilizer } from './id-stabilizer.js';
import type { SourcePosition } from '@domscribe/core';
import type { IDCacheStats, SerializedIDCache, FileIdentity } from './types.js';

// Mock all external dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('xxhash-wasm', () => ({
  default: vi.fn(),
}));

// Import mocked modules to access mock functions
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from 'fs';
import xxhashFactory, { XXHashAPI } from 'xxhash-wasm';

const mockMkdirSync = vi.mocked(mkdirSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockRenameSync = vi.mocked(renameSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
const mockExistsSync = vi.mocked(existsSync);
const mockXxhashFactory = vi.mocked(xxhashFactory);

/** Matches a valid 8-char base58 ID */
const ID_FORMAT = /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/;

// Helper functions
function createFileIdentity(
  filePath: string,
  fileContent: string,
): FileIdentity {
  return { filePath, fileContent };
}

function createPosition(
  line: number | null,
  column: number | null,
  offset?: number,
): SourcePosition {
  return { line, column, offset };
}

function mockHash(content: string): string {
  // Must match computeFileHash: h64(content).toString(16).padStart(16, '0')
  // Our h64 mock produces: hash = sum of (char * 31^i) as bigint
  let hash = 0n;
  for (let i = 0; i < content.length; i++) {
    hash = hash * 31n + BigInt(content.charCodeAt(i));
  }
  return hash.toString(16).padStart(16, '0');
}

function createSerializedCache(
  entries: Array<{
    filePath: string;
    fileHash: string;
    ids: Record<string, string>;
    timestamp?: number;
  }>,
): SerializedIDCache {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    entries: entries.map((e) => ({
      ...e,
      timestamp: e.timestamp ?? Date.now(),
    })),
  };
}

describe('IDStabilizer', () => {
  let stabilizer: IDStabilizer;
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock xxhash factory to return a hasher with h64 that produces real bigints
    mockXxhashFactory.mockResolvedValue({
      ...vi.mocked({} as XXHashAPI),
      h64: vi.fn((content: string) => {
        // Produce a deterministic bigint from content for testing
        let hash = 0n;
        for (let i = 0; i < content.length; i++) {
          hash = hash * 31n + BigInt(content.charCodeAt(i));
        }
        return hash;
      }),
    });

    // Default: no cache file exists
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });

    // Reset singleton instances to ensure clean state
    IDStabilizer.resetInstances();

    stabilizer = new IDStabilizer(workspaceRoot);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return same instance for same cache directory', () => {
      // Act
      const instance1 = IDStabilizer.getInstance(workspaceRoot);
      const instance2 = IDStabilizer.getInstance(workspaceRoot);

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should return different instances for different directories', () => {
      // Act
      const instance1 = IDStabilizer.getInstance('/workspace1');
      const instance2 = IDStabilizer.getInstance('/workspace2');

      // Assert
      expect(instance1).not.toBe(instance2);
    });

    it('should normalize paths to absolute', () => {
      // Act
      const instance1 = IDStabilizer.getInstance('/workspace/.');
      const instance2 = IDStabilizer.getInstance('/workspace');

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should use options only on first call', async () => {
      // Arrange & Act
      const instance1 = IDStabilizer.getInstance(workspaceRoot, {
        debug: true,
      });
      const instance2 = IDStabilizer.getInstance(workspaceRoot, {
        debug: false,
      });

      // Assert - both should be the same instance (first call options win)
      expect(instance1).toBe(instance2);
    });

    it('should clear all instances on resetInstances', () => {
      // Arrange
      const instance1 = IDStabilizer.getInstance('/workspace1');
      const instance2 = IDStabilizer.getInstance('/workspace2');

      // Act
      IDStabilizer.resetInstances();
      const instance3 = IDStabilizer.getInstance('/workspace1');
      const instance4 = IDStabilizer.getInstance('/workspace2');

      // Assert - new instances after reset
      expect(instance3).not.toBe(instance1);
      expect(instance4).not.toBe(instance2);
    });
  });

  describe('IDGenerator interface', () => {
    describe('initialize()', () => {
      it('should initialize xxhash-wasm hasher', async () => {
        // Arrange
        const newStabilizer = new IDStabilizer(workspaceRoot);

        // Act
        await newStabilizer.initialize();

        // Assert
        expect(mockXxhashFactory).toHaveBeenCalled();
      });

      it('should not throw when called multiple times', async () => {
        // Arrange & Act & Assert
        await expect(stabilizer.initialize()).resolves.not.toThrow();
        await expect(stabilizer.initialize()).resolves.not.toThrow();
        await expect(stabilizer.initialize()).resolves.not.toThrow();
      });

      it('should allow getStableId to work after initialization', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'content');
        const position = createPosition(10, 10);

        // Act
        const id = stabilizer.getStableId(fileIdentity, position);

        // Assert
        expect(id).toMatch(ID_FORMAT);
      });
    });

    describe('getStableId() - cache hits', () => {
      it('should return same ID for identical file and position', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');
        const position = createPosition(10, 10);

        // Act
        const id1 = stabilizer.getStableId(fileIdentity, position);
        const id2 = stabilizer.getStableId(fileIdentity, position);

        // Assert
        expect(id2).toBe(id1);
        expect(id1).toMatch(ID_FORMAT);
      });

      it('should track cache hit when returning cached ID', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(fileIdentity, position); // Miss
        stabilizer.getStableId(fileIdentity, position); // Hit

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
      });

      it('should return cached ID across multiple positions in same file', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

        // Act
        const id1 = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10),
        );
        const id2 = stabilizer.getStableId(
          fileIdentity,
          createPosition(15, 15),
        );
        const id1Again = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10),
        );

        // Assert
        expect(id1Again).toBe(id1);
        expect(id1).not.toBe(id2);
      });
    });

    describe('getStableId() - cache misses', () => {
      it('should generate new ID for new file', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');
        const position = createPosition(10, 10);

        // Act
        const id = stabilizer.getStableId(fileIdentity, position);

        // Assert
        expect(id).toMatch(ID_FORMAT);
      });

      it('should track cache miss for new file', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(fileIdentity, position);

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.misses).toBe(1);
        expect(stats.hits).toBe(0);
      });

      it('should generate new ID when file content changes', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        const id1 = stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'const x = 1;'),
          position,
        );
        const id2 = stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'const x = 2;'),
          position,
        );

        // Assert
        expect(id2).not.toBe(id1);
        expect(id1).toMatch(ID_FORMAT);
        expect(id2).toMatch(ID_FORMAT);
      });

      it('should track cache miss when file content changes', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'const x = 1;'),
          position,
        );
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'const x = 2;'),
          position,
        );

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.misses).toBe(2);
      });
    });

    describe('getStableId() - position handling', () => {
      it('should generate different IDs for different positions in same file', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

        // Act
        const id1 = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10),
        );
        const id2 = stabilizer.getStableId(
          fileIdentity,
          createPosition(15, 15),
        );

        // Assert
        expect(id2).not.toBe(id1);
      });

      it('should treat positions with different offsets as different', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

        // Act
        const id1 = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10, 100),
        );
        const id2 = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10, 200),
        );
        const id3 = stabilizer.getStableId(
          fileIdentity,
          createPosition(10, 10),
        );

        // Assert
        expect(id1).not.toBe(id2);
        expect(id1).not.toBe(id3);
        expect(id2).not.toBe(id3);
      });

      it('should handle null line and column values', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

        // Act
        const id1 = stabilizer.getStableId(
          fileIdentity,
          createPosition(null, null),
        );
        const id2 = stabilizer.getStableId(
          fileIdentity,
          createPosition(null, null),
        );

        // Assert
        expect(id2).toBe(id1);
      });
    });

    describe('getStableId() - multiple files', () => {
      it('should handle multiple files independently', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        const id1 = stabilizer.getStableId(
          createFileIdentity('/file1.tsx', 'content1'),
          position,
        );
        const id2 = stabilizer.getStableId(
          createFileIdentity('/file2.tsx', 'content2'),
          position,
        );
        const id3 = stabilizer.getStableId(
          createFileIdentity('/file3.tsx', 'content3'),
          position,
        );

        // Assert
        expect(id1).not.toBe(id2);
        expect(id1).not.toBe(id3);
        expect(id2).not.toBe(id3);
      });

      it('should track correct entry count for multiple files', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(
          createFileIdentity('/file1.tsx', 'content1'),
          position,
        );
        stabilizer.getStableId(
          createFileIdentity('/file2.tsx', 'content2'),
          position,
        );
        stabilizer.getStableId(
          createFileIdentity('/file3.tsx', 'content3'),
          position,
        );

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(3);
      });
    });

    describe('getStableId() - hash computation efficiency', () => {
      it('should compute hash only once for multiple elements in the same file', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

        // Get the h64 spy from the mock hasher
        const hasherInstance = await mockXxhashFactory.mock.results[0]?.value;
        const h64Spy = hasherInstance?.h64;

        // Act - simulate processing multiple elements in the same file
        stabilizer.getStableId(fileIdentity, createPosition(1, 0));
        stabilizer.getStableId(fileIdentity, createPosition(2, 0));
        stabilizer.getStableId(fileIdentity, createPosition(3, 0));
        stabilizer.getStableId(fileIdentity, createPosition(4, 0));
        stabilizer.getStableId(fileIdentity, createPosition(5, 0));

        // Assert - file hash computed once (cached), plus 5 h64 calls for deterministic ID generation
        // Total: 1 file hash + 5 ID hashes = 6
        expect(h64Spy).toHaveBeenCalledTimes(6);
      });

      it('should recompute hash when file content changes', async () => {
        // Arrange
        await stabilizer.initialize();

        // Get the h64 spy from the mock hasher
        const hasherInstance = await mockXxhashFactory.mock.results[0]?.value;
        const h64Spy = hasherInstance?.h64;

        // Act - process elements from files with different content
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content v1'),
          createPosition(1, 0),
        );
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content v2'),
          createPosition(1, 0),
        );

        // Assert - 2 file hashes (content changed) + 2 ID hashes = 4
        expect(h64Spy).toHaveBeenCalledTimes(4);
      });

      it('should recompute hash when switching to a different file', async () => {
        // Arrange
        await stabilizer.initialize();

        // Get the h64 spy from the mock hasher
        const hasherInstance = await mockXxhashFactory.mock.results[0]?.value;
        const h64Spy = hasherInstance?.h64;

        // Act - process elements from different files
        stabilizer.getStableId(
          createFileIdentity('/file1.tsx', 'content'),
          createPosition(1, 0),
        );
        stabilizer.getStableId(
          createFileIdentity('/file2.tsx', 'content'),
          createPosition(1, 0),
        );

        // Assert - 2 file hashes (different files) + 2 ID hashes = 4
        expect(h64Spy).toHaveBeenCalledTimes(4);
      });

      it('should use cached hash when returning to previously processed file with same content', async () => {
        // Arrange
        await stabilizer.initialize();
        const file1 = createFileIdentity('/file1.tsx', 'content1');
        const file2 = createFileIdentity('/file2.tsx', 'content2');

        // Get the h64 spy from the mock hasher
        const hasherInstance = await mockXxhashFactory.mock.results[0]?.value;
        const h64Spy = hasherInstance?.h64;

        // Act - process file1, then file2, then back to file1
        stabilizer.getStableId(file1, createPosition(1, 0));
        stabilizer.getStableId(file2, createPosition(1, 0));
        stabilizer.getStableId(file1, createPosition(2, 0)); // Back to file1

        // Assert - 3 file hashes (cache only holds most recent file) + 3 ID hashes = 6
        // file1 pos(1,0): new file → file hash + ID hash
        // file2 pos(1,0): new file → file hash + ID hash
        // file1 pos(2,0): file hash recomputed (not cached) + new position → ID hash
        expect(h64Spy).toHaveBeenCalledTimes(6);
      });
    });
  });

  describe('CacheControl interface', () => {
    describe('saveCache()', () => {
      it('should write cache to disk with correct structure', async () => {
        // Arrange
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        stabilizer.saveCache();

        // Assert
        // Should write to temp file then rename
        expect(mockWriteFileSync).toHaveBeenCalledWith(
          expect.stringMatching(/\.tmp\.\d+$/),
          expect.any(String),
          'utf-8',
        );
        expect(mockRenameSync).toHaveBeenCalledWith(
          expect.stringMatching(/\.tmp\.\d+$/),
          `${workspaceRoot}/id-cache.json`,
        );

        // Verify JSON structure
        const writtenData = mockWriteFileSync.mock.calls[0]?.[1] as string;
        const parsed: SerializedIDCache = JSON.parse(writtenData);
        expect(parsed.version).toBe('1.0.0');
        expect(parsed.generatedAt).toBeDefined();
        expect(parsed.entries).toBeInstanceOf(Array);
        expect(parsed.entries.length).toBe(1);
      });

      it('should skip save when cache is not dirty', async () => {
        // Arrange
        await stabilizer.initialize();

        // Act - save without making any changes
        stabilizer.saveCache();

        // Assert
        expect(mockWriteFileSync).not.toHaveBeenCalled();
      });

      it('should clear dirty flag after successful save', async () => {
        // Arrange
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        stabilizer.saveCache();
        mockWriteFileSync.mockClear();
        stabilizer.saveCache();

        // Assert - second save should be skipped
        expect(mockWriteFileSync).not.toHaveBeenCalled();
      });

      it('should handle write errors gracefully', async () => {
        // Arrange
        await stabilizer.initialize();
        mockWriteFileSync.mockImplementationOnce(() => {
          throw new Error('EACCES: permission denied');
        });
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act & Assert - saveCache should not throw on write errors
        expect(() => stabilizer.saveCache()).not.toThrow();
      });

      it('should use custom cache file name when specified', async () => {
        // Arrange
        const customStabilizer = new IDStabilizer(workspaceRoot, {
          cacheFileName: 'custom-cache.json',
        });
        await customStabilizer.initialize();
        customStabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        customStabilizer.saveCache();

        // Assert - should rename to custom cache file name
        expect(mockRenameSync).toHaveBeenCalledWith(
          expect.stringMatching(/custom-cache\.json\.tmp\.\d+$/),
          `${workspaceRoot}/custom-cache.json`,
        );
      });

      it('should use atomic write pattern (temp file + rename)', async () => {
        // Arrange
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        stabilizer.saveCache();

        // Assert - should write to temp file then rename
        expect(mockWriteFileSync).toHaveBeenCalledWith(
          expect.stringMatching(/\.tmp\.\d+$/),
          expect.any(String),
          'utf-8',
        );
        expect(mockRenameSync).toHaveBeenCalledWith(
          expect.stringMatching(/\.tmp\.\d+$/),
          `${workspaceRoot}/id-cache.json`,
        );
      });

      it('should clean up temp file when write fails', async () => {
        // Arrange
        mockWriteFileSync.mockImplementationOnce(() => {
          throw new Error('Write failed');
        });
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        stabilizer.saveCache();

        // Assert - should attempt to unlink temp file
        expect(mockUnlinkSync).toHaveBeenCalledWith(
          expect.stringMatching(/\.tmp\.\d+$/),
        );
      });

      it('should not rename if write to temp file fails', async () => {
        // Arrange
        mockWriteFileSync.mockImplementationOnce(() => {
          throw new Error('Write failed');
        });
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );

        // Act
        stabilizer.saveCache();

        // Assert - should not call rename
        expect(mockRenameSync).not.toHaveBeenCalled();
      });
    });

    describe('loadCache()', () => {
      it('should load cache from disk and restore IDs', async () => {
        // Arrange
        const cachedData = createSerializedCache([
          {
            filePath: '/test.tsx',
            fileHash: mockHash('const x = 1;'),
            ids: {
              '10:10': 'cached123',
            },
          },
        ]);
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(cachedData));

        // Act
        await stabilizer.initialize();
        stabilizer.loadCache();
        const id = stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'const x = 1;'),
          createPosition(10, 10),
        );

        // Assert
        expect(id).toBe('cached123');
        expect(mockReadFileSync).toHaveBeenCalledWith(
          `${workspaceRoot}/id-cache.json`,
          'utf-8',
        );
      });

      it('should handle missing cache file gracefully', () => {
        // Arrange
        mockExistsSync.mockReturnValue(false);

        // Act & Assert - loadCache() is now sync and returns early when file doesn't exist
        expect(() => stabilizer.loadCache()).not.toThrow();
      });

      it('should handle corrupted cache file gracefully', () => {
        // Arrange
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('invalid json{{{');

        // Act & Assert - should not throw on corrupted cache
        expect(() => stabilizer.loadCache()).not.toThrow();

        // Cache should remain empty
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(0);
      });

      it('should reject cache with mismatched schema version', () => {
        // Arrange
        const invalidCache = createSerializedCache([]);
        invalidCache.version = '99.0.0';
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(invalidCache));

        // Act
        stabilizer.loadCache();

        // Assert - cache should be empty (version mismatch discards entries)
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(0);
      });

      it('should load multiple files from cache', async () => {
        // Arrange
        const cachedData = createSerializedCache([
          {
            filePath: '/file1.tsx',
            fileHash: mockHash('content1'),
            ids: {
              '10:10': 'id1',
            },
          },
          {
            filePath: '/file2.tsx',
            fileHash: mockHash('content2'),
            ids: {
              '15:15': 'id2',
            },
          },
        ]);
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(cachedData));

        // Act
        await stabilizer.initialize();
        stabilizer.loadCache();

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(2);
      });
    });

    describe('clearCache()', () => {
      it('should clear all cached entries', async () => {
        // Arrange
        await stabilizer.initialize();
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(10, 10),
        );
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content'),
          createPosition(15, 15),
        );

        // Act
        stabilizer.clearCache();

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(0);
      });

      it('should reset hit and miss statistics', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'content');
        stabilizer.getStableId(fileIdentity, createPosition(10, 10)); // Miss
        stabilizer.getStableId(fileIdentity, createPosition(10, 10)); // Hit

        // Act
        stabilizer.clearCache();

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });

      it('should produce same deterministic ID after clearing cache', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'content');
        const position = createPosition(10, 10);
        const id1 = stabilizer.getStableId(fileIdentity, position);

        // Act
        stabilizer.clearCache();
        const id2 = stabilizer.getStableId(fileIdentity, position);

        // Assert - deterministic: same input → same output
        expect(id2).toBe(id1);
      });
    });

    describe('getCacheStats()', () => {
      it('should return complete stats structure', async () => {
        // Arrange
        await stabilizer.initialize();

        // Act
        const stats = stabilizer.getCacheStats();

        // Assert
        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('misses');
        expect(stats).toHaveProperty('entries');
        expect(stats).toHaveProperty('hitRate');
      });

      it('should track cache hits accurately', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'content');
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(fileIdentity, position); // Miss
        stabilizer.getStableId(fileIdentity, position); // Hit
        stabilizer.getStableId(fileIdentity, position); // Hit

        // Assert
        const stats: IDCacheStats = stabilizer.getCacheStats();
        expect(stats.hits).toBe(2);
      });

      it('should track cache misses accurately', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content1'),
          position,
        ); // Miss
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content1'),
          createPosition(15, 15),
        ); // Miss
        stabilizer.getStableId(
          createFileIdentity('/test.tsx', 'content2'),
          position,
        ); // Miss

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.misses).toBe(3);
      });

      it('should calculate hit rate correctly', async () => {
        // Arrange
        await stabilizer.initialize();
        const fileIdentity = createFileIdentity('/test.tsx', 'content');
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(fileIdentity, position); // Miss
        stabilizer.getStableId(fileIdentity, position); // Hit
        stabilizer.getStableId(fileIdentity, position); // Hit
        stabilizer.getStableId(fileIdentity, position); // Hit

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.hitRate).toBe(0.75); // 3 hits / 4 total
      });

      it('should return zero hit rate when no operations performed', () => {
        // Arrange & Act
        const stats = stabilizer.getCacheStats();

        // Assert
        expect(stats.hitRate).toBe(0);
      });

      it('should count total entries correctly', async () => {
        // Arrange
        await stabilizer.initialize();
        const position = createPosition(10, 10);

        // Act
        stabilizer.getStableId(
          createFileIdentity('/file1.tsx', 'content1'),
          position,
        );
        stabilizer.getStableId(
          createFileIdentity('/file2.tsx', 'content2'),
          position,
        );
        stabilizer.getStableId(
          createFileIdentity('/file3.tsx', 'content3'),
          position,
        );

        // Assert
        const stats = stabilizer.getCacheStats();
        expect(stats.entries).toBe(3);
      });
    });
  });

  describe('Error handling', () => {
    it('should recover from corrupted cache and generate new IDs', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not valid json');

      // Act
      stabilizer.loadCache();
      await stabilizer.initialize();

      // Assert - should continue working with empty cache
      const id = stabilizer.getStableId(
        createFileIdentity('/test.tsx', 'content'),
        createPosition(10, 10),
      );
      expect(id).toMatch(ID_FORMAT);
    });

    it('should start fresh after version mismatch', async () => {
      // Arrange
      const invalidCache = createSerializedCache([
        {
          filePath: '/test.tsx',
          fileHash: 'hash123',
          ids: { '/test.tsx': 'cached123' },
        },
      ]);
      invalidCache.version = '99.0.0';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(invalidCache));

      // Act
      stabilizer.loadCache();
      await stabilizer.initialize();

      // Assert - should generate new ID, not use cached one
      const id = stabilizer.getStableId(
        createFileIdentity('/test.tsx', 'content'),
        createPosition(10, 10),
      );
      expect(id).not.toBe('cached123');
    });

    it('should handle missing directory creation errors', async () => {
      // Arrange
      mockMkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      await expect(stabilizer.initialize()).rejects.toThrow(
        'EACCES: permission denied',
      );
    });

    it('should continue generating IDs even after cache errors', async () => {
      // Arrange
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      await stabilizer.initialize();

      // Act - generate ID, save (fails), generate another ID
      const id1 = stabilizer.getStableId(
        createFileIdentity('/test.tsx', 'content'),
        createPosition(10, 10),
      );
      stabilizer.saveCache();
      const id2 = stabilizer.getStableId(
        createFileIdentity('/test2.tsx', 'content2'),
        createPosition(15, 15),
      );

      // Assert - should continue working
      expect(id1).toMatch(ID_FORMAT);
      expect(id2).toMatch(ID_FORMAT);
      expect(id2).not.toBe(id1);
    });
  });

  describe('Options configuration', () => {
    it('should use default cache file name when not specified', async () => {
      // Arrange
      const defaultStabilizer = new IDStabilizer(workspaceRoot);
      await defaultStabilizer.initialize();
      defaultStabilizer.getStableId(
        createFileIdentity('/test.tsx', 'content'),
        createPosition(10, 10),
      );

      // Act
      defaultStabilizer.saveCache();

      // Assert - should rename to default cache file name
      expect(mockRenameSync).toHaveBeenCalledWith(
        expect.stringMatching(/id-cache\.json\.tmp\.\d+$/),
        `${workspaceRoot}/id-cache.json`,
      );
    });

    it('should use custom cache file name when specified', async () => {
      // Arrange
      const customStabilizer = new IDStabilizer(workspaceRoot, {
        cacheFileName: 'my-custom-cache.json',
      });
      await customStabilizer.initialize();
      customStabilizer.getStableId(
        createFileIdentity('/test.tsx', 'content'),
        createPosition(10, 10),
      );

      // Act
      customStabilizer.saveCache();

      // Assert - should rename to custom cache file name
      expect(mockRenameSync).toHaveBeenCalledWith(
        expect.stringMatching(/my-custom-cache\.json\.tmp\.\d+$/),
        `${workspaceRoot}/my-custom-cache.json`,
      );
    });
  });

  describe('Deterministic ID generation', () => {
    it('should produce identical IDs from independent instances for same input', async () => {
      // Arrange
      const s1 = new IDStabilizer('/workspace1');
      const s2 = new IDStabilizer('/workspace2');
      await s1.initialize();
      await s2.initialize();

      const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');
      const position = createPosition(10, 10);

      // Act & Assert
      expect(s1.getStableId(fileIdentity, position)).toBe(
        s2.getStableId(fileIdentity, position),
      );
    });

    it('should produce different IDs for different positions', async () => {
      // Arrange
      await stabilizer.initialize();
      const fileIdentity = createFileIdentity('/test.tsx', 'const x = 1;');

      // Act
      const id1 = stabilizer.getStableId(fileIdentity, createPosition(1, 0));
      const id2 = stabilizer.getStableId(fileIdentity, createPosition(2, 0));

      // Assert
      expect(id1).toMatch(ID_FORMAT);
      expect(id2).toMatch(ID_FORMAT);
      expect(id1).not.toBe(id2);
    });

    it('should produce different IDs for same position in different file content', async () => {
      // Arrange
      await stabilizer.initialize();
      const position = createPosition(10, 10);

      // Act
      const id1 = stabilizer.getStableId(
        createFileIdentity('/test.tsx', 'version 1'),
        position,
      );
      const id2 = stabilizer.getStableId(
        createFileIdentity('/test.tsx', 'version 2'),
        position,
      );

      // Assert
      expect(id1).toMatch(ID_FORMAT);
      expect(id2).toMatch(ID_FORMAT);
      expect(id1).not.toBe(id2);
    });
  });
});
