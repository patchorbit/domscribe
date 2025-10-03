/**
 * Vue-aware Domscribe webpack plugin
 * @module @domscribe/vue/webpack/webpack-plugin
 */
import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  DomscribeWebpackPlugin as BaseDomscribeWebpackPlugin,
  type WebpackPluginOptions,
} from '@domscribe/transform/plugins/webpack';
import type {
  DomscribeRuntimeOptions,
  DomscribeVueCaptureOptions,
} from '../vite/types.js';

/**
 * Unified options for the Vue webpack plugin.
 *
 * Extends the base transform options with `runtime` and `capture` namespaces
 * for configuring RuntimeManager and VueAdapter behavior.
 */
export interface DomscribeVueWebpackPluginOptions extends WebpackPluginOptions {
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: DomscribeRuntimeOptions;
  /** Vue adapter capture configuration (tree depth). */
  capture?: DomscribeVueCaptureOptions;
}

/**
 * Domscribe webpack plugin for Vue projects.
 *
 * Creates the base transform plugin internally and adds `@domscribe/vue/auto-init`
 * as a webpack entry so that RuntimeManager + VueAdapter are initialized
 * automatically — no entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `DomscribeWebpackPlugin`
 * from `@domscribe/transform/plugins/webpack` directly.
 *
 * Usage:
 * ```ts
 * // webpack.config.ts
 * import { DomscribeWebpackPlugin } from '@domscribe/vue/webpack'
 *
 * export default {
 *   plugins: [new DomscribeWebpackPlugin({ overlay: true })]
 * }
 * ```
 */
export class DomscribeWebpackPlugin implements WebpackPluginInstance {
  private readonly basePlugin: BaseDomscribeWebpackPlugin;
  private readonly runtimeOptions: DomscribeRuntimeOptions;
  private readonly captureOptions: DomscribeVueCaptureOptions;
  private readonly debug: boolean;

  constructor(options?: DomscribeVueWebpackPluginOptions) {
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
        maxTreeDepth: this.captureOptions.maxTreeDepth,
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
        entry[firstKey].import.push('@domscribe/vue/auto-init');
      }
    }
  }
}
