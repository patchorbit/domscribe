import { SessionPayloadSchema, type StoredSession } from './schema.js';
import { isoWeek } from './iso-week.js';

export interface Env {
  SESSIONS: KVNamespace;
  /** Comma-separated list of allowed origins for the `/v1/wau` read endpoint. Empty = read disabled. */
  WAU_READ_TOKEN?: string;
  /** Defaults to 84d (12 weeks). Overridable for tests. */
  SESSION_TTL_SECONDS?: string;
}

const MAX_BODY_BYTES = 1024;
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 84; // 12 weeks
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/v1/session' && request.method === 'POST') {
      return handleSession(request, env, ctx);
    }

    if (url.pathname.startsWith('/v1/wau/') && request.method === 'GET') {
      return handleWauRead(url, env);
    }

    if (url.pathname === '/healthz' && request.method === 'GET') {
      return text(200, 'ok');
    }

    if (url.pathname === '/v1/session') {
      return text(405, 'method not allowed', { allow: 'POST' });
    }

    return text(404, 'not found');
  },
};

async function handleSession(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return text(415, 'unsupported media type');
  }

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return text(413, 'payload too large');
  }

  let raw: string;
  try {
    raw = await readCapped(request, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return text(413, 'payload too large');
    }
    return text(400, 'could not read body');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return text(400, 'invalid json');
  }

  const result = SessionPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return text(400, 'invalid payload');
  }
  const payload = result.data;

  const week = isoWeek(new Date());
  const key = `session:${week}:${payload.session_id}`;
  const value: StoredSession = {
    protocol_version: payload.protocol_version,
    daemon_version: payload.daemon_version,
    platform: payload.platform,
    node_version: payload.node_version,
    primary_framework: payload.primary_framework,
    first_seen_at: new Date().toISOString(),
  };
  const ttl = Number(env.SESSION_TTL_SECONDS) || DEFAULT_TTL_SECONDS;

  // waitUntil lets the response return immediately while the KV write completes
  // in the background — matches the fire-and-forget contract the relay client uses.
  // KV `put` is idempotent on overwrite, so a duplicate POST within the same week
  // just refreshes `first_seen_at`; we deliberately do not read-before-write.
  ctx.waitUntil(
    env.SESSIONS.put(key, JSON.stringify(value), { expirationTtl: ttl }),
  );

  return text(204, '');
}

async function handleWauRead(url: URL, env: Env): Promise<Response> {
  if (!env.WAU_READ_TOKEN) {
    return text(404, 'not found');
  }
  const provided = url.searchParams.get('token') ?? '';
  if (!constantTimeEqual(provided, env.WAU_READ_TOKEN)) {
    return text(403, 'forbidden');
  }

  const week = url.pathname.slice('/v1/wau/'.length);
  if (!/^\d{4}-W\d{2}$/.test(week)) {
    return text(400, 'invalid week');
  }

  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await env.SESSIONS.list({
      prefix: `session:${week}:`,
      cursor,
    });
    count += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return json(200, { week, weekly_active_sessions: count });
}

class PayloadTooLargeError extends Error {}

async function readCapped(request: Request, cap: number): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function text(
  status: number,
  body: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'content-type': 'text/plain; charset=utf-8',
      ...extra,
    },
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
