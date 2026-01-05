<script setup lang="ts">
/**
 * AsyncComponents - Tests defineAsyncComponent() patterns
 */
import { ref, defineAsyncComponent, type Component } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Basic async component
const AsyncBasic = defineAsyncComponent(
  () =>
    new Promise<Component>((resolve) => {
      setTimeout(() => {
        resolve({
          template: '<div class="demo-box demo-box-green"><strong>Basic Async Component Loaded!</strong><p>This component was loaded after a 1.5s delay.</p></div>',
        });
      }, 1500);
    })
);

// Async component with loading/error states
const AsyncWithOptions = defineAsyncComponent({
  loader: () =>
    new Promise<Component>((resolve) => {
      setTimeout(() => {
        resolve({
          template: '<div class="demo-box demo-box-blue"><strong>Full Options Async Component!</strong><p>Loaded with loading state handling.</p></div>',
        });
      }, 2000);
    }),
  loadingComponent: {
    template: '<div class="loading-fallback">Loading component...</div>',
  },
  errorComponent: {
    template: '<div class="demo-box" style="border-color: var(--color-error);"><strong>Error!</strong> Failed to load component.</div>',
  },
  delay: 200,
  timeout: 10000,
});

// Simulate error
const AsyncWithError = defineAsyncComponent({
  loader: () =>
    new Promise<Component>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Simulated load failure'));
      }, 1000);
    }),
  errorComponent: {
    template: '<div class="demo-box" style="border-color: var(--color-error); background: rgba(239, 68, 68, 0.1);"><strong>Error!</strong> Component failed to load (simulated).</div>',
  },
  delay: 200,
});

// State
const showBasic = ref(false);
const showWithOptions = ref(false);
const showWithError = ref(false);
const componentKey = ref(0);

function resetAll() {
  showBasic.value = false;
  showWithOptions.value = false;
  showWithError.value = false;
  componentKey.value++;
}
</script>

<template>
  <div>
    <!-- Basic Async -->
    <section>
      <h4>Basic Async Component</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <button @click="showBasic = true">Load Basic Async Component</button>
        <div v-if="showBasic" :key="`basic-${componentKey}`" style="margin-top: 1rem;">
          <AsyncBasic />
        </div>
      </div>
    </section>

    <!-- With Options -->
    <section>
      <h4>With Loading/Error Handling</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <button @click="showWithOptions = true">Load With Options</button>
        <div v-if="showWithOptions" :key="`options-${componentKey}`" style="margin-top: 1rem;">
          <AsyncWithOptions />
        </div>
      </div>
    </section>

    <!-- Error Handling -->
    <section>
      <h4>Error Handling</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <button @click="showWithError = true">Load (Will Fail)</button>
        <div v-if="showWithError" :key="`error-${componentKey}`" style="margin-top: 1rem;">
          <AsyncWithError />
        </div>
      </div>
    </section>

    <!-- Reset -->
    <section>
      <button @click="resetAll">Reset All Demos</button>
    </section>
  </div>
</template>
