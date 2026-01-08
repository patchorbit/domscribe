/**
 * RefPatterns - Tests various ref patterns
 *
 * Validates that Domscribe handles:
 * - useRef with DOM elements
 * - Callback refs
 * - forwardRef (already tested in Memo.tsx, but added here for completeness)
 * - Multiple refs on same element
 * - Ref forwarding chains
 */

import {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { CaptureIcon } from './CaptureIcon';

function UseRefExample() {
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<string>('');

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const measureDiv = () => {
    if (divRef.current) {
      const { width, height } = divRef.current.getBoundingClientRect();
      setMeasurement(`${width}px x ${height}px`);
    }
  };

  return (
    <div className="use-ref-example">
      <div className="input-group">
        <input ref={inputRef} placeholder="Will be focused" />
        <button onClick={focusInput}>Focus Input</button>
      </div>

      <div
        ref={divRef}
        className="demo-box demo-box-blue"
        style={{
          width: '200px',
          height: '100px',
        }}
      >
        Measured div
      </div>
      <button onClick={measureDiv}>Measure Div</button>
      {measurement && <p>Dimensions: {measurement}</p>}
    </div>
  );
}

function CallbackRefExample() {
  const [height, setHeight] = useState<number>(0);

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []);

  return (
    <div className="callback-ref-example">
      <div ref={callbackRef} className="demo-box demo-box-red">
        This element uses a callback ref
        <br />
        Measured height: {height}px
      </div>
    </div>
  );
}

interface CustomInputHandle {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
}

const CustomInput = forwardRef<CustomInputHandle, { placeholder?: string }>(
  ({ placeholder }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
      getValue: () => inputRef.current?.value || '',
    }));

    return (
      <input
        ref={inputRef}
        placeholder={placeholder}
        className="custom-input"
      />
    );
  },
);
CustomInput.displayName = 'CustomInput';

function ForwardRefExample() {
  const inputRef = useRef<CustomInputHandle>(null);
  const [value, setValue] = useState('');

  const handleGetValue = () => {
    const val = inputRef.current?.getValue();
    setValue(val || '');
  };

  return (
    <div className="forward-ref-example">
      <div className="form-group">
        <CustomInput ref={inputRef} placeholder="Custom input with ref" />
        <div>
          <button onClick={() => inputRef.current?.focus()}>Focus</button>
          <button onClick={() => inputRef.current?.clear()}>Clear</button>
          <button onClick={handleGetValue}>Get Value</button>
        </div>
      </div>
      {value && <p>Value: {value}</p>}
    </div>
  );
}

function MultipleRefsExample() {
  const ref1 = useRef<HTMLDivElement | null>(null);
  const [callbackHeight, setCallbackHeight] = useState(0);

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setCallbackHeight(node.getBoundingClientRect().height);
    }
  }, []);

  // Combining refs
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      ref1.current = node;
      callbackRef(node);
    },
    [callbackRef],
  );

  return (
    <div className="multiple-refs-example">
      <div ref={setRefs} className="demo-box demo-box-green">
        This element has multiple refs combined
        <br />
        Height from callback: {callbackHeight}px
      </div>
      <button onClick={() => console.log('Ref1:', ref1.current)}>
        Log ref1
      </button>
    </div>
  );
}

function DynamicRefExample() {
  const [items] = useState(['Item 1', 'Item 2', 'Item 3']);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const focusItem = (index: number) => {
    setFocusedIndex(index);
    itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="dynamic-ref-example">
      {items.map((item, index) => (
        <div
          key={index}
          ref={(el) => (itemRefs.current[index] = el)}
          className={`demo-box demo-box-amber ${focusedIndex === index ? 'focused' : ''}`}
        >
          {item}
        </div>
      ))}
      <div>
        {items.map((_, index) => (
          <button key={index} onClick={() => focusItem(index)}>
            Focus Item {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RefPatterns() {
  return (
    <div className="ref-patterns">
      <section>
        <h4>useRef</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <UseRefExample />
        </div>
      </section>

      <section>
        <h4>Callback Ref</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <CallbackRefExample />
        </div>
      </section>

      <section>
        <h4>forwardRef + useImperativeHandle</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ForwardRefExample />
        </div>
      </section>

      <section>
        <h4>Multiple Refs (Combined)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <MultipleRefsExample />
        </div>
      </section>

      <section>
        <h4>Dynamic Refs (Array)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <DynamicRefExample />
        </div>
      </section>
    </div>
  );
}
