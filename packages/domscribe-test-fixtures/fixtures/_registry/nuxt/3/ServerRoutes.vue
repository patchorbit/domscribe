<script setup lang="ts">
/**
 * Server Routes
 *
 * Demonstrates Nuxt server routes (API routes).
 * Simulates the /server/api/ pattern.
 */

interface ApiResponse {
  status: string;
  message: string;
  timestamp: string;
}

import CaptureIcon from './CaptureIcon.vue';

const response = ref<ApiResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchApi(endpoint: string) {
  loading.value = true;
  error.value = null;

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    response.value = {
      status: 'ok',
      message: `Response from ${endpoint}`,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="component-demo" data-testid="server-routes">
    <h2>Server Routes</h2>
    <p>Simulated Nuxt server API routes.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="btn-group">
        <button
          class="btn btn-primary"
          data-testid="fetch-hello"
          :disabled="loading"
          @click="fetchApi('/api/hello')"
        >
          GET /api/hello
        </button>
        <button
          class="btn btn-primary"
          data-testid="fetch-users"
          :disabled="loading"
          @click="fetchApi('/api/users')"
        >
          GET /api/users
        </button>
      </div>

      <div v-if="loading" class="skeleton" data-testid="loading">
        Loading...
      </div>

      <div v-if="error" class="info-box error" data-testid="error">
        {{ error }}
      </div>

      <div v-if="response" class="demo-card" data-testid="response">
        <h3>Response</h3>
        <dl>
          <dt>Status:</dt>
          <dd>{{ response.status }}</dd>
          <dt>Message:</dt>
          <dd>{{ response.message }}</dd>
          <dt>Timestamp:</dt>
          <dd>{{ response.timestamp }}</dd>
        </dl>
      </div>
    </div>
  </div>
</template>
