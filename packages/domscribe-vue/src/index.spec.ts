import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./internals/component-resolver.js', () => ({
  resolveComponentFromElement: vi.fn().mockReturnValue({ success: false }),
  checkVNodeAccess: vi.fn().mockReturnValue(false),
  findNearestUserComponent: vi.fn((instance) => instance),
}));

vi.mock('./internals/props-extractor.js', () => ({
  extractProps: vi.fn().mockReturnValue({ success: true, props: {} }),
}));

vi.mock('./internals/state-extractor.js', () => ({
  extractState: vi.fn().mockReturnValue({ success: true, state: {} }),
}));

const exports = await import('./index.js');

describe('@domscribe/vue public API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should export VueAdapter class', () => {
    expect(exports.VueAdapter).toBeDefined();
    expect(typeof exports.VueAdapter).toBe('function');
  });

  it('should export createVueAdapter factory', () => {
    expect(exports.createVueAdapter).toBeDefined();
    expect(typeof exports.createVueAdapter).toBe('function');
  });

  it('should create a VueAdapter instance via factory', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn().mockReturnValue([]),
    });

    const adapter = exports.createVueAdapter();

    expect(adapter).toBeInstanceOf(exports.VueAdapter);
    expect(adapter.name).toBe('vue');
  });
});
