<script setup lang="ts">
/**
 * Nuxt Plugins
 *
 * Demonstrates Nuxt plugin patterns.
 * Plugins provide globally available utilities and integrations.
 */

import CaptureIcon from './CaptureIcon.vue';

// Simulate a plugin-provided utility
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const now = ref(new Date());

// Simulate plugin initialization
const pluginStatus = ref({
  analytics: true,
  i18n: true,
  auth: false,
});
</script>

<template>
  <div class="component-demo" data-testid="nuxt-plugins">
    <h2>Nuxt Plugins</h2>
    <p>Plugin-provided utilities and integrations.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="demo-card" data-testid="plugin-utility">
        <h3>Plugin Utility: formatDate</h3>
        <p data-testid="formatted-date">{{ formatDate(now) }}</p>
      </div>

      <div class="demo-card" data-testid="plugin-status">
        <h3>Registered Plugins</h3>
        <ul>
          <li
            v-for="(active, name) in pluginStatus"
            :key="name"
            :data-testid="`plugin-${name}`"
          >
            {{ name }}: {{ active ? 'Active' : 'Inactive' }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
