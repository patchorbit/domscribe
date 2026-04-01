/**
 * Component Capture Expectations for Next.js 15
 *
 * Next.js fixtures inherit all React 18 components (rendered as client
 * components via `'use client'` on the page) plus Next-specific patterns.
 *
 * The inherited React expectations work as-is — the fuzzy page-id matcher
 * in the e2e helpers handles ID differences between React and Next fixtures
 * (e.g. "conditional" → "conditional-rendering").
 *
 * Next-specific expectations cover the 8 framework-specific components.
 * These use React's classified hook state (state_0, ref_0, memo_0, ...)
 * just like the inherited React components.
 *
 * IMPORTANT: ServerComponent, LayoutPattern, ImageOptimization, and Metadata
 * are stateless — they have no hooks and render static content. In a real
 * Next.js app ServerComponent would be an RSC with no client Fiber, but in
 * the fixture it renders as a regular component (the fixture page is 'use client').
 */

import type { PageExpectation } from '../../react/18/expectations.js';
import { react18Expectations } from '../../react/18/expectations.js';

// Re-export shared types
export type {
  ElementExpectation,
  PageExpectation,
} from '../../react/18/expectations.js';

/**
 * Next.js 15-specific component expectations.
 *
 * These cover only the framework-specific components; inherited React
 * component expectations come from react18Expectations.
 */
const next15SpecificExpectations: PageExpectation[] = [
  {
    pageId: 'client-component',
    navLabel: 'Client Component',
    elements: [
      {
        // ClientComponent hooks:
        //   state_0: count = 0
        //   state_1: mounted = false (set to true in useEffect)
        selector: '.component-section .capture-widget',
        label: 'Client component counter widget',
        componentName: 'ClientComponent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0', 'state_1'],
        expectedState: {
          state_0: 0, // count
        },
      },
    ],
  },

  {
    pageId: 'server-component',
    navLabel: 'Server Component',
    elements: [
      {
        // ServerComponent is stateless — no hooks, static user list.
        // In the fixture it renders as a regular client component.
        selector: '.component-section .capture-widget',
        label: 'Server component widget',
        componentName: 'ServerComponent',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'layout-pattern',
    navLabel: 'Layout Pattern',
    elements: [
      {
        // LayoutPattern is stateless — static layout structure.
        selector: '.component-section .capture-widget',
        label: 'Layout pattern widget',
        componentName: 'LayoutPattern',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'server-actions',
    navLabel: 'Server Actions',
    elements: [
      {
        // ServerActions hooks:
        //   state_0: { message: '', status: 'idle' } (useState<FormState>)
        selector: '.component-section .capture-widget',
        label: 'Server actions form widget',
        componentName: 'ServerActions',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
      },
    ],
  },

  {
    pageId: 'dynamic-routes',
    navLabel: 'Dynamic Routes',
    elements: [
      {
        // DynamicRoutes hooks:
        //   state_0: activeRoute = routes[0] (useState<Route>)
        selector: '.component-section .capture-widget',
        label: 'Dynamic routes widget',
        componentName: 'DynamicRoutes',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['state_0'],
      },
    ],
  },

  {
    pageId: 'streaming',
    navLabel: 'Streaming & Suspense',
    elements: [
      {
        // Streaming parent is stateless — the SlowContent children have state,
        // but the capture-widget is on the parent container.
        selector: '.component-section .capture-widget',
        label: 'Streaming suspense widget',
        componentName: 'Streaming',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'image-optimization',
    navLabel: 'Image Optimization',
    elements: [
      {
        // ImageOptimization is stateless — static image showcase.
        selector: '.component-section .capture-widget',
        label: 'Image optimization widget',
        componentName: 'ImageOptimization',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },

  {
    pageId: 'metadata',
    navLabel: 'Metadata API',
    elements: [
      {
        // Metadata is stateless — displays static metadata object.
        selector: '.component-section .capture-widget',
        label: 'Metadata API widget',
        componentName: 'Metadata',
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: [],
      },
    ],
  },
];

/**
 * Complete expectations for Next.js 15 fixtures.
 * Combines inherited React 18 expectations with Next-specific ones.
 */
export const next15Expectations: PageExpectation[] = [
  ...react18Expectations,
  ...next15SpecificExpectations,
];

/**
 * Get expectations for a specific page.
 */
export function getPageExpectation(
  pageId: string,
): PageExpectation | undefined {
  return next15Expectations.find((p) => p.pageId === pageId);
}

/**
 * Get all page IDs that have expectations.
 */
export function getExpectationPageIds(): string[] {
  return next15Expectations.map((p) => p.pageId);
}
