import { describe, expect, it, beforeEach } from 'vitest';
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import worker from '../src/index.js';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    SESSIONS: KVNamespace;
    WAU_READ_TOKEN?: string;
    SESSION_TTL_SECONDS?: string;
  }
}

const VALID_PAYLOAD = {
  protocol_version: '1.0.0',
  daemon_version: '0.5.2',
  session_id: 'abc12345xyz',
  platform: 'linux',
  node_version: 'v20.10.0',
  primary_framework: 'react',
} as const;

async function post(body: unknown, init: RequestInit = {}) {
  const req = new Request('https://telemetry.domscribe.dev/v1/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function get(path: string) {
  const req = new Request(`https://telemetry.domscribe.dev${path}`);
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function clearKv() {
  let cursor: string | undefined;
  do {
    const page = await env.SESSIONS.list({ cursor });
    await Promise.all(page.keys.map((k) => env.SESSIONS.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

beforeEach(async () => {
  await clearKv();
});

describe('POST /v1/session', () => {
  it('accepts a valid payload and returns 204', async () => {
    const res = await post(VALID_PAYLOAD);
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe('');
  });

  it('persists the session to KV under the ISO-week prefix', async () => {
    await post(VALID_PAYLOAD);
    const page = await env.SESSIONS.list({ prefix: 'session:' });
    expect(page.keys).toHaveLength(1);
    expect(page.keys[0]!.name).toMatch(/^session:\d{4}-W\d{2}:abc12345xyz$/);
    const stored = JSON.parse((await env.SESSIONS.get(page.keys[0]!.name))!);
    expect(stored).toMatchObject({
      protocol_version: '1.0.0',
      daemon_version: '0.5.2',
      platform: 'linux',
      node_version: 'v20.10.0',
      primary_framework: 'react',
    });
    expect(stored.first_seen_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    // Crucially: session_id is the key partition, not a stored field.
    expect(stored).not.toHaveProperty('session_id');
  });

  it('is idempotent on duplicate POST within the same week', async () => {
    await post(VALID_PAYLOAD);
    await post(VALID_PAYLOAD);
    const page = await env.SESSIONS.list({ prefix: 'session:' });
    expect(page.keys).toHaveLength(1);
  });

  it('rejects unknown fields (strict schema = privacy guarantee)', async () => {
    const res = await post({
      ...VALID_PAYLOAD,
      user_email: 'leaked@example.com',
    });
    expect(res.status).toBe(400);
    const page = await env.SESSIONS.list({ prefix: 'session:' });
    expect(page.keys).toHaveLength(0);
  });

  it('rejects payloads missing required fields', async () => {
    const { protocol_version: _, ...partial } = VALID_PAYLOAD;
    const res = await post(partial);
    expect(res.status).toBe(400);
  });

  it('rejects non-JSON content-type', async () => {
    const req = new Request('https://telemetry.domscribe.dev/v1/session', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(415);
  });

  it('rejects invalid JSON', async () => {
    const res = await post('{not json');
    expect(res.status).toBe(400);
  });

  it('rejects oversized payloads via declared content-length', async () => {
    const big = 'x'.repeat(2048);
    const res = await post(
      { ...VALID_PAYLOAD, session_id: big.slice(0, 64) },
      {
        headers: {
          'content-type': 'application/json',
          'content-length': '2048',
        },
      },
    );
    expect(res.status).toBe(413);
  });

  it('rejects oversized payloads streamed beyond the cap', async () => {
    // No content-length header → cap enforced by streaming reader.
    const padded = JSON.stringify({
      ...VALID_PAYLOAD,
      session_id: 'x'.repeat(64),
      // 2KB of padding inside a known field forces a strict-schema rejection only
      // *after* the body has been read — we want to confirm the cap fires first.
      _pad: 'y'.repeat(2048),
    });
    const req = new Request('https://telemetry.domscribe.dev/v1/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: padded,
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(413);
  });

  it("validates platform enum (rejects 'sunos')", async () => {
    const res = await post({ ...VALID_PAYLOAD, platform: 'sunos' });
    expect(res.status).toBe(400);
  });

  it("validates session_id charset (rejects '/' in id)", async () => {
    const res = await post({ ...VALID_PAYLOAD, session_id: 'abc/12345' });
    expect(res.status).toBe(400);
  });

  it('sets cache-control: no-store and security headers', async () => {
    const res = await post(VALID_PAYLOAD);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });
});

describe('routing', () => {
  it('returns 405 with Allow: POST on GET /v1/session', async () => {
    const res = await get('/v1/session');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('returns 200 ok on /healthz', async () => {
    const res = await get('/healthz');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('returns 404 on unknown paths', async () => {
    const res = await get('/v1/anything-else');
    expect(res.status).toBe(404);
  });
});

describe('GET /v1/wau/:week', () => {
  it('returns 403 without a valid token', async () => {
    const res = await get('/v1/wau/2026-W22?token=wrong');
    expect(res.status).toBe(403);
  });

  it('returns 400 on a malformed week', async () => {
    const res = await get('/v1/wau/not-a-week?token=test-token');
    expect(res.status).toBe(400);
  });

  it('counts unique sessions in a week', async () => {
    await post({ ...VALID_PAYLOAD, session_id: 'session-aaa' });
    await post({ ...VALID_PAYLOAD, session_id: 'session-bbb' });
    await post({ ...VALID_PAYLOAD, session_id: 'session-bbb' }); // duplicate
    // Find the week we just wrote into.
    const page = await env.SESSIONS.list({ prefix: 'session:' });
    const week = page.keys[0]!.name.split(':')[1]!;
    const res = await get(`/v1/wau/${week}?token=test-token`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      week: string;
      weekly_active_sessions: number;
    };
    expect(body.week).toBe(week);
    expect(body.weekly_active_sessions).toBe(2);
  });
});
