/**
 * Fragments - Tests React.Fragment and <> syntax
 *
 * Validates that Domscribe correctly handles fragments.
 * Note: Fragments themselves don't get data-ds (not host elements),
 * but their children should.
 */
import React, { Fragment } from 'react';

export function Fragments() {
  return (
    <div className="fragments">
      <Fragment>
        <div>Inside Fragment</div>
        <span>Also inside Fragment</span>
      </Fragment>

      <>
        <div>Inside short fragment</div>
        <span>Also inside short fragment</span>
      </>

      <div>
        <Fragment>
          <p>Nested fragment child 1</p>
          <p>Nested fragment child 2</p>
        </Fragment>
      </div>
    </div>
  );
}
