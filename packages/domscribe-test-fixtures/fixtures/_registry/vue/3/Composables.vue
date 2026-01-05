<script setup lang="ts">
/**
 * Composables - Tests Vue's custom hooks equivalent
 */
import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// useMouse composable
function useMouse() {
  const x = ref(0);
  const y = ref(0);

  function update(event: MouseEvent) {
    x.value = event.pageX;
    y.value = event.pageY;
  }

  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));

  return { x, y };
}

// useCounter composable
function useCounter(initial = 0, step = 1) {
  const count = ref(initial);

  function increment() {
    count.value += step;
  }

  function decrement() {
    count.value -= step;
  }

  function reset() {
    count.value = initial;
  }

  const doubled = computed(() => count.value * 2);

  return { count, doubled, increment, decrement, reset };
}

// useLocalStorage composable
function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const stored = localStorage.getItem(key);
  const value = ref<T>(stored ? JSON.parse(stored) : defaultValue) as Ref<T>;

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    { deep: true }
  );

  return value;
}

// useDebounce composable
function useDebounce<T>(value: Ref<T>, delay: number): Ref<T> {
  const debouncedValue = ref(value.value) as Ref<T>;
  let timeout: ReturnType<typeof setTimeout>;

  watch(value, (newValue) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      debouncedValue.value = newValue;
    }, delay);
  });

  return debouncedValue;
}

// Use the composables
const { x: mouseX, y: mouseY } = useMouse();
const { count, doubled, increment, decrement, reset } = useCounter(0, 1);
const persistedName = useLocalStorage('demo-name', 'Guest');

// Debounce demo
const searchQuery = ref('');
const debouncedQuery = useDebounce(searchQuery, 500);
</script>

<template>
  <div>
    <!-- useMouse Demo -->
    <section>
      <h4>useMouse()</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <p>
          Mouse position: (<strong>{{ mouseX }}</strong>, <strong>{{ mouseY }}</strong>)
        </p>
      </div>
    </section>

    <!-- useCounter Demo -->
    <section>
      <h4>useCounter()</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <p><strong>Count:</strong> {{ count }}</p>
        <p><strong>Doubled:</strong> {{ doubled }}</p>
        <div class="button-group">
          <button @click="decrement">-</button>
          <button @click="increment">+</button>
          <button @click="reset">Reset</button>
        </div>
      </div>
    </section>

    <!-- useLocalStorage Demo -->
    <section>
      <h4>useLocalStorage()</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Your Name (persisted):</label>
          <input v-model="persistedName" type="text" />
        </div>
        <p><strong>Value:</strong> {{ persistedName }}</p>
      </div>
    </section>

    <!-- useDebounce Demo -->
    <section>
      <h4>useDebounce()</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Search (debounced 500ms):</label>
          <input v-model="searchQuery" type="text" placeholder="Type something..." />
        </div>
        <p><strong>Immediate:</strong> {{ searchQuery }}</p>
        <p><strong>Debounced:</strong> {{ debouncedQuery }}</p>
      </div>
    </section>
  </div>
</template>
