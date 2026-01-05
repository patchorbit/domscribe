/**
 * LazyComponent - A component to be lazy loaded
 *
 * This file is imported dynamically via React.lazy()
 */

export function LazyComponent() {
  return (
    <div className="lazy-component">
      <h4>Lazy Loaded Component</h4>
      <p>This component was loaded via React.lazy() and dynamic import()</p>
      <div className="lazy-content">
        <button>Lazy Button</button>
        <input placeholder="Lazy Input" />
      </div>
    </div>
  );
}

export function AnotherLazyComponent() {
  return (
    <div className="another-lazy-component">
      <p>Another lazy loaded component</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    </div>
  );
}
