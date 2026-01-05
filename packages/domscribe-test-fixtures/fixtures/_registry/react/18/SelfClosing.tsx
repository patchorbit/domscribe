/**
 * SelfClosing - Tests self-closing JSX elements
 *
 * Validates that Domscribe correctly handles self-closing elements
 * like <input />, <br />, <hr />, <img />.
 */

import { CaptureIcon } from './CaptureIcon';

export function SelfClosing() {
  return (
    <div className="self-closing">
      <section>
        <h4>Text Input (Self-Closing)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input type="text" placeholder="Self-closing input" />
        </div>
      </section>

      <section>
        <h4>Line Break Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Text before break</p>
          <br />
          <p>Text after break</p>
        </div>
      </section>

      <section>
        <h4>Checkbox Input</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <label>
            <input type="checkbox" /> Check me
          </label>
        </div>
      </section>

      <section>
        <h4>Horizontal Rule</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Content above</p>
          <hr />
          <p>Content below</p>
        </div>
      </section>

      <section>
        <h4>Image Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <img
            src="https://dummyimage.com/100x100/000/fff"
            alt="Self-closing img"
          />
        </div>
      </section>

      <section>
        <h4>Radio Input</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <label>
            <input type="radio" name="test" /> Radio option
          </label>
        </div>
      </section>

      <section>
        <h4>Range Input</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input type="range" min="0" max="100" />
        </div>
      </section>
    </div>
  );
}
