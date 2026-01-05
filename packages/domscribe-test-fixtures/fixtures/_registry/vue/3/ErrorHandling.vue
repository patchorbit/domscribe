<script setup lang="ts">
/**
 * ErrorHandling - Tests onErrorCaptured and error boundaries
 */
import { ref, onErrorCaptured } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Error state
const capturedError = ref<Error | null>(null);
const errorLog = ref<string[]>([]);

// Capture errors from child components
onErrorCaptured((error: Error, _instance, info: string) => {
  const timestamp = new Date().toLocaleTimeString();
  errorLog.value.unshift(`[${timestamp}] ${error.message} (${info})`);

  if (errorLog.value.length > 5) {
    errorLog.value.pop();
  }

  capturedError.value = error;

  // Return false to stop propagation
  return false;
});

// Trigger various errors
function triggerSyncError() {
  throw new Error('Sync error from event handler');
}

function triggerAsyncError() {
  setTimeout(() => {
    throw new Error('Async error (not captured by onErrorCaptured)');
  }, 0);
}

function triggerPromiseError() {
  Promise.reject(new Error('Unhandled promise rejection'));
}

function clearErrors() {
  capturedError.value = null;
  errorLog.value = [];
}
</script>

<template>
  <div>
    <!-- Error Demos -->
    <section>
      <h4>Error Triggers</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="triggerSyncError">Trigger Sync Error</button>
          <button @click="triggerAsyncError">Trigger Async Error</button>
          <button @click="triggerPromiseError">Trigger Promise Rejection</button>
          <button @click="clearErrors">Clear Errors</button>
        </div>
        <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--color-text-tertiary);">
          Note: Only sync errors in template/lifecycle are captured by onErrorCaptured.
          Check the browser console for async errors.
        </p>
      </div>
    </section>

    <!-- Error Log -->
    <section>
      <h4>Captured Errors</h4>
      <div class="demo-box capture-widget" :style="capturedError ? 'border-color: var(--color-error)' : ''">
        <CaptureIcon />
        <div v-if="capturedError">
          <p><strong>Current Error:</strong></p>
          <p style="color: var(--color-error);">{{ capturedError.message }}</p>
        </div>
        <div v-else>
          <p style="color: var(--color-text-tertiary);">No errors captured</p>
        </div>
        <div v-if="errorLog.length" style="margin-top: 1rem;">
          <p><strong>Error Log:</strong></p>
          <ul>
            <li v-for="(log, i) in errorLog" :key="i" style="font-size: 0.85rem;">
              {{ log }}
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
