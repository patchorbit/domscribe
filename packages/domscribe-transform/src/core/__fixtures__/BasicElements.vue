<script setup lang="ts">
/**
 * BasicElements - Representative Vue component for transform benchmarks.
 * Copied from test-fixtures registry (vue/3).
 */
import { ref } from 'vue';

const inputValue = ref('');
const checkboxValue = ref(false);
const isSubmitting = ref(false);

function handleSubmit() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  setTimeout(() => {
    isSubmitting.value = false;
  }, 2000);
}
</script>

<template>
  <div>
    <section class="div-elements-section">
      <h4>Div Elements</h4>
      <div class="demo-box capture-widget">
        This is a div element
      </div>
      <div class="demo-box demo-box-blue capture-widget">
        <div>Nested div</div>
      </div>
    </section>

    <section>
      <h4>Span Elements</h4>
      <div class="demo-box capture-widget">
        <p>
          This paragraph contains a <span style="color: var(--color-accent-cyan)">styled span</span> element.
        </p>
        <p>
          Multiple spans: <span>First</span> <span>Second</span> <span>Third</span>
        </p>
      </div>
    </section>

    <section>
      <h4>Button Elements</h4>
      <div class="demo-box capture-widget">
        <div class="button-group">
          <button type="button">Default Button</button>
          <button type="button" class="btn-primary">Primary Button</button>
          <button type="button" disabled>Disabled Button</button>
        </div>
      </div>
    </section>

    <section>
      <h4>Input Elements</h4>
      <div class="demo-box capture-widget">
        <div class="form-group">
          <label>Text Input</label>
          <input
            v-model="inputValue"
            type="text"
            placeholder="Type something..."
          />
          <p v-if="inputValue">You typed: {{ inputValue }}</p>
        </div>
        <div class="form-row">
          <label>
            <input v-model="checkboxValue" type="checkbox" />
            Checkbox input
          </label>
          <span v-if="checkboxValue">Checked!</span>
        </div>
      </div>
    </section>

    <section>
      <h4>Form Elements</h4>
      <div class="demo-box capture-widget">
        <form @submit.prevent>
          <div class="form-group">
            <label>Email</label>
            <input type="email" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" placeholder="Enter password" />
          </div>
          <button
            type="submit"
            class="btn-primary"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit' }}
          </button>
        </form>
      </div>
    </section>

    <section>
      <h4>List Elements</h4>
      <div class="demo-box capture-widget">
        <ul>
          <li>Unordered list item 1</li>
          <li>Unordered list item 2</li>
          <li>Unordered list item 3</li>
        </ul>
        <ol>
          <li>Ordered list item 1</li>
          <li>Ordered list item 2</li>
          <li>Ordered list item 3</li>
        </ol>
      </div>
    </section>

    <section>
      <h4>Class Bindings</h4>
      <div :class="['demo-box', 'capture-widget', checkboxValue ? 'demo-box-green' : 'demo-box-blue']">
        Dynamic class based on checkbox: {{ checkboxValue ? 'green' : 'blue' }}
      </div>
    </section>
  </div>
</template>
