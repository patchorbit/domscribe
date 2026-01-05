<script setup lang="ts">
/**
 * PropsAndEmits - Tests defineProps, defineEmits, and prop validation
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Demo child component state
const childValue = ref('Hello from child');
const emitLogs = ref<string[]>([]);

function logEmit(event: string, payload?: unknown) {
  emitLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] ${event}: ${JSON.stringify(payload)}`
  );
  if (emitLogs.value.length > 5) {
    emitLogs.value.pop();
  }
}

// Simulate receiving an emit
function handleChildUpdate(value: string) {
  logEmit('update:modelValue', value);
  childValue.value = value;
}

function handleChildAction(action: string) {
  logEmit('action', action);
}
</script>

<template>
  <div>
    <!-- v-model Pattern -->
    <section>
      <h4>Custom v-model Pattern</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>Simulated Child Value:</strong></p>
        <input
          :value="childValue"
          type="text"
          @input="handleChildUpdate(($event.target as HTMLInputElement).value)"
        />
        <p style="margin-top: 0.5rem;"><strong>Parent sees:</strong> {{ childValue }}</p>
      </div>
    </section>

    <!-- Emit Logs -->
    <section>
      <h4>Emit Simulation</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group" style="margin-bottom: 1rem;">
        <button @click="handleChildAction('save')">Emit 'save' action</button>
        <button @click="handleChildAction('cancel')">Emit 'cancel' action</button>
        <button @click="emitLogs = []">Clear Logs</button>
      </div>
      <div class="demo-box">
        <h5>Emit Log:</h5>
        <ul v-if="emitLogs.length">
          <li v-for="(log, i) in emitLogs" :key="i" style="font-size: 0.85rem;">
            {{ log }}
          </li>
        </ul>
          <p v-else style="color: var(--color-text-tertiary);">No emits yet</p>
        </div>
      </div>
    </section>
  </div>
</template>
