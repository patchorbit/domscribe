/**
 * SSRHydration - Tests SSR/hydration edge cases
 *
 * Validates that Domscribe handles:
 * - Client-only rendered content (useEffect-only)
 * - typeof window !== 'undefined' checks
 * - Content that differs between server and client
 * - Hydration-safe patterns
 */

import { useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

function ClientOnlyContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // This pattern prevents hydration mismatches
  if (!mounted) {
    return <div className="client-only-placeholder">Loading...</div>;
  }

  return (
    <div className="client-only-content">
      <p>This content only renders on the client</p>
      <p>Window width: {window.innerWidth}</p>
      <button onClick={() => alert('Client-side interaction')}>
        Client Button
      </button>
    </div>
  );
}

function WindowCheck() {
  const isClient = typeof window !== 'undefined';

  return (
    <div className="window-check">
      <p>Running on: {isClient ? 'Client' : 'Server'}</p>
      {isClient && (
        <div>
          <p>User Agent: {window.navigator.userAgent.substring(0, 50)}...</p>
          <p>
            Screen: {window.screen.width}x{window.screen.height}
          </p>
        </div>
      )}
    </div>
  );
}

function HydrationSafeTimestamp() {
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    setTimestamp(Date.now());
  }, []);

  return (
    <div className="hydration-safe-timestamp">
      {timestamp === null ? (
        <div>Timestamp will appear after hydration</div>
      ) : (
        <div>Client timestamp: {new Date(timestamp).toISOString()}</div>
      )}
    </div>
  );
}

function DynamicImportCheck() {
  const [hasLocalStorage, setHasLocalStorage] = useState(false);

  useEffect(() => {
    try {
      localStorage.getItem('test');
      setHasLocalStorage(true);
    } catch {
      setHasLocalStorage(false);
    }
  }, []);

  return (
    <div className="dynamic-import-check">
      <p>LocalStorage available: {hasLocalStorage ? 'Yes' : 'No'}</p>
      {hasLocalStorage && (
        <button onClick={() => localStorage.setItem('test', 'value')}>
          Set LocalStorage
        </button>
      )}
    </div>
  );
}

export function SSRHydration() {
  return (
    <div className="ssr-hydration">
      <section className="section">
        <h4>Client-Only Content</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ClientOnlyContent />
        </div>
      </section>

      <section className="section">
        <h4>Window Check</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <WindowCheck />
        </div>
      </section>

      <section className="section">
        <h4>Hydration-Safe Timestamp</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <HydrationSafeTimestamp />
        </div>
      </section>

      <section className="section">
        <h4>Browser API Checks</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DynamicImportCheck />
        </div>
      </section>
    </div>
  );
}
