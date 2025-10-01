/**
 * React-aware Domscribe Vite plugin
 * @module @domscribe/react/vite/vite-plugin
 */
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';
import { domscribe as baseDomscribe } from '@domscribe/transform/plugins/vite';
import type { DomscribeReactPluginOptions } from './types.js';

/**
 * URL path for the virtual init module.
 *
 * When the browser fetches this path, Vite's dev server routes it through
 * the plugin pipeline (resolveId → load → transform). The transform step
 * rewrites bare specifiers (`@domscribe/runtime`, `@domscribe/react`) to
 * pre-bundled paths — the same ones the overlay resolves to internally —
 * so RuntimeManager shares a single singleton across all consumers.
 *
 * Direct `/node_modules/` paths bypass pre-bundling and create separate
 * module instances with separate singletons, which breaks runtime capture.
 */
const INIT_MODULE_PATH = '/@domscribe/react-init.js';

/**
 * Domscribe Vite plugin for React projects.
 *
 * Creates the base transform plugin internally and adds RuntimeManager + ReactAdapter
 * initialization via a virtual module. No entrypoint changes needed.
 *
 * @remarks
 * For framework-agnostic usage (no runtime capture), import `domscribe`
 * from `@domscribe/transform/plugins/vite` directly.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import react from '@vitejs/plugin-react'
 * import { domscribe } from '@domscribe/react/vite'
 *
 * export default defineConfig({
 *   plugins: [react(), domscribe({ overlay: true })]
 * })
 * ```
 */
export function domscribe(options?: DomscribeReactPluginOptions): Plugin {
  const basePlugin = baseDomscribe(options);
  const baseTransformIndexHtml = basePlugin.transformIndexHtml;
  const baseResolveId =
    typeof basePlugin.resolveId === 'function' ? basePlugin.resolveId : null;
  const baseLoad =
    typeof basePlugin.load === 'function' ? basePlugin.load : null;

  basePlugin.name = 'vite-plugin-domscribe-react';

  basePlugin.resolveId = function (id, ...args) {
    if (id === INIT_MODULE_PATH) {
      return INIT_MODULE_PATH;
    }
    return baseResolveId?.call(this, id, ...args) ?? null;
  };

  basePlugin.load = function (id, ...args) {
    if (id === INIT_MODULE_PATH) {
      const rt = options?.runtime ?? {};
      const cap = options?.capture ?? {};
      const debug = options?.debug ?? false;

      // Build hookNameResolvers reconstruction if provided
      const resolversLine = cap.hookNameResolvers
        ? `const _r = ${JSON.stringify(cap.hookNameResolvers)};\n` +
          `const _resolvers = new Map(Object.entries(_r).map(([k,v])=>[k,new Map(Object.entries(v).map(([i,n])=>[Number(i),n]))]));`
        : `const _resolvers = new Map();`;

      // Bare specifiers here get rewritten by Vite's transform pipeline
      // to pre-bundled paths, matching what the overlay resolves internally
      return [
        `import { RuntimeManager } from '@domscribe/runtime';`,
        `import { createReactAdapter } from '@domscribe/react';`,
        ``,
        resolversLine,
        ``,
        `RuntimeManager.getInstance().initialize({`,
        `  phase: ${rt.phase ?? 1},`,
        `  debug: ${debug},`,
        `  redactPII: ${rt.redactPII ?? true},`,
        `  blockSelectors: ${JSON.stringify(rt.blockSelectors ?? [])},`,
        `  adapter: createReactAdapter({`,
        `    strategy: '${cap.strategy ?? 'best-effort'}',`,
        `    maxTreeDepth: ${cap.maxTreeDepth ?? 50},`,
        `    includeWrappers: ${cap.includeWrappers ?? true},`,
        `    debug: ${debug},`,
        `    hookNameResolvers: _resolvers,`,
        `  }),`,
        `}).catch(e => console.warn('[domscribe] Failed to init React runtime:', e.message));`,
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
