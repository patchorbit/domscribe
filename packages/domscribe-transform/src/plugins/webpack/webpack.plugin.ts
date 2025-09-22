/**
 * Webpack plugin for Domscribe transform
 *
 * Coordinates transform lifecycle via webpack hooks (beforeCompile, compilation,
 * done, shutdown). Uses a separate webpack loader for per-file transforms.
 * Manages relay auto-start, overlay entry injection, and HtmlWebpackPlugin integration.
 *
 * @module @domscribe/transform/plugins/webpack/webpack-plugin
 */
import type { Compiler, Compilation } from 'webpack';
import {
  WebpackPluginOptions,
  type RelayPluginOptions,
  type OverlayPluginOptions,
} from './types.js';
import { ManifestWriter } from '@domscribe/manifest';
import { InjectorRegistry } from '../../core/injector.registry.js';
import { TransformStats } from '../../core/stats.js';
import { RelayControl } from '@domscribe/relay';

/**
 * Required options after defaults are applied
 */
interface ResolvedOptions {
  debug: boolean;
  enabled: boolean;
  relay: RelayPluginOptions;
  overlayEnabled: boolean;
  overlayOptions: OverlayPluginOptions;
}

/**
 * Webpack plugin that manages the Domscribe transform pipeline.
 * Disabled automatically in production builds unless explicitly enabled.
 */
export class DomscribeWebpackPlugin {
  public static name = 'DomscribeWebpackPlugin';

  public stats: TransformStats | undefined;
  public injectorRegistry: InjectorRegistry | undefined;

  /** Relay port after detection/auto-start (for HTML injection) */
  public relayPort: number | undefined;
  /** Relay host after detection/auto-start (for HTML injection) */
  public relayHost: string | undefined;

  private options: ResolvedOptions;
  private writer: ManifestWriter | undefined;
  private relayControl: RelayControl | undefined;

  constructor(options: WebpackPluginOptions = {}) {
    // Disable in production by default
    const isProduction = process.env.NODE_ENV === 'production';

    const {
      debug = false,
      enabled = !isProduction,
      relay = {},
      overlay = true,
    } = options;

    // Resolve overlay options
    const overlayEnabled = overlay !== false;
    const overlayOptions: OverlayPluginOptions =
      typeof overlay === 'object' ? overlay : {};

    this.options = {
      debug,
      enabled,
      relay,
      overlayEnabled,
      overlayOptions,
    };
  }

  apply(compiler: Compiler): void {
    // Skip if disabled (production builds)
    if (!this.options.enabled) {
      if (this.options.debug) {
        console.log(
          '[domscribe-transform][webpack-plugin] Skipping (disabled for production)',
        );
      }
      return;
    }

    // Add overlay as a webpack entry so it gets bundled
    if (this.options.overlayEnabled) {
      this.addOverlayEntry(compiler);
    }

    const {
      hooks: { beforeCompile, compilation, done, shutdown },
    } = compiler;

    /**
     * BeforeCompile is invoked before a compilation is started. Will only be invoked once per build.
     */
    beforeCompile.tapPromise(DomscribeWebpackPlugin.name, async () => {
      await this.preCompilationHook(compiler);
    });

    /**
     * Compilation is invoked after a new compilation is created.
     * Used to auto-inject relay/overlay script tags via HtmlWebpackPlugin hooks.
     */
    compilation.tap(DomscribeWebpackPlugin.name, (compilationInstance) => {
      this.tapHtmlWebpackPlugin(compilationInstance);
    });

    /**
     * Done is invoked after a compilation is finished. HMR cycles will invoke this hook after each change.
     */
    done.tap(DomscribeWebpackPlugin.name, () => {
      this.printStats();
      this.injectorRegistry?.close();
      this.stats?.reset();
    });

    /**
     * Shutdown is invoked when the compiler is shutting down after a build. HMR cycles will not invoke this hook.
     */
    shutdown.tap(DomscribeWebpackPlugin.name, () => {
      this.shutdownHook();
    });
  }

  /**
   * Append @domscribe/overlay/auto-init to the existing webpack entry.
   * Must share the same entry (not a separate named entry) to ensure
   * the overlay and app share one webpack runtime and module registry —
   * otherwise singletons like RuntimeManager would be duplicated.
   *
   * By the time apply() is called, webpack has normalized the entry config
   * to an EntryObject (Record<string, { import: string[] }>).
   */
  private addOverlayEntry(compiler: Compiler): void {
    const entry = compiler.options.entry;

    if (typeof entry === 'object' && !Array.isArray(entry)) {
      const firstKey = Object.keys(entry)[0];
      if (firstKey && entry[firstKey]?.import) {
        entry[firstKey].import.push('@domscribe/overlay/auto-init');
      }
    }
  }

  private async preCompilationHook(compiler: Compiler) {
    try {
      const rootContext = compiler.context;

      this.writer = ManifestWriter.getInstance(rootContext, {
        debug: this.options.debug,
      });

      this.injectorRegistry = InjectorRegistry.getInstance(rootContext, {
        debug: this.options.debug,
      });
      await this.injectorRegistry.initialize();

      this.stats = TransformStats.getInstance(rootContext);

      if (this.options.debug) {
        console.log(
          '[domscribe-transform][webpack-plugin] Webpack plugin initialized',
        );
      }

      // Relay detection and auto-start
      await this.initializeRelay(rootContext);
    } catch (error) {
      console.error(
        '[domscribe-transform][webpack-plugin] Failed to initialize:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async initializeRelay(rootContext: string): Promise<void> {
    const { relay: relayOptions } = this.options;

    if (relayOptions.autoStart === false) {
      return;
    }

    this.relayControl = new RelayControl(rootContext);

    try {
      const { host: assignedHost, port: assignedPort } =
        await this.relayControl.ensureRunning({
          port: relayOptions.port,
          host: relayOptions.host,
        });

      this.relayPort = assignedPort;
      this.relayHost = assignedHost;

      if (this.options.debug) {
        console.log(
          `[domscribe-transform][webpack-plugin] Relay running at http://${assignedHost}:${assignedPort}`,
        );
      }
    } catch (error) {
      // Never fail the build due to relay issues
      console.warn(
        `[domscribe-transform][webpack-plugin] Relay check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the script content to inject relay connection info into HTML.
   * Use with HtmlWebpackPlugin or similar to inject into the page head.
   *
   * @example
   * ```js
   * // In your webpack config with html-webpack-plugin:
   * new HtmlWebpackPlugin({
   *   inject: true,
   *   templateContent: ({ htmlWebpackPlugin }) => `
   *     <!DOCTYPE html>
   *     <html>
   *       <head>
   *         ${domscribePlugin.getRelayScriptTag()}
   *         ${htmlWebpackPlugin.tags.headTags}
   *       </head>
   *       <body>
   *         ${htmlWebpackPlugin.tags.bodyTags}
   *       </body>
   *     </html>
   *   `,
   * });
   * ```
   */
  getRelayScriptTag(): string {
    if (this.relayPort && this.relayHost) {
      return `<script>window.__DOMSCRIBE_RELAY_PORT__ = ${this.relayPort}; window.__DOMSCRIBE_RELAY_HOST__ = "${this.relayHost}";</script>`;
    }
    return '';
  }

  /**
   * Get the script tags to inject overlay into HTML.
   * Includes relay info, overlay options, and overlay initialization.
   *
   * @example
   * ```js
   * // In your webpack config with html-webpack-plugin:
   * new HtmlWebpackPlugin({
   *   inject: true,
   *   templateContent: ({ htmlWebpackPlugin }) => `
   *     <!DOCTYPE html>
   *     <html>
   *       <head>
   *         ${domscribePlugin.getOverlayScriptTags().head}
   *         ${htmlWebpackPlugin.tags.headTags}
   *       </head>
   *       <body>
   *         ${htmlWebpackPlugin.tags.bodyTags}
   *         ${domscribePlugin.getOverlayScriptTags().body}
   *       </body>
   *     </html>
   *   `,
   * });
   * ```
   */
  getOverlayScriptTags(): { head: string; body: string } {
    const headTags: string[] = [];
    const bodyTags: string[] = [];

    // Add relay script tag to head
    const relayTag = this.getRelayScriptTag();
    if (relayTag) {
      headTags.push(relayTag);
    }

    // Add overlay scripts if enabled and relay is available
    if (this.options.overlayEnabled && this.relayPort) {
      const overlayOptionsObj = {
        initialMode: this.options.overlayOptions.initialMode ?? 'collapsed',
        debug: this.options.overlayOptions.debug ?? this.options.debug,
      };

      headTags.push(
        `<script>window.__DOMSCRIBE_OVERLAY_OPTIONS__ = ${JSON.stringify(overlayOptionsObj)};</script>`,
      );

      // Overlay is loaded via EntryPlugin (addOverlayEntry) — no script tag needed.
      // The entry bundles and auto-initializes the overlay.
    }

    return {
      head: headTags.join('\n'),
      body: bodyTags.join('\n'),
    };
  }

  /**
   * Auto-inject relay/overlay script tags via HtmlWebpackPlugin hooks.
   * Dynamically imports html-webpack-plugin — skips silently if not installed.
   */
  private tapHtmlWebpackPlugin(compilationInstance: Compilation): void {
    import('html-webpack-plugin')
      .then((mod) => {
        // Handle both ESM default and CJS interop
        const HtmlWebpackPlugin = mod.default ?? mod;
        HtmlWebpackPlugin.getCompilationHooks(
          compilationInstance,
        ).beforeEmit.tapAsync(DomscribeWebpackPlugin.name, (data, callback) => {
          try {
            data.html = this.injectIntoHtml(data.html);
          } catch (error) {
            // Never break the build due to injection issues
            if (this.options.debug) {
              console.warn(
                '[domscribe-transform][webpack-plugin] HTML injection failed:',
                error instanceof Error ? error.message : String(error),
              );
            }
          }
          callback(null, data);
        });
      })
      .catch(() => {
        // html-webpack-plugin not installed — skip auto-injection
        if (this.options.debug) {
          console.log(
            '[domscribe-transform][webpack-plugin] html-webpack-plugin not found, skipping auto-injection.',
          );
        }
      });
  }

  /**
   * Inject relay/overlay script tags into an HTML string.
   * Reuses getOverlayScriptTags() which already includes relay globals.
   */
  private injectIntoHtml(html: string): string {
    const { head, body } = this.getOverlayScriptTags();

    if (head) {
      // head-prepend: insert right after <head> to match Vite plugin behavior
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${head}`);
      } else if (html.includes('</head>')) {
        // Fallback: insert before closing head tag
        html = html.replace('</head>', `${head}\n</head>`);
      }
    }

    if (body) {
      html = html.replace('</body>', `${body}\n</body>`);
    }

    return html;
  }

  private printStats(): void {
    if (!this.options.debug) {
      return;
    }

    const writerStats = this.writer?.getStats() ?? null;
    this.stats?.print('[domscribe-transform][webpack-plugin]', writerStats);
  }

  private shutdownHook() {
    if (!this.writer) {
      return;
    }

    try {
      // Print stats one last time
      this.printStats();
      // Close writer
      this.writer.close();
    } catch (error) {
      console.error(
        '[domscribe-transform][webpack-plugin] Failed to close writer:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

export default DomscribeWebpackPlugin;
