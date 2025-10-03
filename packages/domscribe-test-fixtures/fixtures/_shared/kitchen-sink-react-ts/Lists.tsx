import React from 'react';
/**
 * Lists - Tests list rendering with .map() and keys
 *
 * Validates that Domscribe:
 * - Correctly handles .map() rendered elements
 * - Preserves React keys (doesn't interfere with reconciliation)
 * - Handles nested lists
 */

export function Lists() {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  const nested = [
    { id: 1, name: 'Group 1', children: ['A', 'B'] },
    { id: 2, name: 'Group 2', children: ['C', 'D'] },
  ];

  return (
    <div className="lists">
      {/* Simple list */}
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      {/* List with object keys */}
      <ul>
        {nested.map((group) => (
          <li key={group.id}>{group.name}</li>
        ))}
      </ul>

      {/* Nested list */}
      <ul>
        {nested.map((group) => (
          <li key={group.id}>
            {group.name}
            <ul>
              {group.children.map((child, idx) => (
                <li key={idx}>{child}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* List with divs */}
      <div>
        {items.map((item, index) => (
          <div key={index} className="list-item">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
