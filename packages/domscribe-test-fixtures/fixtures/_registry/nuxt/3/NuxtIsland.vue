<script setup lang="ts">
/**
 * Nuxt Island
 *
 * Demonstrates Nuxt's NuxtIsland component for server-only rendering.
 * Islands render on the server with zero client-side JS.
 */

import CaptureIcon from './CaptureIcon.vue';

const islands = ref([
  { name: 'header', description: 'Static header rendered on server' },
  { name: 'footer', description: 'Static footer rendered on server' },
  { name: 'sidebar', description: 'Server-rendered navigation sidebar' },
]);

const selectedIsland = ref(islands.value[0]);
</script>

<template>
  <div class="component-demo" data-testid="nuxt-island">
    <h2>Nuxt Island</h2>
    <p>Server-only components with zero client JS.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="btn-group">
        <button
          v-for="island in islands"
          :key="island.name"
          :class="['btn', selectedIsland.name === island.name ? 'btn-primary' : 'btn-secondary']"
          :data-testid="`island-${island.name}`"
          @click="selectedIsland = island"
        >
          {{ island.name }}
        </button>
      </div>

      <div class="demo-card" data-testid="island-preview">
        <h3>{{ selectedIsland.name }}</h3>
        <p>{{ selectedIsland.description }}</p>
        <div class="info-box">
          <p>
            <code>&lt;NuxtIsland&gt;</code> renders this component on the server.
            No client-side JavaScript is shipped for this component.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
