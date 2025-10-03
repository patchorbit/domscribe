/**
 * Unit tests for webpack loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LoaderContext } from 'webpack';
import {
  transform,
  getLoaderStats,
  resetLoaderStats,
  printLoaderStats,
} from './webpack.loader.js';
import type { WebpackLoaderOptions } from './types.js';
import { SourceMap } from 'magic-string';
import { IDStabilizer } from '@domscribe/manifest';

const callbackFn = vi.fn();

/**
 * Create a mock webpack loader context
 */
function createLoaderContext(
  resourcePath: string,
  options: WebpackLoaderOptions,
): LoaderContext<WebpackLoaderOptions> {
  return {
    rootContext: '/src',
    resourcePath,
    getOptions: vi.fn(() => options),
    async: () => callbackFn,
  } as unknown as LoaderContext<WebpackLoaderOptions>;
}

const idStabilizerInitialize = vi.fn();
const idStabilizerComputeFileHashSync = vi.fn();
const domscribeInjectorInject = vi.fn();

vi.mock('@domscribe/manifest', () => ({
  ManifestManager: class {
    static getInstance = () => {
      return {
        getIDStabilizer: () => new IDStabilizer(''),
      };
    };
  },
  IDStabilizer: class {
    initialize = async (...args: unknown[]) => idStabilizerInitialize(...args);
    computeFileHashSync = (...args: unknown[]) =>
      idStabilizerComputeFileHashSync(...args);
  },
}));

vi.mock('../../core/injector.js', () => ({
  DomscribeInjector: class {
    inject = (...args: unknown[]) => domscribeInjectorInject(...args);
  },
}));

describe('Webpack Loader', () => {
  beforeEach(() => {
    resetLoaderStats();
    vi.clearAllMocks();

    idStabilizerInitialize.mockResolvedValue(undefined);
    idStabilizerComputeFileHashSync.mockReturnValue('1234567890');
  });

  describe('Loader Options', () => {
    it('should respect enabled=false option', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;

      const options = { enabled: false };
      const context = createLoaderContext('/src/Button.tsx', options);
      await transform(context, { source, sourceMap: undefined }, callbackFn);

      expect(callbackFn).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(null, source);
    });

    it('should default to enabled=true', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;

      const options = {};
      const context = createLoaderContext('/src/Button.tsx', options);
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));

      await transform(context, { source, sourceMap: undefined }, callbackFn);

      expect(callbackFn).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(
        null,
        expect.stringContaining('from-injector'),
        expect.any(SourceMap),
        expect.objectContaining({
          domscribeManifestEntries: expect.any(Array),
          webpackAST: {},
        }),
      );
    });

    it('should track statistics in debug mode', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;

      const options = { debug: true };
      const context = createLoaderContext('/src/Button.tsx', options);
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));

      await transform(context, { source, sourceMap: undefined }, callbackFn);

      const stats = getLoaderStats();
      expect(stats.filesTransformed).toBe(1);
      expect(stats.elementsInjected).toBe(1);
      expect(stats.totalTimeMs).toBeGreaterThan(0);
    });

    it('should not log in non-debug mode', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;

      const options = { debug: false };
      const context = createLoaderContext('/src/Button.tsx', options);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // noop
      });

      await transform(context, { source, sourceMap: undefined }, callbackFn);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Source Maps', () => {
    it('should call callback with source map when available', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;
      const context = createLoaderContext('/src/Button.tsx', {});
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));

      const result = await transform(
        context,
        { source, sourceMap: undefined },
        callbackFn,
      );

      expect(result).toBeUndefined(); // Callback mode
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0];
      expect(callbackArgs[0]).toBeNull(); // error
      expect(callbackArgs[1]).toBeDefined(); // code
      expect(callbackArgs[1]).toContain('from-injector');
      expect(callbackArgs[2]).toBeDefined(); // map
    });
  });

  describe('Manifest Entries', () => {
    it('should store manifest entries in loader data', async () => {
      const source = `
        export function Button() {
          return <button>Click me</button>;
        }
      `;
      const context = createLoaderContext('/src/Button.tsx', {});
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));

      await transform(context, { source, sourceMap: undefined }, callbackFn);

      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0];
      expect(callbackArgs[3]).toBeDefined();
      expect(callbackArgs[3].domscribeManifestEntries).toBeDefined();
      expect(callbackArgs[3].domscribeManifestEntries).toHaveLength(1);
    });

    it('should generate manifest entries for all elements', async () => {
      const source = `
        export function Card() {
          return (
            <div>
              <h1>Title</h1>
              <p>Content</p>
            </div>
          );
        }
      `;

      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 3));
      const context = createLoaderContext('/src/Card.tsx', {});

      await transform(context, { source, sourceMap: undefined }, callbackFn);

      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0];
      expect(callbackArgs[3]).toBeDefined();
      expect(callbackArgs[3].domscribeManifestEntries).toBeDefined();
      expect(callbackArgs[3].domscribeManifestEntries).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should return original code on parse error', async () => {
      const invalidSource = `
        export function Button() {
          return <button>Click me</button
        }
      `;
      domscribeInjectorInject.mockImplementation(() => {
        throw new Error('Invalid syntax');
      });
      const context = createLoaderContext('/src/Button.tsx', {});

      await transform(
        context,
        { source: invalidSource, sourceMap: undefined },
        callbackFn,
      );

      expect(callbackFn).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(null, invalidSource);
    });

    it('should not break on syntax errors', async () => {
      const invalidSource = `
        export function Button() {
          return <div><span></div></span>;
        }
      `;
      domscribeInjectorInject.mockImplementation(() => {
        throw new Error('Invalid syntax');
      });
      const context = createLoaderContext('/src/Button.tsx', {});

      await transform(
        context,
        { source: invalidSource, sourceMap: undefined },
        callbackFn,
      );

      expect(callbackFn).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(null, invalidSource);
    });
  });

  describe('Statistics', () => {
    it('should track files transformed', async () => {
      resetLoaderStats();

      const source = `export function Button() { return <button>Click</button>; }`;

      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));
      const context1 = createLoaderContext('/src/Button1.tsx', {});
      const context2 = createLoaderContext('/src/Button2.tsx', {});
      const context3 = createLoaderContext('/src/Button3.tsx', {});

      await transform(context1, { source, sourceMap: undefined }, callbackFn);
      await transform(context2, { source, sourceMap: undefined }, callbackFn);
      await transform(context3, { source, sourceMap: undefined }, callbackFn);

      const stats = getLoaderStats();
      expect(stats.filesTransformed).toBe(3);
    });

    it('should track elements injected', async () => {
      resetLoaderStats();

      const source1 = `export function Button() { return <button>Click</button>; }`;
      const source2 = `export function Card() { return <div><h1>Title</h1><p>Content</p></div>; }`;

      domscribeInjectorInject
        .mockReturnValueOnce(mockInjectorResult(source1, 1))
        .mockReturnValueOnce(mockInjectorResult(source2, 3));
      const context1 = createLoaderContext('/src/Button.tsx', {});
      const context2 = createLoaderContext('/src/Card.tsx', {});

      await transform(
        context1,
        { source: source1, sourceMap: undefined },
        callbackFn,
      );
      await transform(
        context2,
        { source: source2, sourceMap: undefined },
        callbackFn,
      );

      const stats = getLoaderStats();
      expect(stats.filesTransformed).toBe(2);
      expect(stats.elementsInjected).toBe(4); // 1 button + 3 elements in card
    });

    it('should track total time', async () => {
      resetLoaderStats();

      const source = `export function Button() { return <button>Click</button>; }`;
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));
      const context = createLoaderContext('/src/Button.tsx', { debug: true });
      await transform(context, { source, sourceMap: undefined }, callbackFn);

      const stats = getLoaderStats();
      expect(stats.totalTimeMs).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      const source = `export function Button() { return <button>Click</button>; }`;
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));
      const context = createLoaderContext('/src/Button.tsx', { debug: true });
      await transform(context, { source, sourceMap: undefined }, callbackFn);

      let stats = getLoaderStats();
      expect(stats.filesTransformed).toBeGreaterThan(0);

      resetLoaderStats();

      stats = getLoaderStats();
      expect(stats.filesTransformed).toBe(0);
      expect(stats.elementsInjected).toBe(0);
      expect(stats.totalTimeMs).toBe(0);
    });

    it('should print statistics', async () => {
      resetLoaderStats();

      const source = `export function Button() { return <button>Click</button>; }`;
      domscribeInjectorInject.mockReturnValue(mockInjectorResult(source, 1));
      const context = createLoaderContext('/src/Button.tsx', { debug: true });
      await transform(context, { source, sourceMap: undefined }, callbackFn);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // noop
      });

      printLoaderStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[domscribe-transform][webpack-loader]'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Files transformed:'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty statistics', async () => {
      resetLoaderStats();

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // noop
      });

      printLoaderStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files transformed'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const source = '';
      const context = createLoaderContext('/src/Empty.tsx', {});

      const result = await transform(
        context,
        { source, sourceMap: undefined },
        callbackFn,
      );

      expect(result).toBeUndefined(); // Uses callback mode
      expect(callbackFn).toHaveBeenCalled();
    });
  });
});

const mockInjectorResult = (source: string, entryCount = 0) => {
  return {
    code: source + 'from-injector',
    map: new SourceMap({
      file: '',
      sources: [''],
      names: [],
      mappings: [],
      x_google_ignoreList: [],
    }),
    manifestEntries: Array.from({ length: entryCount }, () => ({
      id: '1234567890',
      file: '',
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
      tagName: '',
    })),
  };
};
