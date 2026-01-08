/**
 * HOCs - Tests Higher-Order Components
 *
 * Validates that Domscribe correctly handles components wrapped by HOCs.
 */

import { ComponentType } from 'react';
import { CaptureIcon } from './CaptureIcon';

// Simple HOC that adds a wrapper div
function withWrapper<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return (props: P) => (
    <div className="hoc-wrapper">
      <Component {...props} />
    </div>
  );
}

// Another HOC that adds theme prop
interface ThemeProps {
  theme?: 'light' | 'dark';
}

function withTheme<P extends object>(
  Component: ComponentType<P & ThemeProps>,
): ComponentType<P> {
  return (props: P) => <Component {...props} theme="light" />;
}

// Base component
function BaseComponent({
  text,
  theme,
}: {
  text: string;
  theme?: 'light' | 'dark';
}) {
  return <div className={`base-component ${theme || ''}`}>{text}</div>;
}

// Wrapped components
const WrappedComponent = withWrapper(BaseComponent);
const ThemedComponent = withTheme(BaseComponent);
const DoublyWrapped = withTheme(withWrapper(BaseComponent));

export function HOCs() {
  return (
    <div className="hocs">
      <section>
        <h4>Base Component (No HOC)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <BaseComponent text="Original component" />
        </div>
      </section>

      <section>
        <h4>Single HOC Wrapper (withWrapper)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <WrappedComponent text="Wrapped with HOC" />
        </div>
      </section>

      <section>
        <h4>Theme HOC (withTheme)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ThemedComponent text="Themed component" />
        </div>
      </section>

      <section>
        <h4>Multiple HOC Wrapping (Composition)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DoublyWrapped text="Doubly wrapped" />
        </div>
      </section>
    </div>
  );
}
