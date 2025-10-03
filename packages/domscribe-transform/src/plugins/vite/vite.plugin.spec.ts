/**
 * Tests for Vite plugin
 *
 * Tests follow Arrange-Act-Assert methodology and only mock direct dependencies
 * invoked by the module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domscribe } from './vite.plugin.js';
import type { Plugin, ResolvedConfig } from 'vite';
import { type RawSourceMap } from 'source-map';

/**
 * Minimal Plugin Context for hooks that need 'this' context
 */
interface PluginContext {
  getCombinedSourcemap: () => RawSourceMap | null;
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock objects must be defined OUTSIDE of vi.mock() factory due to hoisting
const mockManifestManager = {
  initialize: vi.fn().mockResolvedValue(undefined),
  getIDStabilizer: vi.fn(),
  appendEntries: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue({ entryCount: 0 }),
};

const mockIDStabilizer = {
  computeFileHash: vi.fn().mockResolvedValue('mock-hash-123'),
};

const mockInjector = {
  inject: vi.fn().mockReturnValue({
    code: 'transformed code',
    map: {
      version: 3,
      sources: [],
      names: [],
      mappings: '',
      file: 'original.tsx',
    },
    manifestEntries: [],
  }),
};

const mockParser = {};

const mockSourceMapConsumer = {
  destroy: vi.fn(),
};

const mockStats = {
  recordTransform: vi.fn(),
  print: vi.fn(),
};

const mockManagerGetInstance = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (...args: unknown[]) => mockManifestManager,
);
const mockSourceMapConsumerConstructor = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (...args: unknown[]) => mockSourceMapConsumer,
);

// Mock @domscribe/manifest
vi.mock('@domscribe/manifest', () => ({
  ManifestManager: {
    getInstance: (...args: unknown[]) => mockManagerGetInstance(...args),
  },
}));

// Mock injector - using factory function directly in mock
vi.mock('../../core/injector.js', () => ({
  DomscribeInjector: vi.fn(() => mockInjector),
}));

// Mock parser - using factory function directly in mock
vi.mock('../../parsers/acorn/acorn.parser.js', () => ({
  AcornParser: vi.fn(() => mockParser),
}));

// Mock source-map
vi.mock('source-map', () => ({
  SourceMapConsumer: class {
    constructor(...args: unknown[]) {
      return mockSourceMapConsumerConstructor(...args);
    }
  },
}));

// Mock stats - using factory function directly in mock
vi.mock('../../core/stats.js', () => ({
  TransformStats: vi.fn(() => mockStats),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockResolvedConfig(overrides?: {
  root?: string;
}): Partial<ResolvedConfig> {
  return {
    root: overrides?.root || '/test/project',
  };
}

function createPluginContext(): PluginContext {
  return {
    getCombinedSourcemap: vi.fn().mockReturnValue(null),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callHook<T extends (...args: any[]) => ReturnType<T>>(
  hook: T | { handler: T } | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): ReturnType<T> | undefined {
  if (!hook) return undefined;
  const fn = typeof hook === 'function' ? hook : hook.handler;

  if (context) {
    return fn.bind(context)(...args);
  }

  return fn(...args);
}

// ============================================================================
// Tests
// ============================================================================

describe('domscribe Vite plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManifestManager.getIDStabilizer.mockReturnValue(mockIDStabilizer);
    mockManifestManager.getStats.mockReturnValue({ entryCount: 0 });
    mockIDStabilizer.computeFileHash.mockResolvedValue('mock-hash-123');
    mockInjector.inject.mockReturnValue({
      code: 'transformed code',
      map: {
        version: 3,
        sources: [],
        names: [],
        mappings: '',
        file: 'original.tsx',
      },
      manifestEntries: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plugin Creation & Configuration', () => {
    it('should return a plugin object with correct properties', () => {
      // Arrange & Act
      const plugin = domscribe();

      // Assert
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-domscribe-transform');
      expect(plugin.enforce).toBe('post');
      expect(plugin.apply).toBe('serve');
    });

    it('should create plugin with custom enforce option', () => {
      // Arrange & Act
      const plugin = domscribe({ enforce: 'pre' });

      // Assert
      expect(plugin.enforce).toBe('pre');
    });

    it('should default to post enforce when not specified', () => {
      // Arrange & Act
      const plugin = domscribe({});

      // Assert
      expect(plugin.enforce).toBe('post');
    });

    it('should create plugin with debug enabled', () => {
      // Arrange & Act
      const plugin = domscribe({ debug: true });

      // Assert
      expect(plugin).toBeDefined();
    });
  });

  describe('configResolved hook', () => {
    it('should store root context from config', () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/custom/path' });

      // Act
      callHook(plugin.configResolved, {}, config);

      // Assert - Verify by ensuring buildStart doesn't throw
      expect(async () => {
        await callHook(plugin.buildStart);
      }).not.toThrow();
    });

    it('should handle being called multiple times', () => {
      // Arrange
      const plugin = domscribe();
      const config1 = createMockResolvedConfig({ root: '/path1' });
      const config2 = createMockResolvedConfig({ root: '/path2' });

      // Act
      callHook(plugin.configResolved, {}, config1);
      callHook(plugin.configResolved, {}, config2);

      // Assert - Should not throw
      expect(() => callHook(plugin.configResolved, {}, config2)).not.toThrow();
    });
  });

  describe('buildStart hook', () => {
    it('should initialize ManifestManager with correct root', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockManagerGetInstance).toHaveBeenCalledWith('/test/workspace', {
        debug: false,
      });
    });

    it('should throw error if configResolved not called first', async () => {
      // Arrange
      const plugin = domscribe();

      // Act & Assert
      await expect(callHook(plugin.buildStart)).rejects.toThrow(
        'Root context not found',
      );
    });

    it('should call manager.initialize()', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockManifestManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should get IDStabilizer from manager', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockManifestManager.getIDStabilizer).toHaveBeenCalledTimes(1);
    });

    it('should create DomscribeInjector with parser and stabilizer', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      const { DomscribeInjector } = await import('../../core/injector.js');

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(DomscribeInjector).toHaveBeenCalledWith(
        mockParser,
        mockIDStabilizer,
        { debug: false },
      );
    });

    it('should log debug message when debug enabled', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log');
      const plugin = domscribe({ debug: true });
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[domscribe-transform][vite-plugin] Vite plugin initialized',
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should pass debug option to ManifestManager', async () => {
      // Arrange
      const plugin = domscribe({ debug: true });
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockManagerGetInstance).toHaveBeenCalledWith(expect.any(String), {
        debug: true,
      });
    });

    it('should handle manager initialization errors', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      const error = new Error('Initialization failed');
      mockManifestManager.initialize.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(callHook(plugin.buildStart)).rejects.toThrow(
        'Initialization failed',
      );
    });
  });

  describe('transform hook', () => {
    async function setupPlugin(options = {}): Promise<Plugin> {
      const plugin = domscribe(options);
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);
      return plugin;
    }

    it('should throw if injector not initialized', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);
      // Skip buildStart to leave injector uninitialized

      const context = createPluginContext();

      // Act & Assert
      await expect(
        callHook(plugin.transform, context, 'const x = 1;', '/test/file.jsx'),
      ).rejects.toThrow('Injector not initialized');
    });

    it('should return null for files not matching include pattern', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/file.ts',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should return null for test files (.spec.)', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.spec.jsx',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should return null for test files (.test.)', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.test.jsx',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should return null for node_modules files', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/node_modules/lib/index.jsx',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should transform matching JSX files', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const code = 'const App = () => <div>Hello</div>;';
      const sourceFile = '/test/App.jsx';

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries: [{ id: 'test-id', file: sourceFile }],
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        code,
        sourceFile,
      );

      // Assert
      expect(result).toEqual({
        code: 'transformed code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
      });
    });

    it('should call stabilizer.computeFileHash with code', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const code = 'const App = () => <div>Hello</div>;';

      // Act
      await callHook(plugin.transform, context, code, '/test/App.jsx');

      // Assert
      expect(mockIDStabilizer.computeFileHash).toHaveBeenCalledWith(code);
    });

    it('should call getCombinedSourcemap from context', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const getCombinedSourcemapSpy = vi.spyOn(context, 'getCombinedSourcemap');

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(getCombinedSourcemapSpy).toHaveBeenCalled();
    });

    it('should create SourceMapConsumer when source map available', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const mockSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'original.tsx',
      };
      const context = createPluginContext();
      vi.spyOn(context, 'getCombinedSourcemap').mockReturnValue(mockSourceMap);

      // Act
      await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockSourceMapConsumerConstructor).toHaveBeenCalledWith(
        mockSourceMap,
      );
    });

    it('should call injector.inject with correct parameters', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const code = 'const App = () => <div>Hello</div>;';
      const sourceFile = '/test/App.jsx';

      // Act
      await callHook(plugin.transform, context, code, sourceFile);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledWith(code, {
        sourceFile,
        sourceMapConsumer: undefined,
        fileHash: 'mock-hash-123',
      });
    });

    it('should destroy sourceMapConsumer after use', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const mockSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'original.tsx',
      };
      const context = createPluginContext();
      vi.spyOn(context, 'getCombinedSourcemap').mockReturnValue(mockSourceMap);

      // Act
      await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockSourceMapConsumer.destroy).toHaveBeenCalled();
    });

    it('should call manager.appendEntries with manifest entries', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const manifestEntries = [
        { id: 'id1', file: '/test/App.jsx' },
        { id: 'id2', file: '/test/App.jsx' },
      ];

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries,
      });

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockManifestManager.appendEntries).toHaveBeenCalledWith(
        manifestEntries,
      );
    });

    it('should record stats in debug mode', async () => {
      // Arrange
      const plugin = await setupPlugin({ debug: true });
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [{ id: 'id1' }, { id: 'id2' }],
      });

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockStats.recordTransform).toHaveBeenCalledWith(
        2,
        expect.any(Number),
      );
    });

    it('should log transform info in debug mode', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log');
      const plugin = await setupPlugin({ debug: true });
      const context = createPluginContext();
      const sourceFile = '/test/App.jsx';

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [{ id: 'id1' }, { id: 'id2' }],
      });

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        sourceFile,
      );

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Transformed ${sourceFile}: 2 elements`),
      );

      consoleSpy.mockRestore();
    });

    it('should handle transformation errors gracefully and return null', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const error = new Error('Parse error');
      mockInjector.inject.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to transform /test/App.jsx'),
        'Parse error',
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      mockInjector.inject.mockImplementation(() => {
        throw 'string error';
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to transform /test/App.jsx'),
        'string error',
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle custom include pattern', async () => {
      // Arrange
      const plugin = await setupPlugin({ include: /\.tsx$/i });
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [],
      });

      // Act
      const resultTsx = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.tsx',
      );
      const resultJsx = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(resultTsx).not.toBeNull();
      expect(resultJsx).toBeNull();
    });

    it('should handle custom exclude pattern', async () => {
      // Arrange
      const plugin = await setupPlugin({ exclude: /\.stories\./i });
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [],
      });

      // Act
      const resultStories = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.stories.jsx',
      );
      const resultRegular = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(resultStories).toBeNull();
      expect(resultRegular).not.toBeNull();
    });
  });

  describe('buildEnd hook', () => {
    async function setupPlugin(options = {}): Promise<Plugin> {
      const plugin = domscribe(options);
      const config = createMockResolvedConfig();
      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);
      return plugin;
    }

    it('should call manager.flush()', async () => {
      // Arrange
      const plugin = await setupPlugin();

      // Act
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockManifestManager.flush).toHaveBeenCalledTimes(1);
    });

    it('should call manager.close()', async () => {
      // Arrange
      const plugin = await setupPlugin();

      // Act
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockManifestManager.close).toHaveBeenCalledTimes(1);
    });

    it('should print stats in debug mode', async () => {
      // Arrange
      const plugin = await setupPlugin({ debug: true });
      const mockManagerStats = { entryCount: 42 };
      mockManifestManager.getStats.mockReturnValue(mockManagerStats);

      // Act
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockStats.print).toHaveBeenCalledWith(
        'domscribe-transform][vite-plugin]',
        mockManagerStats,
      );
    });

    it('should not print stats when debug disabled', async () => {
      // Arrange
      const plugin = await setupPlugin({ debug: false });

      // Act
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockStats.print).not.toHaveBeenCalled();
    });

    it('should handle case where manager is undefined gracefully', async () => {
      // Arrange
      const plugin = domscribe();
      // Don't call buildStart, so manager stays undefined

      // Act & Assert
      await expect(callHook(plugin.buildEnd)).resolves.not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete lifecycle: configResolved → buildStart → transform → buildEnd', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig();
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [{ id: 'test-id' }],
      });

      // Act
      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockManifestManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockInjector.inject).toHaveBeenCalledTimes(1);
      expect(mockManifestManager.appendEntries).toHaveBeenCalledTimes(1);
      expect(mockManifestManager.flush).toHaveBeenCalledTimes(1);
      expect(mockManifestManager.close).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple transforms in sequence', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig();
      const context = createPluginContext();

      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);

      const files = [
        { code: 'const App1 = () => <div>1</div>;', path: '/test/App1.jsx' },
        { code: 'const App2 = () => <div>2</div>;', path: '/test/App2.jsx' },
        { code: 'const App3 = () => <div>3</div>;', path: '/test/App3.jsx' },
      ];

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [{ id: 'test-id' }],
      });

      // Act
      for (const file of files) {
        await callHook(plugin.transform, context, file.code, file.path);
      }
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledTimes(3);
      expect(mockManifestManager.appendEntries).toHaveBeenCalledTimes(3);
      expect(mockManifestManager.flush).toHaveBeenCalledTimes(1);
      expect(mockManifestManager.close).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed file types with some filtered out', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig();
      const context = createPluginContext();

      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);

      const files = [
        { code: 'const App = () => <div>1</div>;', path: '/test/App.jsx' }, // Should transform
        { code: 'const x = 1;', path: '/test/utils.ts' }, // Should skip (not JSX)
        {
          code: 'const Test = () => <div>2</div>;',
          path: '/test/App.spec.jsx',
        }, // Should skip (test file)
        { code: 'const App2 = () => <div>3</div>;', path: '/test/App2.jsx' }, // Should transform
      ];

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: null,
        manifestEntries: [{ id: 'test-id' }],
      });

      // Act
      const results = [];
      for (const file of files) {
        results.push(
          await callHook(plugin.transform, context, file.code, file.path),
        );
      }

      // Assert
      expect(results[0]).not.toBeNull(); // JSX file transformed
      expect(results[1]).toBeNull(); // TS file skipped
      expect(results[2]).toBeNull(); // Test file skipped
      expect(results[3]).not.toBeNull(); // JSX file transformed
      expect(mockInjector.inject).toHaveBeenCalledTimes(2); // Only 2 transformations
    });

    it('should handle transformation with source maps end-to-end', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig();
      const mockSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: ['App'],
        mappings: 'AAAA,MAAM,GAAG',
        file: 'original.tsx',
      };
      const context = createPluginContext();
      vi.spyOn(context, 'getCombinedSourcemap').mockReturnValue(mockSourceMap);

      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: {
          version: 3,
          sources: ['App.jsx'],
          names: [],
          mappings: 'AAAA',
          file: 'App.jsx',
        },
        manifestEntries: [{ id: 'id1', file: '/test/App.jsx' }],
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledWith(
        'const App = () => <div>Hello</div>;',
        {
          sourceFile: '/test/App.jsx',
          sourceMapConsumer: mockSourceMapConsumer,
          fileHash: 'mock-hash-123',
        },
      );
      expect(mockSourceMapConsumer.destroy).toHaveBeenCalled();
      expect(result).toEqual({
        code: 'transformed code',
        map: {
          version: 3,
          sources: ['App.jsx'],
          names: [],
          mappings: 'AAAA',
          file: 'App.jsx',
        },
      });
    });
  });
});
