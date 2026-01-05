<script setup lang="ts">
/**
 * SmokeTest - Vue 3 component for testing runtime context capture
 *
 * This component demonstrates how the Overlay picker flow works with Vue:
 * 1. User clicks on an element (simulated via crosshair capture icons)
 * 2. The CaptureIcon finds the element via closest() and captures context
 * 3. This is the realistic flow - no timing issues because the element
 *    exists when clicked and is found directly from the DOM.
 *
 * Note: We don't use refs to capture because when refs are inside v-for,
 * they only bind to the last element. The CaptureIcon handles capture
 * by finding its parent widget element directly.
 */
import { ref, onMounted } from 'vue';
import CaptureIcon from './CaptureIcon.vue';
// Load smoke test utilities (exposes domscribe.* to console)
import '../domscribe-smoke-test';

// Counter state - these represent the component's "props" and "state"
// that we expect to capture via the runtime
const counterLabel = ref('Items');
const counterStep = ref(5);
const counterCount = ref(10);

// UserCard state
const userName = ref('Alice');
const userEmail = ref('alice@example.com');
const userRole = ref<'admin' | 'user' | 'guest'>('admin');
const isExpanded = ref(false);
const notes = ref('');

function incrementCounter() {
  counterCount.value += counterStep.value;
}

function decrementCounter() {
  counterCount.value -= counterStep.value;
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

onMounted(() => {
  console.log('[SmokeTest] Vue 3 smoke test component mounted');
});
</script>

<template>
  <div>
    <!-- Instructions -->
    <section>
      <h4>Testing Runtime Context Capture</h4>
      <div class="demo-box demo-box-amber">
        <h5>How to Test</h5>
        <ol>
          <li>Open browser DevTools console (F12)</li>
          <li>Click the crosshair icons on any widget below</li>
          <li>Check console for captured context (props & state)</li>
          <li>
            Try modifying state (increment counter, expand card) and capture again
          </li>
        </ol>
        <p>
          <strong>This simulates the Overlay picker flow:</strong> when you click
          an element, we have the element reference and can capture its context
          immediately.
        </p>
      </div>
    </section>

    <!-- Counter Widget -->
    <section>
      <h4>Counter Widget</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div class="capture-widget" data-testid="counter">
          <!-- Capture Icon - handles its own capture via closest() -->
          <CaptureIcon position="top-right" />
          <!-- Widget Content -->
          <h5 style="margin-top: 0;">Counter Widget</h5>
          <div class="demo-box">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-weight: 500;">{{ counterLabel }}:</span>
              <span style="font-size: 1.5rem; font-weight: bold;">{{ counterCount }}</span>
            </div>
            <div class="button-group" style="margin-top: 1rem;">
              <button @click="decrementCounter">-{{ counterStep }}</button>
              <button @click="incrementCounter">+{{ counterStep }}</button>
            </div>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--color-text-tertiary);">
            Props: label, initialValue, step | State: count
          </div>
        </div>

        <!-- UserCard Widget -->
        <div
          class="capture-widget"
          data-testid="user-card"
        >
          <!-- Capture Icon - handles its own capture via closest() -->
          <CaptureIcon position="top-right" />

          <!-- Widget Content -->
          <h5 style="margin-top: 0;">User Card Widget</h5>
          <div class="demo-box">
            <p><strong>{{ userName }}</strong></p>
            <p>{{ userEmail }}</p>
            <p>
              <span
                :class="{
                  'role-badge': true,
                  'role-admin': userRole === 'admin',
                  'role-user': userRole === 'user',
                  'role-guest': userRole === 'guest',
                }"
              >
                {{ userRole }}
              </span>
            </p>
            <button @click="toggleExpanded" style="margin-top: 0.5rem;">
              {{ isExpanded ? 'Collapse' : 'Expand' }}
            </button>
            <div v-if="isExpanded" style="margin-top: 1rem;">
              <textarea
                v-model="notes"
                placeholder="Add notes..."
                style="width: 100%; min-height: 60px;"
              />
              <p style="font-size: 0.85rem; color: var(--color-text-tertiary);">
                Notes: {{ notes.length }} chars
              </p>
            </div>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--color-text-tertiary);">
            Props: name, email, role | State: isExpanded, notes
          </div>
        </div>
      </div>
    </section>

    <!-- Strategy Comparison -->
    <section>
      <h4>Capture Strategy Comparison</h4>
      <div class="demo-box">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--color-border-primary);">Strategy</th>
              <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--color-border-primary);">Method</th>
              <th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--color-border-primary);">Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 0.5rem;"><code>VNODE</code></td>
              <td style="padding: 0.5rem;">Direct VNode access via __vueParentComponent</td>
              <td style="padding: 0.5rem;">Most reliable, works without DevTools</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem;"><code>DEVTOOLS</code></td>
              <td style="padding: 0.5rem;">Vue DevTools global hook</td>
              <td style="padding: 0.5rem;">Richer data when DevTools installed</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem;"><code>BEST_EFFORT</code></td>
              <td style="padding: 0.5rem;">DevTools first, fallback to VNode</td>
              <td style="padding: 0.5rem;">Production use - tries best option</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.role-admin {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.role-user {
  background: rgba(8, 145, 178, 0.1);
  color: #0891b2;
}

.role-guest {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}
</style>
