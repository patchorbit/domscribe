<script setup lang="ts">
/**
 * Transitions - Tests <Transition> and <TransitionGroup> components
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Single element transition
const showElement = ref(true);

// Transition modes
const showA = ref(true);

// List transitions
const listItems = ref([
  { id: 1, text: 'Item 1' },
  { id: 2, text: 'Item 2' },
  { id: 3, text: 'Item 3' },
]);
let nextId = 4;

function addItem() {
  const index = Math.floor(Math.random() * (listItems.value.length + 1));
  listItems.value.splice(index, 0, {
    id: nextId++,
    text: `Item ${nextId - 1}`,
  });
}

function removeItem(id: number) {
  const index = listItems.value.findIndex((item) => item.id === id);
  if (index > -1) {
    listItems.value.splice(index, 1);
  }
}

function shuffleItems() {
  listItems.value = listItems.value.sort(() => Math.random() - 0.5);
}
</script>

<template>
  <div>
    <!-- Basic Transition -->
    <section>
      <h4>Basic Transition</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="showElement = !showElement">Toggle</button>
        <Transition name="fade">
          <div
            v-if="showElement"
            class="demo-box demo-box-blue"
            style="margin-top: 1rem;"
          >
            This element fades in and out!
          </div>
        </Transition>
      </div>
    </section>

    <!-- Slide Transition -->
    <section>
      <h4>Slide Transition</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <button @click="showElement = !showElement">Toggle Slide</button>
        <Transition name="slide">
          <div
            v-if="showElement"
            class="demo-box demo-box-green"
            style="margin-top: 1rem;"
          >
            This element slides in from the left!
          </div>
        </Transition>
      </div>
    </section>

    <!-- Transition Modes -->
    <section>
      <h4>Transition Modes (out-in)</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <button @click="showA = !showA">Switch Component</button>
        <Transition name="fade" mode="out-in">
          <div v-if="showA" key="a" class="demo-box" style="margin-top: 1rem;">
            Component A
          </div>
          <div v-else key="b" class="demo-box demo-box-amber" style="margin-top: 1rem;">
            Component B
          </div>
        </Transition>
      </div>
    </section>

    <!-- TransitionGroup -->
    <section>
      <h4>TransitionGroup</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="addItem">Add Item</button>
          <button @click="shuffleItems">Shuffle</button>
        </div>
        <TransitionGroup name="list" tag="ul" style="margin-top: 1rem; position: relative;">
          <li
            v-for="item in listItems"
            :key="item.id"
            style="
              padding: 0.5rem;
              margin: 0.25rem 0;
              background: var(--color-bg-surface);
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            {{ item.text }}
            <button @click="removeItem(item.id)" style="padding: 0.25rem 0.5rem;">
              Remove
            </button>
          </li>
        </TransitionGroup>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* List transition */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.list-move {
  transition: transform 0.3s ease;
}
.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
