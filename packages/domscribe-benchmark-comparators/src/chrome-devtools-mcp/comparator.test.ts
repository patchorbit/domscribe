import { describe, expect, it, vi } from 'vitest';
import { createChromeDevtoolsMcpComparator } from './comparator.js';
import type { ChromeDevtoolsMcpClient } from './client.js';

function fakeClient(
  overrides: Partial<ChromeDevtoolsMcpClient> = {},
): ChromeDevtoolsMcpClient {
  return {
    version: 'test-0.0.0',
    call: vi.fn().mockResolvedValue({ ok: true, content: 'ok' }),
    dispose: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('createChromeDevtoolsMcpComparator', () => {
  it('marks the comparator as external (no caveat on /benchmark)', () => {
    const c = createChromeDevtoolsMcpComparator({ client: fakeClient() });
    expect(c.externalValidity).toBe('external');
    expect(c.name).toBe('chrome-devtools-mcp');
  });

  it('records the client version verbatim (pinned in root devDependencies)', () => {
    const c = createChromeDevtoolsMcpComparator({
      client: fakeClient({ version: '1.4.7' }),
    });
    expect(c.version).toBe('1.4.7');
  });

  it('returns outcome=pass with raw content when the client succeeds', async () => {
    const c = createChromeDevtoolsMcpComparator({
      client: fakeClient({
        call: vi.fn().mockResolvedValue({ ok: true, content: { dom: '<x/>' } }),
      }),
    });
    const res = await c.run({
      scenarioId: 'S1',
      fixture: 'vite',
      request: { url: 'http://localhost' },
    });
    expect(res.outcome).toBe('pass');
    expect(res.rawResponse).toEqual({ dom: '<x/>' });
  });

  it('returns outcome=refused when the client reports refusal', async () => {
    const c = createChromeDevtoolsMcpComparator({
      client: fakeClient({
        call: vi
          .fn()
          .mockResolvedValue({ ok: false, refusal: 'no source position tool' }),
      }),
    });
    const res = await c.run({
      scenarioId: 'S2',
      fixture: 'nuxt',
      request: {},
    });
    expect(res.outcome).toBe('refused');
    expect(res.errorMessage).toBe('no source position tool');
  });

  it('catches transport throws and returns outcome=wrong with the error', async () => {
    const c = createChromeDevtoolsMcpComparator({
      client: fakeClient({
        call: vi.fn().mockRejectedValue(new Error('mcp stdio EOF')),
      }),
    });
    const res = await c.run({
      scenarioId: 'S3',
      fixture: 'next',
      request: {},
    });
    expect(res.outcome).toBe('wrong');
    expect(res.errorMessage).toBe('mcp stdio EOF');
  });
});
