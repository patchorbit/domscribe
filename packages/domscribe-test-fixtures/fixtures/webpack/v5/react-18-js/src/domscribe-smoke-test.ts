/**
 * Domscribe Smoke Test - Console utilities for testing runtime context capture
 *
 * Usage in browser console:
 *   domscribe.captureElement(element)      - Capture context for element (current strategy)
 *   domscribe.captureSelector(selector)    - Capture context for selector (current strategy)
 *   domscribe.setStrategy('fiber'|'devtools'|'best-effort') - Change strategy
 *   domscribe.listTracked()                - List all tracked element IDs
 *   domscribe.status()                     - Show runtime status
 */

import { RuntimeManager } from '@domscribe/runtime';
import {
  CaptureStrategy,
  createReactAdapter,
  ReactAdapter,
} from '@domscribe/react';

// Track adapters per strategy
const adapters = new Map<CaptureStrategy, ReactAdapter>();
let currentStrategy: CaptureStrategy = CaptureStrategy.FIBER;
let runtimeInitialized = false;

function getStrategyFromString(str: string): CaptureStrategy | null {
  const normalized = str.toLowerCase().replace(/[_-]/g, '');
  switch (normalized) {
    case 'fiber':
      return CaptureStrategy.FIBER;
    case 'devtools':
      return CaptureStrategy.DEVTOOLS;
    case 'besteffort':
      return CaptureStrategy.BEST_EFFORT;
    default:
      return null;
  }
}

async function initializeWithStrategy(
  strategy: CaptureStrategy,
): Promise<RuntimeManager> {
  const runtime = RuntimeManager.getInstance();

  if (!runtimeInitialized || currentStrategy !== strategy) {
    let adapter = adapters.get(strategy);
    if (!adapter) {
      adapter = createReactAdapter({
        strategy,
        debug: true,
      });
      adapters.set(strategy, adapter);
    }

    await runtime.initialize({
      adapter,
      debug: true,
    });

    currentStrategy = strategy;
    runtimeInitialized = true;

    console.log('[domscribe] Runtime initialized');
    console.log('[domscribe] Strategy:', strategy);
    console.log('[domscribe] Adapter:', adapter.name, adapter.version);
    console.log('[domscribe] Active strategy:', adapter.getActiveStrategy());
    console.log('[domscribe] Has DevTools:', adapter.hasDevToolsAccess());
  }

  return runtime;
}

async function ensureRuntimeInitialized(): Promise<RuntimeManager> {
  return initializeWithStrategy(currentStrategy);
}

async function setStrategy(
  strategyName: 'fiber' | 'devtools' | 'best-effort',
): Promise<void> {
  const strategy = getStrategyFromString(strategyName);
  if (!strategy) {
    console.error(
      `[domscribe] Invalid strategy: ${strategyName}. Use 'fiber', 'devtools', or 'best-effort'`,
    );
    return;
  }

  await initializeWithStrategy(strategy);
  console.log(`[domscribe] Strategy changed to: ${strategy}`);
}

async function captureElement(element: HTMLElement): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    console.error('[domscribe] Error: Please provide an HTMLElement');
    return;
  }

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  console.log(
    `[domscribe] Captured context for element (${currentStrategy}):`,
    element,
  );
  console.log('[domscribe] Context:', context);

  if (context) {
    console.table({
      Strategy: currentStrategy,
      'Has Props': !!context.componentProps,
      'Has State': !!context.componentState,
      'Props Keys': context.componentProps
        ? Object.keys(context.componentProps).join(', ')
        : 'none',
      'State Keys': context.componentState
        ? Object.keys(context.componentState).join(', ')
        : 'none',
    });

    if (context.componentProps) {
      console.log('[domscribe] Props:', context.componentProps);
    }
    if (context.componentState) {
      console.log('[domscribe] State:', context.componentState);
    }
  }
}

/**
 * Capture runtime context and return structured data (for E2E test assertions).
 * Unlike captureElement(), this returns the result instead of just logging it.
 */
async function captureElementData(element: HTMLElement): Promise<{
  componentName: string | null;
  props: Record<string, unknown> | null;
  propsKeys: string[];
  state: Record<string, unknown> | null;
  stateKeys: string[];
  dataDs: string | null;
} | null> {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const runtime = await ensureRuntimeInitialized();
  const context = await runtime.captureContextForElement(element);

  // Get component name from element info (not part of RuntimeContext)
  const dataDs = element.getAttribute('data-ds');
  let componentName: string | null = null;
  if (dataDs) {
    const info = runtime.getElementInfo(dataDs);
    componentName = info?.componentName ?? null;
  }

  const props = (context?.componentProps as Record<string, unknown>) ?? null;
  const state = (context?.componentState as Record<string, unknown>) ?? null;

  return {
    componentName,
    props,
    propsKeys: props ? Object.keys(props) : [],
    state,
    stateKeys: state ? Object.keys(state) : [],
    dataDs,
  };
}

async function captureSelector(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement | null;

  if (!element) {
    console.error(`[domscribe] No element found for selector: ${selector}`);
    return;
  }

  await captureElement(element);
}

async function listTracked(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();
  const ids = runtime.getAllEntryIds();

  console.log(`[domscribe] Tracked elements: ${ids.length}`);
  if (ids.length > 0) {
    console.table(
      ids.map((id) => ({
        id,
        element: document.querySelector(`[data-ds="${id}"]`)?.tagName || 'N/A',
      })),
    );
  }
}

async function status(): Promise<void> {
  const runtime = await ensureRuntimeInitialized();
  const adapter = adapters.get(currentStrategy);

  console.log('[domscribe] Status:');
  console.table({
    Initialized: runtime.isReady(),
    'Current Strategy': currentStrategy,
    'Tracked Elements': runtime.getTrackedCount(),
    Adapter: adapter?.name || 'none',
    'Active Strategy': adapter?.getActiveStrategy() || 'none',
    'React Version': adapter?.getReactVersion() || 'unknown',
    'Has DevTools': adapter?.hasDevToolsAccess() || false,
  });
}

async function testAllStrategies(element: HTMLElement): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    console.error('[domscribe] Error: Please provide an HTMLElement');
    return;
  }

  console.log('[domscribe] Testing all strategies on element:', element);
  console.log('='.repeat(60));

  for (const strategy of [
    CaptureStrategy.FIBER,
    CaptureStrategy.DEVTOOLS,
    CaptureStrategy.BEST_EFFORT,
  ]) {
    console.log(`\n[domscribe] Testing ${strategy}...`);
    const runtime = await initializeWithStrategy(strategy);
    const context = await runtime.captureContextForElement(element);

    console.log(`[domscribe] ${strategy} result:`, {
      hasProps: !!context?.componentProps,
      hasState: !!context?.componentState,
      props: context?.componentProps,
      state: context?.componentState,
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('[domscribe] All strategies tested');
}

// Expose utilities globally
const domscribeUtils = {
  captureElement,
  captureElementData,
  captureSelector,
  setStrategy,
  listTracked,
  status,
  testAllStrategies,
  strategies: {
    FIBER: CaptureStrategy.FIBER,
    DEVTOOLS: CaptureStrategy.DEVTOOLS,
    BEST_EFFORT: CaptureStrategy.BEST_EFFORT,
  },
};

(window as unknown as Record<string, unknown>).domscribe = domscribeUtils;

console.log('[domscribe] Smoke test utilities loaded. Available commands:');
console.log(
  '  domscribe.captureElement(element) - Capture context for element',
);
console.log(
  '  domscribe.captureSelector(selector) - Capture context for selector',
);
console.log(
  "  domscribe.setStrategy('fiber'|'devtools'|'best-effort') - Change strategy",
);
console.log(
  '  domscribe.testAllStrategies(element) - Test all strategies on element',
);
console.log('  domscribe.listTracked() - List tracked elements');
console.log('  domscribe.status() - Show runtime status');
