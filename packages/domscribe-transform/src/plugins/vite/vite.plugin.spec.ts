/**
 * Tests for Vite plugin
 *
 * Tests the Vite plugin that integrates Domscribe transformations into the Vite build process.
 * This test suite focuses on testing the plugin's business logic only,
 * with all external dependencies mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { domscribe } from './vite.plugin.js';
import type { Plugin, ResolvedConfig } from 'vite';
import { type RawSourceMap } from 'source-map';
import type { VitePluginOptions } from './types.js';

/**
 * Minimal Plugin Context for hooks that need 'this' context
 */
interface PluginContext {
  getCombinedSourcemap: () => RawSourceMap | null;
}

/**
 * Mock manifest entry structure
 */
interface MockManifestEntry {
  id: string;
  file: string;
  [key: string]: unknown;
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockManifestWriter = {
  appendEntries: vi.fn(),
  close: vi.fn(),
  getStats: vi
    .fn()
    .mockReturnValue({ entryCount: 0, filesIndexed: 0, lastRebuild: '' }),
};

const mockInjector = {
  initialize: vi.fn().mockResolvedValue(undefined),
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
    metrics: {
      parseMs: 1,
      traversalMs: 0.5,
      elementsFound: 0,
      elementsInjected: 0,
    },
  }),
  close: vi.fn(),
};

const mockInjectorRegistry = {
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  getInjector: vi.fn(() => mockInjector),
};

const mockSourceMapConsumer = {
  destroy: vi.fn(),
};

const mockStats = {
  record: vi.fn(),
  reset: vi.fn(),
  print: vi.fn(),
};

const mockInjectorRegistryGetInstance = vi
  .fn()
  .mockReturnValue(mockInjectorRegistry);

const mockWriterGetInstance = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (..._args: unknown[]) => mockManifestWriter,
);

const mockSourceMapConsumerConstructor = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (..._args: unknown[]) => mockSourceMapConsumer,
);

const mockStatsGetInstance = vi.fn().mockReturnValue(mockStats);

// Mock @domscribe/manifest
vi.mock('@domscribe/manifest', () => ({
  ManifestWriter: {
    getInstance: (...args: unknown[]) => mockWriterGetInstance(...args),
  },
}));

// Mock injector registry
vi.mock('../../core/injector.registry', async () => {
  const actual = await vi.importActual('../../core/injector.registry');
  return {
    ...actual,
    InjectorRegistry: {
      getInstance: (...args: unknown[]) =>
        mockInjectorRegistryGetInstance(...args),
    },
  };
});

// Mock source-map
vi.mock('source-map', () => ({
  SourceMapConsumer: class {
    constructor(...args: unknown[]) {
      return mockSourceMapConsumerConstructor(...args);
    }
  },
}));

// Mock stats
vi.mock('../../core/stats.js', () => ({
  TransformStats: {
    getInstance: (...args: unknown[]) => mockStatsGetInstance(...args),
  },
}));

// Mock relay control
const mockRelayControl = {
  readLockFile: vi.fn().mockReturnValue(null),
  checkHealth: vi
    .fn()
    .mockResolvedValue({ healthy: false, error: 'No lock file found' }),
  ensureRunning: vi.fn().mockResolvedValue({
    running: false,
    wasStarted: false,
    port: 0,
    host: '127.0.0.1',
  }),
};

vi.mock('@domscribe/relay', () => ({
  RelayControl: class {
    constructor() {
      return mockRelayControl;
    }
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock resolved Vite config
 */
function createMockResolvedConfig(overrides?: {
  root?: string;
}): Partial<ResolvedConfig> {
  return {
    root: overrides?.root || '/test/project',
  };
}

/**
 * Creates a typed mock plugin context with minimal required methods
 */
function createPluginContext(): PluginContext {
  return {
    getCombinedSourcemap: vi.fn().mockReturnValue(null),
  };
}

/**
 * Helper to call plugin hooks with proper context binding
 */
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

/**
 * Helper to set up a plugin through the complete initialization lifecycle
 */
async function setupPlugin(options: VitePluginOptions = {}): Promise<Plugin> {
  const plugin = domscribe(options);
  const config = createMockResolvedConfig({ root: '/test/workspace' });
  callHook(plugin.configResolved, {}, config);
  await callHook(plugin.buildStart);
  return plugin;
}

// ============================================================================
// Tests
// ============================================================================

describe('domscribe Vite plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock return values to defaults
    mockManifestWriter.getStats.mockReturnValue({ entryCount: 0 });
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
      metrics: {
        parseMs: 1,
        traversalMs: 0.5,
        elementsFound: 0,
        elementsInjected: 0,
      },
    });

    // Reset mock singletons
    mockInjectorRegistryGetInstance.mockReturnValue(mockInjectorRegistry);
    mockInjectorRegistry.getInjector.mockReturnValue(mockInjector);
    mockStatsGetInstance.mockReturnValue(mockStats);

    // Reset relay mock
    mockRelayControl.ensureRunning.mockResolvedValue({
      running: false,
      wasStarted: false,
      port: 0,
      host: '127.0.0.1',
    });
  });

  describe('Plugin Creation & Configuration', () => {
    it('should return plugin object with correct properties', () => {
      // Arrange & Act
      const plugin = domscribe();

      // Assert
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-domscribe-transform');
      expect(plugin.enforce).toBe('pre');
      expect(plugin.apply).toBe('serve');
    });

    it('should create plugin with default options', () => {
      // Arrange & Act
      const plugin = domscribe({});

      // Assert
      expect(plugin).toBeDefined();
      expect(plugin.enforce).toBe('pre');
    });

    it('should create plugin with debug enabled', () => {
      // Arrange & Act
      const plugin = domscribe({ debug: true });

      // Assert
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-domscribe-transform');
    });

    it('should create plugin with custom include pattern', () => {
      // Arrange
      const customInclude = /\.tsx$/i;

      // Act
      const plugin = domscribe({ include: customInclude });

      // Assert
      expect(plugin).toBeDefined();
    });

    it('should create plugin with custom exclude pattern', () => {
      // Arrange
      const customExclude = /\.stories\./i;

      // Act
      const plugin = domscribe({ exclude: customExclude });

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

    it('should use rootDir option over config.root when provided', async () => {
      // Arrange — Nuxt sets config.root to srcDir, but rootDir points to project root
      const plugin = domscribe({ rootDir: '/project/root' });
      const config = createMockResolvedConfig({ root: '/project/root/app' });

      // Act
      callHook(plugin.configResolved, {}, config);
      await callHook(plugin.buildStart);

      // Assert — ManifestWriter should be initialized with the project root
      expect(mockWriterGetInstance).toHaveBeenCalledWith(
        '/project/root',
        expect.any(Object),
      );
    });

    it('should handle being called multiple times', () => {
      // Arrange
      const plugin = domscribe();
      const config1 = createMockResolvedConfig({ root: '/path1' });
      const config2 = createMockResolvedConfig({ root: '/path2' });

      // Act
      callHook(plugin.configResolved, {}, config1);
      callHook(plugin.configResolved, {}, config2);

      // Assert - Should not throw on multiple invocations
      expect(() => callHook(plugin.configResolved, {}, config2)).not.toThrow();
    });
  });

  describe('buildStart hook', () => {
    it('should throw error if configResolved not called first', async () => {
      // Arrange
      const plugin = domscribe();

      // Act & Assert
      await expect(callHook(plugin.buildStart)).rejects.toThrow(
        'Root context not found',
      );
    });

    it('should initialize ManifestWriter with correct root', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockWriterGetInstance).toHaveBeenCalledWith('/test/workspace', {
        debug: false,
      });
    });

    it('should call InjectorRegistry.getInstance with workspaceRoot and options', async () => {
      // Arrange
      const plugin = domscribe({ debug: true });
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockInjectorRegistryGetInstance).toHaveBeenCalledWith(
        '/test/workspace',
        {
          debug: true,
        },
      );
    });

    it('should initialize InjectorRegistry', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockInjectorRegistry.initialize).toHaveBeenCalledTimes(1);
    });

    it('should initialize TransformStats', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      // Act
      await callHook(plugin.buildStart);

      // Assert
      expect(mockStatsGetInstance).toHaveBeenCalledWith('/test/workspace');
    });

    it('should handle writer getInstance errors', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);

      const error = new Error('Initialization failed');
      // ManifestWriter.getInstance() now calls initialize() internally,
      // so errors during initialization are thrown from getInstance()
      mockWriterGetInstance.mockImplementationOnce(() => {
        throw error;
      });

      // Act & Assert
      await expect(callHook(plugin.buildStart)).rejects.toThrow(
        'Initialization failed',
      );
    });
  });

  describe('transform hook - File Filtering', () => {
    it('should throw if buildStart not called (writer and injector not initialized)', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);
      // Skip buildStart to leave both writer and injector uninitialized

      const context = createPluginContext();

      // Act & Assert
      await expect(
        callHook(plugin.transform, context, 'const x = 1;', '/test/file.jsx'),
      ).rejects.toThrow('Manifest writer not initialized');
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

    it('should return null for test files', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const resultSpec = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.spec.jsx',
      );
      const resultTest = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.test.jsx',
      );

      // Assert
      expect(resultSpec).toBeNull();
      expect(resultTest).toBeNull();
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

    it('should return null for files with unsupported extension', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/file.not-supported',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });
  });

  describe('transform hook - Core Transformation', () => {
    it('should transform matching JSX files', async () => {
      // Arrange
      const plugin = await setupPlugin({ debug: true });
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
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        code,
        sourceFile,
      );

      // Assert — preamble is prepended to the transformed code
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('map');
      expect((result as { code: string }).code).toContain('transformed code');
      expect((result as { code: string }).code).toContain('typeof window');
    });

    it('should transform matching TSX files', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const code = 'const App: React.FC = () => <div>Hello</div>;';
      const sourceFile = '/test/App.tsx';

      mockInjector.inject.mockReturnValue({
        code: 'transformed tsx code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries: [{ id: 'tsx-id', file: sourceFile }],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        code,
        sourceFile,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('code');
      if (typeof result === 'object') {
        expect(result?.code).toContain('transformed tsx code');
      }
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

    it('should not create SourceMapConsumer when source map is null', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      vi.spyOn(context, 'getCombinedSourcemap').mockReturnValue(null);

      // Act
      await callHook(
        plugin.transform,
        context,
        'const x = 1;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockSourceMapConsumerConstructor).not.toHaveBeenCalled();
    });

    it('should call injector.inject with correct parameters (no fileHash)', async () => {
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
        // NO fileHash parameter
      });
    });

    it('should call injector.inject with sourceMapConsumer when available', async () => {
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

      const code = 'const App = () => <div>Hello</div>;';
      const sourceFile = '/test/App.jsx';

      // Act
      await callHook(plugin.transform, context, code, sourceFile);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledWith(code, {
        sourceFile,
        sourceMapConsumer: mockSourceMapConsumer,
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

    it('should call writer.appendEntries with manifest entries', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const manifestEntries: MockManifestEntry[] = [
        { id: 'id1', file: '/test/App.jsx' },
        { id: 'id2', file: '/test/App.jsx' },
      ];

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries,
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 2,
          elementsInjected: 2,
        },
      });

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledWith(
        manifestEntries,
      );
    });

    it('should return transformed code and source map', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();
      const expectedMap: RawSourceMap = {
        version: 3,
        sources: ['test.jsx'],
        names: [],
        mappings: 'AAAA',
        file: 'test.jsx',
      };

      mockInjector.inject.mockReturnValue({
        code: 'transformed with map',
        map: expectedMap,
        manifestEntries: [],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 0,
          elementsInjected: 0,
        },
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert — preamble is prepended to code
      expect(result).not.toBeNull();
      expect((result as { code: string }).code).toContain(
        'transformed with map',
      );
      expect((result as { map: unknown }).map).toEqual(expectedMap);
    });
  });

  describe('transform hook - Debug & Stats', () => {
    it('should record stats in debug mode', async () => {
      // Arrange
      const plugin = await setupPlugin({ debug: true });
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'test.tsx',
        },
        manifestEntries: [
          { id: 'id1', file: 'test' },
          { id: 'id2', file: 'test' },
        ],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 2,
          elementsInjected: 2,
        },
      });

      // Act
      await callHook(
        plugin.transform,
        context,
        'const App = () => <div>Hello</div>;',
        '/test/App.jsx',
      );

      // Assert - stats.record should be called with FileMetrics
      expect(mockStats.record).toHaveBeenCalledWith(
        expect.objectContaining({
          file: '/test/App.jsx',
          timings: expect.objectContaining({
            totalTransformMs: expect.any(Number),
          }),
          counts: expect.objectContaining({
            elementsInjected: 2,
          }),
        }),
      );
    });
  });

  describe('transform hook - Error Handling', () => {
    it('should handle transformation errors gracefully and return null', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      mockInjector.inject.mockImplementation(() => {
        throw new Error('Parse error');
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
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

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
    });
  });

  describe('buildEnd hook', () => {
    it('should return early if writer not initialized', () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig({ root: '/test/workspace' });
      callHook(plugin.configResolved, {}, config);
      // Don't call buildStart, so writer stays undefined

      // Act & Assert - should not throw, just return early
      expect(() => callHook(plugin.buildEnd)).not.toThrow();
      expect(mockManifestWriter.close).not.toHaveBeenCalled();
    });

    it('should call writer.close()', async () => {
      // Arrange
      const plugin = await setupPlugin();

      // Act
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockManifestWriter.close).toHaveBeenCalledTimes(1);
    });

    it('should handle writer close errors gracefully', async () => {
      // Arrange
      const plugin = await setupPlugin();
      mockManifestWriter.close.mockImplementationOnce(() => {
        throw new Error('Close failed');
      });

      // Act & Assert - should not throw
      expect(async () => await callHook(plugin.buildEnd)).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lifecycle: configResolved → buildStart → transform → buildEnd', async () => {
      // Arrange
      const plugin = domscribe();
      const config = createMockResolvedConfig();
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: 'transformed code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries: [{ id: 'test-id', file: 'test' }],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
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
      expect(mockInjector.inject).toHaveBeenCalledTimes(1);
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledTimes(1);
      expect(mockManifestWriter.close).toHaveBeenCalledTimes(1);
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
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries: [{ id: 'test-id', file: 'test' }],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
      });

      // Act
      for (const file of files) {
        await callHook(plugin.transform, context, file.code, file.path);
      }
      await callHook(plugin.buildEnd);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledTimes(3);
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledTimes(3);
      expect(mockManifestWriter.close).toHaveBeenCalledTimes(1);
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
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'original.tsx',
        },
        manifestEntries: [{ id: 'test-id', file: 'test' }],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
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
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
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
        },
      );
      expect(mockSourceMapConsumer.destroy).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect((result as { code: string }).code).toContain('transformed code');
      expect((result as { map: unknown }).map).toEqual({
        version: 3,
        sources: ['App.jsx'],
        names: [],
        mappings: 'AAAA',
        file: 'App.jsx',
      });
    });

    it('should handle error during transform without breaking subsequent transforms', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      // First transform will fail
      mockInjector.inject.mockImplementationOnce(() => {
        throw new Error('Parse error');
      });

      // Second transform will succeed
      mockInjector.inject.mockImplementationOnce(() => ({
        code: 'success code',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'Good.jsx',
        },
        manifestEntries: [],
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 0,
          elementsInjected: 0,
        },
      }));

      // Act
      const result1 = await callHook(
        plugin.transform,
        context,
        'bad code',
        '/test/Bad.jsx',
      );
      const result2 = await callHook(
        plugin.transform,
        context,
        'good code',
        '/test/Good.jsx',
      );

      // Assert
      expect(result1).toBeNull();
      expect(result2).not.toBeNull();
    });

    it('should handle empty code transformation', async () => {
      // Arrange
      const plugin = await setupPlugin();
      const context = createPluginContext();

      mockInjector.inject.mockReturnValue({
        code: '',
        map: {
          version: 3,
          sources: [],
          names: [],
          mappings: '',
          file: 'Empty.jsx',
        },
        manifestEntries: [],
        metrics: {
          parseMs: 0,
          traversalMs: 0,
          elementsFound: 0,
          elementsInjected: 0,
        },
      });

      // Act
      const result = await callHook(
        plugin.transform,
        context,
        '',
        '/test/Empty.jsx',
      );

      // Assert — preamble is still prepended even for empty transformed code
      expect(result).not.toBeNull();
      expect((result as { code: string }).code).toContain('typeof window');
      expect((result as { map: unknown }).map).toEqual({
        version: 3,
        sources: [],
        names: [],
        mappings: '',
        file: 'Empty.jsx',
      });
    });
  });
});
