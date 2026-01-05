<script setup lang="ts">
/**
 * Route Middleware
 *
 * Demonstrates Nuxt route middleware patterns.
 * Middleware runs before rendering a route.
 */

import CaptureIcon from './CaptureIcon.vue';

const isAuthenticated = ref(false);
const currentRoute = ref('/dashboard');
const middlewareLog = ref<string[]>([]);

function simulateNavigation(route: string) {
  middlewareLog.value = [];

  // Simulate middleware chain
  middlewareLog.value.push(`[auth] Checking authentication for ${route}`);

  if (route.startsWith('/admin') && !isAuthenticated.value) {
    middlewareLog.value.push('[auth] Not authenticated, redirecting to /login');
    currentRoute.value = '/login';
    return;
  }

  middlewareLog.value.push(`[logger] Navigation to ${route}`);
  middlewareLog.value.push(`[analytics] Page view: ${route}`);
  currentRoute.value = route;
}

function toggleAuth() {
  isAuthenticated.value = !isAuthenticated.value;
}
</script>

<template>
  <div class="component-demo" data-testid="middleware">
    <h2>Route Middleware</h2>
    <p>Simulated Nuxt route middleware chain.</p>

    <div class="demo-section">
      <div class="demo-box capture-widget">
        <CaptureIcon />
      </div>
      <div class="btn-group">
        <button
          class="btn btn-secondary"
          data-testid="toggle-auth"
          @click="toggleAuth"
        >
          {{ isAuthenticated ? 'Logout' : 'Login' }}
        </button>
      </div>

      <div class="btn-group">
        <button
          class="btn btn-primary"
          data-testid="nav-dashboard"
          @click="simulateNavigation('/dashboard')"
        >
          /dashboard
        </button>
        <button
          class="btn btn-primary"
          data-testid="nav-admin"
          @click="simulateNavigation('/admin/settings')"
        >
          /admin/settings
        </button>
        <button
          class="btn btn-primary"
          data-testid="nav-public"
          @click="simulateNavigation('/about')"
        >
          /about
        </button>
      </div>

      <div class="demo-card" data-testid="route-info">
        <h3>Current Route: {{ currentRoute }}</h3>
        <p>Authenticated: {{ isAuthenticated }}</p>
      </div>

      <div v-if="middlewareLog.length" class="demo-card" data-testid="middleware-log">
        <h3>Middleware Log</h3>
        <ul>
          <li v-for="(entry, i) in middlewareLog" :key="i">{{ entry }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
