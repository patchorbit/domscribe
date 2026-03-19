// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInitialize = vi.fn();
const mockGetInstance = vi.fn(() => ({ initialize: mockInitialize }));
const mockCreateReactAdapter = vi.fn(() => ({ name: 'react-adapter' }));
const mockInitOverlay = vi.fn();

vi.mock('@domscribe/runtime', () => ({
  RuntimeManager: { getInstance: mockGetInstance },
}));

vi.mock('@domscribe/react', () => ({
  createReactAdapter: mockCreateReactAdapter,
}));

vi.mock('@domscribe/overlay', () => ({
  initOverlay: mockInitOverlay,
}));

describe('auto-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[
      '__DOMSCRIBE_OVERLAY_OPTIONS__'
    ];
  });

  it('should initialize runtime and react adapter', async () => {
    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockGetInstance).toHaveBeenCalled();
    expect(mockCreateReactAdapter).toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalledWith({
      adapter: { name: 'react-adapter' },
    });
  });

  it('should initialize overlay when __DOMSCRIBE_OVERLAY_OPTIONS__ is set', async () => {
    (globalThis as Record<string, unknown>)['__DOMSCRIBE_OVERLAY_OPTIONS__'] = {
      initialMode: 'collapsed',
    };

    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockInitOverlay).toHaveBeenCalled();
  });

  it('should not initialize overlay when __DOMSCRIBE_OVERLAY_OPTIONS__ is not set', async () => {
    await import('./index.js');
    await vi.dynamicImportSettled();

    expect(mockInitOverlay).not.toHaveBeenCalled();
  });
});
