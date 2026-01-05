<script setup lang="ts">
/**
 * useFetch Composable
 *
 * Demonstrates Nuxt's useFetch composable pattern.
 * Simulates async data fetching with loading/error states.
 */

interface Post {
  id: number;
  title: string;
  body: string;
}

import CaptureIcon from './CaptureIcon.vue';

// Simulated useFetch
const posts = ref<Post[]>([
  { id: 1, title: 'Getting Started with Nuxt', body: 'Nuxt is a Vue meta-framework...' },
  { id: 2, title: 'Server-Side Rendering', body: 'SSR improves SEO and initial load...' },
  { id: 3, title: 'Auto Imports', body: 'Nuxt auto-imports composables and utilities...' },
]);
const pending = ref(false);
const fetchError = ref<string | null>(null);

async function refresh() {
  pending.value = true;
  await new Promise((resolve) => setTimeout(resolve, 500));
  pending.value = false;
}
</script>

<template>
  <div class="component-demo" data-testid="use-fetch">
    <h2>useFetch Composable</h2>
    <p>Nuxt's data fetching pattern with reactive state.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button
          class="btn btn-primary"
          data-testid="refresh-btn"
          :disabled="pending"
          @click="refresh"
        >
          {{ pending ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="fetchError" class="info-box error" data-testid="fetch-error">
        {{ fetchError }}
      </div>

      <div v-if="pending" class="skeleton" data-testid="loading">
        Loading posts...
      </div>

      <div v-else class="card-grid">
        <div
          v-for="post in posts"
          :key="post.id"
          class="demo-card"
          :data-testid="`post-${post.id}`"
        >
          <h3>{{ post.title }}</h3>
          <p>{{ post.body }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
