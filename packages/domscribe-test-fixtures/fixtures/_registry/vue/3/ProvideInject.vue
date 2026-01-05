<script setup lang="ts">
/**
 * ProvideInject - Tests Vue's dependency injection (context equivalent)
 */
import { ref, provide, inject, computed, type InjectionKey } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Type-safe injection keys
interface Theme {
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
}

interface UserContext {
  name: string;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const ThemeKey: InjectionKey<Theme> = Symbol('theme');
const UserKey: InjectionKey<UserContext> = Symbol('user');

// Provided values
const currentTheme = ref<Theme>({
  primary: '#0891b2',
  secondary: '#06b6d4',
  mode: 'light',
});

const userName = ref('Guest');
const isLoggedIn = ref(false);

const userContext = computed<UserContext>(() => ({
  name: userName.value,
  isLoggedIn: isLoggedIn.value,
  login: () => {
    userName.value = 'Alice';
    isLoggedIn.value = true;
  },
  logout: () => {
    userName.value = 'Guest';
    isLoggedIn.value = false;
  },
}));

// Provide to descendants
provide(ThemeKey, currentTheme.value);
provide(UserKey, userContext.value);
provide('simpleValue', 'I am a simple provided string');

// Toggle theme mode
function toggleTheme() {
  currentTheme.value.mode = currentTheme.value.mode === 'light' ? 'dark' : 'light';
}

// For demo purposes - simulating inject in same component
const injectedUser = inject(UserKey);
const injectedSimple = inject('simpleValue', 'default value');
</script>

<template>
  <div>
    <!-- Reactive Provide -->
    <section>
      <h4>Theme Provider</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <p><strong>Theme Mode:</strong> {{ currentTheme.mode }}</p>
        <button @click="toggleTheme">Toggle Theme</button>
      </div>
    </section>

    <!-- Default Values -->
    <section>
      <h4>Injected Values</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p><strong>Injected simple value:</strong> {{ injectedSimple }}</p>
      </div>
    </section>

    <!-- User Context Demo -->
    <section>
      <h4>User Context Pattern</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p><strong>User:</strong> {{ injectedUser?.name }}</p>
        <p><strong>Logged In:</strong> {{ injectedUser?.isLoggedIn }}</p>
        <div class="button-group">
          <button v-if="!isLoggedIn" @click="userContext.login">Login</button>
          <button v-else @click="userContext.logout">Logout</button>
        </div>
      </div>
    </section>
  </div>
</template>
