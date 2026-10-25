// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { Plugin, IndexHtmlTransformResult, HtmlTagDescriptor } from 'vite';

vi.mock('@domscribe/transform/plugins/vite', () => ({
  domscribe: vi.fn((options?: Record<string, unknown>): Plugin => ({
    name: 'vite-plugin-domscribe-transform',
    transformIndexHtml: options?._baseTags
      ? () => ({ html: '', tags: options._baseTags as HtmlTagDescriptor[] })
      : undefined,
  })),
}));

import { domscribe } from './vite-plugin.js';

describe('domscribe (vue/vite)', () => {
  it('should rename the plugin to vite-plugin-domscribe-vue', () => {
    const plugin = domscribe();

    expect(plugin.name).toBe('vite-plugin-domscribe-vue');
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

      const result = resolveId.call({}, '/@domscribe/vue-init.js');

      expect(result).toBe('/@domscribe/vue-init.js');
    });

    it('should resolve runtime dependencies from the adapter package for the virtual init module', async () => {
      const plugin = domscribe();
      const resolveId = plugin.resolveId as (...args: unknown[]) => unknown;
      const resolve = vi
        .fn()
        .mockResolvedValue({ id: '/installed/runtime/index.js' });

      const result = await resolveId.call(
        { resolve },
        '@domscribe/runtime',
        '/@domscribe/vue-init.js',
        {},
      );

      expect(result).toEqual({ id: '/installed/runtime/index.js' });
      expect(resolve).toHaveBeenCalledWith(
        '@domscribe/runtime',
        expect.stringContaining('/vite/vite-plugin.'),
        { skipSelf: true },
      );
    });

    it('should leave application imports to Vite resolution', () => {
      const plugin = domscribe();
      const resolveId = plugin.resolveId as (...args: unknown[]) => unknown;
      const resolve = vi.fn();

      const result = resolveId.call(
        { resolve },
        '@domscribe/runtime',
        '/app/src/main.ts',
      );

      expect(result).toBeNull();
      expect(resolve).not.toHaveBeenCalled();
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

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain(`from '@domscribe/runtime'`);
      expect(result).toContain(`from '@domscribe/vue'`);
      expect(result).toContain('RuntimeManager');
      expect(result).toContain('createVueAdapter');
    });

    it('should embed default runtime options when none provided', () => {
      const plugin = domscribe();
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('"phase":1');
      expect(result).toContain('"debug":false');
      expect(result).toContain('"redactPII":true');
      expect(result).toContain('"blockSelectors":[]');
      expect(result).toContain('"captureStyles":false');
      expect(result).toContain('maxTreeDepth: 50');
    });

    it('should serialize custom runtime options', () => {
      const plugin = domscribe({
        runtime: { phase: 2, redactPII: false, blockSelectors: ['.secret'] },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('"phase":2');
      expect(result).toContain('"redactPII":false');
      expect(result).toContain('"blockSelectors":[".secret"]');
    });

    it('should enable runtime style capture from the top-level captureStyles flag', () => {
      const plugin = domscribe({ captureStyles: true });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('"captureStyles":true');
    });

    it('should let runtime.captureStyles override the top-level flag', () => {
      const plugin = domscribe({
        captureStyles: true,
        runtime: { captureStyles: false },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('"captureStyles":false');
    });

    it('should serialize serialization and styleOptions when provided', () => {
      const plugin = domscribe({
        runtime: {
          serialization: { maxDepth: 3 },
          captureStyles: true,
          styleOptions: { maxCustomProperties: 16 },
        },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('"serialization":{"maxDepth":3}');
      expect(result).toContain('"styleOptions":{"maxCustomProperties":16}');
    });

    it('should serialize custom capture options', () => {
      const plugin = domscribe({
        capture: { maxTreeDepth: 25 },
      });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      expect(result).toContain('maxTreeDepth: 25');
    });

    it('should cascade debug to both runtime and adapter', () => {
      const plugin = domscribe({ debug: true });
      const load = plugin.load as (id: string) => string | null;

      const result = load.call({}, '/@domscribe/vue-init.js');

      // debug appears in both initialize() (runtime JSON) and createVueAdapter()
      expect(result).toContain('"debug":true');
      expect(result).toContain('debug: true');
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
        `import('/@domscribe/vue-init.js');`,
      );
    });

    it('should preserve base plugin tags', () => {
      const baseTags: HtmlTagDescriptor[] = [
        { tag: 'script', attrs: { src: '/overlay.js' }, injectTo: 'body' },
      ];
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
      expect(tags).toHaveLength(1);
    });
  });
});
