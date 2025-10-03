/**
 * DynamicContent - Tests state-driven dynamic rendering
 *
 * Validates that Domscribe handles:
 * - useState for dynamic content
 * - useEffect for side effects
 * - Dynamically rendered components based on state
 */

import React, { useState, useEffect } from 'react';

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
    setItems([...items, `Item ${items.length + 1}`]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="dynamic-content">
      <div className="counter">
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>Increment</button>
        <button onClick={() => setCount(count - 1)}>Decrement</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>

      <div className="dynamic-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <ul>
              {items.map((item, index) => (
                <li key={index}>
                  {item}
                  <button onClick={() => removeItem(index)}>Remove</button>
                </li>
              ))}
            </ul>
            <button onClick={addItem}>Add Item</button>
          </>
        )}
      </div>

      {/* Conditionally rendered based on count */}
      {count > 5 && (
        <div className="high-count-message">Count is greater than 5!</div>
      )}

      {count < 0 && (
        <div className="negative-count-message">Count is negative!</div>
      )}
    </div>
  );
}
