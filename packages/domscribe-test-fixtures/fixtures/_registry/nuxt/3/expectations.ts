/**
 * Component Capture Expectations for Nuxt 3
 *
 * Nuxt fixtures inherit all Vue 3 components plus Nuxt-specific patterns.
 *
 * The inherited Vue expectations work as-is — the fuzzy page-id matcher
 * in the e2e helpers handles ID differences between Vue and Nuxt fixtures
 * (e.g. "conditional" → "conditional-rendering").
 *
 * KEY DIFFERENCE FROM REACT: Vue/Nuxt exposes state with named keys
 * (the actual variable names from ref() / reactive() calls),
 * not positional indices like React's Fiber hooks.
 *
 * Nuxt's auto-import system means composables like ref() and computed()
 * are available without explicit imports, but the state extractor reads
 * them the same way as standard Vue 3 Composition API refs.
 *
 * IMPORTANT: The overlay redacts PII (emails, etc.) so expected values
 * must use '[REDACTED]' for those fields.
 */

import type { PageExpectation } from '../../react/18/expectations.js';
import { vue3Expectations } from '../../vue/3/expectations.js';

// Re-export shared types
export type {
  ElementExpectation,
  PageExpectation,
} from '../../react/18/expectations.js';

/**
 * Nuxt 3-specific component expectations.
 *
 * These cover only the framework-specific components; inherited Vue
 * component expectations come from vue3Expectations.
 *
 * State keys match the ref() variable names defined in each component's
 * <script setup> block. Functions and DOM refs are skipped by the state
 * extractor; only serializable reactive values appear.
 */
const nuxt3SpecificExpectations: PageExpectation[] = [
  {
    pageId: 'auto-imports',
    navLabel: 'Auto Imports',
    elements: [
      {
        // AutoImports refs: count=0 (ref), doubled is computed — may not appear
        selector: '.component-section .capture-widget',
        label: 'Auto imports counter widget',
        componentName: null, // TODO: investigate Vue __name resolution in Nuxt
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
    pageId: 'nuxt-layout',
    navLabel: 'Nuxt Layout',
    elements: [
      {
        // NuxtLayout refs: currentLayout='default'
        // layouts is a const array, not a ref
        selector: '.component-section .capture-widget',
        label: 'Nuxt layout selector widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['currentLayout'],
        expectedState: {
          currentLayout: 'default',
        },
      },
    ],
  },

  {
    pageId: 'server-routes',
    navLabel: 'Server Routes',
    elements: [
      {
        // ServerRoutes refs: response=null, loading=false, error=null
        selector: '.component-section .capture-widget',
        label: 'Server routes API widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['loading', 'error'],
        expectedState: {
          loading: false,
          error: null,
        },
      },
    ],
  },

  {
    pageId: 'use-fetch',
    navLabel: 'useFetch Composable',
    elements: [
      {
        // UseFetch refs: posts=[...], pending=false, fetchError=null
        selector: '.component-section .capture-widget',
        label: 'useFetch composable widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['pending', 'fetchError'],
        expectedState: {
          pending: false,
          fetchError: null,
        },
      },
    ],
  },

  {
    pageId: 'state-management',
    navLabel: 'State Management (useState)',
    elements: [
      {
        // StateManagement destructures from composables:
        //   count=0, theme='light'
        // increment/decrement/reset/toggle are functions (skipped)
        selector: '.component-section .capture-widget',
        label: 'State management counter widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['count', 'theme'],
        expectedState: {
          count: 0,
          theme: 'light',
        },
      },
    ],
  },

  {
    pageId: 'nuxt-plugins',
    navLabel: 'Nuxt Plugins',
    elements: [
      {
        // NuxtPlugins refs: now (Date), pluginStatus={analytics:true, i18n:true, auth:false}
        // Date ref may serialize differently — only assert pluginStatus
        selector: '.component-section .capture-widget',
        label: 'Nuxt plugins utility widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['pluginStatus'],
      },
    ],
  },

  {
    pageId: 'middleware',
    navLabel: 'Route Middleware',
    elements: [
      {
        // Middleware refs: isAuthenticated=false, currentRoute='/dashboard', middlewareLog=[]
        selector: '.component-section .capture-widget',
        label: 'Route middleware widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['isAuthenticated', 'currentRoute'],
        expectedState: {
          isAuthenticated: false,
          currentRoute: '/dashboard',
        },
      },
    ],
  },

  {
    pageId: 'nuxt-island',
    navLabel: 'Nuxt Island',
    elements: [
      {
        // NuxtIsland refs: islands=[...], selectedIsland=islands[0]
        // selectedIsland is an object — assert key existence only
        selector: '.component-section .capture-widget',
        label: 'Nuxt island selector widget',
        componentName: null,
        expectDataDs: true,
        expectedPropsKeys: [],
        expectedStateKeys: ['selectedIsland'],
      },
    ],
  },
];

/**
 * Complete expectations for Nuxt 3 fixtures.
 * Combines inherited Vue 3 expectations with Nuxt-specific ones.
 */
export const nuxt3Expectations: PageExpectation[] = [
  ...vue3Expectations,
  ...nuxt3SpecificExpectations,
];

/**
 * Get expectations for a specific page.
 */
export function getPageExpectation(
  pageId: string,
): PageExpectation | undefined {
  return nuxt3Expectations.find((p) => p.pageId === pageId);
}

/**
 * Get all page IDs that have expectations.
 */
export function getExpectationPageIds(): string[] {
  return nuxt3Expectations.map((p) => p.pageId);
}
