<script setup lang="ts">
/**
 * Nuxt Layout
 *
 * Demonstrates Nuxt's layout system.
 * Layouts wrap pages and can be nested.
 */

import CaptureIcon from './CaptureIcon.vue';

const currentLayout = ref('default');
const layouts = ['default', 'sidebar', 'full-width'];
</script>

<template>
  <div class="component-demo" data-testid="nuxt-layout">
    <h2>Nuxt Layout</h2>
    <p>Demonstrates Nuxt layout system patterns.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="btn-group">
        <button
          v-for="layout in layouts"
          :key="layout"
          :class="['btn', currentLayout === layout ? 'btn-primary' : 'btn-secondary']"
          :data-testid="`layout-${layout}`"
          @click="currentLayout = layout"
        >
          {{ layout }}
        </button>
      </div>

      <div class="layout-preview" :data-testid="`preview-${currentLayout}`">
        <template v-if="currentLayout === 'default'">
          <header class="layout-header">Default Header</header>
          <main class="layout-content">
            <slot>Default content area</slot>
          </main>
          <footer class="layout-footer">Default Footer</footer>
        </template>

        <template v-else-if="currentLayout === 'sidebar'">
          <header class="layout-header">Sidebar Layout Header</header>
          <div class="layout-body">
            <aside class="layout-sidebar">Sidebar Navigation</aside>
            <main class="layout-content">
              <slot>Sidebar layout content</slot>
            </main>
          </div>
        </template>

        <template v-else>
          <main class="layout-content full-width">
            <slot>Full width content</slot>
          </main>
        </template>
      </div>
    </div>
  </div>
</template>
