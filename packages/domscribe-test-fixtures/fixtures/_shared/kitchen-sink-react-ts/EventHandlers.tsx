import React from 'react';
/**
 * EventHandlers - Tests event handler attributes
 *
 * Validates that Domscribe correctly handles elements with:
 * - onClick, onChange, onSubmit, onFocus, onBlur, etc.
 */

import { useState } from 'react';

export function EventHandlers() {
  const [clicks, setClicks] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleClick = () => setClicks(clicks + 1);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="event-handlers">
      <button onClick={handleClick}>Clicked {clicks} times</button>

      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Type something"
      />

      <form onSubmit={handleSubmit}>
        <input type="text" name="username" />
        <button type="submit">Submit</button>
      </form>

      {submitted && <div>Form submitted!</div>}

      <button onMouseEnter={() => console.log('hover')}>Hover me</button>

      <input
        type="text"
        onFocus={() => console.log('focused')}
        onBlur={() => console.log('blurred')}
      />
    </div>
  );
}
