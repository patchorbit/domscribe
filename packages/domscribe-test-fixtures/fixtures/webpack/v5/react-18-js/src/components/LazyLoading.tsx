/**
 * LazyLoading - Tests React.lazy() and Suspense
 *
 * Validates that Domscribe handles:
 * - Components loaded via React.lazy()
 * - Suspense boundaries with fallback content
 * - Dynamic imports and code splitting
 * - Manifest handles async component boundaries correctly
 */

import { lazy, Suspense, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

// Lazy load components
const LazyComponent = lazy(() =>
  import('./LazyComponent').then((mod) => ({ default: mod.LazyComponent })),
);

const AnotherLazyComponent = lazy(() =>
  import('./LazyComponent').then((mod) => ({
    default: mod.AnotherLazyComponent,
  })),
);

function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <p>Loading component...</p>
    </div>
  );
}

function NestedSuspense() {
  return (
    <div className="nested-suspense">
      <h4>Nested Suspense Boundary</h4>
      <Suspense fallback={<div>Loading nested...</div>}>
        <AnotherLazyComponent />
      </Suspense>
    </div>
  );
}

export function LazyLoading() {
  const [showLazy, setShowLazy] = useState(false);
  const [showNested, setShowNested] = useState(false);

  return (
    <div className="lazy-loading">
      <section>
        <h4>Basic Lazy Component with Suspense</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowLazy(!showLazy)}>
            {showLazy ? 'Hide' : 'Show'} Lazy Component
          </button>
          {showLazy && (
            <Suspense fallback={<LoadingFallback />}>
              <LazyComponent />
            </Suspense>
          )}
        </div>
      </section>

      <section>
        <h4>Nested Suspense Boundaries</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowNested(!showNested)}>
            {showNested ? 'Hide' : 'Show'} Nested Suspense
          </button>
          {showNested && (
            <Suspense fallback={<div>Loading outer...</div>}>
              <div className="outer-suspense">
                <p>Outer Suspense Content</p>
                <NestedSuspense />
              </div>
            </Suspense>
          )}
        </div>
      </section>

      <section>
        <h4>Multiple Lazy Components (Same Boundary)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Suspense fallback={<div>Loading multiple...</div>}>
            <div className="multiple-lazy">
              <LazyComponent />
              <AnotherLazyComponent />
            </div>
          </Suspense>
        </div>
      </section>
    </div>
  );
}
