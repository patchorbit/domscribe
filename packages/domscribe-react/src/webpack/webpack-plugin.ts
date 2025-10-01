/**
 * React-aware Domscribe webpack plugin
 * @module @domscribe/react/webpack/webpack-plugin
 */
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  DomscribeWebpackPlugin as BaseDomscribeWebpackPlugin,
  type WebpackPluginOptions,
} from '@domscribe/transform/plugins/webpack';
import type {
  DomscribeRuntimeOptions,
  DomscribeReactCaptureOptions,
} from '../vite/types.js';

/**
 * Unified options for the React webpack plugin.
 *
 * Extends the base transform options with `runtime` and `capture` namespaces
 * for configuring RuntimeManager and ReactAdapter behavior.
 */
export interface DomscribeReactWebpackPluginOptions extends WebpackPluginOptions {
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: DomscribeRuntimeOptions;
  /** React adapter capture configuration (strategy, tree depth, wrappers, hook resolvers). */
  capture?: DomscribeReactCaptureOptions;
}

/**
 * Domscribe webpack plugin for React projects.
 *
 * Creates the base transform plugin internally and adds `@domscribe/react/auto-init`
 * as a webpack entry so that RuntimeManager + ReactAdapter are initialized
 * automatically — no entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `DomscribeWebpackPlugin`
 * from `@domscribe/transform/plugins/webpack` directly.
 *
 * Usage:
 * ```ts
 * // webpack.config.ts
 * import { DomscribeWebpackPlugin } from '@domscribe/react/webpack'
 *
 * export default {
 *   plugins: [new DomscribeWebpackPlugin({ overlay: true })]
 * }
 * ```
 */
export class DomscribeWebpackPlugin implements WebpackPluginInstance {
  private readonly basePlugin: BaseDomscribeWebpackPlugin;
  private readonly runtimeOptions: DomscribeRuntimeOptions;
  private readonly captureOptions: DomscribeReactCaptureOptions;
  private readonly debug: boolean;

  constructor(options?: DomscribeReactWebpackPluginOptions) {
    this.basePlugin = new BaseDomscribeWebpackPlugin(options);
    this.runtimeOptions = options?.runtime ?? {};
    this.captureOptions = options?.capture ?? {};
    this.debug = options?.debug ?? false;
  }

  apply(compiler: Compiler): void {
    const { DefinePlugin } = compiler.webpack;
    new DefinePlugin({
      __DOMSCRIBE_RUNTIME_OPTIONS__: JSON.stringify({
        phase: this.runtimeOptions.phase,
        debug: this.debug,
        redactPII: this.runtimeOptions.redactPII,
        blockSelectors: this.runtimeOptions.blockSelectors,
      }),
      __DOMSCRIBE_ADAPTER_OPTIONS__: JSON.stringify({
        strategy: this.captureOptions.strategy,
        maxTreeDepth: this.captureOptions.maxTreeDepth,
        includeWrappers: this.captureOptions.includeWrappers,
        hookNameResolvers: this.captureOptions.hookNameResolvers,
        debug: this.debug,
      }),
    }).apply(compiler);
    this.addAdapterEntry(compiler);
    this.basePlugin.apply(compiler);
  }

  private addAdapterEntry(compiler: Compiler): void {
    const entry = compiler.options.entry;

    if (typeof entry === 'object' && !Array.isArray(entry)) {
      const firstKey = Object.keys(entry)[0];
      if (firstKey && entry[firstKey]?.import) {
        entry[firstKey].import.push('@domscribe/react/auto-init');
      }
    }
  }
}
