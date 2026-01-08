/**
 * Lists - Tests list rendering with .map() and keys
 *
 * Validates that Domscribe:
 * - Correctly handles .map() rendered elements
 * - Preserves React keys (doesn't interfere with reconciliation)
 * - Handles nested lists
 */

import { CaptureIcon } from './CaptureIcon';

export function Lists() {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  const nested = [
    { id: 1, name: 'Group 1', children: ['A', 'B'] },
    { id: 2, name: 'Group 2', children: ['C', 'D'] },
  ];

  return (
    <div className="lists">
      <section>
        <h4>Simple List with .map()</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h4>List with Object Keys</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ul>
            {nested.map((group) => (
              <li key={group.id}>{group.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h4>Nested Lists</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
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
        </div>
      </section>

      <section>
        <h4>List with Div Elements</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>
            {items.map((item, index) => (
              <div key={index} className="list-item">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
