/**
 * Client-only Nuxt plugin that initializes RuntimeManager with VueAdapter
 * and optionally starts the overlay if configured by the module.
 *
 * @module @domscribe/nuxt/runtime/plugin
 */
import { defineNuxtPlugin } from '#imports';
import { RuntimeManager } from '@domscribe/runtime';
import { createVueAdapter } from '@domscribe/vue';

export default defineNuxtPlugin(async () => {
  // Runtime options (serialization, captureStyles, styleOptions, ...) are
  // injected by the module's head script before any bundle executes.
  const win = globalThis as Record<string, unknown>;
  const runtimeOptions =
    (win['__DOMSCRIBE_RUNTIME_OPTIONS__'] as Record<string, unknown>) ?? {};

  try {
    await RuntimeManager.getInstance().initialize({
      ...runtimeOptions,
      adapter: createVueAdapter({}),
    });
  } catch (e) {
    console.warn(
      '[domscribe/nuxt] Failed to initialize runtime:',
      e instanceof Error ? e.message : String(e),
    );
    return;
  }

  // Initialize overlay if options were injected by the module's head script
  if (window.__DOMSCRIBE_OVERLAY_OPTIONS__) {
    try {
      const { initOverlay } = await import('@domscribe/overlay');
      await initOverlay();
    } catch (e) {
      console.warn(
        '[domscribe/nuxt] Failed to init overlay:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
});
