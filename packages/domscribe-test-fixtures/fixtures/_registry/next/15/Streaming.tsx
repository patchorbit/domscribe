'use client';

/**
 * Streaming & Suspense
 *
 * Demonstrates Next.js streaming patterns with React Suspense.
 * Simulates progressive rendering of content.
 */

import { Suspense, useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

function SlowContent({ delay, label }: { delay: number; label: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!loaded) {
    return (
      <div className="skeleton" data-testid={`loading-${label}`}>
        Loading {label}...
      </div>
    );
  }

  return (
    <div className="demo-card" data-testid={`content-${label}`}>
      <h3>{label}</h3>
      <p>Loaded after {delay}ms</p>
    </div>
  );
}

export function Streaming() {
  return (
    <div className="component-demo" data-testid="streaming">
      <h2>Streaming & Suspense</h2>
      <p>Progressive rendering with Suspense boundaries.</p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
        </div>
        <Suspense fallback={<div className="skeleton">Loading header...</div>}>
          <SlowContent delay={200} label="header" />
        </Suspense>

        <div className="card-grid">
          <Suspense
            fallback={<div className="skeleton">Loading sidebar...</div>}
          >
            <SlowContent delay={500} label="sidebar" />
          </Suspense>

          <Suspense
            fallback={<div className="skeleton">Loading main content...</div>}
          >
            <SlowContent delay={800} label="main" />
          </Suspense>
        </div>

        <Suspense fallback={<div className="skeleton">Loading footer...</div>}>
          <SlowContent delay={1200} label="footer" />
        </Suspense>
      </div>
    </div>
  );
}
