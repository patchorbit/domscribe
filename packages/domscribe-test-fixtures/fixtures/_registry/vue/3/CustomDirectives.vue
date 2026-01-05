<script setup lang="ts">
/**
 * CustomDirectives - Tests custom directive patterns
 */
import { ref, type Directive, type DirectiveBinding } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

// ============================================
// Directive 1: v-focus
// ============================================
const vFocus: Directive = {
  mounted(el: HTMLElement) {
    el.focus();
  },
};

// ============================================
// Directive 2: v-click-outside
// ============================================
interface ClickOutsideElement extends HTMLElement {
  __clickOutside?: (event: MouseEvent) => void;
}

const vClickOutside: Directive = {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding) {
    el.__clickOutside = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.__clickOutside);
  },
  unmounted(el: ClickOutsideElement) {
    if (el.__clickOutside) {
      document.removeEventListener('click', el.__clickOutside);
    }
  },
};

// ============================================
// Directive 3: v-tooltip
// ============================================
interface TooltipElement extends HTMLElement {
  __tooltip?: HTMLDivElement;
}

const vTooltip: Directive = {
  mounted(el: TooltipElement, binding: DirectiveBinding) {
    const tooltip = document.createElement('div');
    tooltip.textContent = binding.value;
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    `;
    el.__tooltip = tooltip;
    el.style.position = 'relative';
    el.appendChild(tooltip);

    el.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1';
      tooltip.style.top = '-30px';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
    });

    el.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  },
  updated(el: TooltipElement, binding: DirectiveBinding) {
    if (el.__tooltip) {
      el.__tooltip.textContent = binding.value;
    }
  },
  unmounted(el: TooltipElement) {
    if (el.__tooltip) {
      el.removeChild(el.__tooltip);
    }
  },
};

// ============================================
// Directive 4: v-highlight
// ============================================
const vHighlight: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    el.style.backgroundColor = binding.value || '#ffeb3b';
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    el.style.backgroundColor = binding.value || '#ffeb3b';
  },
};

// ============================================
// Component state
// ============================================
const showDropdown = ref(false);
const highlightColor = ref('#e0f7fa');
const tooltipText = ref('Hover for tooltip!');
const focusDemoKey = ref(0);

function closeDropdown() {
  showDropdown.value = false;
}

function refocusInput() {
  focusDemoKey.value++;
}
</script>

<template>
  <div>
    <!-- v-focus Demo -->
    <section>
      <h4>v-focus Directive</h4>
      <div class="demo-box demo-box-blue capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>This input auto-focuses:</label>
          <input :key="focusDemoKey" v-focus type="text" placeholder="I'm focused!" />
        </div>
        <button @click="refocusInput">Re-mount Input</button>
      </div>
    </section>

    <!-- v-click-outside Demo -->
    <section>
      <h4>v-click-outside Directive</h4>
      <div class="demo-box demo-box-green capture-widget">
        <CaptureIcon />
        <div style="position: relative;">
          <button @click="showDropdown = !showDropdown">
            {{ showDropdown ? 'Close' : 'Open' }} Dropdown
          </button>
          <div
            v-if="showDropdown"
            v-click-outside="closeDropdown"
            class="demo-box"
            style="
              position: absolute;
              top: 100%;
              left: 0;
              min-width: 200px;
              margin-top: 0.5rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              z-index: 10;
            "
          >
            <p>Click outside to close me!</p>
            <ul>
              <li>Option 1</li>
              <li>Option 2</li>
              <li>Option 3</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- v-tooltip Demo -->
    <section>
      <h4>v-tooltip Directive</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Tooltip text:</label>
          <input v-model="tooltipText" type="text" />
        </div>
        <div style="margin-top: 1rem;">
          <button v-tooltip="tooltipText" style="position: relative;">
            Hover over me
          </button>
        </div>
      </div>
    </section>

    <!-- v-highlight Demo -->
    <section>
      <h4>v-highlight Directive</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
          <label>Highlight color:</label>
          <input v-model="highlightColor" type="color" />
        </div>
        <p v-highlight="highlightColor" style="padding: 1rem; margin-top: 1rem;">
          This paragraph has a dynamic highlight color!
        </p>
      </div>
    </section>
  </div>
</template>
