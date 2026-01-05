<script setup lang="ts">
/**
 * DynamicContent - Tests reactive state with ref(), reactive(), and computed()
 */
import { ref, reactive, computed, watch } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Basic ref
const count = ref(0);
const message = ref('Hello, Vue!');

// Reactive object
const user = reactive({
  name: 'Alice',
  email: 'alice@example.com',
  preferences: {
    theme: 'light',
    notifications: true,
  },
});

// Computed properties
const doubleCount = computed(() => count.value * 2);
const greeting = computed(() => `Hello, ${user.name}!`);

// Computed with getter and setter
const fullName = computed({
  get: () => `${user.name} (${user.email})`,
  set: (value: string) => {
    const [name] = value.split(' (');
    user.name = name;
  },
});

// Array operations
const items = ref<string[]>(['Item 1', 'Item 2', 'Item 3']);
const newItem = ref('');

// History for watch demo
const countHistory = ref<number[]>([0]);

// Watch effect
watch(count, (newVal) => {
  countHistory.value.push(newVal);
  if (countHistory.value.length > 10) {
    countHistory.value.shift();
  }
});

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}

function reset() {
  count.value = 0;
  countHistory.value = [0];
}

function addItem() {
  if (newItem.value.trim()) {
    items.value.push(newItem.value.trim());
    newItem.value = '';
  }
}

function removeItem(index: number) {
  items.value.splice(index, 1);
}

function shuffleItems() {
  items.value = items.value.sort(() => Math.random() - 0.5);
}
</script>

<template>
  <div>
    <!-- Basic ref -->
    <section>
      <h4>Basic ref()</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
        <button @click="decrement">-</button>
        <span style="font-size: 1.5rem; font-weight: bold; margin: 0 1rem;">
          {{ count }}
        </span>
        <button @click="increment">+</button>
        <button @click="reset">Reset</button>
      </div>
        <p>History: {{ countHistory.join(' → ') }}</p>
      </div>
    </section>

    <!-- String ref -->
    <section>
      <h4>String ref()</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Edit message</label>
        <input v-model="message" type="text" />
      </div>
        <p>Message: {{ message }}</p>
        <p>Length: {{ message.length }} characters</p>
      </div>
    </section>

    <!-- Computed Properties -->
    <section>
      <h4>Computed Properties</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>count:</strong> {{ count }}</p>
        <p><strong>doubleCount (computed):</strong> {{ doubleCount }}</p>
        <p><strong>greeting (computed):</strong> {{ greeting }}</p>
      </div>
    </section>

    <!-- Reactive Object -->
    <section>
      <h4>Reactive Object</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Name</label>
          <input v-model="user.name" type="text" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="user.email" type="email" />
        </div>
        <div class="form-row">
          <label>Theme:</label>
          <select v-model="user.preferences.theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div class="form-row">
          <label>
            <input v-model="user.preferences.notifications" type="checkbox" />
            Enable notifications
          </label>
        </div>
        <div style="margin-top: 1rem;">
          <pre>{{ JSON.stringify(user, null, 2) }}</pre>
        </div>
      </div>
    </section>

    <!-- Computed with Setter -->
    <section>
      <h4>Computed with Getter/Setter</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Full name (editable computed)</label>
          <input v-model="fullName" type="text" />
        </div>
        <p>This computed property extracts the name when you edit it.</p>
      </div>
    </section>

    <!-- Dynamic Array -->
    <section>
      <h4>Dynamic Array Operations</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
          <input
            v-model="newItem"
            type="text"
            placeholder="New item..."
            @keyup.enter="addItem"
          />
          <button @click="addItem">Add</button>
          <button @click="shuffleItems">Shuffle</button>
        </div>
        <ul>
          <li v-for="(item, index) in items" :key="index" class="list-item-with-button">
            {{ item }}
            <button @click="removeItem(index)">Remove</button>
          </li>
        </ul>
        <p>Total items: {{ items.length }}</p>
      </div>
    </section>
  </div>
</template>
