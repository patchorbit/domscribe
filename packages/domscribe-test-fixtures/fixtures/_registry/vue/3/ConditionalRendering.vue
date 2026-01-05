<script setup lang="ts">
/**
 * ConditionalRendering - Tests v-if, v-else-if, v-else, and v-show
 */
import { ref, computed } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Toggle states
const isVisible = ref(true);
const showDetails = ref(false);

// Status for v-else-if chain
type Status = 'loading' | 'success' | 'error' | 'idle';
const status = ref<Status>('idle');

// Score for multiple conditions
const score = ref(75);

// User authentication state
const isAuthenticated = ref(false);
const isAdmin = ref(false);

// Computed grade
const grade = computed(() => {
  if (score.value >= 90) return 'A';
  if (score.value >= 80) return 'B';
  if (score.value >= 70) return 'C';
  if (score.value >= 60) return 'D';
  return 'F';
});

function cycleStatus() {
  const statuses: Status[] = ['idle', 'loading', 'success', 'error'];
  const currentIndex = statuses.indexOf(status.value);
  status.value = statuses[(currentIndex + 1) % statuses.length];
}
</script>

<template>
  <div>
    <!-- Basic v-if/v-else -->
    <section>
      <h4>Basic v-if / v-else</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="isVisible = !isVisible">
          Toggle Visibility
        </button>
        <div v-if="isVisible" class="demo-box demo-box-green" style="margin-top: 1rem;">
          This content is visible (v-if)
        </div>
        <div v-else class="demo-box demo-box-red" style="margin-top: 1rem;">
          This content shows when hidden (v-else)
        </div>
      </div>
    </section>

    <!-- v-if / v-else-if / v-else Chain -->
    <section>
      <h4>v-if / v-else-if / v-else Chain</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="cycleStatus">
          Cycle Status (Current: {{ status }})
        </button>
        <div v-if="status === 'loading'" class="demo-box demo-box-amber" style="margin-top: 1rem;">
          Loading...
        </div>
        <div v-else-if="status === 'success'" class="demo-box demo-box-green" style="margin-top: 1rem;">
          Success! Operation completed.
        </div>
        <div v-else-if="status === 'error'" class="demo-box demo-box-red" style="margin-top: 1rem;">
          Error! Something went wrong.
        </div>
        <div v-else class="demo-box" style="margin-top: 1rem;">
          Idle - Click button to start
        </div>
      </div>
    </section>

    <!-- v-show vs v-if -->
    <section>
      <h4>v-show vs v-if</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="showDetails = !showDetails">
          Toggle Details
        </button>
        <div class="demo-box" style="margin-top: 1rem;">
          <p><strong>Using v-if:</strong> Element is removed from DOM</p>
          <div v-if="showDetails" class="demo-box-blue" style="padding: 1rem;">
            This uses v-if (check DOM - element removed when hidden)
          </div>
        </div>
        <div class="demo-box" style="margin-top: 1rem;">
          <p><strong>Using v-show:</strong> Element stays in DOM with display:none</p>
          <div v-show="showDetails" class="demo-box-blue" style="padding: 1rem;">
            This uses v-show (check DOM - element has display:none when hidden)
          </div>
        </div>
      </div>
    </section>

    <!-- Computed Conditions -->
    <section>
      <h4>Computed Conditions</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
          <label>Score:</label>
          <input v-model.number="score" type="range" min="0" max="100" />
          <span>{{ score }}</span>
        </div>
        <div
          :class="[
            'demo-box',
            grade === 'A' ? 'demo-box-green' :
            grade === 'B' ? 'demo-box-blue' :
            grade === 'C' ? 'demo-box-amber' :
            'demo-box-red'
          ]"
          style="margin-top: 1rem;"
        >
          Grade: {{ grade }}
          <span v-if="grade === 'A'"> - Excellent!</span>
          <span v-else-if="grade === 'B'"> - Good job!</span>
          <span v-else-if="grade === 'C'"> - Average</span>
          <span v-else-if="grade === 'D'"> - Needs improvement</span>
          <span v-else> - Failing</span>
        </div>
      </div>
    </section>

    <!-- Multiple Conditions -->
    <section>
      <h4>Multiple Conditions (AND/OR)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
          <label>
            <input v-model="isAuthenticated" type="checkbox" />
            Authenticated
          </label>
          <label>
            <input v-model="isAdmin" type="checkbox" />
            Is Admin
          </label>
        </div>
        <div v-if="isAuthenticated && isAdmin" class="demo-box demo-box-green" style="margin-top: 1rem;">
          Welcome, Admin! You have full access.
        </div>
        <div v-else-if="isAuthenticated" class="demo-box demo-box-blue" style="margin-top: 1rem;">
          Welcome, User! You have limited access.
        </div>
        <div v-else class="demo-box demo-box-amber" style="margin-top: 1rem;">
          Please log in to continue.
        </div>
      </div>
    </section>

    <!-- Template v-if (grouping) -->
    <section>
      <h4>Template v-if (Grouping)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="isVisible = !isVisible">
          Toggle Group
        </button>
        <template v-if="isVisible">
          <h5 style="margin-top: 1rem;">Group Title</h5>
          <p>This is paragraph 1</p>
          <p>This is paragraph 2</p>
          <p>All these elements are conditionally rendered together</p>
        </template>
      </div>
    </section>

    <!-- Nested Conditions -->
    <section>
      <h4>Nested Conditions</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div v-if="isAuthenticated" class="demo-box" style="margin-top: 0;">
          <p>Authenticated User Content</p>
          <div v-if="isAdmin" class="demo-box-green" style="padding: 1rem; margin-top: 0.5rem;">
            Admin Panel (nested v-if)
          </div>
          <div v-else class="demo-box-blue" style="padding: 1rem; margin-top: 0.5rem;">
            User Dashboard (nested v-else)
          </div>
        </div>
        <div v-else class="demo-box demo-box-amber" style="margin-top: 0;">
          Guest content - please authenticate
        </div>
      </div>
    </section>
  </div>
</template>
