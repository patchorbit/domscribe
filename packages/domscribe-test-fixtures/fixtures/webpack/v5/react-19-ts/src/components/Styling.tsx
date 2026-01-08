/**
 * Styling - Tests various styling patterns
 *
 * Validates that Domscribe handles:
 * - Inline styles with dynamic values
 * - Large className strings (utility-first/Tailwind-style)
 * - Style objects
 * - CSS Modules (if configured)
 */

import { useState, CSSProperties } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function Styling() {
  const [color, setColor] = useState('blue');
  const [size, setSize] = useState(16);

  // Inline style object
  const dynamicStyle: CSSProperties = {
    color: color,
    fontSize: `${size}px`,
    padding: 'var(--spacing-lg)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: '10px',
    background: 'var(--color-bg-elevated)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-normal)',
  };

  // Utility-first large className (simulating Tailwind)
  const utilityClasses =
    'flex items-center justify-between p-4 mb-2 bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200';

  return (
    <div className="styling">
      {/* Inline styles with dynamic values */}
      <section>
        <h4>Inline Styles (Dynamic)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div style={dynamicStyle} className="dynamic-styled">
            Dynamic styled element
          </div>
          <div>
            <label>
              Color:
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="blue">Blue</option>
                <option value="red">Red</option>
                <option value="green">Green</option>
              </select>
            </label>
            <label>
              Size:
              <input
                type="range"
                min="10"
                max="30"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Direct inline styles */}
      <section>
        <h4>Direct Inline Styles</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              padding: 'var(--spacing-lg)',
              borderRadius: '10px',
              border: '1px solid var(--color-border-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="direct-inline"
          >
            <p style={{ margin: 0, fontWeight: 'bold' }}>Bold text</p>
            <span
              style={{ color: 'var(--color-accent-purple)', fontSize: '14px' }}
            >
              Purple span
            </span>
          </div>
        </div>
      </section>

      {/* Large utility className strings */}
      <section>
        <h4>Utility-First Classes (simulating Tailwind)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className={`demo-box demo-box-blue ${utilityClasses}`}>
            <span>Item with many utility classes</span>
            <button>Button</button>
          </div>
        </div>
      </section>

      {/* Conditional classes */}
      <section>
        <h4>Conditional Classes</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            className={`demo-box demo-box-green conditional-box ${color === 'red' ? 'is-red' : 'not-red'} ${size > 20 ? 'is-large' : 'is-small'}`}
          >
            Conditional class element
          </div>
        </div>
      </section>

      {/* Array join pattern */}
      <section>
        <h4>Array Join Pattern</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            className={[
              'demo-box',
              'demo-box-amber',
              'base-class',
              'another-class',
              color === 'blue' && 'blue-variant',
              size > 20 && 'large-variant',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Array-joined classes
          </div>
        </div>
      </section>

      {/* Style composition */}
      <section>
        <h4>Style Composition</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div
            style={{
              ...dynamicStyle,
              backgroundColor: 'var(--color-bg-elevated)',
              margin: 'var(--spacing-md) 0',
            }}
            className="composed-styles"
          >
            Composed styles
          </div>
        </div>
      </section>
    </div>
  );
}
