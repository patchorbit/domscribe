/**
 * Tests for webpack plugin
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomscribeWebpackPlugin } from './webpack.plugin.js';
import { Compiler, Compilation, Module, config } from 'webpack';
import type { ManifestEntry } from '@domscribe/core';
import { ManifestManager } from '@domscribe/manifest';

// Mock ManifestManager
vi.mock('@domscribe/manifest', () => {
  const mockManager = {
    initialize: vi.fn().mockResolvedValue(undefined),
    appendEntries: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      entryCount: 0,
      filesIndexed: 0,
      lastFlush: null,
    }),
  };

  return {
    ManifestManager: {
      getInstance: vi.fn().mockReturnValue(mockManager),
      resetInstance: vi.fn(),
    },
  };
});

type CompilerHooks = Compiler['hooks'];
type BeforeCompilerHook = CompilerHooks['beforeCompile'];
type CompilationHook = CompilerHooks['compilation'];
type DoneHook = CompilerHooks['done'];

type CompilationHooks = Compilation['hooks'];
type ProcessAssetsHook = CompilationHooks['processAssets'];

describe('DomscribeWebpackPlugin', () => {
  let mockCompiler: Compiler;
  let mockCompilation: Compilation;
  let originalEnv: typeof process.env;
  let mockManager: ReturnType<typeof ManifestManager.getInstance>;

  const beforeCompileTapAsync = vi.fn();
  const compilationTap = vi.fn();
  const doneTapAsync = vi.fn();
  const processAssetsTapAsync = vi.fn();

  const compiler = vi.mockObject<Compiler>(
    new Compiler('', config.getNormalizedWebpackOptions({})),
  );
  let {
    beforeCompile: beforeCompileHook,
    compilation: compilationHook,
    done: doneHook,
  } = compiler.hooks;

  const compilation = vi.mockObject<Compilation>(
    new Compilation(compiler, {
      normalModuleFactory: compiler.createNormalModuleFactory(),
      contextModuleFactory: compiler.createContextModuleFactory(),
    }),
  );
  let { processAssets: processAssetsHook } = compilation.hooks;

  beforeCompileHook = vi.mockObject<BeforeCompilerHook>(beforeCompileHook);
  compilationHook = vi.mockObject<CompilationHook>(compilationHook);
  doneHook = vi.mockObject<DoneHook>(doneHook);
  processAssetsHook = vi.mockObject<ProcessAssetsHook>(processAssetsHook);

  beforeEach(() => {
    // Save original NODE_ENV
    originalEnv = { ...process.env };

    // Clear all mocks
    vi.clearAllMocks();

    // Get mock manager
    mockManager = ManifestManager.getInstance('/test/workspace');

    // Create mock compiler
    mockCompiler = {
      ...compiler,
      context: '/test/workspace',
      hooks: {
        ...compiler.hooks,
        beforeCompile: {
          ...beforeCompileHook,
          tapAsync: beforeCompileTapAsync,
        },
        compilation: {
          ...compilationHook,
          tap: compilationTap,
        },
        done: {
          ...doneHook,
          tapAsync: doneTapAsync,
        },
      },
    };

    // Create mock compilation
    mockCompilation = {
      ...compilation,
      modules: new Set(),
      hooks: {
        ...compilation.hooks,
        processAssets: {
          ...processAssetsHook,
          tapAsync: processAssetsTapAsync,
        },
      },
    };
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env = originalEnv;
  });

  describe('instantiation', () => {
    it('should create plugin with default options', () => {
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();

      expect(plugin).toBeInstanceOf(DomscribeWebpackPlugin);
    });

    it('should create plugin with custom options', () => {
      const plugin = new DomscribeWebpackPlugin({
        debug: true,
        enabled: true,
      });

      expect(plugin).toBeInstanceOf(DomscribeWebpackPlugin);
    });

    it('should disable in production by default', () => {
      process.env.NODE_ENV = 'production';
      const plugin = new DomscribeWebpackPlugin();

      plugin.apply(mockCompiler);

      // Should not register hooks in production
      expect(compilationTap).not.toHaveBeenCalled();
    });

    it('should enable in development by default', () => {
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();

      plugin.apply(mockCompiler);

      // Should register hooks in development
      expect(compilationTap).toHaveBeenCalled();
    });

    it('should respect enabled option over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      const plugin = new DomscribeWebpackPlugin({ enabled: true });

      plugin.apply(mockCompiler);

      // Should register hooks when explicitly enabled
      expect(compilationTap).toHaveBeenCalled();
    });
  });

  describe('apply method', () => {
    it('should register beforeCompile, compilation and done hooks', () => {
      process.env.NODE_ENV = 'development';
      const plugin = new DomscribeWebpackPlugin();

      plugin.apply(mockCompiler);

      expect(beforeCompileTapAsync).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
      expect(compilationTap).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
      expect(doneTapAsync).toHaveBeenCalledWith(
        'DomscribeWebpackPlugin',
        expect.any(Function),
      );
    });

    it('should skip registration when disabled', () => {
      const plugin = new DomscribeWebpackPlugin({ enabled: false });

      plugin.apply(mockCompiler);

      expect(beforeCompileTapAsync).not.toHaveBeenCalled();
      expect(compilationTap).not.toHaveBeenCalled();
      expect(doneTapAsync).not.toHaveBeenCalled();
    });

    it('should log when disabled in debug mode', () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const plugin = new DomscribeWebpackPlugin({
        enabled: false,
        debug: true,
      });

      plugin.apply(mockCompiler);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[domscribe-transform][webpack-plugin] Skipping (disabled for production)',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('manifest collection', () => {
    let plugin: DomscribeWebpackPlugin;
    let processAssetsCallback: (assets: unknown, callback: () => void) => void;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';

      plugin = new DomscribeWebpackPlugin();

      // Capture the processAssets callback
      processAssetsTapAsync.mockImplementation((options, callback) => {
        processAssetsCallback = callback;
      });

      plugin.apply(mockCompiler);

      // Trigger beforeCompile hook to initialize manager
      const beforeCompileCallback = beforeCompileTapAsync.mock.calls[0][1];
      beforeCompileCallback({}, () => undefined);
    });

    it('should collect manifest entries from loader metadata', () => {
      // Create a module with manifest entries
      mockCompilation = getCompilationWithEntries(mockCompilation, [
        {
          entries: [
            {
              id: 'abc12345',
              file: 'Button.tsx',
              start: { line: 10, column: 2 },
              tagName: 'button',
            },
          ],
        },
      ]);

      // Trigger compilation hook
      const compilationCallback = compilationTap.mock.calls[0][1];
      compilationCallback(mockCompilation);

      // Execute processAssets callback
      processAssetsCallback({}, () => undefined);

      // Verify manager.appendEntries was called with manifest entry
      expect(mockManager.appendEntries).toHaveBeenCalledWith([
        {
          id: 'abc12345',
          file: 'Button.tsx',
          start: { line: 10, column: 2 },
          tagName: 'button',
        },
      ]);
    });

    it('should aggregate entries from multiple modules', () => {
      mockCompilation = getCompilationWithEntries(mockCompilation, [
        {
          entries: [
            {
              id: 'abc12345',
              file: 'Button.tsx',
              start: { line: 10, column: 2 },
              tagName: 'button',
            },
          ],
        },
        {
          entries: [
            {
              id: 'def67890',
              file: 'Input.tsx',
              start: { line: 5, column: 0 },
              tagName: 'input',
            },
          ],
        },
      ]);

      // Trigger compilation hook
      const compilationCallback = compilationTap.mock.calls[0][1];
      compilationCallback(mockCompilation);

      // Execute processAssets callback
      processAssetsCallback({}, () => undefined);

      // Should contain both entries
      expect(mockManager.appendEntries).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'abc12345',
          file: 'Button.tsx',
          start: expect.objectContaining({ line: 10, column: 2 }),
          tagName: 'button',
        }),
        expect.objectContaining({
          id: 'def67890',
          file: 'Input.tsx',
          start: expect.objectContaining({ line: 5, column: 0 }),
          tagName: 'input',
        }),
      ]);
    });

    it('should handle modules without manifest entries', async () => {
      mockCompilation = getCompilationWithEntries(mockCompilation, [
        {
          entries: [
            {
              id: 'abc12345',
              file: 'Button.tsx',
              start: { line: 10, column: 2 },
              tagName: 'button',
            },
          ],
        },
        {
          entries: [],
        },
        {},
      ]);

      // Trigger compilation hook
      const compilationCallback = compilationTap.mock.calls[0][1];
      compilationCallback(mockCompilation);

      // Execute processAssets callback
      processAssetsCallback({}, () => undefined);

      // Should only write entries from moduleWithEntries
      expect(mockManager.appendEntries).toHaveBeenCalledWith([
        {
          id: 'abc12345',
          file: 'Button.tsx',
          start: { line: 10, column: 2 },
          tagName: 'button',
        },
      ]);
    });
  });

  describe('statistics', () => {
    let plugin: DomscribeWebpackPlugin;
    let processAssetsCallback: (assets: unknown, callback: () => void) => void;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';

      plugin = new DomscribeWebpackPlugin({ debug: true });

      // Capture the processAssets callback
      processAssetsTapAsync.mockImplementation((options, callback) => {
        processAssetsCallback = callback;
      });

      plugin.apply(mockCompiler);

      // Trigger beforeCompile hook to initialize manager
      const beforeCompileCallback = beforeCompileTapAsync.mock.calls[0][1];
      beforeCompileCallback({}, () => undefined);
    });

    it('should track files transformed', async () => {
      mockCompilation = getCompilationWithEntries(mockCompilation, [
        {
          entries: [
            {
              id: 'abc12345',
              file: 'Button.tsx',
              start: { line: 10, column: 2 },
              tagName: 'button',
            },
          ],
        },
        {
          entries: [
            {
              id: 'def67890',
              file: 'Input.tsx',
              start: { line: 5, column: 0 },
              tagName: 'input',
            },
          ],
        },
      ]);

      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Trigger compilation hook
      const compilationCallback = compilationTap.mock.calls[0][1];
      compilationCallback(mockCompilation);

      // Execute processAssets callback
      processAssetsCallback({}, () => undefined);

      // Trigger done hook
      const doneCallback = doneTapAsync.mock.calls[0][1];
      doneCallback({}, () => undefined);

      // Should print statistics
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[domscribe-plugin] Transform Statistics:'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Files transformed: 2'),
      );

      consoleSpy.mockRestore();
    });

    it('should track elements injected', async () => {
      mockCompilation = getCompilationWithEntries(mockCompilation, [
        {
          entries: [
            {
              id: 'abc12345',
              file: 'Button.tsx',
              start: { line: 10, column: 2 },
              tagName: 'button',
            },
            {
              id: 'def67890',
              file: 'Button.tsx',
              start: { line: 12, column: 4 },
              tagName: 'span',
            },
          ],
        },
      ]);

      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Trigger compilation hook
      const compilationCallback = compilationTap.mock.calls[0][1];
      compilationCallback(mockCompilation);

      // Execute processAssets callback
      processAssetsCallback({}, () => undefined);

      // Trigger done hook
      const doneCallback = doneTapAsync.mock.calls[0][1];
      doneCallback({}, () => undefined);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Elements injected: 2'),
      );

      consoleSpy.mockRestore();
    });

    it('should print no files message when no transformations', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Trigger done hook without any processing
      const doneCallback = doneTapAsync.mock.calls[0][1];
      doneCallback({}, () => undefined);

      expect(consoleSpy).toHaveBeenCalledWith(
        '\n[domscribe-plugin] No files transformed',
      );

      consoleSpy.mockRestore();
    });
  });
});

const getCompilationWithEntries = (
  compilation: Compilation,
  modulesWithEntries: { entries?: ManifestEntry[] }[],
): Compilation => {
  const modules = new Set<Module>();
  for (const moduleWithEntries of modulesWithEntries) {
    const module = new Module('');
    module.buildInfo = {};
    if (moduleWithEntries.entries) {
      module.buildInfo.domscribeManifestEntries = moduleWithEntries.entries;
    }
    modules.add(module);
  }
  compilation.modules = modules;
  return compilation;
};
