import React from 'react';
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

function NoJSXComponent() {
  // No JSX, just a string
  const text = 'Plain text component';
  return text as unknown as JSX.Element;
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
      <div>
        <p>Testing edge cases:</p>

        {/* Null component */}
        <NullComponent />

        {/* Empty fragment */}
        <EmptyFragment />

        {/* Conditional null */}
        <ConditionalNull show={false} />
        <ConditionalNull show={true} />

        {/* Inline null/undefined/boolean */}
        {null}
        {undefined}
        {false}
        {true}

        {/* Empty div */}
        <div></div>

        {/* Div with just whitespace */}
        <div> </div>

        {/* Self-closing div (uncommon but valid) */}
        <div />
      </div>
    </div>
  );
}
