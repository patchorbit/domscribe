/**
 * BasicElements - Tests basic HTML elements
 *
 * This component validates that Domscribe correctly injects data-ds attributes
 * on common HTML elements (div, span, button, input, img, form).
 */

import { CaptureIcon } from './CaptureIcon';

export function BasicElements() {
  return (
    <div className="basic-elements">
      <section>
        <h4>Div Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>This is a div element</div>
        </div>
      </section>

      <section>
        <h4>Span Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <span>This is a span element</span>
        </div>
      </section>

      <section>
        <h4>Button Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <button type="button">This is a button</button>
        </div>
      </section>

      <section>
        <h4>Text Input</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <input type="text" placeholder="This is an input" />
        </div>
      </section>

      <section>
        <h4>Form with Label</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <form>
            <div className="form-row">
              <label htmlFor="email">Email:</label>
              <input id="email" type="email" />
            </div>
          </form>
        </div>
      </section>

      <section>
        <h4>Paragraph Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>This is a paragraph</p>
        </div>
      </section>

      <section>
        <h4>Link Element</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <a href="#test">This is a link</a>
        </div>
      </section>

      <section>
        <h4>Unordered List</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      </section>

      <section>
        <h4>Element with Class Name</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="basic-elements">Div with className attribute</div>
        </div>
      </section>
    </div>
  );
}
