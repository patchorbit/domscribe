<script setup lang="ts">
/**
 * TypeScriptFeatures - Tests TypeScript patterns like generics and typed defineProps
 */
import { ref, computed } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Generic type usage
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

// Typed refs
const currentUser = ref<User | null>(null);
const products = ref<Product[]>([
  { id: 1, name: 'Widget', price: 9.99, inStock: true },
  { id: 2, name: 'Gadget', price: 19.99, inStock: true },
  { id: 3, name: 'Gizmo', price: 29.99, inStock: false },
]);

// Generic function
function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

// Discriminated union
type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

const apiState = ref<ApiResponse<User[]>>({ status: 'loading' });

// Computed with type inference
const inStockProducts = computed(() =>
  products.value.filter((p) => p.inStock)
);

const totalValue = computed(() =>
  products.value.reduce((sum, p) => sum + p.price, 0)
);

// Optional chaining demo
const userName = computed(() => currentUser.value?.name ?? 'Guest');
const userRole = computed(() => currentUser.value?.role ?? 'guest');

// Type assertion example
function handleProduct(id: number) {
  const product = findById(products.value, id);
  if (product) {
    console.log(`Found: ${product.name} at $${product.price}`);
  }
}

// Simulate login
function login() {
  currentUser.value = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
  };
}

function logout() {
  currentUser.value = null;
}

// Simulate API states
function simulateLoading() {
  apiState.value = { status: 'loading' };
}

function simulateSuccess() {
  apiState.value = {
    status: 'success',
    data: [
      { id: 1, name: 'User 1', email: 'user1@test.com', role: 'admin' },
      { id: 2, name: 'User 2', email: 'user2@test.com', role: 'user' },
    ],
  };
}

function simulateError() {
  apiState.value = { status: 'error', message: 'Failed to fetch users' };
}
</script>

<template>
  <div>
    <!-- Typed Refs -->
    <section>
      <h4>Typed Refs</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>Current User:</strong></p>
        <div v-if="currentUser">
          <p>Name: {{ currentUser.name }}</p>
          <p>Email: {{ currentUser.email }}</p>
          <p>Role: {{ currentUser.role }}</p>
          <button @click="logout">Logout</button>
        </div>
        <div v-else>
          <p>Not logged in</p>
          <button @click="login">Login as Alice</button>
        </div>
      </div>
    </section>

    <!-- Optional Chaining -->
    <section>
      <h4>Optional Chaining (?.) and Nullish Coalescing (??)</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p>userName: <strong>{{ userName }}</strong></p>
        <p>userRole: <strong>{{ userRole }}</strong></p>
      </div>
    </section>

    <!-- Generic Function -->
    <section>
      <h4>Generic Functions</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
          <button @click="handleProduct(1)">Find Product 1</button>
          <button @click="handleProduct(2)">Find Product 2</button>
          <button @click="handleProduct(99)">Find Product 99</button>
        </div>
        <p style="color: var(--color-text-tertiary);">Check console for output</p>
      </div>
    </section>

    <!-- Discriminated Union -->
    <section>
      <h4>Discriminated Union Types</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group">
        <button @click="simulateLoading">Set Loading</button>
        <button @click="simulateSuccess">Set Success</button>
        <button @click="simulateError">Set Error</button>
      </div>
      <div class="demo-box" style="margin-top: 1rem;">
        <div v-if="apiState.status === 'loading'" class="loading-fallback">
          Loading...
        </div>
        <div v-else-if="apiState.status === 'success'" class="demo-box-green">
          <p><strong>Success!</strong> Loaded {{ apiState.data.length }} users:</p>
          <ul>
            <li v-for="user in apiState.data" :key="user.id">
              {{ user.name }} ({{ user.role }})
            </li>
          </ul>
        </div>
        <div v-else-if="apiState.status === 'error'" class="demo-box-red">
          <p><strong>Error:</strong> {{ apiState.message }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Typed Computed -->
    <section>
      <h4>Typed Computed Properties</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <h5>Products</h5>
        <ul>
          <li v-for="product in products" :key="product.id">
            {{ product.name }} - ${{ product.price.toFixed(2) }}
            <span v-if="!product.inStock" style="color: var(--color-error);">(Out of stock)</span>
          </li>
        </ul>
        <hr style="margin: 1rem 0;" />
        <p><strong>In Stock:</strong> {{ inStockProducts.length }} products</p>
        <p><strong>Total Value:</strong> ${{ totalValue.toFixed(2) }}</p>
      </div>
    </section>
  </div>
</template>
