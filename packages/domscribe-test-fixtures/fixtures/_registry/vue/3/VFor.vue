<script setup lang="ts">
/**
 * VFor - Tests v-for list rendering in Vue
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Simple array
const fruits = ref(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);

// Array of objects
interface User {
  id: number;
  name: string;
  role: string;
}
const users = ref<User[]>([
  { id: 1, name: 'Alice', role: 'Admin' },
  { id: 2, name: 'Bob', role: 'User' },
  { id: 3, name: 'Charlie', role: 'User' },
  { id: 4, name: 'Diana', role: 'Moderator' },
]);

// Nested array
const categories = ref([
  {
    name: 'Fruits',
    items: ['Apple', 'Banana', 'Orange'],
  },
  {
    name: 'Vegetables',
    items: ['Carrot', 'Broccoli', 'Spinach'],
  },
  {
    name: 'Grains',
    items: ['Rice', 'Wheat', 'Oats'],
  },
]);

// Object iteration
const person = ref({
  name: 'John Doe',
  age: 30,
  occupation: 'Developer',
  city: 'San Francisco',
});

// Range iteration
const count = ref(5);

// For adding/removing items
const newFruit = ref('');

function addFruit() {
  if (newFruit.value.trim()) {
    fruits.value.push(newFruit.value.trim());
    newFruit.value = '';
  }
}

function removeFruit(index: number) {
  fruits.value.splice(index, 1);
}

function removeUser(id: number) {
  users.value = users.value.filter((u) => u.id !== id);
}
</script>

<template>
  <div>
    <!-- Basic Array Iteration -->
    <section>
      <h4>Basic Array Iteration</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <ul>
        <li v-for="fruit in fruits" :key="fruit">
          {{ fruit }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Array with Index -->
    <section>
      <h4>Array with Index</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <ul>
        <li v-for="(fruit, index) in fruits" :key="index">
            {{ index + 1 }}. {{ fruit }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Object Array Iteration -->
    <section>
      <h4>Object Array Iteration</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="list-group">
        <div
          v-for="user in users"
          :key="user.id"
          class="demo-box"
          style="min-width: 150px;"
        >
          <strong>{{ user.name }}</strong>
          <p>Role: {{ user.role }}</p>
            <button @click="removeUser(user.id)">Remove</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Nested Iteration -->
    <section>
      <h4>Nested v-for</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div v-for="category in categories" :key="category.name" class="demo-box">
        <h5>{{ category.name }}</h5>
        <ul>
          <li v-for="item in category.items" :key="item">
            {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Object Properties Iteration -->
    <section>
      <h4>Object Properties Iteration</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <ul>
        <li v-for="(value, key) in person" :key="key">
            <strong>{{ key }}:</strong> {{ value }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Object with Index -->
    <section>
      <h4>Object with Index</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <ul>
        <li v-for="(value, key, index) in person" :key="key">
            {{ index }}. {{ key }}: {{ value }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Range Iteration -->
    <section>
      <h4>Range Iteration (1 to n)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
        <button v-for="n in count" :key="n">
          Button {{ n }}
        </button>
      </div>
      <div class="form-row">
        <label>Count:</label>
        <input v-model.number="count" type="range" min="1" max="10" />
          <span>{{ count }}</span>
        </div>
      </div>
    </section>

    <!-- Dynamic List -->
    <section>
      <h4>Dynamic List (Add/Remove)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
        <input
          v-model="newFruit"
          type="text"
          placeholder="New fruit name"
          @keyup.enter="addFruit"
        />
        <button @click="addFruit">Add</button>
      </div>
      <ul>
        <li v-for="(fruit, index) in fruits" :key="fruit" class="list-item-with-button">
          {{ fruit }}
            <button @click="removeFruit(index)">Remove</button>
          </li>
        </ul>
      </div>
    </section>

    <!-- v-for with v-if (using template) -->
    <section>
      <h4>v-for with Filtering (template wrapper)</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>Only showing users with role "User":</p>
        <ul>
        <template v-for="user in users" :key="user.id">
          <li v-if="user.role === 'User'">
            {{ user.name }}
            </li>
          </template>
        </ul>
      </div>
    </section>
  </div>
</template>
