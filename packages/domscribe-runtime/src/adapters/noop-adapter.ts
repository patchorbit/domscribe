/**
 * No-op framework adapter (fallback)
 * @module @domscribe/runtime/adapters/noop-adapter
 */

import type { FrameworkAdapter } from './adapter.interface.js';

/**
 * No-op adapter that returns null for all operations
 *
 * Used as a fallback when no framework adapter is provided. It ensures
 * graceful degradation.
 */
export class NoopAdapter implements FrameworkAdapter {
  readonly name = 'noop';
  readonly version = undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getComponentInstance(_element: HTMLElement): null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  captureProps(_component: unknown): null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  captureState(_component: unknown): null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getComponentName(_component: unknown): null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getComponentTree(_component: unknown): null {
    return null;
  }
}
