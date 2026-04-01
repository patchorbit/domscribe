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
 * React hooks are classified by type and given semantic names:
 *   state_0, state_1 ... for useState/useReducer
 *   ref_0, ref_1 ...     for useRef
 *   memo_0, memo_1 ...   for useMemo/useCallback
 * Effect hooks (useEffect/useLayoutEffect) are excluded from captured state.
 * Indices are per-type, matching declaration order within each type.
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
        //   state_0: showContent = true
        //   state_1: mode = 'light'
        selector:
          '.conditional-rendering section:nth-of-type(1) .capture-widget',
        label: 'Logical AND widget',
        componentName: 'ConditionalRendering',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1'],
        expectedState: {
          state_0: true, // showContent
          state_1: 'light', // mode
        },
      },
      {
        selector:
          '.conditional-rendering section:nth-of-type(3) .capture-widget',
        label: 'Mode-based rendering widget',
        componentName: 'ConditionalRendering',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1'],
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
        //   state_0: clicks = 0
        //   state_1: inputValue = ''
        //   state_2: submitted = false
        selector: '.event-handlers section:nth-of-type(1) .capture-widget',
        label: 'onClick handler widget',
        componentName: 'EventHandlers',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1', 'state_2'],
        expectedState: {
          state_0: 0, // clicks
          state_1: '', // inputValue
          state_2: false, // submitted
        },
      },
      {
        selector: '.event-handlers section:nth-of-type(3) .capture-widget',
        label: 'onSubmit handler widget',
        componentName: 'EventHandlers',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1', 'state_2'],
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
        //   state_0: count = 0
        //   state_1: items = ['Dynamic Item 1', 'Dynamic Item 2', 'Dynamic Item 3']
        //   state_2: loading = true (useEffect sets true before async completes)
        selector: '.dynamic-content section:nth-of-type(1) .capture-widget',
        label: 'DynamicContent counter widget',
        componentName: 'DynamicContent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1', 'state_2'],
        expectedState: {
          state_0: 0, // count
          state_2: true, // loading (captured during useEffect)
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
        //   state_0: radius = 30
        selector: '.svg-elements section:nth-of-type(1) .capture-widget',
        label: 'Basic SVG shapes widget',
        componentName: 'SVGElements',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
        expectedState: {
          state_0: 30, // radius
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
        //   state_0: color = 'blue'
        //   state_1: size = 16
        selector: '.styling section:nth-of-type(1) .capture-widget',
        label: 'Dynamic inline styles widget',
        componentName: 'Styling',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1'],
        expectedState: {
          state_0: 'blue', // color
          state_1: 16, // size
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
        //   state_0: count = 0
        selector: '.memo section:nth-of-type(1) .capture-widget',
        label: 'React.memo with useCallback widget',
        componentName: 'CallbackParent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
        expectedState: {
          state_0: 0, // count
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
        // useReducer exposes state as state_0
        selector: '.advanced-hooks section:nth-of-type(1) .capture-widget',
        label: 'useReducer widget',
        componentName: 'ReducerExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
      },
      {
        // CustomHookExample is a sub-component
        // useCounter(5) internally uses useState(5)
        selector: '.advanced-hooks section:nth-of-type(3) .capture-widget',
        label: 'Custom hook widget',
        componentName: 'CustomHookExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
        expectedState: {
          state_0: 5, // useCounter initial value
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
        // Hooks: ref_0=useRef (inputRef), ref_1=useRef (divRef), state_0=useState('')
        // useRef shows as {current} in the overlay
        selector: '.ref-patterns section:nth-of-type(1) .capture-widget',
        label: 'useRef widget',
        componentName: 'UseRefExample',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['ref_0', 'state_0'],
        expectedState: {
          state_0: '', // input value (useState)
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
        expectedStateKeys: ['state_0'],
        expectedState: {
          state_0: 0, // count
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
        //   state_0: isModalOpen = false
        //   state_1: isDirectPortalOpen = false
        selector: '.portals section:nth-of-type(1) .capture-widget',
        label: 'Modal portal widget',
        componentName: 'Portals',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1'],
        expectedState: {
          state_0: false, // isModalOpen
          state_1: false, // isDirectPortalOpen
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
        //   state_0: counterLabel = 'Items'
        //   state_1: counterStep = 5
        //   state_2: counterCount = 10
        //   state_3: userName = 'Alice'
        //   state_4: userEmail = 'alice@example.com' (redacted)
        //   state_5: userRole = 'admin'
        //   state_6: isExpanded = false
        //   state_7: notes = ''
        selector: '.capture-widget[data-testid="counter"]',
        label: 'SmokeTest counter widget (Fiber strategy)',
        componentName: 'SmokeTest',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'state_0',
          'state_1',
          'state_2',
          'state_3',
          'state_4',
          'state_5',
          'state_6',
          'state_7',
        ],
        expectedState: {
          state_0: 'Items', // counterLabel
          state_1: 5, // counterStep
          state_2: 10, // counterCount
          state_3: 'Alice', // userName
          state_4: '[REDACTED]', // userEmail (PII redacted by overlay)
          state_5: 'admin', // userRole
          state_6: false, // isExpanded
          state_7: '', // notes
        },
      },
      {
        selector: '.capture-widget[data-testid="user-card"]',
        label: 'SmokeTest user card widget (Fiber strategy)',
        componentName: 'SmokeTest',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [
          'state_0',
          'state_1',
          'state_2',
          'state_3',
          'state_4',
          'state_5',
          'state_6',
          'state_7',
        ],
        expectedState: {
          state_3: 'Alice', // userName
          state_4: '[REDACTED]', // userEmail (PII redacted by overlay)
          state_5: 'admin', // userRole
          state_6: false, // isExpanded
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
