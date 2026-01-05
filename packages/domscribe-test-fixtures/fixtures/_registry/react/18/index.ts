/**
 * Kitchen Sink React Components
 *
 * Battle-tested React components covering all edge cases for Domscribe transform validation.
 *
 * These components test:
 * - Basic HTML elements (div, span, button, input, etc.)
 * - Self-closing elements (<input />, <br />, <img />)
 * - Fragments (<></>, <Fragment>)
 * - Conditional rendering (&&, ternary)
 * - Lists with .map() and keys
 * - Member expressions (<UI.Button>)
 * - Event handlers (onClick, onChange, etc.)
 * - Higher-order components (HOCs)
 * - Render props pattern
 * - React.memo, forwardRef, useCallback
 * - Deeply nested structures (10+ levels)
 * - Dynamic state-driven content
 * - TypeScript features (generics, type assertions, optional chaining)
 * - Edge cases (null, undefined, empty components)
 * - Portals (createPortal)
 * - Context API (Provider/Consumer)
 * - Lazy loading (React.lazy + Suspense)
 * - SSR/Hydration patterns
 * - SVG elements
 * - Error boundaries
 * - Advanced hooks (useReducer, useImperativeHandle, custom hooks)
 * - React 18 features (useTransition, useDeferredValue, useId)
 * - Styling patterns (inline, utility classes, conditional)
 * - Children manipulation (Children.map, cloneElement)
 * - Ref patterns (useRef, callback refs, forwardRef)
 * - Compound components (Tabs, Accordion, polymorphic)
 */

// Core patterns
export { BasicElements } from './BasicElements';
export { SelfClosing } from './SelfClosing';
export { Fragments } from './Fragments';
export { ConditionalRendering } from './ConditionalRendering';
export { Lists } from './Lists';
export { MemberExpressions } from './MemberExpressions';
export { EventHandlers } from './EventHandlers';
export { HOCs } from './HOCs';
export { RenderProps } from './RenderProps';
export { Memo } from './Memo';
export { DeeplyNested } from './DeeplyNested';
export { DynamicContent } from './DynamicContent';
export { TypeScriptFeatures } from './TypeScriptFeatures';
export { EdgeCases } from './EdgeCases';

// Advanced patterns
export { Portals } from './Portals';
export { Context } from './Context';
export { LazyLoading } from './LazyLoading';
export { SSRHydration } from './SSRHydration';
export { SVGElements } from './SVGElements';
export { ErrorBoundaries } from './ErrorBoundaries';
export { AdvancedHooks } from './AdvancedHooks';
export { React18Features } from './React18Features';
export { Styling } from './Styling';
export { ChildrenManipulation } from './ChildrenManipulation';
export { RefPatterns } from './RefPatterns';
export { CompoundComponents } from './CompoundComponents';

// Smoke test for runtime capture
export { SmokeTest, Counter, UserCard } from './SmokeTest';
