/**
 * EdgeCases - Tests edge case scenarios
 *
 * Validates that Domscribe handles:
 * - null returns
 * - undefined returns
 * - boolean returns
 * - Empty components
 * - Components with no JSX
 */

import { CaptureIcon } from './CaptureIcon';

function NullComponent() {
  return null;
}

function UndefinedComponent() {
  return undefined as unknown as JSX.Element;
}

function BooleanComponent() {
  return false as unknown as JSX.Element;
}

function EmptyFragment() {
  return <></>;
}

function ConditionalNull({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }
  return <div>Conditionally rendered content</div>;
}

export function EdgeCases() {
  return (
    <div className="edge-cases">
      <section>
        <h4>Null & Undefined Returns</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Components that return null or undefined:</p>
          <NullComponent />
          <UndefinedComponent />
          <p>(Nothing should render above)</p>
        </div>
      </section>

      <section>
        <h4>Boolean Returns</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Component that returns boolean:</p>
          <BooleanComponent />
          <p>(Nothing should render above)</p>
        </div>
      </section>

      <section>
        <h4>Empty Fragment</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Component with empty fragment:</p>
          <EmptyFragment />
          <p>(Nothing should render above)</p>
        </div>
      </section>

      <section>
        <h4>Conditional Null Returns</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ConditionalNull show={false} />
          <p>(Above should be hidden)</p>
          <ConditionalNull show={true} />
          <p>(Above should be visible)</p>
        </div>
      </section>

      <section>
        <h4>Inline Null/Undefined/Boolean</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          {null}
          {undefined}
          {false}
          {true}
          <p>(Above values should not render visibly)</p>
        </div>
      </section>

      <section>
        <h4>Empty & Whitespace Divs</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div style={{ border: '1px solid gray', minHeight: '20px' }}></div>
          <p>Empty div above</p>
          <div style={{ border: '1px solid gray', minHeight: '20px' }}> </div>
          <p>Whitespace div above</p>
        </div>
      </section>

      <section>
        <h4>Self-Closing Div</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div />
          <p>(Self-closing div above - uncommon but valid)</p>
        </div>
      </section>
    </div>
  );
}
