/**
 * Memo - Tests React.memo, forwardRef, and useCallback
 *
 * Validates that Domscribe handles memoization and ref forwarding.
 */

import { memo, forwardRef, useCallback, useRef, useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

// Memoized component
const MemoizedChild = memo(({ count }: { count: number }) => {
  return <p>Count: {count}</p>;
});
MemoizedChild.displayName = 'MemoizedChild';

// Component with forwardRef
const ForwardRefInput = forwardRef<HTMLInputElement, { placeholder: string }>(
  ({ placeholder }, ref) => {
    return (
      <input
        ref={ref}
        placeholder={placeholder}
        className="forward-ref-input"
      />
    );
  },
);
ForwardRefInput.displayName = 'ForwardRefInput';

// Component using useCallback
function CallbackParent() {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <div className="callback-parent">
      <MemoizedChild count={count} />
      <button onClick={increment}>Increment</button>
    </div>
  );
}

export function Memo() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="memo">
      <section>
        <h4>React.memo with useCallback</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <CallbackParent />
        </div>
      </section>

      <section>
        <h4>forwardRef Pattern</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="input-group">
            <ForwardRefInput ref={inputRef} placeholder="Forward ref input" />
            <button onClick={focusInput}>Focus Input</button>
          </div>
        </div>
      </section>
    </div>
  );
}
