import { describe, it, expect, vi } from 'vitest';
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';

vi.mock('@domscribe/transform/plugins/vite', () => ({
  domscribe: vi.fn(
    (options?: Record<string, unknown>): Plugin => ({
      name: 'vite-plugin-domscribe-transform',
      transformIndexHtml: options?._baseTags
        ? () => ({ html: '', tags: options._baseTags as HtmlTagDescriptor[] })
        : undefined,
    }),
  ),
}));

import { domscribe } from './vite-plugin.js';

describe('domscribe (react/vite)', () => {
  it('should rename the plugin to vite-plugin-domscribe-react', () => {
    const plugin = domscribe();

    expect(plugin.name).toBe('vite-plugin-domscribe-react');
  });

  it('should return a Plugin object', () => {
    const plugin = domscribe();

    expect(plugin).toBeDefined();
    expect(plugin.name).toBeDefined();
  });

  describe('resolveId', () => {
    it('should resolve the init module path', () => {
      const plugin = domscribe();
      const resolveId = plugin.resolveId as (id: string) => string | null;

      const result = resolveId.call({}, '/@domscribe/react-init.js');

      expect(result).toBe('/@domscribe/react-init.js');
    });

    it('should return null for unrelated IDs', () => {
      const plugin = domscribe();
      const resolveId = plugin.resolveId as (id: string) => string | null;

      const result = resolveId.call({}, 'some-other-module');

      expect(result).toBeNull();
    });
  });

  describe('load', () => {
    it('should return init code for the init module path', () => {
      const plugin = domscribe();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain(`from '@domscribe/runtime'`);
      expect(result).toContain(`from '@domscribe/react'`);
      expect(result).toContain('RuntimeManager');
      expect(result).toContain('createReactAdapter');
    });

    it('should embed default runtime options when none provided', () => {
      const plugin = domscribe();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain('phase: 1');
      expect(result).toContain('debug: false');
      expect(result).toContain('redactPII: true');
      expect(result).toContain('blockSelectors: []');
      expect(result).toContain("strategy: 'best-effort'");
      expect(result).toContain('maxTreeDepth: 50');
      expect(result).toContain('includeWrappers: true');
    });

    it('should serialize custom runtime options', () => {
      const plugin = domscribe({
        runtime: { phase: 2, redactPII: false, blockSelectors: ['.secret'] },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain('phase: 2');
      expect(result).toContain('redactPII: false');
      expect(result).toContain('blockSelectors: [".secret"]');
    });

    it('should serialize custom capture options', () => {
      const plugin = domscribe({
        capture: {
          strategy: 'fiber',
          maxTreeDepth: 25,
          includeWrappers: false,
        },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain("strategy: 'fiber'");
      expect(result).toContain('maxTreeDepth: 25');
      expect(result).toContain('includeWrappers: false');
    });

    it('should cascade debug to both runtime and adapter', () => {
      const plugin = domscribe({ debug: true });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      // debug appears in both initialize() and createReactAdapter()
      const debugMatches = result.match(/debug: true/g);
      expect(debugMatches).toHaveLength(2);
    });

    it('should serialize hookNameResolvers into Map reconstruction', () => {
      const plugin = domscribe({
        capture: {
          hookNameResolvers: {
            MyComponent: { 0: 'count', 1: 'name' },
          },
        },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain('new Map(Object.entries(_r)');
      expect(result).toContain('"MyComponent"');
      expect(result).toContain('"count"');
      expect(result).toContain('"name"');
    });

    it('should use empty Map when no hookNameResolvers provided', () => {
      const plugin = domscribe();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/react-init.js');

      expect(result).toContain('const _resolvers = new Map();');
    });

    it('should return null for unrelated IDs', () => {
      const plugin = domscribe();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, 'some-other-module');

      expect(result).toBeNull();
    });
  });

  describe('transformIndexHtml', () => {
    it('should inject a script tag for runtime initialization', () => {
      const plugin = domscribe();

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      expect(result).toHaveProperty('tags');
      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      const runtimeTag = tags.find(
        (t) => t.tag === 'script' && t.attrs?.type === 'module',
      );
      expect(runtimeTag).toBeDefined();
      expect(runtimeTag?.injectTo).toBe('body');
      expect(runtimeTag?.children).toContain(
        `import('/@domscribe/react-init.js');`,
      );
    });

    it('should preserve base plugin tags', () => {
      const baseTags: HtmlTagDescriptor[] = [
        { tag: 'script', attrs: { src: '/overlay.js' }, injectTo: 'body' },
      ];
      // Pass _baseTags through options so the mock base plugin returns them
      const plugin = domscribe({ _baseTags: baseTags } as never);

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      expect(tags.length).toBeGreaterThan(1);
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'script',
          attrs: { src: '/overlay.js' },
        }),
      );
    });

    it('should handle base plugin with no transformIndexHtml', () => {
      const plugin = domscribe();

      const result = (
        plugin.transformIndexHtml as () => IndexHtmlTransformResult
      )();

      const tags = (result as { tags: HtmlTagDescriptor[] }).tags;
      // Base has no transformIndexHtml → only the runtime init tag
      expect(tags).toHaveLength(1);
    });
  });
});
