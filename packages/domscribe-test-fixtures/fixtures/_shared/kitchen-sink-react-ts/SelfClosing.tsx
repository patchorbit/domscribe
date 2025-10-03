import React from 'react';
/**
 * SelfClosing - Tests self-closing JSX elements
 *
 * Validates that Domscribe correctly handles self-closing elements
 * like <input />, <br />, <hr />, <img />.
 */

export function SelfClosing() {
  return (
    <div className="self-closing">
      <input type="text" placeholder="Self-closing input" />
      <br />
      <input type="checkbox" />
      <hr />
      <img src="https://via.placeholder.com/100" alt="Self-closing img" />
      <input type="radio" name="test" />
      <br />
      <input type="range" min="0" max="100" />
    </div>
  );
}
