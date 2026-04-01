/**
 * Turbopack self-initializing loader for Domscribe transform
 *
 * Unlike the webpack loader (which relies on DomscribeWebpackPlugin for lifecycle),
 * this loader handles its own initialization, relay auto-start, and cleanup —
 * because Turbopack has no plugin system.
 *
 * Key differences from the webpack loader:
 * - Lazy singleton initialization on first invocation
 * - Eager ID cache persistence after every transform (workers are ephemeral)
 * - Client globals preamble injected into every file (server/client share one loader instance)
 *
 * @module @domscribe/transform/plugins/turbopack/turbopack-loader
 */
import type { LoaderContext } from 'webpack';
import type { SourceMap } from 'magic-string';
import type { TurbopackLoaderOptions, TurbopackInitResult } from './types.js';
import { SourceMapConsumer } from 'source-map';
import {
  InjectorRegistry,
  isInjectorFileExtension,
} from '../../core/injector.registry.js';
import { ManifestWriter } from '@domscribe/manifest';
import { TransformStats } from '../../core/stats.js';
import { RelayControl } from '@domscribe/relay';
import { PATHS } from '@domscribe/core';
import { FileTimings } from '../../core/types.js';
import path from 'path';

const LOG_PREFIX = '[domscribe-transform][turbopack-loader]';

// Module-level state for lazy singleton initialization.
//
// NOTE: Turbopack runs loaders in ephemeral worker processes — module-level
// singletons may be lost when workers are recycled.  We compensate by
// eagerly persisting the ID cache after every transform so that a fresh
// worker can reload it from disk.
let initPromise: Promise<void> | null = null;
let initResult: TurbopackInitResult = {
  relayHost: undefined,
  relayPort: undefined,
};
let cleanupRegistered = false;

/**
 * Returns the relay host/port after initialization completes.
 * Call this from meta-framework wrappers (e.g. @domscribe/next) to get relay info.
 */
export function getInitResult(): TurbopackInitResult {
  return initResult;
}

/**
 * Lazy initialization — runs once on first loader invocation.
 * Creates ManifestWriter, InjectorRegistry, TransformStats singletons
 * and optionally starts the relay.
 */
async function ensureInitialized(
  rootContext: string,
  options: TurbopackLoaderOptions,
): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = doInit(rootContext, options);
  return initPromise;
}

async function doInit(
  rootContext: string,
  options: TurbopackLoaderOptions,
): Promise<void> {
  const { debug = false, relay = {} } = options;

  if (debug) {
    console.log(`${LOG_PREFIX} Initializing singletons...`);
  }

  // Initialize manifest writer
  ManifestWriter.getInstance(rootContext, { debug });

  // Initialize injector registry
  const injectorRegistry = InjectorRegistry.getInstance(rootContext, { debug });
  await injectorRegistry.initialize();

  // Initialize stats
  TransformStats.getInstance(rootContext);

  // Start relay if configured
  if (relay.autoStart !== false) {
    try {
      const relayControl = new RelayControl(rootContext);
      const { host, port } = await relayControl.ensureRunning({
        port: relay.port,
        host: relay.host,
        bodyLimit: relay.bodyLimit,
      });
      initResult = { relayHost: host, relayPort: port };

      if (debug) {
        console.log(`${LOG_PREFIX} Relay running at http://${host}:${port}`);
      }
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Relay check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Register cleanup on process exit (best-effort safety net).
  // Turbopack worker processes are ephemeral so this may not always fire;
  // the primary persistence path is the eager save after each transform.
  if (!cleanupRegistered) {
    cleanupRegistered = true;
    process.on('exit', () => {
      try {
        const stats = TransformStats.getInstance(rootContext);
        const writer = ManifestWriter.getInstance(rootContext);
        const writerStats = writer.getStats();
        if (debug) {
          stats.print(LOG_PREFIX, writerStats);
        }
        const registry = InjectorRegistry.getInstance(rootContext);
        registry.close();
        writer.close();
      } catch {
        // Best-effort cleanup — never throw during exit
      }
    });
  }

  if (debug) {
    console.log(`${LOG_PREFIX} Initialization complete`);
  }
}

/**
 * Build a JS preamble that sets relay + overlay globals on `window`.
 * Injected once into the first transformed file so the client-side
 * provider (DomscribeDevProvider) can discover relay/overlay config
 * without relying on NEXT_PUBLIC_* env vars.
 *
 * Also:
 * - Installs a one-time console.error filter that suppresses React's
 *   "Invalid prop `data-ds` supplied to `React.Fragment`" warning
 * - Triggers auto-initialization of runtime + overlay via
 *   `import('@domscribe/next/auto-init')`, guarded by a
 *   `__DOMSCRIBE_AUTO_INIT__` flag to run only once per page load
 */
/**
 * Compute the import specifier for the auto-init module.
 *
 * When `autoInitPath` is provided (absolute path resolved by the
 * meta-framework wrapper), returns a relative path from the source file
 * to the auto-init module. This bypasses bare-specifier resolution, which
 * fails in pnpm monorepos when the transformed file belongs to a workspace
 * package that doesn't directly depend on `@domscribe/next`.
 *
 * Falls back to the bare specifier when `autoInitPath` is not provided.
 */
function resolveAutoInitSpecifier(
  autoInitPath: string | undefined,
  sourceFile: string,
): string {
  if (!autoInitPath) {
    return '@domscribe/next/auto-init';
  }

  const relPath = path
    .relative(path.dirname(sourceFile), autoInitPath)
    .split(path.sep)
    .join('/');

  return relPath.startsWith('.') ? relPath : `./${relPath}`;
}

function buildClientGlobalsPreamble(
  options: TurbopackLoaderOptions,
  sourceFile: string,
): string {
  const parts: string[] = [];

  // Suppress React Fragment prop warning for data-ds (once per page load).
  parts.push(
    `if(!window.__DOMSCRIBE_CONSOLE_PATCHED__){` +
      `window.__DOMSCRIBE_CONSOLE_PATCHED__=true;` +
      `var _ce=console.error;` +
      `console.error=function(){` +
      `if(typeof arguments[0]==='string'){var _s=Array.prototype.join.call(arguments,' ');if(_s.indexOf('data-ds')!==-1&&_s.indexOf('React.Fragment')!==-1)return}` +
      `return _ce.apply(console,arguments)` +
      `}}`,
  );

  if (initResult.relayPort !== undefined) {
    parts.push(`window.__DOMSCRIBE_RELAY_PORT__=${initResult.relayPort}`);
  }
  if (initResult.relayHost !== undefined) {
    parts.push(
      `window.__DOMSCRIBE_RELAY_HOST__=${JSON.stringify(initResult.relayHost)}`,
    );
  }

  const { overlay } = options;
  if (overlay !== undefined && overlay !== false) {
    const overlayOptions = typeof overlay === 'object' ? overlay : {};
    parts.push(
      `window.__DOMSCRIBE_OVERLAY_OPTIONS__=${JSON.stringify(overlayOptions)}`,
    );
  }

  const autoInitSpecifier = resolveAutoInitSpecifier(
    options.autoInitPath,
    sourceFile,
  );

  return (
    `if(typeof window!=='undefined'){${parts.join(';')};` +
    `if(!window.__DOMSCRIBE_AUTO_INIT__){` +
    `window.__DOMSCRIBE_AUTO_INIT__=true;` +
    `import('${autoInitSpecifier}').catch(function(){})` +
    `}}\n`
  );
}

/**
 * Self-initializing Turbopack loader.
 *
 * Unlike the webpack loader (which relies on DomscribeWebpackPlugin for lifecycle),
 * this loader handles its own initialization, relay auto-start, and cleanup.
 * Turbopack has no plugin system — the loader is the only code that runs.
 *
 * Uses the same Turbopack-compatible loader APIs as the webpack loader:
 * this.async(), this.callback(), this.resourcePath, this.rootContext, this.getOptions()
 */
export default function turbopackLoader(
  this: LoaderContext<TurbopackLoaderOptions>,
  source: string,
  sourceMap?: SourceMap,
): string | void {
  const callback = this.async();

  transformWithInit(this, { source, sourceMap }, callback).catch((error) => {
    console.warn(
      `${LOG_PREFIX} Failed to transform ${this.resourcePath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return callback(null, source);
  });
}

async function transformWithInit(
  context: LoaderContext<TurbopackLoaderOptions>,
  { source, sourceMap }: { source: string; sourceMap?: SourceMap },
  callback: ReturnType<LoaderContext<TurbopackLoaderOptions>['async']>,
): Promise<void> {
  if (!source) {
    return callback(null, source);
  }

  const { rootContext, resourcePath: sourceFile } = context;
  const options = context.getOptions();
  const { debug = false, enabled = true } = options;

  if (!enabled) {
    return callback(null, source);
  }

  const fileExtension = sourceFile.split('.').pop();

  if (!fileExtension || !isInjectorFileExtension(fileExtension)) {
    return callback(null, source);
  }

  // Lazy init on first call
  try {
    await ensureInitialized(rootContext, options);
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return callback(null, source);
  }

  const totalStart = performance.now();
  const timings: FileTimings = {
    sourceMapConsumerMs: 0,
    parseMs: 0,
    traversalMs: 0,
    totalTransformMs: 0,
  };

  // Declare dependency on ID cache for invalidation
  const idCachePath = path.join(
    rootContext,
    PATHS.TRANSFORM_CACHE,
    'id-cache.json',
  );
  context.addDependency(idCachePath);

  const injectorRegistry = InjectorRegistry.getInstance(rootContext);

  if (!injectorRegistry) {
    if (debug) {
      console.warn(
        `${LOG_PREFIX} No injector registry found for ${rootContext}, skipping`,
      );
    }
    return callback(null, source);
  }

  // Create source map consumer if source map is provided
  let sourceMapConsumer: SourceMapConsumer | undefined;
  if (sourceMap) {
    const smStart = performance.now();
    sourceMapConsumer = await new SourceMapConsumer(sourceMap);
    timings.sourceMapConsumerMs = performance.now() - smStart;
  }

  const injector = await injectorRegistry.getInjector(fileExtension);

  let result;
  try {
    result = injector.inject(source, {
      sourceFile,
      sourceMapConsumer,
    });
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to transform ${sourceFile}:`,
      error instanceof Error ? error.message : String(error),
    );
    return callback(null, source);
  }

  const {
    code: transformedCode,
    map,
    manifestEntries,
    metrics: injectorMetrics,
  } = result;

  timings.parseMs = injectorMetrics.parseMs;
  timings.traversalMs = injectorMetrics.traversalMs;

  if (sourceMapConsumer) {
    const destroyStart = performance.now();
    sourceMapConsumer.destroy();
    timings.sourceMapConsumerMs += performance.now() - destroyStart;
  }

  const writer = ManifestWriter.getInstance(rootContext);
  writer.appendEntries(manifestEntries);

  if (!map) {
    if (debug) {
      console.warn(
        `${LOG_PREFIX} No source map generated for ${sourceFile}, skipping`,
      );
    }
    return callback(null, source);
  }

  timings.totalTransformMs = performance.now() - totalStart;

  const stats = TransformStats.getInstance(rootContext);
  stats.record({
    file: sourceFile,
    timings,
    counts: {
      elementsFound: injectorMetrics.elementsFound,
      elementsInjected: injectorMetrics.elementsInjected,
    },
  });

  if (debug) {
    console.log(
      `${LOG_PREFIX} Transformed ${sourceFile}: ` +
        `${injectorMetrics.elementsInjected} elements in ${timings.totalTransformMs.toFixed(2)}ms ` +
        `(parse=${timings.parseMs.toFixed(2)}ms, traverse=${timings.traversalMs.toFixed(2)}ms, ` +
        `smConsumer=${timings.sourceMapConsumerMs.toFixed(2)}ms)`,
    );
  }

  // Eagerly persist the ID cache after each transform.
  // Turbopack workers are ephemeral — module-level singletons and timers
  // cannot survive worker recycling.  Writing after every file ensures
  // the next worker (or the next dev-server start) picks up stable IDs.
  //
  // Use saveCache() (not close()) — close() marks the registry as closed,
  // which causes getInstance() to create a new uninitialized instance on
  // the next file. In `next build` mode, multiple files run in the same
  // process, so the registry must stay alive. Actual cleanup happens via
  // the process.on('exit') handler registered during initialization.
  injectorRegistry.saveCache();

  // Inject relay/overlay globals into every transformed file.
  //
  // Why every file instead of just the first?
  // Turbopack compiles server and client bundles through the SAME loader
  // module instance.  A module-level "injected once" flag would be set by
  // the server compilation (where the preamble is a no-op thanks to the
  // `typeof window` guard), causing the client compilation to skip the
  // preamble entirely — so window globals would never be set.
  //
  // Injecting into every file is safe because:
  //   • The preamble is guarded by `typeof window !== 'undefined'`
  //     → no-op in server bundles
  //   • Window property assignments are idempotent
  //     → harmless if executed multiple times on the client
  //   • The snippet is ~100 bytes — negligible for dev mode
  let outputCode = transformedCode;
  const preamble = buildClientGlobalsPreamble(options, sourceFile);
  if (preamble) {
    // Insert after 'use client'/'use server' directive so we don't
    // violate Next.js/Turbopack's requirement that it be the first expression.
    // The regex allows leading comments (line or block) before the directive,
    // which is valid JS and common in codebases using lint-ignore pragmas.
    const directiveMatch = transformedCode.match(
      /^(?:[ \t]*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)[ \t]*\r?\n)*[ \t]*(['"])use (client|server)\1;?[ \t]*\r?\n?/,
    );
    if (directiveMatch) {
      const prologue = directiveMatch[0];
      outputCode = prologue + preamble + transformedCode.slice(prologue.length);
    } else {
      outputCode = preamble + transformedCode;
    }
  }

  callback(null, outputCode, map);
}
