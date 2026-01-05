/**
 * MemberExpressions - Tests member expression JSX elements
 *
 * Validates that Domscribe handles:
 * - <UI.Button> style components
 * - <Card.Header> style nested components
 */

import { CaptureIcon } from './CaptureIcon';

// Simulated component library
const UI = {
  Button: ({ children }: { children: React.ReactNode }) => (
    <button className="ui-button">{children}</button>
  ),
  Input: ({ placeholder }: { placeholder: string }) => (
    <input className="ui-input" placeholder={placeholder} />
  ),
};

const Card = {
  Header: ({ children }: { children: React.ReactNode }) => (
    <div className="card-header">{children}</div>
  ),
  Body: ({ children }: { children: React.ReactNode }) => (
    <div className="card-body">{children}</div>
  ),
  Footer: ({ children }: { children: React.ReactNode }) => (
    <div className="card-footer">{children}</div>
  ),
};

export function MemberExpressions() {
  return (
    <div className="member-expressions">
      <section>
        <h4>Simple Member Expression (UI.Button)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UI.Button>Click Me</UI.Button>
        </div>
      </section>

      <section>
        <h4>Member Expression Input (UI.Input)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UI.Input placeholder="Enter text" />
        </div>
      </section>

      <section>
        <h4>Nested Member Expressions (Card.Header, Card.Body, Card.Footer)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="card">
            <Card.Header>Card Title</Card.Header>
            <Card.Body>Card content goes here</Card.Body>
            <Card.Footer>Card footer</Card.Footer>
          </div>
        </div>
      </section>
    </div>
  );
}
