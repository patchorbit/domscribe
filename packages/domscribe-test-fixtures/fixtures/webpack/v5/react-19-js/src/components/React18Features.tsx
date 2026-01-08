/**
 * React18Features - Tests React 18 specific features
 *
 * Validates that Domscribe handles:
 * - useTransition for concurrent rendering
 * - useDeferredValue for deferred updates
 * - useId for SSR-safe unique IDs
 * - startTransition API
 */

import { useState, useTransition, useDeferredValue, useId } from 'react';
import { CaptureIcon } from './CaptureIcon';

function TransitionExample() {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<number[]>([]);

  const handleClick = () => {
    setCount((c) => c + 1);

    // This update is marked as non-urgent
    startTransition(() => {
      const newItems = Array.from({ length: 1000 }, (_, i) => i);
      setItems(newItems);
    });
  };

  return (
    <div className="transition-example">
      <p>Count: {count}</p>
      <button onClick={handleClick} disabled={isPending}>
        {isPending ? 'Loading...' : 'Update (with transition)'}
      </button>
      <p>Items generated: {items.length}</p>
      {isPending && <div className="pending-indicator">Updating...</div>}
    </div>
  );
}

function DeferredValueExample() {
  const [input, setInput] = useState('');
  const deferredInput = useDeferredValue(input);

  const items = Array.from(
    { length: 100 },
    (_, i) => `Item ${i}: ${deferredInput}`,
  );

  return (
    <div className="deferred-value-example">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type to filter..."
      />
      <p>Current input: {input}</p>
      <p>Deferred input: {deferredInput}</p>
      <div className="deferred-list">
        {items.slice(0, 10).map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function UseIdExample() {
  const id1 = useId();
  const id2 = useId();
  const id3 = useId();

  return (
    <div className="use-id-example">
      <div className="form-group">
        <label htmlFor={id1}>First Name:</label>
        <input id={id1} type="text" />
      </div>
      <div className="form-group">
        <label htmlFor={id2}>Last Name:</label>
        <input id={id2} type="text" />
      </div>
      <div className="form-group">
        <label htmlFor={id3}>Email:</label>
        <input id={id3} type="email" />
      </div>
      <p>Generated IDs are SSR-safe and unique</p>
    </div>
  );
}

function NestedUseIdExample() {
  const parentId = useId();

  return (
    <div className="nested-use-id">
      <fieldset>
        <legend id={`${parentId}-legend`}>Personal Info</legend>
        <div className="form-group">
          <label htmlFor={`${parentId}-name`}>Name:</label>
          <input id={`${parentId}-name`} type="text" />
        </div>
        <div className="form-group">
          <label htmlFor={`${parentId}-age`}>Age:</label>
          <input id={`${parentId}-age`} type="number" />
        </div>
      </fieldset>
    </div>
  );
}

export function React18Features() {
  return (
    <div className="react-18-features">
      <section>
        <h4>useTransition</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <TransitionExample />
        </div>
      </section>

      <section>
        <h4>useDeferredValue</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DeferredValueExample />
        </div>
      </section>

      <section>
        <h4>useId</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UseIdExample />
        </div>
      </section>

      <section>
        <h4>Nested useId (with prefixes)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <NestedUseIdExample />
        </div>
      </section>
    </div>
  );
}
