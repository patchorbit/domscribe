/**
 * RenderProps - Tests render prop pattern
 *
 * Validates that Domscribe correctly handles components using render props.
 */

import { ReactNode } from 'react';
import { CaptureIcon } from './CaptureIcon';

interface MouseTrackerProps {
  render: (x: number, y: number) => ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  // Simplified - in real app would track mouse position
  const x = 100;
  const y = 200;

  return <div className="mouse-tracker">{render(x, y)}</div>;
}

interface DataProviderProps<T> {
  data: T[];
  children: (items: T[]) => ReactNode;
}

function DataProvider<T>({ data, children }: DataProviderProps<T>) {
  return <div className="data-provider">{children(data)}</div>;
}

export function RenderProps() {
  const items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  return (
    <div className="render-props">
      <section>
        <h4>Basic Render Prop</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <MouseTracker
            render={(x, y) => (
              <div>
                Mouse position: {x}, {y}
              </div>
            )}
          />
        </div>
      </section>

      <section>
        <h4>Children as Function (Render Prop)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DataProvider data={items}>
            {(data) => (
              <ul>
                {data.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            )}
          </DataProvider>
        </div>
      </section>
    </div>
  );
}
