/**
 * Vue-aware Domscribe Vite plugin
 * @module @domscribe/vue/vite/vite-plugin
 */
import { fileURLToPath } from 'node:url';
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';
import { domscribe as baseDomscribe } from '@domscribe/transform/plugins/vite';
import type { DomscribeVuePluginOptions } from './types.js';

/**
 * URL path for the virtual init module.
 *
 * When the browser fetches this path, Vite's dev server routes it through
 * the plugin pipeline (resolveId → load → transform). Dependencies resolve
 * from this adapter's package location, then Vite rewrites the imports through
 * its normal module pipeline. The overlay uses the same pipeline so both
 * reference one RuntimeManager singleton, including in isolated installs.
 *
 * Direct `/node_modules/` paths bypass pre-bundling and create separate
 * module instances with separate singletons, which breaks runtime capture.
 */
const INIT_MODULE_PATH = '/@domscribe/vue-init.js';

/**
 * Domscribe Vite plugin for Vue projects.
 *
 * Creates the base transform plugin internally and adds RuntimeManager + VueAdapter
 * initialization via a virtual module. No entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `domscribe`
 * from `@domscribe/transform/plugins/vite` directly.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import vue from '@vitejs/plugin-vue'
 * import { domscribe } from '@domscribe/vue/vite'
 *
 * export default defineConfig({
 *   plugins: [vue(), domscribe({ overlay: true })]
 * })
 * ```
 */
export function domscribe(options?: DomscribeVuePluginOptions): Plugin {
  const basePlugin = baseDomscribe(options);
  const baseTransformIndexHtml = basePlugin.transformIndexHtml;
  const baseResolveId =
    typeof basePlugin.resolveId === 'function' ? basePlugin.resolveId : null;
  const baseLoad =
    typeof basePlugin.load === 'function' ? basePlugin.load : null;

  basePlugin.name = 'vite-plugin-domscribe-vue';

  basePlugin.resolveId = function (id, importer, ...args) {
    if (id === INIT_MODULE_PATH) {
      return INIT_MODULE_PATH;
    }
    if (
      importer === INIT_MODULE_PATH &&
      (id === '@domscribe/runtime' || id === '@domscribe/vue')
    ) {
      // Virtual modules have no package location. Resolve their dependencies
      // from this adapter so isolated installs (pnpm) can find them, while
      // letting Vite keep its normal dependency optimization and deduplication.
      return this.resolve(id, fileURLToPath(import.meta.url), {
        skipSelf: true,
      });
    }
    return baseResolveId?.call(this, id, importer, ...args) ?? null;
  };

  basePlugin.load = function (id, ...args) {
    if (id === INIT_MODULE_PATH) {
      const rt = options?.runtime ?? {};
      const cap = options?.capture ?? {};
      const debug = options?.debug ?? false;

      // JSON.stringify drops undefined fields, so optional runtime options
      // (serialization, styleOptions) only appear when configured.
      const runtimeJson = JSON.stringify({
        phase: rt.phase ?? 1,
        debug,
        redactPII: rt.redactPII ?? true,
        blockSelectors: rt.blockSelectors ?? [],
        serialization: rt.serialization,
        captureStyles: rt.captureStyles ?? options?.captureStyles ?? false,
        styleOptions: rt.styleOptions,
      });

      // Vite resolves these imports from the owning package and rewrites
      // them through the same module pipeline used by the overlay.
      return [
        `import { RuntimeManager } from '@domscribe/runtime';`,
        `import { createVueAdapter } from '@domscribe/vue';`,
        ``,
        `RuntimeManager.getInstance().initialize({`,
        `  ...${runtimeJson},`,
        `  adapter: createVueAdapter({`,
        `    maxTreeDepth: ${cap.maxTreeDepth ?? 50},`,
        `    debug: ${debug},`,
        `  }),`,
        `}).catch(e => console.warn('[domscribe] Failed to init Vue runtime:', e.message));`,
      ].join('\n');
    }
    return baseLoad?.call(this, id, ...args) ?? null;
  };

  basePlugin.transformIndexHtml = (): IndexHtmlTransformResult => {
    // Call the base plugin's transformIndexHtml (relay port + overlay injection)
    const baseResult =
      typeof baseTransformIndexHtml === 'function'
        ? (
            baseTransformIndexHtml as () => IndexHtmlTransformResult | undefined
          )()
        : undefined;

    // Build on existing tags from the base plugin
    const baseTags: HtmlTagDescriptor[] =
      baseResult && typeof baseResult === 'object' && 'tags' in baseResult
        ? (baseResult.tags ?? [])
        : [];

    // Import the virtual init module — browser fetches this URL, Vite
    // serves it through its full plugin + transform pipeline
    const runtimeTag: HtmlTagDescriptor = {
      tag: 'script',
      attrs: { type: 'module' },
      children: `import('${INIT_MODULE_PATH}');`,
      injectTo: 'body',
    };

    const tags = [...baseTags, runtimeTag];
    return { html: '', tags };
  };

  return basePlugin;
}
