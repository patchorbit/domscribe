// @ts-nocheck

/**
 * ConditionalRendering - Tests conditional rendering patterns
 *
 * Validates that Domscribe handles:
 * - Logical AND (&&) rendering
 * - Ternary operators
 * - if/else patterns
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function ConditionalRendering() {
  const [showContent, setShowContent] = useState(true);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <div className="conditional-rendering">
      <section>
        <h4>Logical AND (&&) Rendering</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={() => setShowContent(!showContent)}>
            Toggle Content (currently {showContent ? 'shown' : 'hidden'})
          </button>
          {showContent && <div>Content shown via logical AND</div>}
        </div>
      </section>

      <section>
        <h4>Ternary Operator</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {showContent ? (
            <div>Content shown (ternary true)</div>
          ) : (
            <div>Content hidden (ternary false)</div>
          )}
        </div>
      </section>

      <section>
        <h4>Mode-Based Rendering</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {mode === 'light' ? (
            <div className="light-mode">Light mode active</div>
          ) : (
            <div className="dark-mode">Dark mode active</div>
          )}
          <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
            Toggle Mode (currently {mode})
          </button>
        </div>
      </section>
    </div>
  );
}
