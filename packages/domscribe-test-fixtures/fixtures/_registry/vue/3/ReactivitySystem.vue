<script setup lang="ts">
/**
 * ReactivitySystem - Tests ref, reactive, toRef, toRefs, shallowRef
 */
import { ref, reactive, toRef, toRefs, shallowRef, triggerRef } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Basic ref
const count = ref(0);

// Reactive object
const state = reactive({
  name: 'Alice',
  age: 30,
  address: {
    city: 'New York',
    zip: '10001',
  },
});

// toRef - create ref from reactive property
const nameRef = toRef(state, 'name');

// toRefs - destructure reactive while keeping reactivity
const { age } = toRefs(state);

// shallowRef - only tracks .value changes, not deep
const shallowState = shallowRef({
  items: ['a', 'b', 'c'],
  count: 0,
});

function incrementCount() {
  count.value++;
}

function updateName(newName: string) {
  nameRef.value = newName;
}

function incrementAge() {
  age.value++;
}

function addItem() {
  shallowState.value.items.push(`item-${shallowState.value.items.length + 1}`);
  triggerRef(shallowState);
}

function replaceShallowState() {
  shallowState.value = {
    items: ['new-a', 'new-b'],
    count: shallowState.value.count + 1,
  };
}
</script>

<template>
  <div>
    <!-- ref() -->
    <section>
      <h4>ref()</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>Count:</strong> {{ count }}</p>
        <button @click="incrementCount">Increment</button>
      </div>
    </section>

    <!-- reactive() -->
    <section>
      <h4>reactive()</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Name:</label>
          <input v-model="state.name" type="text" />
        </div>
        <div class="form-group">
          <label>City (nested):</label>
          <input v-model="state.address.city" type="text" />
        </div>
        <p><strong>State:</strong> {{ state.name }}, {{ state.address.city }}</p>
      </div>
    </section>

    <!-- toRef() -->
    <section>
      <h4>toRef()</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p><strong>nameRef.value:</strong> {{ nameRef }}</p>
        <p><strong>state.name:</strong> {{ state.name }}</p>
        <div class="button-group">
          <button @click="updateName('Bob')">Set to Bob</button>
          <button @click="updateName('Charlie')">Set to Charlie</button>
        </div>
      </div>
    </section>

    <!-- toRefs() -->
    <section>
      <h4>toRefs()</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <p><strong>age.value:</strong> {{ age }}</p>
        <p><strong>state.age:</strong> {{ state.age }}</p>
        <button @click="incrementAge">Increment Age</button>
      </div>
    </section>

    <!-- shallowRef() -->
    <section>
      <h4>shallowRef()</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p><strong>Items:</strong> {{ shallowState.items.join(', ') }}</p>
        <p><strong>Count:</strong> {{ shallowState.count }}</p>
        <div class="button-group">
          <button @click="addItem">Add Item</button>
          <button @click="replaceShallowState">Replace Value</button>
        </div>
      </div>
    </section>
  </div>
</template>
