/**
 * Tests for Webpack Loader
 *
 * Tests the webpack loader that integrates Domscribe transformations into the Webpack build process.
 * This test suite focuses on testing the loader's business logic only,
 * with all external dependencies mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoaderContext, NormalModule } from 'webpack';
import { transform } from './webpack.loader.js';
import type { WebpackLoaderOptions } from './types.js';
import type { SourceMap } from 'magic-string';
import type { RawSourceMap } from 'source-map';

/**
 * Mock manifest entry structure
 */
interface MockManifestEntry {
  id: string;
  file: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
  tagName: string;
}

/**
 * Mock injector metrics structure
 */
interface MockInjectorMetrics {
  parseMs: number;
  traversalMs: number;
  elementsFound: number;
  elementsInjected: number;
}

/**
 * Mock injector result structure
 */
interface MockInjectorResult {
  code: string;
  map: RawSourceMap | null;
  manifestEntries: MockManifestEntry[];
  metrics: MockInjectorMetrics;
}

/**
 * Extended LoaderContext with _module
 */
interface ExtendedLoaderContext<T> extends LoaderContext<T> {
  _module?: NormalModule;
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockInjector = {
  initialize: vi.fn().mockResolvedValue(undefined),
  inject: vi.fn().mockReturnValue({
    code: 'transformed code',
    map: {
      version: 3,
      sources: ['test.tsx'],
      names: [],
      mappings: 'AAAA',
      file: 'test.tsx',
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

const mockSourceMapConsumer = {
  destroy: vi.fn(),
};

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
  print: vi.fn(),
};

const mockManifestWriter = {
  initialize: vi.fn(),
  appendEntries: vi.fn(),
  getStats: vi
    .fn()
    .mockReturnValue({ entryCount: 0, filesIndexed: 0, lastRebuild: '' }),
};

const mockWriterGetInstance = vi.fn(() => mockManifestWriter);

// Mock @domscribe/manifest
vi.mock('@domscribe/manifest', () => ({
  ManifestWriter: {
    getInstance: (...args: Parameters<typeof mockWriterGetInstance>) =>
      mockWriterGetInstance(...args),
  },
}));

const mockInjectorRegistry = {
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  getInjector: vi.fn(() => mockInjector),
};

const mockInjectorRegistryGetInstance = vi.fn(() => mockInjectorRegistry);

const mockSourceMapConsumerConstructor = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (..._args: unknown[]) => mockSourceMapConsumer,
);

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

const mockStatsGetInstance = vi.fn(() => mockStats);

// Mock stats
vi.mock('../../core/stats.js', () => ({
  TransformStats: {
    getInstance: (...args: unknown[]) => mockStatsGetInstance(...args),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock webpack loader context with typed options
 */
function createLoaderContext(
  resourcePath: string,
  options: WebpackLoaderOptions = {},
  includeModule = false,
): ExtendedLoaderContext<WebpackLoaderOptions> {
  const baseContext = {
    rootContext: '/test/workspace',
    resourcePath,
    getOptions: vi.fn(() => options),
    async: vi.fn(),
    addDependency: vi.fn(),
  };

  const module = vi.mocked(NormalModule);

  if (includeModule) {
    const contextWithModule = {
      ...baseContext,
      _module: module,
    };
    return Object.assign(Object.create(null), contextWithModule);
  }

  return Object.assign(Object.create(null), baseContext);
}

/**
 * Create a mock callback function with proper typing
 */
function createMockCallback(): {
  callback: ReturnType<typeof vi.fn>;
  getCallArgs: () => {
    error: Error | null;
    content?: string;
    sourceMap?: RawSourceMap | SourceMap;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalData?: any;
  } | null;
} {
  const callback = vi.fn();

  return {
    callback,
    getCallArgs: () => {
      const calls = callback.mock.calls;
      if (calls.length === 0) return null;

      const [error, content, sourceMap, additionalData] = calls[0];
      return { error, content, sourceMap, additionalData };
    },
  };
}

/**
 * Create a mock injector result with configurable entries
 */
function createMockInjectorResult(
  code: string,
  entryCount = 0,
  includeMap = true,
): MockInjectorResult {
  const entries: MockManifestEntry[] = Array.from(
    { length: entryCount },
    (_, i): MockManifestEntry => ({
      id: `id-${i}`,
      file: 'test.tsx',
      start: { line: i + 1, column: 0 },
      end: { line: i + 1, column: 10 },
      tagName: 'div',
    }),
  );

  const map: RawSourceMap | null = includeMap
    ? {
        version: 3,
        sources: ['test.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'test.tsx',
      }
    : null;

  return {
    code,
    map,
    manifestEntries: entries,
    metrics: {
      parseMs: 1,
      traversalMs: 0.5,
      elementsFound: entryCount,
      elementsInjected: entryCount,
    },
  };
}

/**
 * Helper to call transform with proper type safety
 */
async function callTransform(
  context: ExtendedLoaderContext<WebpackLoaderOptions>,
  source: string,
  sourceMap: SourceMap | undefined,
  callback: ReturnType<LoaderContext<WebpackLoaderOptions>['async']>,
): Promise<void> {
  return transform(context, { source, sourceMap }, callback);
}

// ============================================================================
// Tests
// ============================================================================

describe('Webpack Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock return values to defaults
    mockInjector.inject.mockReturnValue(
      createMockInjectorResult('transformed code', 0),
    );

    // Reset ManifestWriter mock
    mockWriterGetInstance.mockReturnValue(mockManifestWriter);

    // Reset InjectorRegistry mock
    mockInjectorRegistryGetInstance.mockReturnValue(mockInjectorRegistry);
    mockInjectorRegistry.getInjector.mockReturnValue(mockInjector);

    // Reset TransformStats mock
    mockStatsGetInstance.mockReturnValue(mockStats);
  });

  describe('Loader Options', () => {
    it('should respect enabled=false option', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const options: WebpackLoaderOptions = { enabled: false };
      const context = createLoaderContext('/test/Button.tsx', options);
      const { callback, getCallArgs } = createMockCallback();

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe(source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should default to enabled=true when not specified', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx', {});
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalled();
    });

    it('should respect enabled=true option explicitly', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const options: WebpackLoaderOptions = { enabled: true };
      const context = createLoaderContext('/test/Button.tsx', options);
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalled();
    });

    it('should record stats in debug mode', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const options: WebpackLoaderOptions = { debug: true };
      const context = createLoaderContext('/test/Button.tsx', options);
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 2),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockStats.record).toHaveBeenCalled();
    });

    it('should return null for files with no extension', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button');
      const { callback } = createMockCallback();

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(null, source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should return null for files with unsupported extension', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.not-supported');
      const { callback } = createMockCallback();

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(null, source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });
  });

  describe('Empty Source Handling', () => {
    it('should handle empty source string', async () => {
      // Arrange
      const source = '';
      const context = createLoaderContext('/test/Empty.tsx');
      const { callback, getCallArgs } = createMockCallback();

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(callback).toHaveBeenCalled();
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe(source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only source', async () => {
      // Arrange
      const source = '   \n  \t  ';
      const context = createLoaderContext('/test/Whitespace.tsx');
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 0),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalled();
    });
  });

  describe('Source Maps', () => {
    it('should call callback with source map when available', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1, true),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(callback).toHaveBeenCalled();
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe('transformed');
      expect(args?.sourceMap).toBeDefined();
    });

    it('should create SourceMapConsumer when input source map provided', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const inputSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'original.tsx',
      };
      const context = createLoaderContext('/test/Button.tsx');
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      const sourceMapAsSourceMap: SourceMap = Object.assign(
        Object.create(null),
        inputSourceMap,
      );
      await callTransform(context, source, sourceMapAsSourceMap, callback);

      // Assert
      expect(mockSourceMapConsumerConstructor).toHaveBeenCalledWith(
        inputSourceMap,
      );
    });

    it('should not create SourceMapConsumer when no input source map', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockSourceMapConsumerConstructor).not.toHaveBeenCalled();
    });

    it('should return original source when no map generated', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx', { debug: true });
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1, false),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe(source);
    });
  });

  describe('Manifest Entries', () => {
    it('should call manager.appendEntries with manifest entries', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx', {});
      const { callback } = createMockCallback();
      const entries: MockManifestEntry[] = [
        {
          id: 'test-id',
          file: '/test/Button.tsx',
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
          tagName: 'button',
        },
      ];
      mockInjector.inject.mockReturnValue({
        code: 'transformed',
        map: {
          version: 3,
          sources: ['test.tsx'],
          names: [],
          mappings: 'AAAA',
          file: 'test.tsx',
        },
        manifestEntries: entries,
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
      });

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledWith(entries);
    });

    it('should get ManifestWriter with correct context', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx', { debug: true });
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockWriterGetInstance).toHaveBeenCalledWith('/test/workspace');
    });
  });

  describe('Core Transformation', () => {
    it('should call InjectorRegistry.getInstance with rootContext', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx', { debug: true });
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockInjectorRegistryGetInstance).toHaveBeenCalledWith(
        '/test/workspace',
      );
    });

    it('should transform JSX files with manifest entries', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.jsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed jsx', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe('transformed jsx');
      expect(mockInjector.inject).toHaveBeenCalled();
    });

    it('should transform TSX files', async () => {
      // Arrange
      const source =
        'export function Button(): JSX.Element { return <button>Click</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed tsx', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe('transformed tsx');
    });

    it('should call injector.inject with correct parameters (no fileHash)', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledWith(
        source,
        expect.objectContaining({
          sourceFile: '/test/Button.tsx',
          sourceMapConsumer: undefined,
          // NO fileHash parameter
        }),
      );
    });

    it('should pass sourceMapConsumer to injector when available', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const inputSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'original.tsx',
      };
      const context = createLoaderContext('/test/Button.tsx');
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      const sourceMapAsSourceMap: SourceMap = Object.assign(
        Object.create(null),
        inputSourceMap,
      );
      await callTransform(context, source, sourceMapAsSourceMap, callback);

      // Assert
      expect(mockInjector.inject).toHaveBeenCalledWith(
        source,
        expect.objectContaining({
          sourceFile: '/test/Button.tsx',
          sourceMapConsumer: mockSourceMapConsumer,
        }),
      );
    });

    it('should return transformed code and source map', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      const expectedMap: RawSourceMap = {
        version: 3,
        sources: ['test.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'test.tsx',
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
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe('transformed with map');
      expect(args?.sourceMap).toEqual(expectedMap);
    });
  });

  describe('Error Handling', () => {
    it('should return original source on injection error', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockImplementation(() => {
        throw new Error('Injection failed');
      });

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe(source);
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockImplementation(() => {
        throw 'string error';
      });

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe(source);
    });

    it('should not break on parse errors', async () => {
      // Arrange
      const invalidSource =
        'export function Button() { return <button>Click me</button';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Act
      await callTransform(context, invalidSource, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe(invalidSource);
    });

    it('should handle malformed JSX gracefully', async () => {
      // Arrange
      const malformedSource =
        'export function Button() { return <div><span></div></span>; }';
      const context = createLoaderContext('/test/Button.tsx');
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockImplementation(() => {
        throw new Error('Malformed JSX');
      });

      // Act
      await callTransform(context, malformedSource, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.error).toBeNull();
      expect(args?.content).toBe(malformedSource);
    });
  });

  describe('Statistics Tracking', () => {
    it('should record metrics for transformed files', async () => {
      // Arrange
      const source1 =
        'export function Button() { return <button>Click</button>; }';
      const source2 =
        'export function Card() { return <div><h1>Title</h1><p>Content</p></div>; }';
      const context1 = createLoaderContext('/test/Button.tsx', {});
      const context2 = createLoaderContext('/test/Card.tsx', {});
      const { callback } = createMockCallback();

      mockInjector.inject
        .mockReturnValueOnce(createMockInjectorResult('transformed1', 1))
        .mockReturnValueOnce(createMockInjectorResult('transformed2', 3));

      // Act
      await callTransform(context1, source1, undefined, callback);
      await callTransform(context2, source2, undefined, callback);

      // Assert - stats.record should be called with FileMetrics objects
      expect(mockStats.record).toHaveBeenCalledTimes(2);
      expect(mockStats.record).toHaveBeenCalledWith(
        expect.objectContaining({
          file: '/test/Button.tsx',
          timings: expect.objectContaining({
            totalTransformMs: expect.any(Number),
          }),
          counts: expect.objectContaining({
            elementsInjected: 1,
          }),
        }),
      );
      expect(mockStats.record).toHaveBeenCalledWith(
        expect.objectContaining({
          file: '/test/Card.tsx',
          counts: expect.objectContaining({
            elementsInjected: 3,
          }),
        }),
      );
    });

    it('should track timing breakdown', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click</button>; }';
      const context = createLoaderContext('/test/Button.tsx', {});
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert - check timing breakdown is recorded (manifestWriteMs is separate now)
      expect(mockStats.record).toHaveBeenCalledWith(
        expect.objectContaining({
          timings: expect.objectContaining({
            parseMs: expect.any(Number),
            traversalMs: expect.any(Number),
            sourceMapConsumerMs: expect.any(Number),
            totalTransformMs: expect.any(Number),
          }),
        }),
      );
    });

    it('should call TransformStats.getInstance with rootContext', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click</button>; }';
      const context = createLoaderContext('/test/Button.tsx', {});
      const { callback } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      expect(mockStatsGetInstance).toHaveBeenCalledWith('/test/workspace');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete transformation flow with all features', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const inputSourceMap: RawSourceMap = {
        version: 3,
        sources: ['original.tsx'],
        names: [],
        mappings: 'AAAA',
        file: 'original.tsx',
      };
      const context = createLoaderContext(
        '/test/Button.tsx',
        { debug: true },
        true,
      );
      const { callback } = createMockCallback();
      const entries: MockManifestEntry[] = [
        {
          id: 'test-id',
          file: '/test/Button.tsx',
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
          tagName: 'button',
        },
      ];
      mockInjector.inject.mockReturnValue({
        code: 'transformed',
        map: {
          version: 3,
          sources: ['test.tsx'],
          names: [],
          mappings: 'AAAA',
          file: 'test.tsx',
        },
        manifestEntries: entries,
        metrics: {
          parseMs: 1,
          traversalMs: 0.5,
          elementsFound: 1,
          elementsInjected: 1,
        },
      });

      // Act
      const sourceMapAsSourceMap: SourceMap = Object.assign(
        Object.create(null),
        inputSourceMap,
      );
      await callTransform(context, source, sourceMapAsSourceMap, callback);

      // Assert
      expect(mockSourceMapConsumerConstructor).toHaveBeenCalledWith(
        inputSourceMap,
      );
      expect(mockInjector.inject).toHaveBeenCalled();
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledWith(entries);
      expect(mockStats.record).toHaveBeenCalled();
    });

    it('should handle transformation without debug or source maps', async () => {
      // Arrange
      const source =
        'export function Button() { return <button>Click me</button>; }';
      const context = createLoaderContext(
        '/test/Button.tsx',
        { debug: false },
        false,
      );
      const { callback, getCallArgs } = createMockCallback();
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      await callTransform(context, source, undefined, callback);

      // Assert
      const args = getCallArgs();
      expect(args?.content).toBe('transformed');
      // Stats are always recorded (not just in debug mode)
      expect(mockStats.record).toHaveBeenCalled();
      expect(context._module).toBeUndefined();
    });

    it('should handle error recovery in production-like scenario', async () => {
      // Arrange
      const source1 =
        'export function Button() { return <button>Click me</button>; }';
      const source2 = 'export function Card() { return <div>Card</div>; }';
      const context1 = createLoaderContext('/test/Button.tsx', {
        debug: false,
      });
      const context2 = createLoaderContext('/test/Card.tsx', { debug: false });
      const { callback: callback1, getCallArgs: getCallArgs1 } =
        createMockCallback();
      const { callback: callback2, getCallArgs: getCallArgs2 } =
        createMockCallback();

      // First transform fails
      mockInjector.inject.mockImplementationOnce(() => {
        throw new Error('Injection failed');
      });

      // Second transform succeeds
      mockInjector.inject.mockImplementationOnce(() =>
        createMockInjectorResult('transformed2', 1),
      );

      // Act
      await callTransform(context1, source1, undefined, callback1);
      await callTransform(context2, source2, undefined, callback2);

      // Assert
      const args1 = getCallArgs1();
      expect(args1?.content).toBe(source1); // Original source returned

      const args2 = getCallArgs2();
      expect(args2?.content).toBe('transformed2'); // Transformed successfully
    });
  });
});
