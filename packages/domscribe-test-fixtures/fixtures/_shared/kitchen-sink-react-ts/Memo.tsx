import React from 'react';
/**
 * Memo - Tests React.memo, forwardRef, and useCallback
 *
 * Validates that Domscribe handles memoization and ref forwarding.
 */

import { memo, forwardRef, useCallback, useRef, useState } from 'react';

// Memoized component
const MemoizedChild = memo(({ count }: { count: number }) => {
  return <div className="memoized-child">Count: {count}</div>;
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
      <button onClick={increment}>Increment</button>
      <MemoizedChild count={count} />
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
      <CallbackParent />

      <div>
        <ForwardRefInput ref={inputRef} placeholder="Forward ref input" />
        <button onClick={focusInput}>Focus Input</button>
      </div>
    </div>
  );
}
