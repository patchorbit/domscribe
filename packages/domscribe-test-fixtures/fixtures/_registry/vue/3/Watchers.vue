<script setup lang="ts">
/**
 * Watchers - Tests watch(), watchEffect(), watchPostEffect()
 */
import { ref, reactive, watch, watchEffect, watchPostEffect } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Basic reactive state
const count = ref(0);
const message = ref('Hello');

const user = reactive({
  name: 'Alice',
  email: 'alice@example.com',
});

// Watch logs
const watchLogs = ref<string[]>([]);
const effectLogs = ref<string[]>([]);

function addLog(logs: typeof watchLogs, entry: string) {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${entry}`);
  if (logs.value.length > 5) {
    logs.value.pop();
  }
}

// watch() - explicit source
watch(count, (newVal, oldVal) => {
  addLog(watchLogs, `count: ${oldVal} → ${newVal}`);
});

// watch() - multiple sources
watch(
  [count, message],
  ([newCount, newMsg], [oldCount, oldMsg]) => {
    if (newCount !== oldCount) {
      addLog(watchLogs, `count changed in multi-watch`);
    }
    if (newMsg !== oldMsg) {
      addLog(watchLogs, `message changed in multi-watch`);
    }
  }
);

// watch() - deep reactive object
watch(
  () => user.name,
  (newName, oldName) => {
    addLog(watchLogs, `user.name: "${oldName}" → "${newName}"`);
  }
);

// watchEffect() - auto-tracks dependencies
watchEffect(() => {
  addLog(effectLogs, `watchEffect: count is ${count.value}`);
});

// watchPostEffect() - runs after DOM updates
const postEffectElement = ref<HTMLElement | null>(null);
watchPostEffect(() => {
  if (postEffectElement.value) {
    const text = postEffectElement.value.textContent;
    addLog(effectLogs, `watchPostEffect: DOM shows "${text}"`);
  }
});

function increment() {
  count.value++;
}

function updateMessage(msg: string) {
  message.value = msg;
}

function clearLogs() {
  watchLogs.value = [];
  effectLogs.value = [];
}

function clearEffectLogs() {
  effectLogs.value = [];
}
</script>

<template>
  <div>
    <!-- watch() Basic -->
    <section>
      <h4>watch() - Explicit Sources</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="increment">Increment Count ({{ count }})</button>
          <button @click="updateMessage('World')">Set Message to "World"</button>
          <button @click="updateMessage('Hello')">Set Message to "Hello"</button>
        </div>
      </div>
    </section>

    <!-- watch() Multiple Sources -->
    <section>
      <h4>watch() - Multiple Sources</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p><strong>Count:</strong> {{ count }}</p>
        <p><strong>Message:</strong> {{ message }}</p>
      </div>
    </section>

    <!-- watch() Reactive Object -->
    <section>
      <h4>watch() - Reactive Object Property</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>User Name:</label>
          <input v-model="user.name" type="text" />
        </div>
      </div>
    </section>

    <!-- watchPostEffect() -->
    <section>
      <h4>watchPostEffect() - After DOM Update</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div ref="postEffectElement" style="padding: 0.5rem; background: var(--color-bg-surface); border-radius: 4px;">
          Current count: {{ count }}
        </div>
      </div>
    </section>

    <!-- Watch Logs -->
    <section>
      <h4>Watch Logs</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group" style="margin-bottom: 1rem;">
        <button @click="clearLogs">Clear Logs</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="demo-box">
          <h5>watch() logs:</h5>
          <ul v-if="watchLogs.length">
            <li v-for="(log, i) in watchLogs" :key="i" style="font-size: 0.85rem;">
              {{ log }}
            </li>
          </ul>
          <p v-else style="color: var(--color-text-tertiary);">No watch events yet</p>
        </div>
        <div class="demo-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h5 style="margin: 0;">watchEffect/watchPostEffect logs:</h5>
            <button @click="clearEffectLogs" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">Clear</button>
          </div>
          <ul v-if="effectLogs.length">
            <li v-for="(log, i) in effectLogs" :key="i" style="font-size: 0.85rem;">
              {{ log }}
            </li>
          </ul>
            <p v-else style="color: var(--color-text-tertiary);">No effect events yet</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
