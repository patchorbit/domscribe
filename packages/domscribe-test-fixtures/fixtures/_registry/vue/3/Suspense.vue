<script setup lang="ts">
/**
 * Suspense - Tests async component loading and suspense boundaries
 */
import { ref, defineAsyncComponent, type Component } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Simulated async components
const AsyncUserProfile = defineAsyncComponent({
  loader: () =>
    new Promise<Component>((resolve) => {
      setTimeout(() => {
        resolve({
          template: `
            <div class="demo-box demo-box-green">
              <h5>User Profile (Loaded!)</h5>
              <p><strong>Name:</strong> Alice Johnson</p>
              <p><strong>Email:</strong> alice@example.com</p>
              <p><strong>Role:</strong> Admin</p>
            </div>
          `,
        });
      }, 2000);
    }),
  loadingComponent: {
    template: '<div class="loading-fallback">Loading user profile...</div>',
  },
  delay: 200,
  timeout: 10000,
});

const AsyncDashboard = defineAsyncComponent({
  loader: () =>
    new Promise<Component>((resolve) => {
      setTimeout(() => {
        resolve({
          template: `
            <div class="demo-box demo-box-blue">
              <h5>Dashboard (Loaded!)</h5>
              <p>Active Users: 1,234</p>
              <p>Revenue: $45,678</p>
              <p>Orders: 567</p>
            </div>
          `,
        });
      }, 1500);
    }),
});

// State for demo
const showAsyncComponent = ref(false);
const showSuspense = ref(false);
const suspenseKey = ref(0);

function loadComponent() {
  showAsyncComponent.value = true;
}

function loadWithSuspense() {
  showSuspense.value = true;
  suspenseKey.value++;
}

function resetDemo() {
  showAsyncComponent.value = false;
  showSuspense.value = false;
}
</script>

<template>
  <div>
    <!-- Async Component Demo -->
    <section>
      <h4>Async Component (defineAsyncComponent)</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="loadComponent">Load Async Component</button>
          <button @click="resetDemo">Reset</button>
        </div>
        <div v-if="showAsyncComponent" style="margin-top: 1rem;">
          <AsyncUserProfile />
        </div>
      </div>
    </section>

    <!-- Suspense Demo -->
    <section>
      <h4>With Suspense Boundary</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="loadWithSuspense">Load with Suspense</button>
          <button @click="resetDemo">Reset</button>
        </div>
        <div v-if="showSuspense" style="margin-top: 1rem;">
          <Suspense :key="suspenseKey">
            <template #default>
              <AsyncDashboard />
            </template>
            <template #fallback>
              <div class="loading-fallback">Loading dashboard...</div>
            </template>
          </Suspense>
        </div>
      </div>
    </section>
  </div>
</template>
