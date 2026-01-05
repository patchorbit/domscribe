<script setup lang="ts">
/**
 * RenderFunctions - Tests h() function and render function patterns
 */
import { h, ref, computed, type VNode } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// State
const level = ref<1 | 2 | 3 | 4 | 5 | 6>(2);
const headingText = ref('Dynamic Heading');
const buttonVariant = ref<'primary' | 'secondary' | 'danger'>('primary');
const items = ref(['Apple', 'Banana', 'Cherry']);

// Render function component using h()
const DynamicHeading = {
  props: {
    level: {
      type: Number,
      required: true,
      validator: (v: number) => v >= 1 && v <= 6,
    },
  },
  setup(props: { level: number }, { slots }: { slots: { default?: () => VNode[] } }) {
    return () => h(`h${props.level}`, slots.default?.());
  },
};

// Button with variants
const RenderButton = {
  props: {
    variant: {
      type: String,
      default: 'primary',
    },
  },
  emits: ['click'],
  setup(
    props: { variant: string },
    { slots, emit }: { slots: { default?: () => VNode[] }; emit: (event: 'click') => void }
  ) {
    const variantClasses: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
    };

    return () =>
      h(
        'button',
        {
          class: ['btn', variantClasses[props.variant]],
          onClick: () => emit('click'),
        },
        slots.default?.()
      );
  },
};

// Computed render function
const listVNode = computed(() =>
  h(
    'ul',
    { class: 'render-list' },
    items.value.map((item, index) =>
      h('li', { key: index }, item)
    )
  )
);
</script>

<template>
  <div>
    <!-- Dynamic Heading Demo -->
    <section>
      <h4>Dynamic Heading Level</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <div class="form-row">
          <label>Level:</label>
          <select v-model="level">
            <option v-for="l in [1, 2, 3, 4, 5, 6]" :key="l" :value="l">
              h{{ l }}
            </option>
          </select>
          <input v-model="headingText" type="text" style="flex: 1;" />
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--color-bg-surface); border-radius: 4px;">
          <DynamicHeading :level="level">{{ headingText }}</DynamicHeading>
        </div>
      </div>
    </section>

    <!-- Button Variants Demo -->
    <section>
      <h4>Button with Variants</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="button-group" style="margin-bottom: 1rem;">
          <button
            v-for="v in ['primary', 'secondary', 'danger']"
            :key="v"
            :class="{ 'btn-primary': buttonVariant === v }"
            @click="buttonVariant = v as 'primary' | 'secondary' | 'danger'"
          >
            {{ v }}
          </button>
        </div>
        <RenderButton :variant="buttonVariant" @click="() => console.log(`Clicked ${buttonVariant}!`)">
          {{ buttonVariant }} Button
        </RenderButton>
      </div>
    </section>

    <!-- Computed VNodes -->
    <section>
      <h4>Computed VNodes</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <component :is="() => listVNode" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-accent-primary);
  color: white;
}

.btn-secondary {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.render-list {
  padding-left: 1.5rem;
  margin: 0;
}

.render-list li {
  padding: 0.25rem 0;
}
</style>
