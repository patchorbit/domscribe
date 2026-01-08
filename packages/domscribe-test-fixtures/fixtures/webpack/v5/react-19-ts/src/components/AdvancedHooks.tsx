/**
 * AdvancedHooks - Tests advanced React hook patterns
 *
 * Validates that Domscribe handles:
 * - useReducer with complex state
 * - useImperativeHandle with forwardRef
 * - Custom hooks that return JSX
 * - useLayoutEffect vs useEffect
 */

import {
  useReducer,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
} from 'react';
import { CaptureIcon } from './CaptureIcon';

// useReducer example
interface CounterState {
  count: number;
  history: number[];
}

type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'set'; payload: number };

function counterReducer(
  state: CounterState,
  action: CounterAction,
): CounterState {
  switch (action.type) {
    case 'increment':
      return {
        count: state.count + 1,
        history: [...state.history, state.count + 1],
      };
    case 'decrement':
      return {
        count: state.count - 1,
        history: [...state.history, state.count - 1],
      };
    case 'reset':
      return { count: 0, history: [0] };
    case 'set':
      return {
        count: action.payload,
        history: [...state.history, action.payload],
      };
    default:
      return state;
  }
}

function ReducerExample() {
  const [state, dispatch] = useReducer(counterReducer, {
    count: 0,
    history: [0],
  });

  return (
    <div className="reducer-example">
      <p>Count: {state.count}</p>
      <p>History: {state.history.join(', ')}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <button onClick={() => dispatch({ type: 'set', payload: 10 })}>
        Set to 10
      </button>
    </div>
  );
}

// useImperativeHandle example
interface FancyInputHandle {
  focus: () => void;
  clear: () => void;
  setValue: (value: string) => void;
}

const FancyInput = forwardRef<FancyInputHandle, { placeholder?: string }>(
  ({ placeholder }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      clear: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      },
      setValue: (value: string) => {
        if (inputRef.current) {
          inputRef.current.value = value;
        }
      },
    }));

    return (
      <input ref={inputRef} placeholder={placeholder} className="fancy-input" />
    );
  },
);
FancyInput.displayName = 'FancyInput';

function ImperativeHandleExample() {
  const inputRef = useRef<FancyInputHandle>(null);

  return (
    <div className="imperative-handle-example">
      <div className="form-group">
        <FancyInput ref={inputRef} placeholder="Fancy input" />
        <div>
          <button onClick={() => inputRef.current?.focus()}>Focus</button>
          <button onClick={() => inputRef.current?.clear()}>Clear</button>
          <button onClick={() => inputRef.current?.setValue('Hello!')}>
            Set Value
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom hook that returns JSX
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  const counter = (
    <div className="custom-hook-counter">
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <p>Count from custom hook: {count}</p>
    </div>
  );

  return { count, counter };
}

function CustomHookExample() {
  const { counter } = useCounter(5);

  return <div className="custom-hook-example">{counter}</div>;
}

// useLayoutEffect vs useEffect
function LayoutEffectExample() {
  const [layoutValue, setLayoutValue] = useState('Not measured');
  const [effectValue, setEffectValue] = useState('Not measured');
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (divRef.current) {
      const width = divRef.current.offsetWidth;
      setLayoutValue(`Width: ${width}px (useLayoutEffect)`);
    }
  }, []);

  useEffect(() => {
    if (divRef.current) {
      const width = divRef.current.offsetWidth;
      setEffectValue(`Width: ${width}px (useEffect)`);
    }
  }, []);

  return (
    <div className="layout-effect-example">
      <div
        ref={divRef}
        className="demo-box demo-box-blue"
        style={{ width: '200px' }}
      >
        Measured element
      </div>
      <p>{layoutValue}</p>
      <p>{effectValue}</p>
    </div>
  );
}

export function AdvancedHooks() {
  return (
    <div className="advanced-hooks">
      <section>
        <h4>useReducer</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ReducerExample />
        </div>
      </section>

      <section>
        <h4>useImperativeHandle</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ImperativeHandleExample />
        </div>
      </section>

      <section>
        <h4>Custom Hook returning JSX</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <CustomHookExample />
        </div>
      </section>

      <section>
        <h4>useLayoutEffect vs useEffect</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <LayoutEffectExample />
        </div>
      </section>
    </div>
  );
}
