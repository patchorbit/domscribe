/**
 * EventHandlers - Tests event handler attributes
 *
 * Validates that Domscribe correctly handles elements with:
 * - onClick, onChange, onSubmit, onFocus, onBlur, etc.
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

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
      <section>
        <h4>onClick Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onClick={handleClick}>Clicked {clicks} times</button>
        </div>
      </section>

      <section>
        <h4>onChange Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Current value: {inputValue || '(empty)'}</p>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder="Type something"
          />
        </div>
      </section>

      <section>
        <h4>onSubmit Handler (Form)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <input type="text" name="username" placeholder="Username" />
              <button type="submit">Submit</button>
            </div>
          </form>
          {submitted && <div>Form submitted!</div>}
        </div>
      </section>

      <section>
        <h4>onMouseEnter Handler</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button onMouseEnter={() => console.log('hover')}>
            Hover me (check console)
          </button>
        </div>
      </section>

      <section>
        <h4>onFocus & onBlur Handlers</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input
            type="text"
            onFocus={() => console.log('focused')}
            onBlur={() => console.log('blurred')}
            placeholder="Focus/blur (check console)"
          />
        </div>
      </section>
    </div>
  );
}
