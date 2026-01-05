<script setup lang="ts">
/**
 * TwoWayBinding - Tests v-model for forms, custom components, and modifiers
 */
import { ref, computed } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Basic inputs
const textValue = ref('');
const numberValue = ref(0);
const rangeValue = ref(50);

// Checkbox and radio
const singleCheckbox = ref(false);
const multiCheckbox = ref<string[]>([]);
const radioValue = ref('');

// Select
const singleSelect = ref('');
const multiSelect = ref<string[]>([]);

// Textarea
const textareaValue = ref('');

// Modifiers
const trimmedValue = ref('');
const lazyValue = ref('');
const numericValue = ref(0);

// Color and date
const colorValue = ref('#06b6d4');
const dateValue = ref('');

// Computed character count
const charCount = computed(() => textareaValue.value.length);

const checkboxOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
const selectOptions = [
  { value: 'vue', label: 'Vue.js' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
];
</script>

<template>
  <div>
    <!-- Text Input -->
    <section>
      <h4>Text Input</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Basic text binding</label>
        <input v-model="textValue" type="text" placeholder="Type something..." />
          <p>Value: "{{ textValue }}"</p>
        </div>
      </div>
    </section>

    <!-- Number Input -->
    <section>
      <h4>Number Input</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Number input</label>
        <input v-model.number="numberValue" type="number" />
        <p>Value: {{ numberValue }} (type: {{ typeof numberValue }})</p>
      </div>
      <div class="form-group">
        <label>Range input</label>
        <input v-model.number="rangeValue" type="range" min="0" max="100" />
          <p>Value: {{ rangeValue }}</p>
        </div>
      </div>
    </section>

    <!-- Single Checkbox -->
    <section>
      <h4>Single Checkbox</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <label>
        <input v-model="singleCheckbox" type="checkbox" />
        I agree to the terms
      </label>
        <p>Checked: {{ singleCheckbox }}</p>
      </div>
    </section>

    <!-- Multiple Checkboxes -->
    <section>
      <h4>Multiple Checkboxes</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
        <label v-for="option in checkboxOptions" :key="option">
          <input v-model="multiCheckbox" type="checkbox" :value="option" />
          {{ option }}
        </label>
      </div>
        <p>Selected: {{ multiCheckbox.join(', ') || 'none' }}</p>
      </div>
    </section>

    <!-- Radio Buttons -->
    <section>
      <h4>Radio Buttons</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
        <label v-for="option in selectOptions" :key="option.value">
          <input v-model="radioValue" type="radio" :value="option.value" />
          {{ option.label }}
        </label>
      </div>
        <p>Selected: {{ radioValue || 'none' }}</p>
      </div>
    </section>

    <!-- Single Select -->
    <section>
      <h4>Single Select</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Choose a framework</label>
        <select v-model="singleSelect">
          <option value="" disabled>Select one...</option>
          <option v-for="option in selectOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
          <p>Selected: {{ singleSelect || 'none' }}</p>
        </div>
      </div>
    </section>

    <!-- Multiple Select -->
    <section>
      <h4>Multiple Select</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Choose frameworks (Ctrl/Cmd+click)</label>
        <select v-model="multiSelect" multiple style="height: 100px;">
          <option v-for="option in selectOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
          <p>Selected: {{ multiSelect.join(', ') || 'none' }}</p>
        </div>
      </div>
    </section>

    <!-- Textarea -->
    <section>
      <h4>Textarea</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Message ({{ charCount }} characters)</label>
          <textarea v-model="textareaValue" placeholder="Enter your message..." />
        </div>
      </div>
    </section>

    <!-- v-model Modifiers -->
    <section>
      <h4>v-model Modifiers</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>.trim - Removes whitespace</label>
        <input v-model.trim="trimmedValue" type="text" placeholder="  try spaces  " />
        <p>Value: "{{ trimmedValue }}" (length: {{ trimmedValue.length }})</p>
      </div>
      <div class="form-group">
        <label>.lazy - Updates on change, not input</label>
        <input v-model.lazy="lazyValue" type="text" placeholder="Updates on blur..." />
        <p>Value: "{{ lazyValue }}"</p>
      </div>
      <div class="form-group">
        <label>.number - Casts to number</label>
        <input v-model.number="numericValue" type="text" placeholder="Enter a number..." />
          <p>Value: {{ numericValue }} (type: {{ typeof numericValue }})</p>
        </div>
      </div>
    </section>

    <!-- Color and Date -->
    <section>
      <h4>Color and Date Inputs</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
        <div class="form-group">
          <label>Color picker</label>
          <input v-model="colorValue" type="color" />
          <p>Value: {{ colorValue }}</p>
        </div>
        <div class="form-group">
          <label>Date picker</label>
          <input v-model="dateValue" type="date" />
            <p>Value: {{ dateValue || 'none' }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
