import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Compiler } from 'webpack';

const mockBaseApply = vi.fn();

vi.mock('@domscribe/transform/plugins/webpack', () => ({
  DomscribeWebpackPlugin: class {
    apply = mockBaseApply;
  },
}));

import { DomscribeWebpackPlugin } from './webpack-plugin.js';

const mockDefinePluginApply = vi.fn();

class MockDefinePlugin {
  definitions: Record<string, string>;
  static calls: Record<string, string>[] = [];
  constructor(definitions: Record<string, string>) {
    this.definitions = definitions;
    MockDefinePlugin.calls.push(definitions);
  }
  apply = mockDefinePluginApply;
}

function createMockCompiler(
  entry?: Record<string, { import: string[] }>,
): Compiler {
  return {
    options: {
      entry: entry ?? {
        main: { import: ['./src/index.ts'] },
      },
    },
    webpack: {
      DefinePlugin: MockDefinePlugin,
    },
  } as unknown as Compiler;
}

describe('DomscribeWebpackPlugin (react)', () => {
  beforeEach(() => {
    mockBaseApply.mockClear();
    mockDefinePluginApply.mockClear();
    MockDefinePlugin.calls = [];
  });

  describe('apply', () => {
    it('should call the base plugin apply', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      expect(mockBaseApply).toHaveBeenCalledWith(compiler);
    });

    it('should add auto-init entry to the first entry point', () => {
      const plugin = new DomscribeWebpackPlugin();
      const entry = { main: { import: ['./src/index.ts'] } };
      const compiler = createMockCompiler(entry);

      plugin.apply(compiler);

      expect(entry.main.import).toContain('@domscribe/react/auto-init');
    });

    it('should preserve existing entries', () => {
      const plugin = new DomscribeWebpackPlugin();
      const entry = {
        main: { import: ['./src/index.ts', './src/polyfills.ts'] },
      };
      const compiler = createMockCompiler(entry);

      plugin.apply(compiler);

      expect(entry.main.import).toContain('./src/index.ts');
      expect(entry.main.import).toContain('./src/polyfills.ts');
      expect(entry.main.import).toContain('@domscribe/react/auto-init');
    });

    it('should handle entry as non-object gracefully', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = {
        options: { entry: './src/index.ts' },
        webpack: { DefinePlugin: MockDefinePlugin },
      } as unknown as Compiler;

      plugin.apply(compiler);

      expect(mockBaseApply).toHaveBeenCalled();
    });

    it('should handle entry as array gracefully', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = {
        options: { entry: ['./src/index.ts'] },
        webpack: { DefinePlugin: MockDefinePlugin },
      } as unknown as Compiler;

      plugin.apply(compiler);

      expect(mockBaseApply).toHaveBeenCalled();
    });

    it('should handle empty entry object', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = createMockCompiler(
        {} as Record<string, { import: string[] }>,
      );

      plugin.apply(compiler);

      expect(mockBaseApply).toHaveBeenCalled();
    });

    it('should handle entry without import array', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = {
        options: { entry: { main: {} } },
        webpack: { DefinePlugin: MockDefinePlugin },
      } as unknown as Compiler;

      plugin.apply(compiler);

      expect(mockBaseApply).toHaveBeenCalled();
    });

    it('should add to the first key when multiple entries exist', () => {
      const plugin = new DomscribeWebpackPlugin();
      const entry = {
        main: { import: ['./src/main.ts'] },
        vendor: { import: ['./src/vendor.ts'] },
      };
      const compiler = createMockCompiler(entry);

      plugin.apply(compiler);

      expect(entry.main.import).toContain('@domscribe/react/auto-init');
      expect(entry.vendor.import).not.toContain('@domscribe/react/auto-init');
    });
  });

  describe('DefinePlugin injection', () => {
    it('should apply DefinePlugin with default options', () => {
      const plugin = new DomscribeWebpackPlugin();
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      expect(MockDefinePlugin.calls).toHaveLength(1);
      expect(MockDefinePlugin.calls[0]).toEqual({
        __DOMSCRIBE_RUNTIME_OPTIONS__: JSON.stringify({
          phase: undefined,
          debug: false,
          redactPII: undefined,
          blockSelectors: undefined,
        }),
        __DOMSCRIBE_ADAPTER_OPTIONS__: JSON.stringify({
          strategy: undefined,
          maxTreeDepth: undefined,
          includeWrappers: undefined,
          hookNameResolvers: undefined,
          debug: false,
        }),
      });
      expect(mockDefinePluginApply).toHaveBeenCalledWith(compiler);
    });

    it('should inject custom runtime options', () => {
      const plugin = new DomscribeWebpackPlugin({
        runtime: { phase: 2, redactPII: false, blockSelectors: ['.secret'] },
      });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const runtimeOpts = JSON.parse(definitions.__DOMSCRIBE_RUNTIME_OPTIONS__);
      expect(runtimeOpts.phase).toBe(2);
      expect(runtimeOpts.redactPII).toBe(false);
      expect(runtimeOpts.blockSelectors).toEqual(['.secret']);
    });

    it('should inject custom capture options', () => {
      const plugin = new DomscribeWebpackPlugin({
        capture: {
          strategy: 'fiber',
          maxTreeDepth: 25,
          includeWrappers: false,
          hookNameResolvers: { MyComp: { 0: 'count' } },
        },
      });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const adapterOpts = JSON.parse(definitions.__DOMSCRIBE_ADAPTER_OPTIONS__);
      expect(adapterOpts.strategy).toBe('fiber');
      expect(adapterOpts.maxTreeDepth).toBe(25);
      expect(adapterOpts.includeWrappers).toBe(false);
      expect(adapterOpts.hookNameResolvers).toEqual({
        MyComp: { 0: 'count' },
      });
    });

    it('should cascade debug to both runtime and adapter definitions', () => {
      const plugin = new DomscribeWebpackPlugin({ debug: true });
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      const definitions = MockDefinePlugin.calls[0];
      const runtimeOpts = JSON.parse(definitions.__DOMSCRIBE_RUNTIME_OPTIONS__);
      const adapterOpts = JSON.parse(definitions.__DOMSCRIBE_ADAPTER_OPTIONS__);
      expect(runtimeOpts.debug).toBe(true);
      expect(adapterOpts.debug).toBe(true);
    });

    it('should apply DefinePlugin before base plugin', () => {
      const callOrder: string[] = [];
      mockDefinePluginApply.mockImplementation(() => callOrder.push('define'));
      mockBaseApply.mockImplementation(() => callOrder.push('base'));

      const plugin = new DomscribeWebpackPlugin();
      const compiler = createMockCompiler();

      plugin.apply(compiler);

      expect(callOrder).toEqual(['define', 'base']);
    });
  });
});
