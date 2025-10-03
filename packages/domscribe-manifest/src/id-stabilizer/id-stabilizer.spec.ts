import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { IDStabilizer } from './id-stabilizer.js';

describe('IDStabilizer', () => {
  let tempDir: string;
  let stabilizer: IDStabilizer;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'domscribe-test-'));
    stabilizer = new IDStabilizer(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getStableId', () => {
    it('should generate new ID for new file', () => {
      const id = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      expect(id).toMatch(/^[0-9A-HJ-NP-Za-hj-np-z]{8}$/);
      expect(id.length).toBe(8);
    });

    it('should return same ID for same file hash and position', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      const id2 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      expect(id2).toBe(id1);
    });

    it('should generate new ID when file hash changes', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      const id2 = stabilizer.getStableId('/test.tsx', 'hash456', {
        line: 10,
        column: 10,
      });

      expect(id2).not.toBe(id1);
    });

    it('should generate new ID for new position in same file', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      const id2 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 15,
        column: 15,
      });

      expect(id2).not.toBe(id1);
    });

    it('should handle multiple positions in same file', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      const id2 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 15,
        column: 15,
      });
      const id3 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 20,
        column: 20,
      });

      // All IDs should be different
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);

      // But repeated calls should return same IDs
      expect(
        stabilizer.getStableId('/test.tsx', 'hash123', {
          line: 10,
          column: 10,
        }),
      ).toBe(id1);
      expect(
        stabilizer.getStableId('/test.tsx', 'hash123', {
          line: 15,
          column: 15,
        }),
      ).toBe(id2);
      expect(
        stabilizer.getStableId('/test.tsx', 'hash123', {
          line: 20,
          column: 20,
        }),
      ).toBe(id3);
    });

    it('should update timestamp on new position', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 });
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 15, column: 15 });

      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.misses).toBe(2); // Two new positions
    });

    it('should handle multiple files independently', () => {
      const id1 = stabilizer.getStableId('/file1.tsx', 'hash1', {
        line: 10,
        column: 10,
      });
      const id2 = stabilizer.getStableId('/file2.tsx', 'hash2', {
        line: 10,
        column: 10,
      });
      const id3 = stabilizer.getStableId('/file3.tsx', 'hash3', {
        line: 10,
        column: 10,
      });

      // All IDs should be different
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);

      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(3);
    });

    it('should handle line and column edge cases', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 1,
        column: 1,
      }); // First line, first column
      const id2 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 1000,
        column: 1000,
      }); // Large numbers
      const id3 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 1,
        column: 1,
      }); // Repeat first

      expect(id1).not.toBe(id2);
      expect(id3).toBe(id1); // Should match first call
    });
  });

  describe('computeFileHash', () => {
    it('should compute consistent hash for same content', async () => {
      const content = 'const App = () => <div>Hello</div>';

      const hash1 = await stabilizer.computeFileHash(content);
      const hash2 = await stabilizer.computeFileHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]+$/); // Hex string
    });

    it('should compute different hash for different content', async () => {
      const content1 = 'const App = () => <div>Hello</div>';
      const content2 = 'const App = () => <div>World</div>';

      const hash1 = await stabilizer.computeFileHash(content1);
      const hash2 = await stabilizer.computeFileHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty files', async () => {
      // Provide content explicitly to avoid file read
      const hash = await stabilizer.computeFileHash('');

      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash).toBeTruthy();
    });

    it('should handle large files efficiently', async () => {
      // Generate a large file (100KB)
      const largeContent = 'x'.repeat(100 * 1024);

      const startTime = performance.now();
      const hash = await stabilizer.computeFileHash(largeContent);
      const duration = performance.now() - startTime;

      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(duration).toBeLessThan(10); // Should be <10ms even for large files
    });
  });

  describe('computeFileHashSync', () => {
    it('should throw if hasher not initialized', () => {
      const newStabilizer = new IDStabilizer(tempDir);

      expect(() => {
        newStabilizer.computeFileHashSync('content');
      }).toThrow('not initialized');
    });

    it('should work after async hash initializes hasher', async () => {
      await stabilizer.computeFileHash('init');

      const hash = stabilizer.computeFileHashSync(
        'const App = () => <div>Hello</div>',
      );

      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should compute same hash as async version', async () => {
      const content = 'const App = () => <div>Hello</div>';

      const asyncHash = await stabilizer.computeFileHash(content);
      const syncHash = stabilizer.computeFileHashSync(content);

      expect(syncHash).toBe(asyncHash);
    });
  });

  describe('cache persistence', () => {
    it('should persist cache to disk', async () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 });
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 15, column: 15 });

      await stabilizer.saveCache();

      const cacheFile = join(tempDir, 'id-cache.json');
      expect(readFileSync(cacheFile, 'utf-8')).toBeTruthy();
    });

    it('should load cache from disk', async () => {
      // Create cache
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      await stabilizer.saveCache();

      // Create new stabilizer and load cache
      const newStabilizer = new IDStabilizer(tempDir);
      await newStabilizer.loadCache();

      const id2 = newStabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      expect(id2).toBe(id1); // Should get same ID from loaded cache
    });

    it('should handle missing cache file gracefully', async () => {
      await expect(stabilizer.loadCache()).resolves.not.toThrow();
    });

    it('should handle corrupted cache file gracefully', async () => {
      const cacheFile = join(tempDir, 'id-cache.json');
      writeFileSync(cacheFile, 'invalid json{{{', 'utf-8');

      await expect(stabilizer.loadCache()).resolves.not.toThrow();

      // Should start with empty cache
      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should validate cache schema on load', async () => {
      const cacheFile = join(tempDir, 'id-cache.json');
      const invalidCache = {
        version: '99.0.0', // Wrong version
        generatedAt: new Date().toISOString(),
        entries: [],
      };
      writeFileSync(cacheFile, JSON.stringify(invalidCache), 'utf-8');

      await stabilizer.loadCache();

      // Should reject and start fresh
      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should preserve all cache data across save/load', async () => {
      // Create multiple entries
      stabilizer.getStableId('/file1.tsx', 'hash1', { line: 10, column: 10 });
      stabilizer.getStableId('/file1.tsx', 'hash1', { line: 15, column: 15 });
      stabilizer.getStableId('/file2.tsx', 'hash2', { line: 20, column: 20 });

      await stabilizer.saveCache();

      // Load in new instance
      const newStabilizer = new IDStabilizer(tempDir);
      await newStabilizer.loadCache();

      const stats = newStabilizer.getCacheStats();
      expect(stats.entries).toBe(2); // 2 files
    });

    it('should create cache directory if missing', async () => {
      const nestedDir = join(tempDir, 'nested', 'dir');
      const nestedStabilizer = new IDStabilizer(nestedDir);

      nestedStabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      await nestedStabilizer.saveCache();

      const cacheFile = join(nestedDir, 'id-cache.json');
      expect(readFileSync(cacheFile, 'utf-8')).toBeTruthy();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entries', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 });
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 15, column: 15 });

      stabilizer.clearCache();

      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should reset statistics', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 });
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit

      stabilizer.clearCache();

      const stats = stabilizer.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should allow new entries after clear', () => {
      const id1 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });
      stabilizer.clearCache();
      const id2 = stabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      // Should generate new ID after clear
      expect(id2).not.toBe(id1);
    });
  });

  describe('getCacheStats', () => {
    it('should track cache hits', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 });
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit

      const stats = stabilizer.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should track cache misses', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Miss
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 15, column: 15 }); // Miss
      stabilizer.getStableId('/test.tsx', 'hash456', { line: 10, column: 10 }); // Miss (hash changed)

      const stats = stabilizer.getCacheStats();
      expect(stats.misses).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Miss
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit
      stabilizer.getStableId('/test.tsx', 'hash123', { line: 10, column: 10 }); // Hit

      const stats = stabilizer.getCacheStats();
      expect(stats.hitRate).toBe(0.75); // 3 hits / 4 total
    });

    it('should return 0 hit rate when no operations', () => {
      const stats = stabilizer.getCacheStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should count total entries', () => {
      stabilizer.getStableId('/file1.tsx', 'hash1', { line: 10, column: 10 });
      stabilizer.getStableId('/file2.tsx', 'hash2', { line: 10, column: 10 });
      stabilizer.getStableId('/file3.tsx', 'hash3', { line: 10, column: 10 });

      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(3);
    });
  });

  describe('debug mode', () => {
    it('should not log in normal mode', () => {
      const consoleSpy = { log: vi.fn() };
      global.console.log = consoleSpy.log;

      const normalStabilizer = new IDStabilizer(tempDir, { debug: false });
      normalStabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log in debug mode', () => {
      const consoleSpy = { log: vi.fn() };
      global.console.log = consoleSpy.log;

      const debugStabilizer = new IDStabilizer(tempDir, { debug: true });
      debugStabilizer.getStableId('/test.tsx', 'hash123', {
        line: 10,
        column: 10,
      });

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should hash typical file in <1ms', async () => {
      const content = `
        import React from 'react';

        const App = () => {
          return (
            <div>
              <h1>Hello World</h1>
              <button onClick={() => console.log('clicked')}>Click me</button>
            </div>
          );
        };

        export default App;
      `; // ~100 lines worth

      const startTime = performance.now();
      await stabilizer.computeFileHash(content);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1);
    });

    it('should handle 1000 files without memory issues', () => {
      for (let i = 0; i < 1000; i++) {
        stabilizer.getStableId(`/file${i}.tsx`, `hash${i}`, {
          line: 10,
          column: 10,
        });
      }

      const stats = stabilizer.getCacheStats();
      expect(stats.entries).toBe(1000);
    });

    it('should have O(1) cache lookup', () => {
      // Populate cache with many entries
      for (let i = 0; i < 100; i++) {
        stabilizer.getStableId(`/file${i}.tsx`, `hash${i}`, {
          line: 10,
          column: 10,
        });
      }

      // Lookup should be fast regardless of cache size
      const startTime = performance.now();
      stabilizer.getStableId('/file50.tsx', 'hash50', { line: 10, column: 10 });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(0.1); // <0.1ms
    });

    it('should save cache in <200ms for 1000 entries', async () => {
      for (let i = 0; i < 1000; i++) {
        stabilizer.getStableId(`/file${i}.tsx`, `hash${i}`, {
          line: 10,
          column: 10,
        });
      }

      const startTime = performance.now();
      await stabilizer.saveCache();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('real-world HMR simulation', () => {
    it('should achieve >80% cache hit rate on second build', async () => {
      const files = [
        '/src/App.tsx',
        '/src/Button.tsx',
        '/src/Header.tsx',
        '/src/Footer.tsx',
      ];

      // First build (cold cache)
      for (const file of files) {
        const content = `const Component = () => <div>Content</div>`;
        const hash = await stabilizer.computeFileHash(content);
        stabilizer.getStableId(file, hash, { line: 10, column: 10 });
        stabilizer.getStableId(file, hash, { line: 15, column: 15 });
        stabilizer.getStableId(file, hash, { line: 20, column: 20 });
      }

      const stats1 = stabilizer.getCacheStats();
      expect(stats1.misses).toBe(12); // All misses on first build

      // Save cache
      await stabilizer.saveCache();

      // Second build (warm cache, same content)
      // Create new stabilizer instance to simulate restart
      const newStabilizer = new IDStabilizer(tempDir);
      await newStabilizer.loadCache();

      for (const file of files) {
        const content = `const Component = () => <div>Content</div>`;
        const hash = await newStabilizer.computeFileHash(content);
        newStabilizer.getStableId(file, hash, { line: 10, column: 10 });
        newStabilizer.getStableId(file, hash, { line: 15, column: 15 });
        newStabilizer.getStableId(file, hash, { line: 20, column: 20 });
      }

      const stats2 = newStabilizer.getCacheStats();
      expect(stats2.hitRate).toBeGreaterThan(0.8); // >80% hit rate
    });
  });
});
