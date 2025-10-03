/**
 * Options for the Vue-aware Domscribe Vite plugin.
 *
 * Mirrors the base transform plugin options — all options are passed through.
 * Adds `runtime` and `capture` namespaces for configuring runtime behavior
 * and Vue adapter capture settings.
 *
 * @module @domscribe/vue/vite/types
 */

/**
 * RuntimeManager configuration (minus adapter, which is framework-specific).
 */
export interface DomscribeRuntimeOptions {
  /** Capture phase. @default 1 */
  phase?: 1 | 2;
  /** Redact PII from captured data. @default true */
  redactPII?: boolean;
  /** CSS selectors to block from capture. @default [] */
  blockSelectors?: string[];
}

/**
 * Vue adapter capture configuration.
 */
export interface DomscribeVueCaptureOptions {
  /** Maximum component tree depth. @default 50 */
  maxTreeDepth?: number;
}

export interface DomscribeVuePluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  debug?: boolean;
  relay?: {
    autoStart?: boolean;
    port?: number;
    host?: string;
  };
  overlay?:
    | boolean
    | {
        initialMode?: 'collapsed' | 'expanded';
        debug?: boolean;
      };
  /** RuntimeManager configuration (phase, PII redaction, block selectors). */
  runtime?: DomscribeRuntimeOptions;
  /** Vue adapter capture configuration (tree depth). */
  capture?: DomscribeVueCaptureOptions;
}
