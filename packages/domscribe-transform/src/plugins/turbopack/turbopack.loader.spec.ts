/**
 * Tests for Turbopack Self-Initializing Loader
 *
 * Tests the Turbopack loader which handles its own singleton initialization,
 * relay auto-start, and cleanup — since Turbopack has no plugin system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LoaderContext } from 'webpack';
import type { TurbopackLoaderOptions } from './types.js';
import type { RawSourceMap } from 'source-map';

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
  print: vi.fn(),
  getAggregate: vi.fn().mockReturnValue({
    filesTransformed: 0,
    elementsFound: 0,
    elementsInjected: 0,
    totalTimeMs: 0,
    avgTimePerFileMs: 0,
  }),
};

const mockManifestWriter = {
  initialize: vi.fn(),
  appendEntries: vi.fn(),
  close: vi.fn(),
  getStats: vi
    .fn()
    .mockReturnValue({ entryCount: 0, filesIndexed: 0, lastRebuild: '' }),
};

const mockWriterGetInstance = vi.fn(() => mockManifestWriter);

vi.mock('@domscribe/manifest', () => ({
  ManifestWriter: {
    getInstance: (...args: Parameters<typeof mockWriterGetInstance>) =>
      mockWriterGetInstance(...args),
  },
}));

const mockInjectorRegistry = {
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  saveCache: vi.fn(),
  getInjector: vi.fn(() => mockInjector),
};

const mockInjectorRegistryGetInstance = vi.fn(() => mockInjectorRegistry);

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

const mockSourceMapConsumerConstructor = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (..._args: unknown[]) => mockSourceMapConsumer,
);

vi.mock('source-map', () => ({
  SourceMapConsumer: class {
    constructor(...args: unknown[]) {
      return mockSourceMapConsumerConstructor(...args);
    }
  },
}));

const mockStatsGetInstance = vi.fn(() => mockStats);

vi.mock('../../core/stats.js', () => ({
  TransformStats: {
    getInstance: (...args: unknown[]) => mockStatsGetInstance(...args),
  },
}));

const mockRelayControl = {
  ensureRunning: vi.fn().mockResolvedValue({ host: '127.0.0.1', port: 4400 }),
};

vi.mock('@domscribe/relay', () => ({
  RelayControl: class MockRelayControl {
    ensureRunning = mockRelayControl.ensureRunning;
  },
}));

vi.mock('@domscribe/core', () => ({
  PATHS: {
    TRANSFORM_CACHE: '.domscribe/cache',
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

interface MockInjectorResult {
  code: string;
  map: RawSourceMap | null;
  manifestEntries: { id: string; file: string }[];
  metrics: {
    parseMs: number;
    traversalMs: number;
    elementsFound: number;
    elementsInjected: number;
  };
}

function createMockInjectorResult(
  code: string,
  entryCount = 0,
  includeMap = true,
): MockInjectorResult {
  const entries = Array.from({ length: entryCount }, (_, i) => ({
    id: `id-${i}`,
    file: 'test.tsx',
  }));

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

function createLoaderContext(
  resourcePath: string,
  options: TurbopackLoaderOptions = {},
): LoaderContext<TurbopackLoaderOptions> {
  const baseContext = {
    rootContext: '/test/workspace',
    resourcePath,
    getOptions: vi.fn(() => options),
    async: vi.fn(),
    addDependency: vi.fn(),
  };
  return Object.assign(Object.create(null), baseContext);
}

// ============================================================================
// Tests
// ============================================================================

/**
 * We need to re-import the module for each test to reset module-level state
 * (initPromise, initResult, cleanupRegistered).
 */
async function importLoader() {
  return await import('./turbopack.loader.js');
}

describe('Turbopack Loader', () => {
  let loaderModule: Awaited<ReturnType<typeof importLoader>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock return values
    mockInjector.inject.mockReturnValue(
      createMockInjectorResult('transformed code', 0),
    );
    mockWriterGetInstance.mockReturnValue(mockManifestWriter);
    mockInjectorRegistryGetInstance.mockReturnValue(mockInjectorRegistry);
    mockInjectorRegistry.getInjector.mockReturnValue(mockInjector);
    mockStatsGetInstance.mockReturnValue(mockStats);
    mockRelayControl.ensureRunning.mockResolvedValue({
      host: '127.0.0.1',
      port: 4400,
    });

    // Re-import to reset module-level state
    vi.resetModules();
    loaderModule = await importLoader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should trigger initialization with InjectorRegistry', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);

      // Act
      loaderModule.default.call(context, source);
      // Wait for async operations
      await vi.waitFor(() => {
        expect(asyncCallback).toHaveBeenCalled();
      });

      // Assert - singletons initialized
      expect(mockInjectorRegistryGetInstance).toHaveBeenCalledWith(
        '/test/workspace',
        expect.objectContaining({ debug: false }),
      );
      expect(mockInjectorRegistry.initialize).toHaveBeenCalled();
    });

    it('should reuse initialization on subsequent invocations', async () => {
      // Arrange
      const source1 = 'export function App() { return <div>Hello</div>; }';
      const source2 = 'export function Card() { return <div>Card</div>; }';
      const context1 = createLoaderContext('/test/App.tsx');
      const context2 = createLoaderContext('/test/Card.tsx');
      const asyncCallback1 = vi.fn();
      const asyncCallback2 = vi.fn();
      context1.async = vi.fn(() => asyncCallback1);
      context2.async = vi.fn(() => asyncCallback2);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context1, source1);
      await vi.waitFor(() => expect(asyncCallback1).toHaveBeenCalled());

      loaderModule.default.call(context2, source2);
      await vi.waitFor(() => expect(asyncCallback2).toHaveBeenCalled());

      // Assert - InjectorRegistry.getInstance called for init only once with options,
      // then called again per-file without options
      expect(mockInjectorRegistry.initialize).toHaveBeenCalledTimes(1);
    });

    it('should start relay during initialization', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx', {
        relay: { port: 5000, bodyLimit: 5242880 },
      });
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(mockRelayControl.ensureRunning).toHaveBeenCalledWith({
        port: 5000,
        host: undefined,
        bodyLimit: 5242880,
      });
    });

    it('should handle init failure gracefully and return original source', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjectorRegistry.initialize.mockRejectedValueOnce(
        new Error('Init failed'),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(asyncCallback).toHaveBeenCalledWith(null, source);
    });

    it('should not block transforms if relay fails', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockRelayControl.ensureRunning.mockRejectedValueOnce(
        new Error('Relay failed'),
      );
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert - transform still proceeded
      expect(mockInjector.inject).toHaveBeenCalled();
      expect(asyncCallback).toHaveBeenCalledWith(
        null,
        expect.stringContaining('transformed'),
        expect.objectContaining({ version: 3 }),
      );
    });
  });

  describe('Relay Options', () => {
    it('should skip relay when autoStart is false', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx', {
        relay: { autoStart: false },
      });
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(mockRelayControl.ensureRunning).not.toHaveBeenCalled();
    });

    it('should expose relay info via getInitResult()', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      const result = loaderModule.getInitResult();
      expect(result.relayHost).toBe('127.0.0.1');
      expect(result.relayPort).toBe(4400);
    });
  });

  describe('Transform', () => {
    it('should transform source code correctly', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — first file includes relay globals preamble
      expect(asyncCallback).toHaveBeenCalledWith(
        null,
        expect.stringContaining('transformed'),
        expect.objectContaining({ version: 3 }),
      );
    });

    it('should inject client globals into first transformed file', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — preamble sets relay globals
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain('__DOMSCRIBE_RELAY_PORT__=4400');
      expect(outputCode).toContain('__DOMSCRIBE_RELAY_HOST__="127.0.0.1"');
    });

    it('should inject client globals after use client directive', async () => {
      // Arrange
      const source =
        "'use client';\nexport function App() { return <div>Hello</div>; }";
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult("'use client';\ntransformed", 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — 'use client' must come before the preamble
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain('__DOMSCRIBE_RELAY_PORT__');
      const directiveIndex = outputCode.indexOf("'use client'");
      const preambleIndex = outputCode.indexOf('__DOMSCRIBE_RELAY_PORT__');
      expect(directiveIndex).toBeLessThan(preambleIndex);
      // The directive should be at the very start
      expect(directiveIndex).toBe(0);
    });

    it('should inject preamble after use client with leading comments', async () => {
      // Arrange — files with lint-ignore comments before "use client"
      const source =
        '/** biome-ignore-all */\n/** another comment */\n"use client";\nimport React from "react";';
      const context = createLoaderContext('/test/InputGroup.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult(
          '/** biome-ignore-all */\n/** another comment */\n"use client";\ntransformed',
          1,
        ),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — comments + directive must come before the preamble
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      const directiveIndex = outputCode.indexOf('"use client"');
      const preambleIndex = outputCode.indexOf('__DOMSCRIBE_RELAY_PORT__');
      expect(directiveIndex).toBeLessThan(preambleIndex);
      // Comments should be preserved before the directive
      expect(outputCode.indexOf('biome-ignore-all')).toBeLessThan(
        directiveIndex,
      );
    });

    it('should inject client globals after use server directive', async () => {
      // Arrange
      const source = '"use server";\nexport async function action() {}';
      const context = createLoaderContext('/test/action.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('"use server";\ntransformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — 'use server' must come before the preamble
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain('__DOMSCRIBE_RELAY_PORT__');
      const directiveIndex = outputCode.indexOf('"use server"');
      const preambleIndex = outputCode.indexOf('__DOMSCRIBE_RELAY_PORT__');
      expect(directiveIndex).toBeLessThan(preambleIndex);
      expect(directiveIndex).toBe(0);
    });

    it('should inject client globals into every transformed file', async () => {
      // Arrange — Turbopack shares the loader module between server and
      // client compilations, so a "first file only" flag would be consumed
      // by the server side (where the preamble is a no-op).  Injecting
      // into every file is idempotent and ensures the client always gets it.
      const context1 = createLoaderContext('/test/App.tsx');
      const context2 = createLoaderContext('/test/Card.tsx');
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      context1.async = vi.fn(() => callback1);
      context2.async = vi.fn(() => callback2);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act — transform two files
      loaderModule.default.call(
        context1,
        'export function App() { return <div/>; }',
      );
      await vi.waitFor(() => expect(callback1).toHaveBeenCalled());

      loaderModule.default.call(
        context2,
        'export function Card() { return <div/>; }',
      );
      await vi.waitFor(() => expect(callback2).toHaveBeenCalled());

      // Assert — both files have preamble
      const output1 = callback1.mock.calls[0][1] as string;
      const output2 = callback2.mock.calls[0][1] as string;
      expect(output1).toContain('__DOMSCRIBE_RELAY_PORT__');
      expect(output2).toContain('__DOMSCRIBE_RELAY_PORT__');
    });

    it('should inject auto-init import with dedup guard', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain('__DOMSCRIBE_AUTO_INIT__');
      expect(outputCode).toContain(
        "import('@domscribe/next/auto-init').catch(function(){})",
      );
    });

    it('should use relative path from autoInitPath when provided', async () => {
      // Arrange — source file at /test/packages/ui/Button.tsx,
      // auto-init at /test/node_modules/@domscribe/next/auto-init/index.js
      const source = 'export function Button() { return <button/>; }';
      const context = createLoaderContext('/test/packages/ui/Button.tsx', {
        autoInitPath: '/test/node_modules/@domscribe/next/auto-init/index.js',
      });
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — relative path from packages/ui/ to node_modules/
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain(
        "import('../../node_modules/@domscribe/next/auto-init/index.js').catch(function(){})",
      );
    });

    it('should inject overlay options when configured', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx', {
        overlay: { initialMode: 'expanded', debug: true },
      });
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      const outputCode = asyncCallback.mock.calls[0][1] as string;
      expect(outputCode).toContain('__DOMSCRIBE_OVERLAY_OPTIONS__');
      expect(outputCode).toContain('"initialMode":"expanded"');
    });

    it('should skip empty source', async () => {
      // Arrange
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);

      // Act
      loaderModule.default.call(context, '');
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(asyncCallback).toHaveBeenCalledWith(null, '');
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should skip when enabled is false', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx', { enabled: false });
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(asyncCallback).toHaveBeenCalledWith(null, source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should skip non-JSX/TSX files', async () => {
      // Arrange
      const source = 'export const x = 1;';
      const context = createLoaderContext('/test/utils.css');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(asyncCallback).toHaveBeenCalledWith(null, source);
      expect(mockInjector.inject).not.toHaveBeenCalled();
    });

    it('should record stats per file', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 2),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(mockStats.record).toHaveBeenCalledWith(
        expect.objectContaining({
          file: '/test/App.tsx',
          timings: expect.objectContaining({
            totalTransformMs: expect.any(Number),
          }),
          counts: expect.objectContaining({
            elementsInjected: 2,
          }),
        }),
      );
    });

    it('should handle injection error gracefully', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockImplementation(() => {
        throw new Error('Injection failed');
      });

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(asyncCallback).toHaveBeenCalledWith(null, source);
    });

    it('should eagerly persist ID cache after each transform', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      mockInjector.inject.mockReturnValue(
        createMockInjectorResult('transformed', 1),
      );

      // Act
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert — injectorRegistry.saveCache() called to persist ID cache
      // (not close(), which would invalidate the registry for subsequent files)
      expect(mockInjectorRegistry.saveCache).toHaveBeenCalled();
    });

    it('should append manifest entries', async () => {
      // Arrange
      const source = 'export function App() { return <div>Hello</div>; }';
      const context = createLoaderContext('/test/App.tsx');
      const asyncCallback = vi.fn();
      context.async = vi.fn(() => asyncCallback);
      const entries = [{ id: 'abc', file: 'test.tsx' }];
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
      loaderModule.default.call(context, source);
      await vi.waitFor(() => expect(asyncCallback).toHaveBeenCalled());

      // Assert
      expect(mockManifestWriter.appendEntries).toHaveBeenCalledWith(entries);
    });
  });

  describe('getInitResult', () => {
    it('should return undefined relay info before initialization', () => {
      // Assert
      const result = loaderModule.getInitResult();
      expect(result.relayHost).toBeUndefined();
      expect(result.relayPort).toBeUndefined();
    });
  });
});
