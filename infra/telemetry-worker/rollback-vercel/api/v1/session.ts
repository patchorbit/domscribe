/**
 * Vercel Edge Function — fallback telemetry endpoint.
 *
 * Use this only if Cloudflare Worker provisioning is blocked > 1 day
 * (sprint 2491 replanning trigger #2). Behaviour matches the Worker
 * one-for-one; the storage backend swaps from Cloudflare KV to Vercel KV
 * (Upstash Redis under the hood).
 *
 * Deploy:
 *   vercel link
 *   vercel kv create domscribe-telemetry
 *   vercel env add WAU_READ_TOKEN     # paste secret; preview + production
 *   vercel --prod
 *
 * Endpoint URL after deploy: https://<vercel-domain>/api/v1/session
 * Point the CNAME `telemetry.domscribe.dev` at the Vercel domain so the
 * relay's hard-coded URL keeps working without a code change.
 */

import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const MAX_BODY_BYTES = 1024;
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 84;
const PLATFORMS = new Set(['darwin', 'linux', 'win32', 'freebsd', 'openbsd']);
const FRAMEWORKS = new Set([
  'react',
  'vue',
  'next',
  'nuxt',
  'svelte',
  'astro',
  'solid',
  'unknown',
]);
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const NODE_SEMVER = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;

const ALLOWED_KEYS = new Set([
  'protocol_version',
  'daemon_version',
  'session_id',
  'platform',
  'node_version',
  'primary_framework',
]);

const SECURITY: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return text(405, 'method not allowed', { allow: 'POST' });
  }
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return text(415, 'unsupported media type');
  }
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return text(413, 'payload too large');
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return text(413, 'payload too large');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return text(400, 'invalid json');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return text(400, 'invalid payload');
  }
  for (const k of Object.keys(parsed)) {
    if (!ALLOWED_KEYS.has(k)) return text(400, 'invalid payload');
  }
  for (const k of ALLOWED_KEYS) {
    if (typeof parsed[k] !== 'string') return text(400, 'invalid payload');
  }
  const protocol_version = parsed.protocol_version as string;
  const daemon_version = parsed.daemon_version as string;
  const session_id = parsed.session_id as string;
  const platform = parsed.platform as string;
  const node_version = parsed.node_version as string;
  const primary_framework = parsed.primary_framework as string;
  if (!SEMVER.test(protocol_version)) return text(400, 'invalid payload');
  if (!SEMVER.test(daemon_version)) return text(400, 'invalid payload');
  if (!SESSION_ID.test(session_id)) return text(400, 'invalid payload');
  if (!PLATFORMS.has(platform)) return text(400, 'invalid payload');
  if (!NODE_SEMVER.test(node_version)) return text(400, 'invalid payload');
  if (!FRAMEWORKS.has(primary_framework)) return text(400, 'invalid payload');

  const week = isoWeek(new Date());
  const key = `session:${week}:${session_id}`;
  const value = JSON.stringify({
    protocol_version,
    daemon_version,
    platform,
    node_version,
    primary_framework,
    first_seen_at: new Date().toISOString(),
  });
  const ttl = Number(process.env.SESSION_TTL_SECONDS) || DEFAULT_TTL_SECONDS;

  // Vercel Edge does not expose a `waitUntil` analogue for fire-and-forget;
  // we await the write but the client's 2s timeout still applies, and Vercel KV
  // p99 is well under that budget. If a write spikes past 2s the client times out
  // and we drop the sample — acceptable for fire-and-forget telemetry.
  await kv.set(key, value, { ex: ttl });

  return text(204, '');
}

function text(
  status: number,
  body: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      ...SECURITY,
      'content-type': 'text/plain; charset=utf-8',
      ...extra,
    },
  });
}

function isoWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
