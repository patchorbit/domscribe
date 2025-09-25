# Building a Custom Framework Adapter

Domscribe captures runtime context (component props, state, metadata) through framework adapters. We ship adapters for React and Vue, but the `FrameworkAdapter` interface lets you add support for any component-based framework — Svelte, Angular, Solid, Lit, or your own.

## The Interface

```ts
import type { FrameworkAdapter } from '@domscribe/runtime';

interface FrameworkAdapter {
  readonly name: string;
  readonly version?: string;

  // Required
  getComponentInstance(element: HTMLElement): unknown | null;
  captureProps(component: unknown): Record<string, unknown> | null;
  captureState(component: unknown): Record<string, unknown> | null;

  // Optional
  getComponentName?(component: unknown): string | null;
  getComponentTree?(component: unknown): ComponentTreeNode | null;
}
```

## What Each Method Does

### `getComponentInstance(element: HTMLElement)`

Given a DOM element with a `data-ds` attribute, return the framework's component instance that owns it. This is the bridge between the DOM and your framework's internals.

**How existing adapters do it:**

- **React**: Reads `__reactFiber$` keys on the DOM element to access the Fiber node
- **Vue**: Reads `__vueParentComponent` on the DOM element to access the component instance

Return `null` if the element isn't owned by a component in your framework.

### `captureProps(component: unknown)`

Given the component instance returned by `getComponentInstance`, extract its props as a plain object.

Return `null` if props cannot be captured. Values should be JSON-serializable — the runtime's PII redaction layer processes the output before transmission.

### `captureState(component: unknown)`

Same as `captureProps`, but for reactive state. What "state" means depends on the framework:

- **React**: Hook state (`memoizedState` chain on Fiber)
- **Vue**: `setupState` (Composition API) or `data` (Options API)

### `getComponentName(component: unknown)` _(optional)_

Return a human-readable component name. Used in the overlay UI and manifest entries.

### `getComponentTree(component: unknown)` _(optional)_

Return a tree of parent/child components for hierarchical inspection:

```ts
interface ComponentTreeNode {
  name: string;
  instance: unknown;
  parent?: ComponentTreeNode;
  children?: ComponentTreeNode[];
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
}
```

## Example: Minimal Adapter

```ts
import type { FrameworkAdapter } from '@domscribe/runtime';

export class SvelteAdapter implements FrameworkAdapter {
  readonly name = 'svelte';
  readonly version: string | undefined;

  constructor() {
    // Detect framework version if possible
    this.version = this.detectVersion();
  }

  getComponentInstance(element: HTMLElement): unknown | null {
    // Svelte 5 attaches component context to DOM elements
    // via __svelte_meta or similar internal property.
    // Walk up from the element to find the owning component.
    const meta = (element as any).__svelte_meta;
    return meta?.component ?? null;
  }

  captureProps(component: unknown): Record<string, unknown> | null {
    if (!this.isSvelteComponent(component)) return null;

    // Extract props from the component's public API
    // Svelte 5 runes: read from the component's exported bindings
    try {
      const props: Record<string, unknown> = {};
      // ... framework-specific extraction logic
      return Object.keys(props).length > 0 ? props : null;
    } catch {
      return null;
    }
  }

  captureState(component: unknown): Record<string, unknown> | null {
    if (!this.isSvelteComponent(component)) return null;

    // Extract reactive state
    try {
      const state: Record<string, unknown> = {};
      // ... framework-specific extraction logic
      return Object.keys(state).length > 0 ? state : null;
    } catch {
      return null;
    }
  }

  getComponentName(component: unknown): string | null {
    if (!this.isSvelteComponent(component)) return null;
    // Svelte components often have a constructor name or metadata
    return (component as any).constructor?.name ?? null;
  }

  private isSvelteComponent(value: unknown): boolean {
    // Type guard for your framework's component instances
    return value != null && typeof value === 'object';
  }

  private detectVersion(): string | undefined {
    try {
      return (globalThis as any).__svelte?.version;
    } catch {
      return undefined;
    }
  }
}
```

## Registering Your Adapter

### Option A: Manual initialization in your app entry

```ts
import { RuntimeManager } from '@domscribe/runtime';
import { SvelteAdapter } from './svelte-adapter';

RuntimeManager.getInstance().initialize({
  adapter: new SvelteAdapter(),
});
```

### Option B: Build a Vite/Webpack plugin wrapper

Follow the pattern in `@domscribe/react/vite` or `@domscribe/vue/vite` — wrap the base `domscribe()` transform plugin and inject a script that auto-initializes your adapter:

```ts
// svelte-vite-plugin.ts
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';
import { domscribe as baseDomscribe } from '@domscribe/transform/plugins/vite';

interface DomscribeSveltePluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  debug?: boolean;
  relay?: { autoStart?: boolean; port?: number; host?: string };
  overlay?:
    | boolean
    | { initialMode?: 'collapsed' | 'expanded'; debug?: boolean };
  runtime?: { phase?: 1 | 2; redactPII?: boolean; blockSelectors?: string[] };
  capture?: {
    /* your framework-specific adapter options */
  };
}

const INIT_MODULE_PATH = '/@domscribe/svelte-init.js';

export function domscribe(options?: DomscribeSveltePluginOptions): Plugin {
  const basePlugin = baseDomscribe(options);
  const baseTransformIndexHtml = basePlugin.transformIndexHtml;
  const baseResolveId =
    typeof basePlugin.resolveId === 'function' ? basePlugin.resolveId : null;
  const baseLoad =
    typeof basePlugin.load === 'function' ? basePlugin.load : null;

  basePlugin.name = 'vite-plugin-domscribe-svelte';

  // Resolve the virtual init module
  basePlugin.resolveId = function (id, ...args) {
    if (id === INIT_MODULE_PATH) return INIT_MODULE_PATH;
    return baseResolveId?.call(this, id, ...args) ?? null;
  };

  // Serve the virtual init module with serialized options
  basePlugin.load = function (id, ...args) {
    if (id === INIT_MODULE_PATH) {
      const rt = options?.runtime ?? {};
      const debug = options?.debug ?? false;

      return [
        `import { RuntimeManager } from '@domscribe/runtime';`,
        `import { SvelteAdapter } from './svelte-adapter';`,
        ``,
        `RuntimeManager.getInstance().initialize({`,
        `  phase: ${rt.phase ?? 1},`,
        `  debug: ${debug},`,
        `  redactPII: ${rt.redactPII ?? true},`,
        `  blockSelectors: ${JSON.stringify(rt.blockSelectors ?? [])},`,
        `  adapter: new SvelteAdapter({ debug: ${debug} }),`,
        `}).catch(e => console.warn('[domscribe] Failed to init Svelte runtime:', e.message));`,
      ].join('\n');
    }
    return baseLoad?.call(this, id, ...args) ?? null;
  };

  // Inject a <script> tag that imports the virtual module
  basePlugin.transformIndexHtml = (): IndexHtmlTransformResult => {
    const baseResult =
      typeof baseTransformIndexHtml === 'function'
        ? (
            baseTransformIndexHtml as () => IndexHtmlTransformResult | undefined
          )()
        : undefined;

    const baseTags: HtmlTagDescriptor[] =
      baseResult && typeof baseResult === 'object' && 'tags' in baseResult
        ? (baseResult.tags ?? [])
        : [];

    return {
      html: '',
      tags: [
        ...baseTags,
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `import('${INIT_MODULE_PATH}');`,
          injectTo: 'body',
        },
      ],
    };
  };

  return basePlugin;
}
```

## Implementation Guidelines

**Return `null`, don't throw.** All methods should return `null` on failure. The runtime handles null gracefully — throwing will break the capture pipeline.

**Keep it serializable.** `captureProps` and `captureState` must return plain objects with JSON-compatible values. Functions, DOM nodes, and circular references should be excluded or replaced with descriptive strings (e.g., `"[Function onClick]"`).

**Gate debug logging.** If you add console output, gate it behind a `debug` option:

```ts
constructor(private options: { debug?: boolean } = {}) {}

getComponentInstance(element: HTMLElement): unknown | null {
  const instance = /* ... */;
  if (this.options.debug) {
    console.log(`[SvelteAdapter] Resolved component for`, element, instance);
  }
  return instance;
}
```

**Framework internals change.** Internal property names (like React's `__reactFiber$` or Vue's `__vueParentComponent`) are not public API and can change between versions. Build version detection into your adapter and handle missing properties gracefully.

## Testing Your Adapter

The runtime uses constructor DI, so you can test your adapter in isolation:

```ts
import { describe, it, expect } from 'vitest';
import { SvelteAdapter } from './svelte-adapter';

describe('SvelteAdapter', () => {
  const adapter = new SvelteAdapter();

  it('should return null for non-component elements', () => {
    const div = document.createElement('div');
    expect(adapter.getComponentInstance(div)).toBeNull();
  });

  it('should capture props from a component instance', () => {
    const mockComponent = {
      /* mock your framework's component shape */
    };
    const props = adapter.captureProps(mockComponent);
    expect(props).toEqual({
      /* expected props */
    });
  });
});
```

To verify integration with the full runtime pipeline, register your adapter and use the overlay to click elements in a running app with `debug: true` enabled.
