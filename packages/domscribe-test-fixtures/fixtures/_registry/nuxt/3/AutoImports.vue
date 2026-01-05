<script setup lang="ts">
/**
 * Auto Imports
 *
 * Demonstrates Nuxt's auto-import feature.
 * Composables, utils, and Vue APIs are available without explicit imports.
 */

import CaptureIcon from './CaptureIcon.vue';

// In Nuxt, ref, computed, watch etc. are auto-imported
const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}
</script>

<template>
  <div class="component-demo" data-testid="auto-imports">
    <h2>Auto Imports</h2>
    <p>Nuxt auto-imports Vue composables and utilities.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button
          class="btn btn-primary"
          data-testid="increment-btn"
          @click="increment"
        >
          Count: {{ count }}
        </button>
        <p data-testid="doubled-value">Doubled: {{ doubled }}</p>
      </div>
    </div>

    <div class="info-box">
      <p>
        In Nuxt, <code>ref</code>, <code>computed</code>, and other Vue APIs
        are auto-imported — no explicit import statements needed.
      </p>
    </div>
  </div>
</template>
