<script setup lang="ts">
/**
 * TemplateRefs - Tests ref="..." attribute and template refs in Vue
 */
import { ref, onMounted } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Template refs
const inputRef = ref<HTMLInputElement | null>(null);
const divRef = ref<HTMLDivElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);

// State for demo
const inputValue = ref('');
const divDimensions = ref({ width: 0, height: 0 });
const isFocused = ref(false);

onMounted(() => {
  // Access DOM elements after mount
  if (divRef.value) {
    divDimensions.value = {
      width: divRef.value.offsetWidth,
      height: divRef.value.offsetHeight,
    };
  }
});

function focusInput() {
  inputRef.value?.focus();
}

function blurInput() {
  inputRef.value?.blur();
}

function getInputValue() {
  if (inputRef.value) {
    inputValue.value = inputRef.value.value;
  }
}

function clickButton() {
  buttonRef.value?.click();
}

function updateDimensions() {
  if (divRef.value) {
    divDimensions.value = {
      width: divRef.value.offsetWidth,
      height: divRef.value.offsetHeight,
    };
  }
}
</script>

<template>
  <div>
    <!-- Basic Ref Usage -->
    <section>
      <h4>Basic Template Ref</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Input with ref</label>
        <input
          ref="inputRef"
          type="text"
          placeholder="This input has a template ref"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <p>Is focused: {{ isFocused }}</p>
      </div>
      <div class="button-group">
        <button @click="focusInput">Focus Input</button>
        <button @click="blurInput">Blur Input</button>
        <button @click="getInputValue">Get Value</button>
      </div>
        <p v-if="inputValue">Input value: {{ inputValue }}</p>
      </div>
    </section>

    <!-- Ref for Measuring -->
    <section>
      <h4>Ref for DOM Measurement</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div
          ref="divRef"
          class="demo-box demo-box-blue"
        style="resize: both; overflow: auto; min-width: 200px; min-height: 100px;"
      >
        Resize me! I have a template ref for measurement.
      </div>
      <button @click="updateDimensions">Update Dimensions</button>
        <p>
          Width: {{ divDimensions.width }}px, Height: {{ divDimensions.height }}px
        </p>
      </div>
    </section>

    <!-- Ref on Button -->
    <section>
      <h4>Ref on Button</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button
          ref="buttonRef"
        class="btn-primary"
        @click="() => console.log('Button clicked via ref!')"
      >
        Button with Ref
      </button>
        <button @click="clickButton">
          Click Button Programmatically
        </button>
      </div>
    </section>

    <!-- Multiple Refs Pattern -->
    <section>
      <h4>Multiple Refs</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>
        Vue allows multiple refs in a component. Each gets its own reactive reference.
      </p>
      <div class="demo-box">
        <code>const inputRef = ref&lt;HTMLInputElement | null&gt;(null)</code>
        <br />
        <code>const divRef = ref&lt;HTMLDivElement | null&gt;(null)</code>
        <br />
          <code>const buttonRef = ref&lt;HTMLButtonElement | null&gt;(null)</code>
        </div>
      </div>
    </section>

    <!-- Ref Timing -->
    <section>
      <h4>Ref Timing</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p><strong>Important:</strong> Template refs are only available after the component is mounted.</p>
        <ul>
          <li>Use <code>onMounted()</code> to access refs after mount</li>
          <li>Refs are <code>null</code> during setup phase</li>
          <li>Always null-check before using ref methods</li>
        </ul>
      </div>
    </section>
  </div>
</template>
