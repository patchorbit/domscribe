/**
 * Fragments - Tests React.Fragment and <> syntax
 *
 * Validates that Domscribe correctly handles fragments.
 * Note: Fragments themselves don't get data-ds (not host elements),
 * but their children should.
 */
import { Fragment } from 'react';
import { CaptureIcon } from './CaptureIcon';

export function Fragments() {
  return (
    <div className="fragments">
      <section>
        <h4>React.Fragment Syntax</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Fragment>
            <div>Inside Fragment</div>
            <span>Also inside Fragment</span>
          </Fragment>
        </div>
      </section>

      <section>
        <h4>Short Fragment Syntax (&lt;&gt;)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <>
            <div>Inside short fragment</div>
            <span>Also inside short fragment</span>
          </>
        </div>
      </section>

      <section>
        <h4>Nested Fragment</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>
            <Fragment>
              <p>Nested fragment child 1</p>
              <p>Nested fragment child 2</p>
            </Fragment>
          </div>
        </div>
      </section>
    </div>
  );
}
