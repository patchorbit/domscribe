<script setup lang="ts">
/**
 * Mixins - Tests legacy mixin pattern (for completeness)
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Note: Mixins are a legacy pattern. Composables are preferred in Vue 3.
const selectedApproach = ref<'mixin' | 'composable'>('mixin');
</script>

<template>
  <div>
    <!-- Introduction -->
    <section>
      <h4>Vue Mixins (Legacy Pattern)</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p>
          <strong>Note:</strong> Mixins are a Vue 2 pattern for code reuse.
          In Vue 3, <strong>composables are preferred</strong>.
        </p>
      </div>
    </section>

    <!-- Toggle -->
    <section>
      <h4>Compare Approaches</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button
            :class="{ 'btn-primary': selectedApproach === 'mixin' }"
            @click="selectedApproach = 'mixin'"
          >
            Mixin (Legacy)
          </button>
          <button
            :class="{ 'btn-primary': selectedApproach === 'composable' }"
            @click="selectedApproach = 'composable'"
          >
            Composable (Recommended)
          </button>
        </div>
        <div style="margin-top: 1rem;">
          <p v-if="selectedApproach === 'mixin'">
            <strong>Mixins</strong> merge options (data, methods, lifecycle) into components.
            Issues: naming collisions, implicit dependencies, poor TypeScript support.
          </p>
          <p v-else>
            <strong>Composables</strong> are explicit functions returning reactive state.
            Benefits: clear imports, no collisions, full TypeScript support.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
