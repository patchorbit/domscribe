<script setup lang="ts">
/**
 * CompositionVsOptions - Shows both API styles side-by-side for comparison
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Composition API example (this file uses <script setup>)
const compositionCount = ref(0);
const compositionDoubled = computed(() => compositionCount.value * 2);

function compositionIncrement() {
  compositionCount.value++;
}

onMounted(() => {
  console.log('[Composition] Component mounted');
});

onUnmounted(() => {
  console.log('[Composition] Component unmounted');
});
</script>

<template>
  <div>
    <!-- Introduction -->
    <section>
      <h4>Vue 3 API Styles</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p>Vue 3 offers two API styles for organizing component logic:</p>
        <ul>
          <li><strong>Composition API</strong> - Function-based, better TypeScript support</li>
          <li><strong>Options API</strong> - Object-based, familiar to Vue 2 users</li>
        </ul>
        <p>Both are fully supported and can even be mixed in the same project!</p>
      </div>
    </section>

    <!-- Composition API Demo -->
    <section>
      <h4>Composition API (This Component)</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p><strong>Count:</strong> {{ compositionCount }}</p>
        <p><strong>Doubled:</strong> {{ compositionDoubled }}</p>
        <button @click="compositionIncrement">Increment</button>
      </div>
    </section>

    <!-- When to Use -->
    <section>
      <h4>When to Use Each</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <h5>Composition API</h5>
            <ul>
              <li>Building large applications</li>
              <li>Need TypeScript support</li>
              <li>Want to extract reusable logic</li>
              <li>Coming from React Hooks</li>
            </ul>
          </div>
          <div>
            <h5>Options API</h5>
            <ul>
              <li>Coming from Vue 2</li>
              <li>Simpler, smaller components</li>
              <li>Team already familiar with it</li>
              <li>No TypeScript requirement</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
