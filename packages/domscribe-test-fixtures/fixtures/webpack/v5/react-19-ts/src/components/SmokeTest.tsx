/**
 * SmokeTest - React component for testing runtime context capture
 *
 * This component demonstrates how the Overlay picker flow works with React:
 * 1. User clicks on an element (simulated via crosshair capture icons)
 * 2. The CaptureIcon finds the element via closest() and captures context
 * 3. This is the realistic flow - no timing issues because the element
 *    exists when clicked and is found directly from the DOM.
 *
 * Note: We don't use refs to capture because when refs are inside .map(),
 * they only bind to the last element. The CaptureIcon handles capture
 * by finding its parent widget element directly.
 */

import { useState } from 'react';
import { CaptureStrategy } from '@domscribe/react';
import { CaptureIcon } from './CaptureIcon';
// Load smoke test utilities (exposes domscribe.* to console)
import '../domscribe-smoke-test';

const strategies = [
  { key: CaptureStrategy.FIBER, label: 'Fiber Strategy' },
  { key: CaptureStrategy.DEVTOOLS, label: 'DevTools Strategy' },
  { key: CaptureStrategy.BEST_EFFORT, label: 'Best Effort Strategy' },
];

// Exported components for other tests
interface CounterProps {
  label: string;
  initialValue: number;
  step?: number;
}

export function Counter({ label, initialValue, step = 1 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="smoke-test-counter" data-testid="counter">
      <span className="label">{label}</span>
      <span className="value">{count}</span>
      <button onClick={() => setCount(count + step)}>+{step}</button>
      <button onClick={() => setCount(count - step)}>-{step}</button>
    </div>
  );
}

interface UserCardProps {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export function UserCard({ name, email, role }: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');

  return (
    <div className="smoke-test-user-card" data-testid="user-card">
      <h4>{name}</h4>
      <p>Email: {email}</p>
      <p>Role: {role}</p>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      {isExpanded && (
        <div className="details">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
          <p>Notes length: {notes.length}</p>
        </div>
      )}
    </div>
  );
}

// Main SmokeTest component
export function SmokeTest() {
  // Counter state - these represent the component's "props" and "state"
  // that we expect to capture via the runtime
  const [counterLabel] = useState('Items');
  const [counterStep] = useState(5);
  const [counterCount, setCounterCount] = useState(10);

  // UserCard state
  const [userName] = useState('Alice');
  const [userEmail] = useState('alice@example.com');
  const [userRole] = useState<'admin' | 'user' | 'guest'>('admin');
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');

  const incrementCounter = () => setCounterCount((c) => c + counterStep);
  const decrementCounter = () => setCounterCount((c) => c - counterStep);
  const toggleExpanded = () => setIsExpanded((e) => !e);

  return (
    <div>
      {/* Instructions */}
      <section>
        <h4>Testing Runtime Context Capture</h4>
        <div className="demo-box demo-box-amber">
          <h5>How to Test</h5>
          <ol>
            <li>Open browser DevTools console (F12)</li>
            <li>Click the crosshair icons on any widget below</li>
            <li>Check console for captured context (props & state)</li>
            <li>
              Try modifying state (increment counter, expand card) and capture
              again
            </li>
          </ol>
          <p>
            <strong>This simulates the Overlay picker flow:</strong> when you
            click an element, we have the element reference and can capture its
            context immediately.
          </p>
        </div>
      </section>

      {/* Strategy Sections */}
      {strategies.map((strategyInfo) => (
        <section key={strategyInfo.key}>
          <h4>{strategyInfo.label}</h4>
          <p
            style={{
              color: 'var(--color-text-tertiary)',
              marginBottom: '1rem',
            }}
          >
            Strategy: <code>{strategyInfo.key}</code>
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
            }}
          >
            {/* Counter Widget */}
            <div className="capture-widget" data-testid="counter">
              {/* Capture Icon - handles its own capture via closest() */}
              <CaptureIcon position="top-right" strategy={strategyInfo.key} />

              {/* Widget Content */}
              <h5 style={{ marginTop: 0 }}>Counter Widget</h5>
              <div className="demo-box">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  <span style={{ fontWeight: 500 }}>{counterLabel}:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {counterCount}
                  </span>
                </div>
                <div className="button-group" style={{ marginTop: '1rem' }}>
                  <button onClick={decrementCounter}>-{counterStep}</button>
                  <button onClick={incrementCounter}>+{counterStep}</button>
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Props: label, initialValue, step | State: count
              </div>
            </div>

            {/* UserCard Widget */}
            <div className="capture-widget" data-testid="user-card">
              {/* Capture Icon - handles its own capture via closest() */}
              <CaptureIcon position="top-right" strategy={strategyInfo.key} />

              {/* Widget Content */}
              <h5 style={{ marginTop: 0 }}>User Card Widget</h5>
              <div className="demo-box">
                <p>
                  <strong>{userName}</strong>
                </p>
                <p>{userEmail}</p>
                <p>
                  <span className={`role-badge role-${userRole}`}>
                    {userRole}
                  </span>
                </p>
                <button
                  onClick={toggleExpanded}
                  style={{ marginTop: '0.5rem' }}
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
                {isExpanded && (
                  <div style={{ marginTop: '1rem' }}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes..."
                      style={{ width: '100%', minHeight: '60px' }}
                    />
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      Notes: {notes.length} chars
                    </p>
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Props: name, email, role | State: isExpanded, notes
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Strategy Comparison */}
      <section>
        <h4>Capture Strategy Comparison</h4>
        <div className="demo-box">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--color-border-primary)',
                  }}
                >
                  Strategy
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--color-border-primary)',
                  }}
                >
                  Method
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--color-border-primary)',
                  }}
                >
                  Best For
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem' }}>
                  <code>FIBER</code>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  Direct Fiber access via __reactFiber$
                </td>
                <td style={{ padding: '0.5rem' }}>
                  Most reliable, works without DevTools
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}>
                  <code>DEVTOOLS</code>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  React DevTools global hook
                </td>
                <td style={{ padding: '0.5rem' }}>
                  Richer data when DevTools installed
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}>
                  <code>BEST_EFFORT</code>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  DevTools first, fallback to Fiber
                </td>
                <td style={{ padding: '0.5rem' }}>
                  Production use - tries best option
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
