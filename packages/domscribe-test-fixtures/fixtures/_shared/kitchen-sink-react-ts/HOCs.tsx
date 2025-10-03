/**
 * HOCs - Tests Higher-Order Components
 *
 * Validates that Domscribe correctly handles components wrapped by HOCs.
 */

import React, { ComponentType } from 'react';

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
      <BaseComponent text="Original component" />
      <WrappedComponent text="Wrapped with HOC" />
      <ThemedComponent text="Themed component" />
      <DoublyWrapped text="Doubly wrapped" />
    </div>
  );
}
