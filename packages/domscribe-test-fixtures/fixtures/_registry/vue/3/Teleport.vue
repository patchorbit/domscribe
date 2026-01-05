<script setup lang="ts">
/**
 * Teleport - Tests Vue's portal equivalent for rendering outside component tree
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

const showModal = ref(false);
const showNotification = ref(false);
const notificationMessage = ref('');

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function showNotify(message: string) {
  notificationMessage.value = message;
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, 3000);
}
</script>

<template>
  <div>
    <!-- Modal Demo -->
    <section>
      <h4>Modal Example</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <button @click="openModal">Open Modal</button>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-text-tertiary);">
          The modal renders outside this component's DOM tree!
        </p>
      </div>

      <!-- Teleported Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="showModal"
            style="
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
            "
            @click.self="closeModal"
          >
            <div
              style="
                background: white;
                padding: 2rem;
                border-radius: 8px;
                max-width: 400px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              "
            >
              <h3 style="margin-top: 0;">Teleported Modal</h3>
              <p>This modal is rendered directly in the body element, not inside the component tree.</p>
              <button @click="closeModal">Close Modal</button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </section>

    <!-- Notification Demo -->
    <section>
      <h4>Notification Toast</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="showNotify('Success! Operation completed.')">Show Success</button>
          <button @click="showNotify('Warning! Check your input.')">Show Warning</button>
          <button @click="showNotify('Error! Something went wrong.')">Show Error</button>
        </div>
      </div>

      <!-- Teleported Notification -->
      <Teleport to="body">
        <Transition name="slide-up">
          <div
            v-if="showNotification"
            style="
              position: fixed;
              bottom: 2rem;
              right: 2rem;
              background: var(--color-accent-primary);
              color: white;
              padding: 1rem 1.5rem;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              z-index: 1000;
            "
          >
            {{ notificationMessage }}
          </div>
        </Transition>
      </Teleport>
    </section>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
