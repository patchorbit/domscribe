/**
 * Component Capture Expectations for React 18
 *
 * Defines what props, state, and data-ds attributes we expect
 * when capturing elements on each page via the overlay picker.
 *
 * These expectations are tied to the canonical component definitions
 * in this directory and the way they are rendered in fixture App.tsx.
 */

/**
 * Expected capture result for a single element on a page.
 */
export interface ElementExpectation {
  /** CSS selector to locate the element */
  selector: string;
  /** Human-readable label for test output */
  label: string;
  /** Expected nearest React component name (null = don't assert) */
  componentName: string | null;
  /** Whether the element should have a data-ds attribute */
  expectDataDs: boolean;
  /** Expected prop keys (subset — assert these keys exist) */
  expectedPropsKeys?: string[];
  /** Expected prop values (subset — assert these key/value pairs match) */
  expectedProps?: Record<string, unknown>;
  /** Expected state keys (subset — assert these keys exist) */
  expectedStateKeys?: string[];
  /** Expected state values (subset — assert these key/value pairs match) */
  expectedState?: Record<string, unknown>;
}

/**
 * Expected capture results for all testable elements on a page.
 */
export interface PageExpectation {
  /** Navigation ID matching App.tsx component config id */
  pageId: string;
  /** Sidebar label for navigation */
  navLabel: string;
  /** Elements to capture and validate on this page */
  elements: ElementExpectation[];
}

/**
 * React Fiber exposes hook state as positional indices (hook_0, hook_1, ...),
 * NOT as named variables. The order matches the order of useState/useReducer
 * calls in the component source.
 *
 * Values in expectedState are compared against the overlay's formatted display.
 * The overlay uses ds-context-panel.formatValue():
 *   string  → "value"
 *   number  → 5
 *   boolean → false
 *   array   → Array(3)
 *   object  → {key1, key2}
 *
 * IMPORTANT: The Fiber walker finds the nearest COMPONENT ancestor of the
 * clicked element. If a file defines sub-components (e.g. ReducerExample
 * inside AdvancedHooks.tsx), the sub-component name is what gets reported.
 *
 * IMPORTANT: The overlay redacts PII (emails, etc.) so expected values
 * must use '[REDACTED]' for those fields.
 */
export const react18Expectations: PageExpectation[] = [
  // ---------------------------------------------------------------------------
  // CORE PATTERNS
  // ---------------------------------------------------------------------------

  {
    pageId: 'basic-elements',
    navLabel: 'Basic Elements',
    elements: [
      {
        selector: '.basic-elements section:nth-of-type(1) .capture-widget',
        label: 'Div element widget',
        componentName: 'BasicElements',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
      {
        selector: '.basic-elements section:nth-of-type(3) .capture-widget',
        label: 'Button element widget',
        componentName: 'BasicElements',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
      {
        selector: '.basic-elements section:nth-of-type(5) .capture-widget',
        label: 'Form element widget',
        componentName: 'BasicElements',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'self-closing',
    navLabel: 'Self-Closing',
    elements: [
      {
        selector: '.self-closing section:nth-of-type(1) .capture-widget',
        label: 'Input element widget',
        componentName: 'SelfClosing',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
      {
        selector: '.self-closing section:nth-of-type(5) .capture-widget',
        label: 'Image element widget',
        componentName: 'SelfClosing',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'fragments',
    navLabel: 'Fragments',
    elements: [
      {
        selector: '.fragments section:nth-of-type(1) .capture-widget',
        label: 'React.Fragment widget',
        componentName: 'Fragments',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'lists',
    navLabel: 'Lists',
    elements: [
      {
        selector: '.lists section:nth-of-type(1) .capture-widget',
        label: 'Simple map list widget',
        componentName: 'Lists',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'conditional',
    navLabel: 'Conditional Rendering',
    elements: [
      {
        // ConditionalRendering hooks:
        //   hook_0: showContent = true
        //   hook_1: mode = 'light'
        selector:
          '.conditional-rendering section:nth-of-type(1) .capture-widget',
        label: 'Logical AND widget',
        componentName: 'ConditionalRendering',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1'],
        expectedState: {
          hook_0: true, // showContent
          hook_1: 'light', // mode
        },
      },
      {
        selector:
          '.conditional-rendering section:nth-of-type(3) .capture-widget',
        label: 'Mode-based rendering widget',
        componentName: 'ConditionalRendering',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1'],
      },
    ],
  },

  {
    pageId: 'nested',
    navLabel: 'Deeply Nested',
    elements: [
      {
        selector: '.deeply-nested section:nth-of-type(1) .capture-widget',
        label: 'Deeply nested widget (15 levels)',
        componentName: 'DeeplyNested',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'event-handlers',
    navLabel: 'Event Handlers',
    elements: [
      {
        // EventHandlers hooks:
        //   hook_0: clicks = 0
        //   hook_1: inputValue = ''
        //   hook_2: submitted = false
        selector: '.event-handlers section:nth-of-type(1) .capture-widget',
        label: 'onClick handler widget',
        componentName: 'EventHandlers',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1', 'hook_2'],
        expectedState: {
          hook_0: 0, // clicks
          hook_1: '', // inputValue
          hook_2: false, // submitted
        },
      },
      {
        selector: '.event-handlers section:nth-of-type(3) .capture-widget',
        label: 'onSubmit handler widget',
        componentName: 'EventHandlers',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1', 'hook_2'],
      },
    ],
  },

  {
    pageId: 'member-expressions',
    navLabel: 'Member Expressions',
    elements: [
      {
        selector: '.member-expressions section:nth-of-type(1) .capture-widget',
        label: 'UI.Button widget',
        componentName: 'MemberExpressions',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'dynamic-content',
    navLabel: 'Dynamic Content',
    elements: [
      {
        // DynamicContent hooks:
        //   hook_0: count = 0
        //   hook_1: items = ['Dynamic Item 1', 'Dynamic Item 2', 'Dynamic Item 3']
        //   hook_2: loading = true (useEffect sets true before async completes)
        selector: '.dynamic-content section:nth-of-type(1) .capture-widget',
        label: 'DynamicContent counter widget',
        componentName: 'DynamicContent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1', 'hook_2'],
        expectedState: {
          hook_0: 0, // count
          hook_2: true, // loading (captured during useEffect)
        },
      },
    ],
  },

  {
    pageId: 'edge-cases',
    navLabel: 'Edge Cases',
    elements: [
      {
        selector: '.edge-cases section:nth-of-type(1) .capture-widget',
        label: 'Null/undefined returns widget',
        componentName: 'EdgeCases',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
      {
        selector: '.edge-cases section:nth-of-type(4) .capture-widget',
        label: 'Conditional nulls widget',
        componentName: 'ConditionalNull',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ADVANCED PATTERNS
  // ---------------------------------------------------------------------------

  {
    pageId: 'svg-elements',
    navLabel: 'SVG Elements',
    elements: [
      {
        // SVGElements hooks:
        //   hook_0: radius = 30
        selector: '.svg-elements section:nth-of-type(1) .capture-widget',
        label: 'Basic SVG shapes widget',
        componentName: 'SVGElements',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0'],
        expectedState: {
          hook_0: 30, // radius
        },
      },
      {
        selector: '.svg-elements section:nth-of-type(3) .capture-widget',
        label: 'Dynamic SVG widget (state-driven radius)',
        componentName: 'SVGElements',
        expectDataDs: true,
        expectedPropsKeys: [],
      },
    ],
  },

  {
    pageId: 'styling',
    navLabel: 'Styling Patterns',
    elements: [
      {
        // Styling hooks:
        //   hook_0: color = 'blue'
        //   hook_1: size = 16
        selector: '.styling section:nth-of-type(1) .capture-widget',
        label: 'Dynamic inline styles widget',
        componentName: 'Styling',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1'],
        expectedState: {
          hook_0: 'blue', // color
          hook_1: 16, // size
        },
      },
    ],
  },

  {
    pageId: 'memo',
    navLabel: 'Memo',
    elements: [
      {
        // CallbackParent is the sub-component rendered in section 1
        // CallbackParent hooks:
        //   hook_0: count = 0
        selector: '.memo section:nth-of-type(1) .capture-widget',
        label: 'React.memo with useCallback widget',
        componentName: 'CallbackParent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0'],
        expectedState: {
          hook_0: 0, // count
        },
      },
    ],
  },

  {
    pageId: 'context',
    navLabel: 'Context API',
    elements: [
      {
        selector: '.context section:nth-of-type(1) .capture-widget',
        label: 'Theme context widget',
        componentName: null, // May resolve to Context or a sub-component
        expectDataDs: true,
        expectedPropsKeys: [],
      },
    ],
  },

  {
    pageId: 'error-boundaries',
    navLabel: 'Error Boundaries',
    elements: [
      {
        // ErrorBoundary is a class component — state uses named keys, not hooks
        selector: '.error-boundaries section:nth-of-type(1) .capture-widget',
        label: 'Basic error boundary widget',
        componentName: 'ErrorBoundary',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hasError'],
        expectedState: {
          hasError: false,
        },
      },
    ],
  },

  {
    pageId: 'advanced-hooks',
    navLabel: 'Advanced Hooks',
    elements: [
      {
        // ReducerExample is a sub-component — Fiber walker finds it
        // useReducer exposes state as hook_0
        selector: '.advanced-hooks section:nth-of-type(1) .capture-widget',
        label: 'useReducer widget',
        componentName: 'ReducerExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0'],
      },
      {
        // CustomHookExample is a sub-component
        // useCounter(5) internally uses useState(5)
        selector: '.advanced-hooks section:nth-of-type(3) .capture-widget',
        label: 'Custom hook widget',
        componentName: 'CustomHookExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0'],
        expectedState: {
          hook_0: 5, // useCounter initial value
        },
      },
    ],
  },

  {
    pageId: 'ref-patterns',
    navLabel: 'Ref Patterns',
    elements: [
      {
        // UseRefExample is a sub-component
        // Hooks: hook_0=useRef (inputRef), hook_1=useRef (divRef), hook_2=useState('')
        // useRef shows as {current} in the overlay
        selector: '.ref-patterns section:nth-of-type(1) .capture-widget',
        label: 'useRef widget',
        componentName: 'UseRefExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_2'],
        expectedState: {
          hook_2: '', // input value (useState)
        },
      },
      {
        // CallbackRefExample is a sub-component
        // Hooks: useState(0)
        selector: '.ref-patterns section:nth-of-type(2) .capture-widget',
        label: 'Callback ref widget',
        componentName: 'CallbackRefExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0'],
        expectedState: {
          hook_0: 0, // count
        },
      },
    ],
  },

  {
    pageId: 'compound-components',
    navLabel: 'Compound Components',
    elements: [
      {
        selector: '.compound-components section:nth-of-type(1) .capture-widget',
        label: 'Tabs compound component widget',
        componentName: null, // Could resolve to Tabs or CompoundComponents
        expectDataDs: true,
        expectedPropsKeys: [],
      },
      {
        selector: '.compound-components section:nth-of-type(2) .capture-widget',
        label: 'Card compound component widget',
        componentName: null, // Could resolve to Card or CompoundComponents
        expectDataDs: true,
        expectedPropsKeys: [],
      },
    ],
  },

  {
    pageId: 'portals',
    navLabel: 'Portals',
    elements: [
      {
        // Portals hooks:
        //   hook_0: isModalOpen = false
        //   hook_1: isDirectPortalOpen = false
        selector: '.portals section:nth-of-type(1) .capture-widget',
        label: 'Modal portal widget',
        componentName: 'Portals',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['hook_0', 'hook_1'],
        expectedState: {
          hook_0: false, // isModalOpen
          hook_1: false, // isDirectPortalOpen
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SMOKE TEST & CAPTURE
  // ---------------------------------------------------------------------------

  {
    pageId: 'smoke-test',
    navLabel: 'Smoke Test',
    elements: [
      {
        // SmokeTest hooks:
        //   hook_0: counterLabel = 'Items'
        //   hook_1: counterStep = 5
        //   hook_2: counterCount = 10
        //   hook_3: userName = 'Alice'
        //   hook_4: userEmail = 'alice@example.com' (redacted)
        //   hook_5: userRole = 'admin'
        //   hook_6: isExpanded = false
        //   hook_7: notes = ''
        selector: '.capture-widget[data-testid="counter"]',
        label: 'SmokeTest counter widget (Fiber strategy)',
        componentName: 'SmokeTest',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'hook_0',
          'hook_1',
          'hook_2',
          'hook_3',
          'hook_4',
          'hook_5',
          'hook_6',
          'hook_7',
        ],
        expectedState: {
          hook_0: 'Items', // counterLabel
          hook_1: 5, // counterStep
          hook_2: 10, // counterCount
          hook_3: 'Alice', // userName
          hook_4: '[REDACTED]', // userEmail (PII redacted by overlay)
          hook_5: 'admin', // userRole
          hook_6: false, // isExpanded
          hook_7: '', // notes
        },
      },
      {
        selector: '.capture-widget[data-testid="user-card"]',
        label: 'SmokeTest user card widget (Fiber strategy)',
        componentName: 'SmokeTest',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'hook_0',
          'hook_1',
          'hook_2',
          'hook_3',
          'hook_4',
          'hook_5',
          'hook_6',
          'hook_7',
        ],
        expectedState: {
          hook_3: 'Alice', // userName
          hook_4: '[REDACTED]', // userEmail (PII redacted by overlay)
          hook_5: 'admin', // userRole
          hook_6: false, // isExpanded
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
  return react18Expectations.find((p) => p.pageId === pageId);
}

/**
 * Get all page IDs that have expectations.
 */
export function getExpectationPageIds(): string[] {
  return react18Expectations.map((p) => p.pageId);
}
