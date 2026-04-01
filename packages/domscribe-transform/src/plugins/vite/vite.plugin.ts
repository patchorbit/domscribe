/**
 * Vite plugin for Domscribe transform
 *
 * Injects `data-ds` attributes into JSX/TSX/Vue files during dev server mode.
 * Manages manifest writing, relay auto-start, and overlay HTML injection.
 *
 * @module @domscribe/transform/plugins/vite/vite-plugin
 */
import {
  createFilter,
  type Plugin,
  type IndexHtmlTransformResult,
  type HtmlTagDescriptor,
} from 'vite';
import { SourceMapConsumer } from 'source-map';
import { ManifestWriter } from '@domscribe/manifest';
import { TransformStats } from '../../core/stats.js';
import { FileTimings } from '../../core/types.js';
import { VitePluginOptions, OverlayPluginOptions } from './types.js';
import {
  InjectorRegistry,
  isInjectorFileExtension,
} from '../../core/injector.registry.js';
import { RelayControl } from '@domscribe/relay';

/**
 * Build a JS preamble that sets relay + overlay globals on `window`.
 *
 * Injected into every transformed file so that SSR frameworks (e.g. React
 * Router 7 SSR) that bypass Vite's `transformIndexHtml` pipeline still
 * get the window globals needed for overlay initialization.
 *
 * Safe for non-SSR too — window property assignments are idempotent, and
 * the entire block is guarded by `typeof window !== 'undefined'`.
 */
function buildVitePreamble(opts: {
  relayPort: number | undefined;
  relayHost: string | undefined;
  overlayEnabled: boolean;
  overlayOptions: OverlayPluginOptions;
  debug: boolean;
}): string {
  const parts: string[] = [];

  // Suppress React Fragment prop warning for data-ds (once per page load)
  parts.push(
    `if(!window.__DOMSCRIBE_CONSOLE_PATCHED__){` +
      `window.__DOMSCRIBE_CONSOLE_PATCHED__=true;` +
      `var _ce=console.error;` +
      `console.error=function(){` +
      `if(typeof arguments[0]==='string'){var _s=Array.prototype.join.call(arguments,' ');if(_s.indexOf('data-ds')!==-1&&_s.indexOf('React.Fragment')!==-1)return}` +
      `return _ce.apply(console,arguments)` +
      `}}`,
  );

  if (opts.relayPort !== undefined) {
    parts.push(`window.__DOMSCRIBE_RELAY_PORT__=${opts.relayPort}`);
  }
  if (opts.relayHost !== undefined) {
    parts.push(
      `window.__DOMSCRIBE_RELAY_HOST__=${JSON.stringify(opts.relayHost)}`,
    );
  }

  if (opts.overlayEnabled && opts.relayPort !== undefined) {
    const overlayOptionsObj = {
      initialMode: opts.overlayOptions.initialMode ?? 'collapsed',
      debug: opts.overlayOptions.debug ?? opts.debug,
    };
    parts.push(
      `window.__DOMSCRIBE_OVERLAY_OPTIONS__=${JSON.stringify(overlayOptionsObj)}`,
    );
  }

  // Auto-init overlay (once per page load) for SSR scenarios where
  // transformIndexHtml never fires
  let autoInit = '';
  if (opts.overlayEnabled && opts.relayPort !== undefined) {
    autoInit =
      `if(!window.__DOMSCRIBE_AUTO_INIT__){` +
      `window.__DOMSCRIBE_AUTO_INIT__=true;` +
      `import('/node_modules/@domscribe/overlay/index.js').then(function(m){return m.initOverlay()}).catch(function(){})` +
      `}`;
  }

  return (
    `if(typeof window!=='undefined'){${parts.join(';')};` + autoInit + `}\n`
  );
}

/**
 * Create the Domscribe Vite plugin.
 *
 * @param options - Plugin configuration (file filters, debug, relay, overlay)
 * @returns Vite plugin instance (enforce: 'pre', apply: 'serve')
 */
export function domscribe(options: VitePluginOptions = {}): Plugin {
  const {
    include = /\.(jsx|tsx|vue)$/i, // Transform JSX, TSX, and Vue SFC files
    exclude = /node_modules|\.test\.|\.spec\./i,
    debug = false,
    relay: relayOptions = {},
    overlay: overlayOption = true,
    rootDir,
  } = options;
  const filter = createFilter(include, exclude);

  // Resolve overlay options
  const overlayEnabled = overlayOption !== false;
  const overlayOptions: OverlayPluginOptions =
    typeof overlayOption === 'object' ? overlayOption : {};

  // Injector and ManifestWriter are initialized in buildStart
  // and used across transforms
  let injectorRegistry: InjectorRegistry | undefined;
  let writer: ManifestWriter | undefined;

  // Statistics tracking (dev mode only)
  let stats: TransformStats | undefined;

  let rootContext: string | undefined;

  // Relay client for auto-start and port discovery
  let relayControl: RelayControl | undefined;
  let relayPort: number | undefined;
  let relayHost: string | undefined;

  // Track transform activity for debounced "ready" detection
  let transformsSettledCheckTimer: NodeJS.Timeout | undefined;
  let lastTransformTime = 0;
  const TRANSFORMS_SETTLED_DEBOUNCE_MS = 500; // Consider ready after 500ms of no transforms

  function printStats() {
    if (!debug) {
      return;
    }

    const writerStats = writer?.getStats() ?? null;
    stats?.print('[domscribe-transform][vite-plugin]', writerStats);
  }

  /**
   * Called when all transforms have settled.
   */
  function onTransformsSettled() {
    printStats();
    stats?.reset();
    injectorRegistry?.close();
  }

  /**
   * Schedule work after transform activity settles
   */
  function scheduleTransformsSettledCheck() {
    if (transformsSettledCheckTimer) {
      clearTimeout(transformsSettledCheckTimer);
    }

    lastTransformTime = Date.now();

    transformsSettledCheckTimer = setTimeout(() => {
      // Only fire if no transforms happened during the debounce period
      if (Date.now() - lastTransformTime >= TRANSFORMS_SETTLED_DEBOUNCE_MS) {
        onTransformsSettled();
      }
    }, TRANSFORMS_SETTLED_DEBOUNCE_MS);
  }

  return {
    name: 'vite-plugin-domscribe-transform',
    enforce: 'pre', // Needs to run before other plugins
    apply: 'serve', // Only run in development mode

    configResolved(config) {
      rootContext = rootDir ?? config.root;
    },

    async buildStart() {
      if (!rootContext) {
        throw new Error('Root context not found');
      }

      // Reset ready state for new build
      lastTransformTime = 0;

      // Initialize manifest writer once per build
      // Note: ManifestWriter.getInstance() calls initialize() internally via constructor
      writer = ManifestWriter.getInstance(rootContext, { debug });

      injectorRegistry = InjectorRegistry.getInstance(rootContext, { debug });
      await injectorRegistry.initialize();

      stats = TransformStats.getInstance(rootContext);

      if (debug) {
        console.log(
          '[domscribe-transform][vite-plugin] Vite plugin initialized',
        );
      }

      // Relay detection and auto-start
      if (relayOptions.autoStart !== false) {
        relayControl = new RelayControl(rootContext);
        try {
          const { host: assignedHost, port: assignedPort } =
            await relayControl.ensureRunning({
              port: relayOptions.port,
              host: relayOptions.host,
              bodyLimit: relayOptions.bodyLimit,
            });

          relayPort = assignedPort;
          relayHost = assignedHost;

          if (debug) {
            console.log(
              `[domscribe-transform][vite-plugin] Relay running at http://${relayHost}:${relayPort}`,
            );
          }
        } catch (error) {
          // Never fail the build due to relay issues
          console.warn(
            `[domscribe-transform][vite-plugin] Relay check failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    },

    async transform(code, sourceFile) {
      const totalStart = performance.now();
      const timings: FileTimings = {
        sourceMapConsumerMs: 0,
        parseMs: 0,
        traversalMs: 0,
        totalTransformMs: 0,
      };

      if (!writer) {
        throw new Error('Manifest writer not initialized');
      }

      if (!injectorRegistry) {
        throw new Error('Injector registry not initialized');
      }

      // Filter files
      if (!filter(sourceFile)) {
        return null;
      }

      try {
        // Get combined source map from previous transforms if available
        const sourceMap = this.getCombinedSourcemap();

        // Create source map consumer for position resolution
        let sourceMapConsumer: SourceMapConsumer | undefined;
        if (sourceMap) {
          const smStart = performance.now();
          sourceMapConsumer = await new SourceMapConsumer(sourceMap);
          timings.sourceMapConsumerMs = performance.now() - smStart;
        }

        // Get injector based on file extension
        const fileExtension = sourceFile.split('.').pop();

        if (!fileExtension) {
          if (debug) {
            console.warn(
              `[domscribe-transform][vite-plugin] No file extension found for ${sourceFile}, skipping transformation`,
            );
          }
          return null;
        }

        if (!isInjectorFileExtension(fileExtension)) {
          if (debug) {
            console.warn(
              `[domscribe-transform][vite-plugin] Invalid file extension ${fileExtension} for ${sourceFile}, skipping transformation`,
            );
          }
          return null;
        }

        const injector = await injectorRegistry.getInjector(fileExtension);

        // Inject data-ds attributes and generate manifest entries
        const {
          code: transformedCode,
          map,
          manifestEntries,
          metrics: injectorMetrics,
        } = injector.inject(code, {
          sourceFile,
          sourceMapConsumer,
        });

        // Copy injector metrics
        timings.parseMs = injectorMetrics.parseMs;
        timings.traversalMs = injectorMetrics.traversalMs;

        // Cleanup source map consumer
        if (sourceMapConsumer) {
          const destroyStart = performance.now();
          sourceMapConsumer.destroy();
          timings.sourceMapConsumerMs += performance.now() - destroyStart;
        }

        // Add manifest entries to writer
        writer.appendEntries(manifestEntries);

        // Calculate total transform time
        timings.totalTransformMs = performance.now() - totalStart;

        // Record metrics
        stats?.record({
          file: sourceFile,
          timings,
          counts: {
            elementsFound: injectorMetrics.elementsFound,
            elementsInjected: injectorMetrics.elementsInjected,
          },
        });

        // Debug logging
        if (debug) {
          console.log(
            `[domscribe-transform][vite-plugin] Transformed ${sourceFile}: ` +
              `${injectorMetrics.elementsInjected} elements in ${timings.totalTransformMs.toFixed(2)}ms ` +
              `(parse=${timings.parseMs.toFixed(2)}ms, traverse=${timings.traversalMs.toFixed(2)}ms, ` +
              `smConsumer=${timings.sourceMapConsumerMs.toFixed(2)}ms)`,
          );
        }

        // Schedule transforms settled check after transform settles
        scheduleTransformsSettledCheck();

        // Prepend relay/overlay globals into every transformed file.
        // This ensures SSR frameworks (e.g. React Router 7) that bypass
        // Vite's transformIndexHtml pipeline still get the window globals.
        // The preamble is guarded by `typeof window !== 'undefined'` and
        // all assignments are idempotent, so it's safe for non-SSR too.
        const preamble = buildVitePreamble({
          relayPort,
          relayHost,
          overlayEnabled,
          overlayOptions,
          debug,
        });
        const outputCode = preamble + transformedCode;

        return {
          code: outputCode,
          map,
        };
      } catch (error) {
        // Log error but don't break the build
        console.error(
          `[domscribe-transform][vite-plugin] Failed to transform ${sourceFile}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return original code on error (failsafe behavior)
        return null;
      }
    },

    buildEnd() {
      if (!writer) {
        return;
      }

      try {
        // Print stats one last time
        printStats();
        // Close writer
        writer.close();
      } catch (error) {
        console.error(
          '[domscribe-transform][vite-plugin] Failed to close writer:',
          error instanceof Error ? error.message : String(error),
        );
      }
    },

    transformIndexHtml(): IndexHtmlTransformResult | undefined {
      const tags: HtmlTagDescriptor[] = [];

      // Suppress React's "Invalid prop `data-ds` supplied to React.Fragment"
      // warning.  Fires when a component resolves to Fragment at runtime
      // (e.g. `const P = hasKey ? dynamic(...) : Fragment`).  Harmless but
      // clutters the console and triggers error overlays.
      tags.push({
        tag: 'script',
        children:
          `if(!window.__DOMSCRIBE_CONSOLE_PATCHED__){` +
          `window.__DOMSCRIBE_CONSOLE_PATCHED__=true;` +
          `var _ce=console.error;` +
          `console.error=function(){` +
          `if(typeof arguments[0]==='string'){var _s=Array.prototype.join.call(arguments,' ');if(_s.indexOf('data-ds')!==-1&&_s.indexOf('React.Fragment')!==-1)return}` +
          `return _ce.apply(console,arguments)` +
          `}}`,
        injectTo: 'head-prepend',
      });

      // Inject relay port for overlay discovery
      // The overlay (browser UI) needs to know which port to connect to
      if (relayPort && relayHost) {
        tags.push({
          tag: 'script',
          children: `window.__DOMSCRIBE_RELAY_PORT__ = ${relayPort}; window.__DOMSCRIBE_RELAY_HOST__ = "${relayHost}";`,
          injectTo: 'head-prepend',
        });
      }

      // Inject overlay initialization script
      if (overlayEnabled && relayPort) {
        // Build overlay options object
        const overlayOptionsObj = {
          initialMode: overlayOptions.initialMode ?? 'collapsed',
          debug: overlayOptions.debug ?? debug,
        };

        tags.push({
          tag: 'script',
          children: `window.__DOMSCRIBE_OVERLAY_OPTIONS__ = ${JSON.stringify(overlayOptionsObj)};`,
          injectTo: 'head-prepend',
        });

        // Import and initialize overlay
        // Use /node_modules/ path so browser can resolve it via Vite's dev server
        tags.push({
          tag: 'script',
          attrs: { type: 'module' },
          children: `import('/node_modules/@domscribe/overlay/index.js').then(m => m.initOverlay()).catch(e => console.warn('[domscribe] Failed to load overlay:', e.message));`,
          injectTo: 'body',
        });
      }

      return { html: '', tags };
    },
  };
}

export default domscribe;
