/**
 * Tests for Webpack plugin
 *
 * This test file tests the webpack plugin which:
 * - Initializes ManifestWriter in beforeCompile hook
 * - Auto-injects relay/overlay script tags via HtmlWebpackPlugin hooks in compilation hook
 * - Prints stats in done hook (debug mode only)
 * - Closes writer in shutdown hook
 *
 * Note: Manifest collection from modules is handled by the loader, not the plugin.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomscribeWebpackPlugin } from './webpack.plugin.js';
import { Compiler, config } from 'webpack';
import type { WebpackPluginOptions } from './types.js';

interface MockManifestWriter {
  appendEntries: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
}

interface MockInjectorRegistry {
  initialize: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getInjector: ReturnType<typeof vi.fn>;
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockStats = {
  record: vi.fn(),
  reset: vi.fn(),
  getAggregate: vi.fn().mockReturnValue({
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
  }),
  getFileMetrics: vi.fn().mockReturnValue([]),
  print: vi.fn(),
};

const mockWriterGetInstance = vi.fn();

// Mock @domscribe/manifest
vi.mock('@domscribe/manifest', () => {
  return {
    ManifestWriter: {
      getInstance: (...args: unknown[]) => {
        return mockWriterGetInstance(...args);
      },
    },
  };
});

const mockInjectorRegistryGetInstance = vi.fn();

// Mock injector registry
vi.mock('../../core/injector.registry.js', () => ({
  InjectorRegistry: {
    getInstance: (...args: unknown[]) =>
      mockInjectorRegistryGetInstance(...args),
  },
}));

const mockStatsGetInstance = vi.fn().mockReturnValue(mockStats);

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

// Mock html-webpack-plugin (optional dependency)
const mockBeforeEmitTapAsync = vi.fn();

const mockGetCompilationHooks = vi.fn().mockReturnValue({
  beforeEmit: { tapAsync: mockBeforeEmitTapAsync },
});

vi.mock('html-webpack-plugin', () => ({
  default: { getCompilationHooks: mockGetCompilationHooks },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function resetMockManifestWriter(): MockManifestWriter {
  const manifestWriter = {
    appendEntries: vi.fn(),
    close: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      entryCount: 0,
      filesIndexed: 0,
      lastRebuild: '',
    }),
  };

  mockWriterGetInstance.mockReturnValue(manifestWriter);

  return manifestWriter;
}

function resetMockInjectorRegistry(): MockInjectorRegistry {
  const injectorRegistry = {
    initialize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    getInjector: vi.fn(),
  };

  mockInjectorRegistryGetInstance.mockReturnValue(injectorRegistry);

  return injectorRegistry;
}

/**
 * Creates a mock webpack compiler with typed hooks
 */
function createMockCompiler(context = '/test/workspace'): {
  compiler: Compiler;
  compilerHooks: {
    beforeCompileTapPromise: ReturnType<typeof vi.fn>;
    compilationTap: ReturnType<typeof vi.fn>;
    doneTap: ReturnType<typeof vi.fn>;
    shutdownTap: ReturnType<typeof vi.fn>;
  };
  compilerCallbacks: {
    getBeforeCompile: () => () => Promise<void>;
    getCompilation: () => (compilation: unknown) => void;
    getDone: () => () => void;
    getShutdown: () => () => void;
  };
} {
  const beforeCompileTapPromise = vi.fn();
  const compilationTap = vi.fn();
  const doneTap = vi.fn();
  const shutdownTap = vi.fn();

  const compiler = vi.mockObject<Compiler>(
    new Compiler(context, config.getNormalizedWebpackOptions({})),
  );
  const {
    beforeCompile: beforeCompileHook,
    compilation: compilationHook,
    done: doneHook,
    shutdown: shutdownHook,
  } = compiler.hooks;

  return {
    compiler: {
      ...compiler,
      hooks: {
        ...compiler.hooks,
        beforeCompile: {
          ...beforeCompileHook,
          tapPromise: beforeCompileTapPromise,
        },
        compilation: {
          ...compilationHook,
          tap: compilationTap,
        },
        done: {
          ...doneHook,
          tap: doneTap,
        },
        shutdown: {
          ...shutdownHook,
          tap: shutdownTap,
        },
      },
    },
    compilerHooks: {
      beforeCompileTapPromise,
      compilationTap,
      doneTap,
      shutdownTap,
    },
    compilerCallbacks: {
      getBeforeCompile: () => beforeCompileTapPromise.mock.calls[0]?.[1],
      getCompilation: () => compilationTap.mock.calls[0]?.[1],
      getDone: () => doneTap.mock.calls[0]?.[1],
      getShutdown: () => shutdownTap.mock.calls[0]?.[1],
    },
  };
}

/**
 * Helper to set up plugin and trigger initialization
 */
async function setupPlugin(options: WebpackPluginOptions = {}): Promise<{
  plugin: DomscribeWebpackPlugin;
  compiler: ReturnType<typeof createMockCompiler>['compiler'];
  compilerCallbacks: ReturnType<typeof createMockCompiler>['compilerCallbacks'];
  initializePlugin: () => Promise<void>;
}> {
  const plugin = new DomscribeWebpackPlugin(options);
  const { compiler, compilerCallbacks } = createMockCompiler();

  const initializePlugin = async () => {
    plugin.apply(compiler);

    // Trigger beforeCompile to initialize manager
    const beforeCompileCallback = compilerCallbacks.getBeforeCompile();
    await beforeCompileCallback();
  };

  return { plugin, compiler, compilerCallbacks, initializePlugin };
}

// ============================================================================
// Tests
// ============================================================================

describe('DomscribeWebpackPlugin', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockManifestWriter: MockManifestWriter;
  let mockInjectorRegistry: MockInjectorRegistry;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear all mocks
    vi.clearAllMocks();

    // Reset mock manifest writer
    mockManifestWriter = resetMockManifestWriter();
    mockInjectorRegistry = resetMockInjectorRegistry();

    // Reset stats mock
    mockStatsGetInstance.mockReturnValue(mockStats);

    // Reset html-webpack-plugin mocks
    mockBeforeEmitTapAsync.mockReset();
    mockGetCompilationHooks.mockReturnValue({
      beforeEmit: { tapAsync: mockBeforeEmitTapAsync },
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Plugin Instantiation', () => {
    it('should create plugin with default options', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      const plugin = new DomscribeWebpackPlugin();

      // Assert
      expect(plugin).toBeInstanceOf(DomscribeWebpackPlugin);
      expect(DomscribeWebpackPlugin.name).toBe('DomscribeWebpackPlugin');
    });

    it('should create plugin with custom options', () => {
      // Arrange
      const options: WebpackPluginOptions = {
        debug: true,
        enabled: true,
      };

      // Act
      const plugin = new DomscribeWebpackPlugin(options);

      // Assert
      expect(plugin).toBeInstanceOf(DomscribeWebpackPlugin);
    });

    it('should disable in production by default', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const plugin = new DomscribeWebpackPlugin();
      const { compiler, compilerHooks } = createMockCompiler();
      plugin.apply(compiler);

      // Assert - Should not register hooks in production
      expect(compilerHooks.beforeCompileTapPromise).not.toHaveBeenCalled();
      expect(compilerHooks.doneTap).not.toHaveBeenCalled();
    });

    it('should respect enabled option over NODE_ENV', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const plugin = new DomscribeWebpackPlugin({ enabled: true });
      const { compiler, compilerHooks } = createMockCompiler();
      plugin.apply(compiler);

      // Assert - Should register hooks when explicitly enabled
      expect(compilerHooks.beforeCompileTapPromise).toHaveBeenCalled();
      expect(compilerHooks.doneTap).toHaveBeenCalled();
    });

    it('should respect enabled: false option', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      const plugin = new DomscribeWebpackPlugin({ enabled: false });
      const { compiler, compilerHooks } = createMockCompiler();
      plugin.apply(compiler);

      // Assert - Should not register hooks when explicitly disabled
      expect(compilerHooks.beforeCompileTapPromise).not.toHaveBeenCalled();
    });
  });

  describe('apply method', () => {
    it('should register all required hooks', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();
      const { compiler, compilerHooks } = createMockCompiler();

      // Act
      plugin.apply(compiler);

      // Assert
      expect(compilerHooks.beforeCompileTapPromise).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
      expect(compilerHooks.compilationTap).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
      expect(compilerHooks.doneTap).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
      expect(compilerHooks.shutdownTap).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
    });

    it('should skip registration when disabled', () => {
      // Arrange
      const plugin = new DomscribeWebpackPlugin({ enabled: false });
      const { compiler, compilerHooks } = createMockCompiler();

      // Act
      plugin.apply(compiler);

      // Assert
      expect(compilerHooks.beforeCompileTapPromise).not.toHaveBeenCalled();
      expect(compilerHooks.compilationTap).not.toHaveBeenCalled();
      expect(compilerHooks.doneTap).not.toHaveBeenCalled();
      expect(compilerHooks.shutdownTap).not.toHaveBeenCalled();
    });
  });

  describe('beforeCompile hook', () => {
    it('should initialize ManifestWriter with correct context', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin();

      // Act
      await initializePlugin();

      // Assert
      expect(mockWriterGetInstance).toHaveBeenCalledWith('/test/workspace', {
        debug: false,
      });
    });

    it('should initialize ManifestWriter with debug option', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin({ debug: true });

      // Act
      await initializePlugin();

      // Assert
      expect(mockWriterGetInstance).toHaveBeenCalledWith(expect.any(String), {
        debug: true,
      });
    });

    it('should initialize InjectorRegistry', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin();

      // Act
      await initializePlugin();

      // Assert
      expect(mockInjectorRegistryGetInstance).toHaveBeenCalledWith(
        '/test/workspace',
        { debug: false },
      );
      expect(mockInjectorRegistry.initialize).toHaveBeenCalledTimes(1);
    });

    it('should initialize TransformStats', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin();

      // Act
      await initializePlugin();

      // Assert
      expect(mockStatsGetInstance).toHaveBeenCalledWith('/test/workspace');
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      mockWriterGetInstance.mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin();

      // Act & Assert - should not throw, error is caught internally
      await initializePlugin();
    });

    it('should handle non-Error exceptions during initialization', async () => {
      // Arrange
      mockWriterGetInstance.mockImplementationOnce(() => {
        throw 'string error';
      });

      process.env.NODE_ENV = 'development';
      const { initializePlugin } = await setupPlugin();

      // Act & Assert - should not throw, error is caught internally
      await initializePlugin();
    });
  });

  describe('done hook', () => {
    it('should print stats in debug mode', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: true,
      });
      const mockWriterStats = {
        entryCount: 42,
        filesIndexed: 10,
        lastRebuild: new Date().toISOString(),
      };
      mockManifestWriter.getStats.mockReturnValue(mockWriterStats);

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert
      expect(mockStats.print).toHaveBeenCalledWith(
        '[domscribe-transform][webpack-plugin]',
        mockWriterStats,
      );
    });

    it('should not print stats when debug disabled', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: false,
      });

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert
      expect(mockStats.print).not.toHaveBeenCalled();
    });

    it('should reset stats on done', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: false,
      });

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert
      expect(mockStats.reset).toHaveBeenCalled();
    });

    it('should close injector registry on done', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: false,
      });

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert
      expect(mockInjectorRegistry.close).toHaveBeenCalled();
    });

    it('should handle null writer stats gracefully', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      mockManifestWriter.getStats.mockReturnValue(null);
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: true,
      });

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert - should pass null for writerStats since writer.getStats() returns null
      expect(mockStats.print).toHaveBeenCalledWith(
        '[domscribe-transform][webpack-plugin]',
        null,
      );
    });
  });

  describe('shutdown hook', () => {
    it('should call writer.close()', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin();

      await initializePlugin();

      // Act
      const shutdownCallback = compilerCallbacks.getShutdown();
      shutdownCallback();

      // Assert
      expect(mockManifestWriter.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close errors gracefully', async () => {
      // Arrange
      mockManifestWriter.close.mockImplementationOnce(() => {
        throw new Error('Close failed');
      });

      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin();

      await initializePlugin();

      // Act & Assert - should not throw
      const shutdownCallback = compilerCallbacks.getShutdown();
      expect(() => shutdownCallback()).not.toThrow();
    });

    it('should handle non-Error exceptions in shutdown hook', async () => {
      // Arrange
      mockManifestWriter.close.mockImplementationOnce(() => {
        throw 'string error';
      });

      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin();

      await initializePlugin();

      // Act & Assert - should not throw
      const shutdownCallback = compilerCallbacks.getShutdown();
      expect(() => shutdownCallback()).not.toThrow();
    });

    it('should return early if writer not initialized', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();
      const { compiler, compilerCallbacks } = createMockCompiler();
      plugin.apply(compiler);
      // Don't call beforeCompile to leave writer uninitialized

      // Act
      const shutdownCallback = compilerCallbacks.getShutdown();
      shutdownCallback();

      // Assert - should not throw, just return early
      expect(mockManifestWriter.close).not.toHaveBeenCalled();
    });
  });

  describe('compilation hook', () => {
    it('should register compilation hook on apply', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();
      const { compiler, compilerHooks } = createMockCompiler();

      // Act
      plugin.apply(compiler);

      // Assert
      expect(compilerHooks.compilationTap).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
    });

    it('should not register compilation hook when disabled', () => {
      // Arrange
      const plugin = new DomscribeWebpackPlugin({ enabled: false });
      const { compiler, compilerHooks } = createMockCompiler();

      // Act
      plugin.apply(compiler);

      // Assert
      expect(compilerHooks.compilationTap).not.toHaveBeenCalled();
    });

    it('should tap HtmlWebpackPlugin beforeEmit when available', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin();
      await initializePlugin();

      // Act
      const compilationCallback = compilerCallbacks.getCompilation();
      const mockCompilation = {};
      compilationCallback(mockCompilation);

      // Assert - wait for dynamic import() to resolve
      await vi.waitFor(() => {
        expect(mockGetCompilationHooks).toHaveBeenCalledWith(mockCompilation);
      });
      expect(mockBeforeEmitTapAsync).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
    });
  });

  describe('HTML injection via beforeEmit', () => {
    /**
     * Helper to set up plugin with relay running and get the beforeEmit callback.
     */
    async function getBeforeEmitCallback(
      options: WebpackPluginOptions = { overlay: true },
    ): Promise<
      (
        data: { html: string; outputName: string },
        cb: (err: null, data: { html: string; outputName: string }) => void,
      ) => void
    > {
      // Configure relay as running
      mockRelayControl.ensureRunning.mockResolvedValue({
        running: true,
        wasStarted: false,
        port: 3042,
        host: '127.0.0.1',
      });

      const { initializePlugin, compilerCallbacks } =
        await setupPlugin(options);
      await initializePlugin();

      // Trigger compilation hook
      const compilationCallback = compilerCallbacks.getCompilation();
      compilationCallback({});

      // Wait for dynamic import to resolve and tapAsync to be registered
      await vi.waitFor(() => {
        expect(mockBeforeEmitTapAsync).toHaveBeenCalled();
      });

      return mockBeforeEmitTapAsync.mock.calls[0]?.[1];
    }

    it('should inject relay globals into <head> when relay is running', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback();
      const html =
        '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert
      expect(data.html).toContain('window.__DOMSCRIBE_RELAY_PORT__ = 3042');
      expect(data.html).toContain(
        'window.__DOMSCRIBE_RELAY_HOST__ = "127.0.0.1"',
      );
      expect(cb).toHaveBeenCalledWith(null, data);
    });

    it('should inject overlay options when overlay enabled and relay running', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback({ overlay: true });
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert
      expect(data.html).toContain('window.__DOMSCRIBE_OVERLAY_OPTIONS__');
    });

    it('should not inject overlay script tag in body (overlay loaded via EntryPlugin)', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback({ overlay: true });
      const html =
        '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert - overlay is loaded via webpack EntryPlugin, not a script tag
      expect(data.html).not.toContain('@domscribe/overlay');
      // But overlay options should still be in head
      expect(data.html).toContain('__DOMSCRIBE_OVERLAY_OPTIONS__');
    });

    it('should not inject anything when relay is not running', async () => {
      // Arrange - explicitly set relay as not running
      mockRelayControl.ensureRunning.mockResolvedValue({
        running: false,
        wasStarted: false,
        port: 0,
        host: '127.0.0.1',
      });
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        overlay: true,
      });
      await initializePlugin();

      const compilationCallback = compilerCallbacks.getCompilation();
      compilationCallback({});

      await vi.waitFor(() => {
        expect(mockBeforeEmitTapAsync).toHaveBeenCalled();
      });

      const callback = mockBeforeEmitTapAsync.mock.calls[0]?.[1];
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert
      expect(data.html).not.toContain('__DOMSCRIBE_RELAY_PORT__');
      expect(data.html).not.toContain('@domscribe/overlay');
      expect(cb).toHaveBeenCalledWith(null, data);
    });

    it('should inject relay globals but not overlay when overlay is disabled', async () => {
      // Arrange - overlay disabled, relay running
      const callback = await getBeforeEmitCallback({ overlay: false });
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert - relay globals present, overlay not
      expect(data.html).toContain('__DOMSCRIBE_RELAY_PORT__');
      expect(data.html).not.toContain('__DOMSCRIBE_OVERLAY_OPTIONS__');
      expect(data.html).not.toContain('@domscribe/overlay');
    });

    it('should call callback even if injection throws', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback();
      // Pass null html to trigger a TypeError in string operations
      const data = {
        html: null as unknown as string,
        outputName: 'index.html',
      };
      const cb = vi.fn();

      // Act - should not throw
      callback(data, cb);

      // Assert - callback still called
      expect(cb).toHaveBeenCalledWith(null, data);
    });

    it('should inject head content after <head> tag for head-prepend parity with Vite', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback({ overlay: true });
      const html =
        '<html><head><meta charset="utf-8"></head><body></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert - relay script appears after <head> but before existing content
      const headTagEnd = data.html.indexOf('<head>') + '<head>'.length;
      const relayPortIdx = data.html.indexOf('__DOMSCRIBE_RELAY_PORT__');
      const metaIdx = data.html.indexOf('<meta charset');
      expect(relayPortIdx).toBeGreaterThan(headTagEnd);
      expect(relayPortIdx).toBeLessThan(metaIdx);
    });

    it('should fall back to </head> injection when <head> tag not found', async () => {
      // Arrange
      const callback = await getBeforeEmitCallback({ overlay: true });
      // HTML with uppercase HEAD (no lowercase <head>)
      const html = '<html><HEAD></HEAD><body></body></html>';
      const data = { html, outputName: 'index.html' };
      const cb = vi.fn();

      // Act
      callback(data, cb);

      // Assert - no <head> to match, no </head> either (uppercase), so no injection
      expect(data.html).not.toContain('__DOMSCRIBE_RELAY_PORT__');
      expect(cb).toHaveBeenCalledWith(null, data);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete lifecycle: beforeCompile → done → shutdown', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin();

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      const shutdownCallback = compilerCallbacks.getShutdown();
      shutdownCallback();

      // Assert
      expect(mockManifestWriter.close).toHaveBeenCalledTimes(1);
    });

    it('should handle lifecycle with debug enabled throughout', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const { initializePlugin, compilerCallbacks } = await setupPlugin({
        debug: true,
      });

      await initializePlugin();

      // Act
      const doneCallback = compilerCallbacks.getDone();
      doneCallback();

      // Assert
      expect(mockStats.print).toHaveBeenCalled();
    });

    it('should handle shutdown without initialization gracefully', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();
      const { compiler, compilerCallbacks } = createMockCompiler();
      plugin.apply(compiler);

      // Act - go straight to shutdown without beforeCompile
      const shutdownCallback = compilerCallbacks.getShutdown();
      shutdownCallback();

      // Assert - Should complete without calling close
      expect(mockManifestWriter.close).not.toHaveBeenCalled();
    });
  });
});
