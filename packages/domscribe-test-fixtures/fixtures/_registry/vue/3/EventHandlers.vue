<script setup lang="ts">
/**
 * EventHandlers - Tests @click, @input, @submit and event modifiers
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Click tracking
const clickCount = ref(0);
const lastClickInfo = ref('');

// Input tracking
const inputValue = ref('');
const inputEvents = ref<string[]>([]);

// Form data
const formData = ref({ email: '', message: '' });
const formSubmitted = ref(false);

// Mouse events
const mousePosition = ref({ x: 0, y: 0 });
const isHovering = ref(false);

// Keyboard events
const lastKey = ref('');
const keyHistory = ref<string[]>([]);

// Focus events
const isFocused = ref(false);

function handleClick(event: MouseEvent) {
  clickCount.value++;
  lastClickInfo.value = `Button: ${event.button}, Shift: ${event.shiftKey}, Ctrl: ${event.ctrlKey}`;
}

function handleDoubleClick() {
  clickCount.value += 10;
  lastClickInfo.value = 'Double-clicked! (+10)';
}

function handleRightClick() {
  lastClickInfo.value = 'Right-clicked (context menu prevented)';
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputEvents.value.push(`input: "${target.value}"`);
  if (inputEvents.value.length > 5) {
    inputEvents.value.shift();
  }
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  inputEvents.value.push(`change: "${target.value}"`);
  if (inputEvents.value.length > 5) {
    inputEvents.value.shift();
  }
}

function handleSubmit() {
  formSubmitted.value = true;
  console.log('Form submitted:', formData.value);
  setTimeout(() => {
    formSubmitted.value = false;
  }, 2000);
}

function handleMouseMove(event: MouseEvent) {
  mousePosition.value = { x: event.offsetX, y: event.offsetY };
}

function handleKeyDown(event: KeyboardEvent) {
  lastKey.value = event.key;
  keyHistory.value.push(event.key);
  if (keyHistory.value.length > 10) {
    keyHistory.value.shift();
  }
}

function clearHistory() {
  inputEvents.value = [];
  keyHistory.value = [];
  clickCount.value = 0;
}
</script>

<template>
  <div>
    <!-- Click Events -->
    <section>
      <h4>Click Events</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
        <button @click="handleClick">
          Click Me ({{ clickCount }})
        </button>
        <button @dblclick="handleDoubleClick">
          Double-Click Me
        </button>
        <button @click.right.prevent="handleRightClick">
          Right-Click Me
        </button>
          <button @click="clearHistory">
            Clear
          </button>
        </div>
        <p v-if="lastClickInfo">Last action: {{ lastClickInfo }}</p>
      </div>
    </section>

    <!-- Click Modifiers -->
    <section>
      <h4>Click Modifiers</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
        <button @click.once="clickCount++">
          @click.once (only works once)
        </button>
        <button @click.shift="clickCount += 5">
          @click.shift (+5 when Shift held)
        </button>
        <button @click.ctrl="clickCount += 10">
          @click.ctrl (+10 when Ctrl held)
        </button>
          <button @click.exact="clickCount++">
            @click.exact (only plain click)
          </button>
        </div>
        <p>Click count: {{ clickCount }}</p>
      </div>
    </section>

    <!-- Input Events -->
    <section>
      <h4>Input Events</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Test input (@input and @change)</label>
        <input
          v-model="inputValue"
          type="text"
          placeholder="Type here..."
          @input="handleInput"
          @change="handleChange"
        />
      </div>
      <div class="demo-box">
        <p><strong>Event log:</strong></p>
        <ul>
          <li v-for="(event, index) in inputEvents" :key="index">
            {{ event }}
          </li>
        </ul>
          <p v-if="inputEvents.length === 0" style="color: var(--color-text-tertiary);">
            No events yet
          </p>
        </div>
      </div>
    </section>

    <!-- Form Submit -->
    <section>
      <h4>Form Submit (@submit.prevent)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Email</label>
          <input v-model="formData.email" type="email" placeholder="email@example.com" />
        </div>
        <div class="form-group">
          <label>Message</label>
          <textarea v-model="formData.message" placeholder="Your message..." />
        </div>
        <button type="submit" class="btn-primary">Submit</button>
      </form>
        <div v-if="formSubmitted" class="demo-box demo-box-green">
          Form submitted successfully!
        </div>
      </div>
    </section>

    <!-- Mouse Events -->
    <section>
      <h4>Mouse Events</h4>
      <div
        class="demo-box demo-box-blue capture-widget"
        style="height: 150px; cursor: crosshair;"
        @mousemove="handleMouseMove"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <CaptureIcon />
        <p>Move mouse here</p>
        <p>Position: ({{ mousePosition.x }}, {{ mousePosition.y }})</p>
        <p>Hovering: {{ isHovering }}</p>
      </div>
    </section>

    <!-- Keyboard Events -->
    <section>
      <h4>Keyboard Events</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Type here (tracks @keydown)</label>
        <input
          type="text"
          placeholder="Focus and type..."
          @keydown="handleKeyDown"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>
        <p>Focused: {{ isFocused }}</p>
        <p>Last key: <code>{{ lastKey || 'none' }}</code></p>
        <p>Key history: {{ keyHistory.join(', ') || 'none' }}</p>
      </div>
    </section>

    <!-- Key Modifiers -->
    <section>
      <h4>Keyboard Modifiers</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Special key handlers</label>
        <input
          type="text"
          placeholder="Try Enter, Escape, or Tab..."
          @keydown.enter="lastKey = 'Enter (captured)'"
          @keydown.esc="lastKey = 'Escape (captured)'"
          @keydown.tab="lastKey = 'Tab (captured)'"
            @keydown.space.prevent="lastKey = 'Space (prevented default)'"
          />
        </div>
      </div>
    </section>

    <!-- Event Propagation -->
    <section>
      <h4>Event Propagation (.stop, .self)</h4>
      <div
        class="demo-box demo-box-amber capture-widget"
        @click="lastClickInfo = 'Outer div clicked'"
      >
        <CaptureIcon />
        <p>Outer div (click me)</p>
        <button @click.stop="lastClickInfo = 'Inner button clicked (.stop)'">
          .stop - Won't bubble
        </button>
        <button @click="lastClickInfo = 'Inner button clicked (bubbles)'">
          No modifier - Bubbles up
        </button>
      </div>
      <p>{{ lastClickInfo }}</p>
    </section>
  </div>
</template>
