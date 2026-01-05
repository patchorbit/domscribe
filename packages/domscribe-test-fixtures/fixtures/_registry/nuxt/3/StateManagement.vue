<script setup lang="ts">
/**
 * State Management (useState)
 *
 * Demonstrates Nuxt's useState composable for shared state.
 * useState provides SSR-friendly shared state across components.
 */

import CaptureIcon from './CaptureIcon.vue';

// Simulate Nuxt's useState (in real Nuxt, this is auto-imported)
const useCounter = () => {
  const count = ref(0);
  const increment = () => count.value++;
  const decrement = () => count.value--;
  const reset = () => (count.value = 0);
  return { count, increment, decrement, reset };
};

const useTheme = () => {
  const theme = ref<'light' | 'dark'>('light');
  const toggle = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  };
  return { theme, toggle };
};

const { count, increment, decrement, reset } = useCounter();
const { theme, toggle: toggleTheme } = useTheme();
</script>

<template>
  <div class="component-demo" data-testid="state-management">
    <h2>State Management (useState)</h2>
    <p>Nuxt's SSR-friendly shared state pattern.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="demo-card" data-testid="counter-state">
        <h3>Counter State</h3>
        <p data-testid="count-value">Count: {{ count }}</p>
        <div class="btn-group">
          <button class="btn btn-primary" data-testid="decrement" @click="decrement">
            -
          </button>
          <button class="btn btn-primary" data-testid="increment" @click="increment">
            +
          </button>
          <button class="btn btn-secondary" data-testid="reset" @click="reset">
            Reset
          </button>
        </div>
      </div>

      <div class="demo-card" data-testid="theme-state">
        <h3>Theme State</h3>
        <p data-testid="theme-value">Current: {{ theme }}</p>
        <button class="btn btn-primary" data-testid="toggle-theme" @click="toggleTheme">
          Toggle Theme
        </button>
      </div>
    </div>

    <div class="info-box">
      <p>
        <code>useState</code> provides SSR-friendly state that is serialized
        and transferred from server to client during hydration.
      </p>
    </div>
  </div>
</template>
