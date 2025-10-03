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

export function ConditionalRendering() {
  const [showContent, setShowContent] = useState(true);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <div className="conditional-rendering">
      {/* Logical AND */}
      {showContent && <div>Content shown via logical AND</div>}

      {/* Ternary operator */}
      {showContent ? (
        <div>Content shown (ternary true)</div>
      ) : (
        <div>Content hidden (ternary false)</div>
      )}

      {/* Mode-based rendering */}
      {mode === 'light' ? (
        <div className="light-mode">Light mode active</div>
      ) : (
        <div className="dark-mode">Dark mode active</div>
      )}

      {/* Controls */}
      <button onClick={() => setShowContent(!showContent)}>
        Toggle Content
      </button>
      <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
        Toggle Mode
      </button>
    </div>
  );
}
