'use client';

/**
 * Client Component Pattern
 *
 * Demonstrates Next.js client components with 'use client' directive.
 * Client components support interactivity, hooks, and browser APIs.
 */

import { useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function ClientComponent() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="component-demo" data-testid="client-component">
      <h2>Client Component</h2>
      <p>
        This component uses &apos;use client&apos; directive for interactivity.
      </p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button
            data-testid="increment-btn"
            className="btn btn-primary"
            onClick={() => setCount((c) => c + 1)}
          >
            Count: {count}
          </button>
        </div>
      </div>

      <div className="info-box">
        <p>Hydrated: {mounted ? 'Yes' : 'No'}</p>
        <p>
          Client components have full React Fiber access — Domscribe can capture
          props, state, and hooks via runtime introspection.
        </p>
      </div>
    </div>
  );
}
