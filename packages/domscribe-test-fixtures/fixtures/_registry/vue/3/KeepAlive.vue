<script setup lang="ts">
/**
 * KeepAlive - Tests component caching with <KeepAlive>
 */
import { ref, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// For dynamic component switching
const currentTab = ref('Counter');
const tabs = ['Counter', 'Form', 'List'];

// Counter state (preserved when cached)
const count = ref(0);

// Form state (preserved when cached)
const formData = ref({
  name: '',
  email: '',
  message: '',
});

// List state (preserved when cached)
const listItems = ref(['Item 1', 'Item 2']);
const newItem = ref('');

// Lifecycle tracking
const lifecycleLog = ref<string[]>([]);

function log(message: string) {
  const time = new Date().toLocaleTimeString();
  lifecycleLog.value.unshift(`[${time}] ${message}`);
  if (lifecycleLog.value.length > 10) {
    lifecycleLog.value.pop();
  }
}

// Track lifecycle for Counter
onMounted(() => log('Counter: mounted'));
onUnmounted(() => log('Counter: unmounted'));
onActivated(() => log('Counter: activated'));
onDeactivated(() => log('Counter: deactivated'));

function addListItem() {
  if (newItem.value.trim()) {
    listItems.value.push(newItem.value.trim());
    newItem.value = '';
  }
}
</script>

<template>
  <div>
    <!-- Tab Demo -->
    <section>
      <h4>Tab Switching Demo</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p>Switch tabs and notice state is preserved:</p>
        <div class="button-group" style="margin: 1rem 0;">
          <button
            v-for="tab in tabs"
            :key="tab"
            :class="{ 'btn-primary': currentTab === tab }"
            @click="currentTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <KeepAlive>
          <div v-if="currentTab === 'Counter'" key="counter">
            <div class="demo-box">
              <h5>Counter Component</h5>
              <p>Count: <strong>{{ count }}</strong></p>
              <div class="button-group">
                <button @click="count--">-</button>
                <button @click="count++">+</button>
                <button @click="count = 0">Reset</button>
              </div>
              <p style="color: var(--color-text-tertiary); margin-top: 0.5rem; font-size: 0.85rem;">
                Switch tabs - count is preserved!
              </p>
            </div>
          </div>

          <div v-else-if="currentTab === 'Form'" key="form">
            <div class="demo-box">
              <h5>Form Component</h5>
              <div class="form-group">
                <label>Name:</label>
                <input v-model="formData.name" type="text" placeholder="Your name" />
              </div>
              <div class="form-group">
                <label>Email:</label>
                <input v-model="formData.email" type="email" placeholder="you@example.com" />
              </div>
              <div class="form-group">
                <label>Message:</label>
                <textarea v-model="formData.message" placeholder="Your message..." />
              </div>
              <p style="color: var(--color-text-tertiary); font-size: 0.85rem;">
                Form data is preserved when you switch tabs!
              </p>
            </div>
          </div>

          <div v-else-if="currentTab === 'List'" key="list">
            <div class="demo-box">
              <h5>List Component</h5>
              <div class="form-row">
                <input
                  v-model="newItem"
                  type="text"
                  placeholder="New item..."
                  @keyup.enter="addListItem"
                />
                <button @click="addListItem">Add</button>
              </div>
              <ul style="margin-top: 1rem;">
                <li v-for="item in listItems" :key="item">{{ item }}</li>
              </ul>
              <p style="color: var(--color-text-tertiary); font-size: 0.85rem;">
                List items are preserved when you switch tabs!
              </p>
            </div>
          </div>
        </KeepAlive>
      </div>
    </section>

    <!-- Lifecycle Log -->
    <section>
      <h4>Lifecycle Log</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <ul v-if="lifecycleLog.length">
          <li v-for="(entry, i) in lifecycleLog" :key="i" style="font-size: 0.85rem;">
            {{ entry }}
          </li>
        </ul>
        <p v-else style="color: var(--color-text-tertiary);">Switch tabs to see lifecycle events</p>
      </div>
    </section>
  </div>
</template>
