import { describe, expect, it, vi } from 'vitest';
import { createWebMcpReferenceComparator } from './comparator.js';

describe('createWebMcpReferenceComparator', () => {
  it('marks the comparator as in-repo-fallback (caveat surfaces on /benchmark)', () => {
    const c = createWebMcpReferenceComparator({
      bridge: { evaluate: vi.fn() },
    });
    expect(c.externalValidity).toBe('in-repo-fallback');
    expect(c.name).toBe('webmcp-reference');
  });

  it('returns outcome=refused for S4 (props/state) with a recorded reason', async () => {
    const c = createWebMcpReferenceComparator({
      bridge: { evaluate: vi.fn() },
    });
    const res = await c.run({
      scenarioId: 'S4',
      fixture: 'vite',
      request: { instancePath: 'App.Button[0]' },
    });
    expect(res.outcome).toBe('refused');
    expect(res.errorMessage).toMatch(/props\/state/);
  });

  it('returns outcome=refused for S5 (annotation→source) with a recorded reason', async () => {
    const c = createWebMcpReferenceComparator({
      bridge: { evaluate: vi.fn() },
    });
    const res = await c.run({
      scenarioId: 'S5',
      fixture: 'next',
      request: { annotationId: 'a-1' },
    });
    expect(res.outcome).toBe('refused');
    expect(res.errorMessage).toMatch(/source roundtrip/);
  });

  it('returns outcome=pass with raw value when S1 selector resolves', async () => {
    const c = createWebMcpReferenceComparator({
      bridge: { evaluate: vi.fn().mockResolvedValue('<div>x</div>') },
    });
    const res = await c.run({
      scenarioId: 'S1',
      fixture: 'nuxt',
      request: { selector: 'div' },
    });
    expect(res.outcome).toBe('pass');
    expect(res.rawResponse).toBe('<div>x</div>');
  });

  it('catches bridge throws and returns outcome=wrong with the error', async () => {
    const c = createWebMcpReferenceComparator({
      bridge: {
        evaluate: vi.fn().mockRejectedValue(new Error('socket closed')),
      },
    });
    const res = await c.run({
      scenarioId: 'S1',
      fixture: 'vite',
      request: { selector: 'div' },
    });
    expect(res.outcome).toBe('wrong');
    expect(res.errorMessage).toBe('socket closed');
  });
});
