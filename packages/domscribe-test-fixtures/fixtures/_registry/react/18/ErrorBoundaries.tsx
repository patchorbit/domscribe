/**
 * ErrorBoundaries - Tests React Error Boundaries
 *
 * Validates that Domscribe handles:
 * - Class components with componentDidCatch
 * - Error boundary fallback UI
 * - Components that throw errors
 */

import { Component, ReactNode, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-fallback">
            <h4>Something went wrong</h4>
            <p>Error: {this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Intentional error from ThrowingComponent');
  }

  return (
    <div className="throwing-component">
      <p>This component is not throwing an error</p>
    </div>
  );
}

function ConditionalError() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="conditional-error">
      <button onClick={() => setThrowError(true)}>Trigger Error</button>
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={throwError} />
      </ErrorBoundary>
    </div>
  );
}

export function ErrorBoundaries() {
  const [reset, setReset] = useState(0);

  return (
    <div className="error-boundaries">
      <section>
        <h4>Basic Error Boundary (Default Fallback)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Safe content wrapped in error boundary:</p>
          <ErrorBoundary>
            <div className="safe-content">
              <p>This content is inside an error boundary</p>
              <button>Safe Button</button>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      <section>
        <h4>Error Boundary with Custom Fallback UI</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Error boundary with custom fallback message:</p>
          <ErrorBoundary
            fallback={
              <div className="custom-fallback">
                <h5>Custom Error Fallback</h5>
                <p>Please contact support</p>
              </div>
            }
          >
            <div className="more-safe-content">
              <p>Another section with error protection</p>
            </div>
          </ErrorBoundary>
        </div>
      </section>

      <section>
        <h4>Conditional Error Triggering</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Click button to trigger an error and test error boundary:</p>
          <ConditionalError key={reset} />
          <button onClick={() => setReset((r) => r + 1)}>Reset All</button>
        </div>
      </section>

      <section>
        <h4>Nested Error Boundaries</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Multiple error boundaries nested inside each other:</p>
          <ErrorBoundary>
            <div className="outer-boundary">
              <p>Outer error boundary</p>
              <ErrorBoundary>
                <div className="inner-boundary">
                  <p>Inner error boundary</p>
                </div>
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );
}
