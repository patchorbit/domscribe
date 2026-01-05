/**
 * DynamicContent - Tests state-driven dynamic rendering
 *
 * Validates that Domscribe handles:
 * - useState for dynamic content
 * - useEffect for side effects
 * - Dynamically rendered components based on state
 */

import { useState, useEffect } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function DynamicContent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data loading
    const timer = setTimeout(() => {
      setItems(['Dynamic Item 1', 'Dynamic Item 2', 'Dynamic Item 3']);
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const addItem = () => {
    setItems([...items, `Dynamic Item ${items.length + 1}`]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="dynamic-content">
      <section>
        <h4>Counter with useState</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="counter">
            <p>Count: {count}</p>
            <div>
              <button onClick={() => setCount(count + 1)}>Increment</button>
              <button onClick={() => setCount(count - 1)}>Decrement</button>
              <button onClick={() => setCount(0)}>Reset</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h4>Dynamic List with useEffect</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="list-group">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
                <ul>
                  {items.map((item, index) => (
                    <li key={index} className="list-item-with-button">
                      <span>{item}</span>
                      <button onClick={() => removeItem(index)}>Remove</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <button onClick={addItem}>Add Item</button>
        </div>
      </section>

      <section>
        <h4>Conditional Messages Based on State</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {count > 5 && (
            <div className="high-count-message">Count is greater than 5!</div>
          )}
          {count < 0 && (
            <div className="negative-count-message">Count is negative!</div>
          )}
          {count >= 0 && count <= 5 && <div>Count is between 0 and 5</div>}
        </div>
      </section>
    </div>
  );
}
