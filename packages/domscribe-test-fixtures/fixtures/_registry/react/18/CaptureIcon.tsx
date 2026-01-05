/**
 * CaptureIcon - Minimal SVG crosshair icon for capturing element context
 *
 * Placed in top-right corner of capturable widgets.
 * Triggers context capture when clicked.
 *
 * Each icon initializes the runtime with its own strategy. The RuntimeManager
 * is a singleton but will be re-initialized if the adapter/strategy changes.
 */
import { useCallback } from 'react';
import {
  CaptureStrategy,
  createReactAdapter,
  ReactAdapter,
} from '@domscribe/react';
import { RuntimeManager } from '@domscribe/runtime';

interface CaptureIconProps {
  position?: 'top-right' | 'bottom-right';
  strategy?: CaptureStrategy;
}

// Track adapters per strategy to reuse them
const adapters = new Map<CaptureStrategy, ReactAdapter>();

// Track which strategy the runtime was last initialized with
let currentInitializedStrategy: CaptureStrategy | null = null;

async function initRuntime(strategy: CaptureStrategy): Promise<RuntimeManager> {
  const runtime = RuntimeManager.getInstance();

  // Re-initialize if strategy changed or not yet initialized
  if (currentInitializedStrategy !== strategy) {
    // Get or create adapter for this strategy
    let adapter = adapters.get(strategy);
    if (!adapter) {
      adapter = createReactAdapter({
        strategy,
        debug: true,
      });
      adapters.set(strategy, adapter);
    }

    await runtime.initialize({ adapter, debug: true });
    currentInitializedStrategy = strategy;

    console.log('[CaptureIcon] Runtime initialized:', {
      strategy,
      activeStrategy: adapter.getActiveStrategy(),
      hasDevTools: adapter.hasDevToolsAccess(),
    });
  }

  return runtime;
}

export function CaptureIcon({
  position = 'top-right',
  strategy = CaptureStrategy.BEST_EFFORT,
}: CaptureIconProps) {
  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      // Find the parent capture-widget element
      const button = event.currentTarget;
      const widget = button.closest(
        '.capture-widget, .capturable-widget, .demo-box',
      );

      if (!widget || !(widget instanceof HTMLElement)) {
        console.warn('[CaptureIcon] Could not find parent widget element');
        return;
      }

      try {
        const runtime = await initRuntime(strategy);
        const context = await runtime.captureContextForElement(widget);

        console.log('[CaptureIcon] Context captured:', {
          element: widget,
          tagName: widget.tagName,
          strategy,
          context,
        });
      } catch (error) {
        console.error('[CaptureIcon] Capture failed:', error);
      }
    },
    [strategy],
  );

  return (
    <button
      type="button"
      className={`capture-icon ${position}`}
      title="Capture context"
      onClick={handleClick}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle */}
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Top tick */}
        <line
          x1="8"
          y1="2"
          x2="8"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Bottom tick */}
        <line
          x1="8"
          y1="11"
          x2="8"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Left tick */}
        <line
          x1="2"
          y1="8"
          x2="5"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Right tick */}
        <line
          x1="11"
          y1="8"
          x2="14"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
