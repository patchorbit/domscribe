<script setup lang="ts">
/**
 * BasicElements - Tests basic HTML elements in Vue templates
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

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
    <!-- Div Section -->
    <section class="div-elements-section">
      <h4>Div Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        This is a div element
      </div>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <div>Nested div</div>
      </div>
    </section>

    <!-- Span Section -->
    <section>
      <h4>Span Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>
          This paragraph contains a <span style="color: var(--color-accent-cyan)">styled span</span> element.
        </p>
        <p>
          Multiple spans: <span>First</span> <span>Second</span> <span>Third</span>
        </p>
      </div>
    </section>

    <!-- Button Section -->
    <section>
      <h4>Button Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button type="button">Default Button</button>
          <button type="button" class="btn-primary">Primary Button</button>
          <button type="button" disabled>Disabled Button</button>
        </div>
      </div>
    </section>

    <!-- Input Section -->
    <section>
      <h4>Input Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
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

    <!-- Form Section -->
    <section>
      <h4>Form Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
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
            <span v-if="isSubmitting" class="spinner"></span>
            {{ isSubmitting ? 'Submitting...' : 'Submit' }}
          </button>
        </form>
      </div>
    </section>

    <!-- Paragraph and Text Section -->
    <section>
      <h4>Paragraph Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>This is a simple paragraph.</p>
        <p>
          This paragraph has <strong>strong</strong> and <em>emphasized</em> text.
        </p>
        <p>
          And here's some <code>inline code</code> styling.
        </p>
      </div>
    </section>

    <!-- Link Section -->
    <section>
      <h4>Anchor Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>
          <a href="https://vuejs.org" target="_blank" rel="noopener">Vue.js Documentation</a>
        </p>
        <p>
          <a href="#basic-elements">Internal anchor link</a>
        </p>
      </div>
    </section>

    <!-- List Section -->
    <section>
      <h4>List Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
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

    <!-- Class Binding Section -->
    <section>
      <h4>Class Bindings</h4>
      <div :class="['demo-box', 'capture-widget', checkboxValue ? 'demo-box-green' : 'demo-box-blue']">
        <CaptureIcon />
        Dynamic class based on checkbox: {{ checkboxValue ? 'green' : 'blue' }}
      </div>
    </section>
  </div>
</template>

<style scoped>
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.div-elements-section {
  border-left: 3px solid var(--color-accent-cyan);
  padding-left: 12px;
}
</style>
