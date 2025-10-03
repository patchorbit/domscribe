import React from 'react';
/**
 * BasicElements - Tests basic HTML elements
 *
 * This component validates that Domscribe correctly injects data-ds attributes
 * on common HTML elements (div, span, button, input, img, form).
 */

export function BasicElements() {
  return (
    <div className="basic-elements">
      <div>This is a div element</div>
      <span>This is a span element</span>
      <button type="button">This is a button</button>
      <input type="text" placeholder="This is an input" />
      <img src="https://via.placeholder.com/150" alt="Placeholder" />
      <form>
        <label htmlFor="email">Email:</label>
        <input id="email" type="email" />
      </form>
      <p>This is a paragraph</p>
      <a href="#test">This is a link</a>
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
      </ul>
    </div>
  );
}
