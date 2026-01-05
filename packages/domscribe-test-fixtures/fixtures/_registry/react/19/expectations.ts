/**
 * Component Capture Expectations for React 19
 *
 * React 19 components are structurally identical to React 18 for capture
 * purposes — the same hooks, same Fiber layout, same positional state
 * indices. The only differences are TypeScript compatibility fixes
 * (e.g. ReactNode return types, callback ref signatures).
 *
 * We re-export the React 18 expectations directly, since the overlay
 * captures the same data from both versions.
 */

export type {
  ElementExpectation,
  PageExpectation,
} from '../18/expectations.js';

export {
  react18Expectations as react19Expectations,
  getPageExpectation,
  getExpectationPageIds,
} from '../18/expectations.js';
