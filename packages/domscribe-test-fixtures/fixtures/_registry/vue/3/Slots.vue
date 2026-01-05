<script setup lang="ts">
/**
 * Slots - Tests default, named, and scoped slots
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// For scoped slot demo
const items = ref([
  { id: 1, name: 'Apple', price: 1.5, inStock: true },
  { id: 2, name: 'Banana', price: 0.75, inStock: true },
  { id: 3, name: 'Cherry', price: 3.0, inStock: false },
]);
</script>

<template>
  <div>
    <!-- Default Slot -->
    <section>
      <h4>Default Slot</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>Simulated Card Component:</strong></p>
        <div style="border: 1px dashed var(--color-border-secondary); padding: 1rem; border-radius: 4px;">
          <slot>Default slot content (fallback)</slot>
          <p>This paragraph is the "slotted" content!</p>
        </div>
      </div>
    </section>

    <!-- Named Slots -->
    <section>
      <h4>Named Slots</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>Simulated Layout Component:</strong></p>
        <div style="border: 1px solid var(--color-border-primary); border-radius: 4px; overflow: hidden;">
          <div style="background: var(--color-bg-surface); padding: 0.5rem; border-bottom: 1px solid var(--color-border-primary);">
            <strong>Header Slot:</strong> Page Title
          </div>
          <div style="padding: 1rem; min-height: 60px;">
            <strong>Default Slot:</strong> Main content goes here
          </div>
          <div style="background: var(--color-bg-surface); padding: 0.5rem; border-top: 1px solid var(--color-border-primary);">
            <strong>Footer Slot:</strong> Copyright 2024
          </div>
        </div>
      </div>
    </section>

    <!-- Scoped Slots -->
    <section>
      <h4>Scoped Slots</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <p><strong>Simulated Scoped Slot:</strong></p>
        <ul>
          <li
            v-for="(item, index) in items"
            :key="item.id"
            style="padding: 0.5rem; border-bottom: 1px solid var(--color-border-secondary);"
          >
            <strong>#{{ index + 1 }}</strong>: {{ item.name }} - ${{ item.price.toFixed(2) }}
            <span v-if="!item.inStock" style="color: var(--color-error); margin-left: 0.5rem;">
              (Out of stock)
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Slot Fallbacks -->
    <section>
      <h4>Slot Fallback Content</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p><strong>Without content:</strong></p>
        <button>Default Button Text</button>
        <p style="margin-top: 0.5rem;"><strong>With content:</strong></p>
        <button>Custom Button Text</button>
      </div>
    </section>
  </div>
</template>
