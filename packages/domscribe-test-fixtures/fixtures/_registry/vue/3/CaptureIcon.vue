<script setup lang="ts">
/**
 * CaptureIcon - Minimal SVG crosshair icon for capturing element context
 *
 * Placed in top-right corner of capturable widgets.
 * Triggers context capture when clicked.
 *
 * Each icon initializes the runtime with its own strategy. The RuntimeManager
 * is a singleton but will be re-initialized if the adapter/strategy changes.
 */
import { createVueAdapter } from '@domscribe/vue';
import { RuntimeManager } from '@domscribe/runtime';

const props = withDefaults(
  defineProps<{
    position?: 'top-right' | 'bottom-right';
  }>(),
  {
    position: 'top-right',
  }
);

async function initRuntime(): Promise<RuntimeManager> {
  const runtime = RuntimeManager.getInstance();

  const adapter = createVueAdapter({
    debug: true,
  });

  await runtime.initialize({ adapter, debug: true });

  return runtime;
}

async function handleClick(event: MouseEvent) {
  event.stopPropagation();

  // Find the parent capture-widget element
  const button = event.currentTarget as HTMLElement;
  const widget = button.closest('.capture-widget, .capturable-widget, .demo-box');

  if (!widget || !(widget instanceof HTMLElement)) {
    console.warn('[CaptureIcon] Could not find parent widget element');
    return;
  }

  try {
    const runtime = await initRuntime();
    const context = await runtime.captureContextForElement(widget);

    console.log('[CaptureIcon] Context captured:', {
      element: widget,
      tagName: widget.tagName,
      context,
    });
  } catch (error) {
    console.error('[CaptureIcon] Capture failed:', error);
  }
}
</script>

<template>
  <button
    type="button"
    :class="['capture-icon', position]"
    title="Capture context"
    @click="handleClick"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Outer circle -->
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <!-- Top tick -->
      <line
        x1="8"
        y1="2"
        x2="8"
        y2="5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <!-- Bottom tick -->
      <line
        x1="8"
        y1="11"
        x2="8"
        y2="14"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <!-- Left tick -->
      <line
        x1="2"
        y1="8"
        x2="5"
        y2="8"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <!-- Right tick -->
      <line
        x1="11"
        y1="8"
        x2="14"
        y2="8"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<style scoped>
/* Styles are in index.css under .capture-icon */
</style>
