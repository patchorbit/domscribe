/**
 * BasicElements - Representative React component for transform benchmarks.
 * Copied from test-fixtures registry (react/18).
 */

export function BasicElements() {
  return (
    <div className="basic-elements">
      <section>
        <h4>Div Element</h4>
        <div className="demo-box capture-widget">
          <div>This is a div element</div>
        </div>
      </section>

      <section>
        <h4>Span Element</h4>
        <div className="demo-box capture-widget">
          <span>This is a span element</span>
        </div>
      </section>

      <section>
        <h4>Button Element</h4>
        <div className="demo-box capture-widget">
          <button type="button">This is a button</button>
        </div>
      </section>

      <section>
        <h4>Text Input</h4>
        <div className="demo-box capture-widget">
          <input type="text" placeholder="This is an input" />
        </div>
      </section>

      <section>
        <h4>Form with Label</h4>
        <div className="demo-box capture-widget">
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
          <p>This is a paragraph</p>
        </div>
      </section>

      <section>
        <h4>Link Element</h4>
        <div className="demo-box capture-widget">
          <a href="#test">This is a link</a>
        </div>
      </section>

      <section>
        <h4>Unordered List</h4>
        <div className="demo-box capture-widget">
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      </section>

      <section>
        <h4>Element with Class Name</h4>
        <div className="demo-box capture-widget">
          <div className="basic-elements">Div with className attribute</div>
        </div>
      </section>
    </div>
  );
}
