<script setup lang="ts">
/**
 * DynamicComponents - Tests <component :is="..."> patterns
 */
import { ref, shallowRef, type Component } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// Simple inline components for demo
const ComponentA: Component = {
  template: '<div class="demo-box demo-box-blue"><strong>Component A</strong><p>I am the blue component!</p></div>',
};

const ComponentB: Component = {
  template: '<div class="demo-box demo-box-green"><strong>Component B</strong><p>I am the green component!</p></div>',
};

const ComponentC: Component = {
  template: '<div class="demo-box demo-box-amber"><strong>Component C</strong><p>I am the amber component!</p></div>',
};

// Component registry
const componentRegistry: Record<string, Component> = {
  A: ComponentA,
  B: ComponentB,
  C: ComponentC,
};

// State
const currentComponent = shallowRef<Component>(ComponentA);
const currentKey = ref('A');

// Tab-based switching
const tabs = [
  { key: 'A', label: 'Component A', component: ComponentA },
  { key: 'B', label: 'Component B', component: ComponentB },
  { key: 'C', label: 'Component C', component: ComponentC },
];

function switchTo(key: string) {
  currentKey.value = key;
  const comp = componentRegistry[key];
  if (comp) {
    currentComponent.value = comp;
  }
}

// HTML element switching
const currentElement = ref<'button' | 'a' | 'span'>('button');
const elements = ['button', 'a', 'span'] as const;
</script>

<template>
  <div>
    <!-- Basic Dynamic Component -->
    <section>
      <h4>Dynamic Component Switching</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group" style="margin-bottom: 1rem;">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="{ 'btn-primary': currentKey === tab.key }"
            @click="switchTo(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <component :is="currentComponent" />
      </div>
    </section>

    <!-- Dynamic HTML Elements -->
    <section>
      <h4>Dynamic HTML Elements</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="button-group" style="margin-bottom: 1rem;">
          <button
            v-for="el in elements"
            :key="el"
            :class="{ 'btn-primary': currentElement === el }"
            @click="currentElement = el"
          >
            {{ el }}
          </button>
        </div>
        <component
          :is="currentElement"
          :href="currentElement === 'a' ? '#' : undefined"
          style="padding: 0.5rem 1rem; border: 1px solid currentColor;"
        >
          I am a {{ currentElement }}!
        </component>
      </div>
    </section>
  </div>
</template>
