/**
 * Component Capture Expectations for Vue 3
 *
 * Defines what props, state, and data-ds attributes we expect
 * when capturing elements on each page via the overlay picker.
 *
 * These expectations are tied to the canonical component definitions
 * in this directory and the way they are rendered in fixture App.vue.
 *
 * KEY DIFFERENCE FROM REACT: Vue exposes state with named keys
 * (the actual variable names from ref() / reactive() calls),
 * not positional indices like React's Fiber hooks.
 *
 * The Vue state extractor reads from setupState (Composition API)
 * or data (Options API), skipping functions and Vue internals.
 * Refs are automatically unwrapped to their inner values.
 *
 * IMPORTANT: Vue components in this fixture have bare <div> roots
 * (no class name), so selectors use .component-section as the
 * ancestor, which is the wrapper in App.vue.
 *
 * IMPORTANT: The overlay redacts PII (emails, etc.) so expected values
 * must use '[REDACTED]' for those fields.
 */

import type {
  ElementExpectation,
  PageExpectation,
} from '../../react/18/expectations.js';

// Re-export types for convenience
export type { ElementExpectation, PageExpectation };

export const vue3Expectations: PageExpectation[] = [
  // ---------------------------------------------------------------------------
  // CORE PATTERNS
  // ---------------------------------------------------------------------------

  {
    pageId: 'basic-elements',
    navLabel: 'Basic Elements',
    elements: [
      {
        // BasicElements has refs: inputValue='', checkboxValue=false, isSubmitting=false
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Div element widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['inputValue', 'checkboxValue', 'isSubmitting'],
        expectedState: {
          inputValue: '',
          checkboxValue: false,
          isSubmitting: false,
        },
      },
      {
        selector: '.component-section section:nth-of-type(3) .capture-widget',
        label: 'Button element widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['inputValue', 'checkboxValue', 'isSubmitting'],
      },
      {
        selector: '.component-section section:nth-of-type(5) .capture-widget',
        label: 'Form element widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['inputValue', 'checkboxValue', 'isSubmitting'],
      },
    ],
  },

  {
    pageId: 'self-closing',
    navLabel: 'Self-Closing Elements',
    elements: [
      {
        // SelfClosing has no refs — stateless
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Input element widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'template-refs',
    navLabel: 'Template Refs',
    elements: [
      {
        // TemplateRefs refs: inputRef, divRef, buttonRef (DOM refs),
        // inputValue='', divDimensions={width:0,height:0}, isFocused=false
        // Note: DOM refs (HTMLElement) are skipped by state extractor
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Input ref widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['inputValue', 'isFocused'],
        expectedState: {
          inputValue: '',
          isFocused: false,
        },
      },
    ],
  },

  {
    pageId: 'v-for',
    navLabel: 'v-for Lists',
    elements: [
      {
        // VFor refs: fruits, users, categories, person, count=5, newFruit=''
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Simple array v-for widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['count', 'newFruit'],
        expectedState: {
          count: 5,
          newFruit: '',
        },
      },
    ],
  },

  {
    pageId: 'conditional',
    navLabel: 'Conditional Rendering',
    elements: [
      {
        // ConditionalRendering refs: isVisible=true, showDetails=false,
        // status='idle', score=75, isAuthenticated=false, isAdmin=false
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'v-if toggle widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'isVisible',
          'showDetails',
          'status',
          'score',
          'isAuthenticated',
          'isAdmin',
        ],
        expectedState: {
          isVisible: true,
          showDetails: false,
          status: 'idle',
          score: 75,
          isAuthenticated: false,
          isAdmin: false,
        },
      },
      {
        selector: '.component-section section:nth-of-type(4) .capture-widget',
        label: 'Grade display widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['score'],
      },
    ],
  },

  {
    pageId: 'nested',
    navLabel: 'Deeply Nested',
    elements: [
      {
        // DeeplyNested refs: depth=15
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Deeply nested widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['depth'],
        expectedState: {
          depth: 15,
        },
      },
    ],
  },

  {
    pageId: 'event-handlers',
    navLabel: 'Event Handlers',
    elements: [
      {
        // EventHandlers refs: clickCount=0, lastClickInfo='', inputValue='',
        // inputEvents=[], formData={email:'',message:''}, formSubmitted=false,
        // mousePosition={x:0,y:0}, isHovering=false, lastKey='',
        // keyHistory=[], isFocused=false
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: '@click handler widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['clickCount', 'lastClickInfo', 'formSubmitted'],
        expectedState: {
          clickCount: 0,
          lastClickInfo: '',
          formSubmitted: false,
        },
      },
      {
        selector: '.component-section section:nth-of-type(3) .capture-widget',
        label: '@submit handler widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['formSubmitted'],
      },
    ],
  },

  {
    pageId: 'two-way-binding',
    navLabel: 'Two-Way Binding',
    elements: [
      {
        // TwoWayBinding refs: textValue='', numberValue=0, rangeValue=50,
        // singleCheckbox=false, and many more
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Text v-model widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['textValue', 'numberValue', 'rangeValue'],
        expectedState: {
          textValue: '',
          numberValue: 0,
          rangeValue: 50,
        },
      },
    ],
  },

  {
    pageId: 'dynamic-content',
    navLabel: 'Dynamic Content',
    elements: [
      {
        // DynamicContent refs: count=0, message='Hello, Vue!',
        // items=['Item 1','Item 2','Item 3'], newItem='', countHistory=[0]
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'Counter widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['count', 'message', 'newItem'],
        expectedState: {
          count: 0,
          message: 'Hello, Vue!',
          newItem: '',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VUE-SPECIFIC PATTERNS
  // ---------------------------------------------------------------------------

  {
    pageId: 'reactivity-system',
    navLabel: 'Reactivity System',
    elements: [
      {
        // ReactivitySystem refs: count=0, shallowState={...}
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'ref() reactivity widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['count'],
        expectedState: {
          count: 0,
        },
      },
    ],
  },

  {
    pageId: 'watchers',
    navLabel: 'Watchers',
    elements: [
      {
        // Watchers refs: count=0, message='Hello', watchLogs=[], effectLogs=[]
        selector: '.component-section section:nth-of-type(1) .capture-widget',
        label: 'watch() widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['count', 'message'],
        expectedState: {
          count: 0,
          message: 'Hello',
        },
      },
    ],
  },

  {
    pageId: 'composables',
    navLabel: 'Composables',
    elements: [
      {
        // Composables uses custom composables — state from useMouse, useCounter, etc.
        // searchQuery='' is a direct ref in the component
        selector: '.component-section section:nth-of-type(2) .capture-widget',
        label: 'useCounter composable widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['searchQuery'],
        expectedState: {
          searchQuery: '',
        },
      },
    ],
  },

  // Teleport page skipped — teleported content renders outside the component
  // tree, so the capture widget resolves to App.vue instead of Teleport.vue.

  // ---------------------------------------------------------------------------
  // SMOKE TEST & CAPTURE
  // ---------------------------------------------------------------------------

  {
    pageId: 'smoke-test',
    navLabel: 'Smoke Test',
    elements: [
      {
        // SmokeTest refs:
        //   counterLabel = 'Items'
        //   counterStep = 5
        //   counterCount = 10
        //   userName = 'Alice'
        //   userEmail = 'alice@example.com' (redacted)
        //   userRole = 'admin'
        //   isExpanded = false
        //   notes = ''
        selector: '.capture-widget[data-testid="counter"]',
        label: 'SmokeTest counter widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'counterLabel',
          'counterStep',
          'counterCount',
          'userName',
          'userEmail',
          'userRole',
          'isExpanded',
          'notes',
        ],
        expectedState: {
          counterLabel: 'Items',
          counterStep: 5,
          counterCount: 10,
          userName: 'Alice',
          userEmail: '[REDACTED]', // PII redacted by overlay
          userRole: 'admin',
          isExpanded: false,
          notes: '',
        },
      },
      {
        selector: '.capture-widget[data-testid="user-card"]',
        label: 'SmokeTest user card widget',
        componentName: null, // TODO: investigate Vue __name resolution
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['userName', 'userEmail', 'userRole', 'isExpanded'],
        expectedState: {
          userName: 'Alice',
          userEmail: '[REDACTED]', // PII redacted by overlay
          userRole: 'admin',
          isExpanded: false,
        },
      },
    ],
  },
];

/**
 * Get expectations for a specific page.
 */
export function getPageExpectation(
  pageId: string,
): PageExpectation | undefined {
  return vue3Expectations.find((p) => p.pageId === pageId);
}

/**
 * Get all page IDs that have expectations.
 */
export function getExpectationPageIds(): string[] {
  return vue3Expectations.map((p) => p.pageId);
}
