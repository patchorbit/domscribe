/**
 * Layout Pattern
 *
 * Demonstrates Next.js nested layouts (App Router).
 * Layouts wrap pages and preserve state across navigation.
 */

import { CaptureIcon } from './CaptureIcon';

interface LayoutPatternProps {
  children?: React.ReactNode;
}

export function LayoutPattern({ children }: LayoutPatternProps) {
  return (
    <div className="component-demo" data-testid="layout-pattern">
      <h2>Layout Pattern</h2>
      <p>Demonstrates nested layout composition in Next.js App Router.</p>

      <div className="demo-section">
        <div className="demo-box capture-widget">
          <CaptureIcon />
        </div>
        <div className="layout-wrapper" data-testid="layout-outer">
          <header className="layout-header">
            <nav>
              <span className="nav-item">Home</span>
              <span className="nav-item">About</span>
              <span className="nav-item">Contact</span>
            </nav>
          </header>

          <div className="layout-body" data-testid="layout-inner">
            <aside className="layout-sidebar">
              <ul>
                <li>Section 1</li>
                <li>Section 2</li>
                <li>Section 3</li>
              </ul>
            </aside>

            <main className="layout-content">
              {children ?? (
                <p data-testid="layout-default-content">
                  Default layout content. In Next.js, this is replaced by the
                  page component.
                </p>
              )}
            </main>
          </div>

          <footer className="layout-footer">
            <p>Layout Footer</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
