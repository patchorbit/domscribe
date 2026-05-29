# `@domscribe/telemetry-worker`

Cloudflare Worker + KV backend for opt-in relay telemetry, per
[RFC 0002 §4](../../docs/rfcs/0002-protocol-v1-execution.md) and
[issue #34](https://github.com/patchorbit/domscribe/issues/34).

This is **deployment infrastructure**, not an npm-published package. It lives
under `infra/` (outside `packages/*`) so the protocol package's SemVer surface
is unaffected by changes here.

## Endpoint contract

```
POST https://telemetry.domscribe.dev/v1/session
content-type: application/json

{
  "protocol_version":  "1.0.0",
  "daemon_version":    "0.5.2",
  "session_id":        "rotating-per-install id, url-safe, 8–64 chars",
  "platform":          "darwin" | "linux" | "win32" | "freebsd" | "openbsd",
  "node_version":      "v20.10.0",
  "primary_framework": "react" | "vue" | "next" | "nuxt" | "svelte" | "astro" | "solid" | "unknown"
}
```

- **Success:** `204 No Content`, empty body.
- **Failure:** `4xx` text body. Client treats any non-`204` as drop-on-floor.
- **Strict schema:** any unknown field is rejected with `400`. This is the
  privacy guarantee — a relay that adds a new field is rejected until the
  schema is bumped here in lockstep.
- **Body cap:** 1024 bytes. Anything larger is `413`.
- **No auth:** the endpoint is public-write. Cloudflare's free DDoS layer
  protects it; per-account KV write ceiling (1000 writes/s) bounds the worst
  case far above projected scale (see [Load testing](#load-testing)).

## Storage scheme

```
KV namespace: SESSIONS
Key:          session:<YYYY-Www>:<session_id>
Value:        { protocol_version, daemon_version, platform, node_version,
                primary_framework, first_seen_at }
TTL:          12 weeks (overridable via SESSION_TTL_SECONDS)
```

- Session ID is the **key partition**, not a stored field — that gives us
  weekly-active counting via prefix-scan without ever needing to read+rewrite.
- Duplicate POSTs within the same week are idempotent overwrites.
- `first_seen_at` resets on each POST; if you need true first-contact, change
  to a `get-then-put` pattern at the cost of one extra KV read per request.

## Read endpoint (operator only)

```
GET https://telemetry.domscribe.dev/v1/wau/<YYYY-Www>?token=<WAU_READ_TOKEN>
```

Returns `{ "week": "...", "weekly_active_sessions": <n> }`. Gated on the
`WAU_READ_TOKEN` secret; if the secret is unset, the endpoint returns `404`
(disabled by default).

Used to read the DOP falsifier signal — ≥10 WAU relay sessions by 2026-08-20.

---

## Deployment runbook (primary path — Cloudflare)

**Prerequisites:** a Cloudflare account, the `domscribe.dev` zone added,
and `wrangler` ≥ 4.0 installed (`pnpm dlx wrangler --version`).

### 1. Authenticate

```bash
cd infra/telemetry-worker
pnpm install
pnpm dlx wrangler login
```

### 2. Provision the KV namespaces

```bash
# production
pnpm dlx wrangler kv:namespace create SESSIONS

# preview (used by `wrangler dev` and CI)
pnpm dlx wrangler kv:namespace create SESSIONS --preview
```

Each prints an `id`. Paste them into `wrangler.toml` in the
`[[kv_namespaces]]` block (replace `REPLACE_WITH_PROD_KV_ID` and
`REPLACE_WITH_PREVIEW_KV_ID`). Commit the `wrangler.toml` with the real IDs —
namespace IDs are not secret; they're scoped to your Cloudflare account and
mean nothing without an auth token.

### 3. Set the read-side secret (optional but recommended)

```bash
pnpm dlx wrangler secret put WAU_READ_TOKEN
# paste a long random string; store it in the team password manager
```

If you skip this, `/v1/wau/...` returns `404` and the WAU readout is
unavailable — the write path still works.

### 4. Deploy

```bash
pnpm deploy   # wraps `wrangler deploy`
```

First deploy needs the `telemetry` subdomain registered on the
`domscribe.dev` zone. Cloudflare will create the worker-route binding from
the `routes` block in `wrangler.toml` automatically; if the zone is not
attached to the account, the deploy fails fast with a clear message.

### 5. Smoke test

```bash
# health check
curl -i https://telemetry.domscribe.dev/healthz
# expect: HTTP/2 200, body "ok"

# write
curl -i -X POST https://telemetry.domscribe.dev/v1/session \
  -H 'content-type: application/json' \
  -d '{
    "protocol_version":  "1.0.0",
    "daemon_version":    "0.5.2",
    "session_id":        "smoke-test-aaaaaaaa",
    "platform":          "linux",
    "node_version":      "v20.10.0",
    "primary_framework": "react"
  }'
# expect: HTTP/2 204, empty body

# readout (replace TOKEN and WEEK)
curl -i "https://telemetry.domscribe.dev/v1/wau/2026-W22?token=TOKEN"
# expect: HTTP/2 200, {"week":"2026-W22","weekly_active_sessions":1}
```

### 6. Document the endpoint URL

Once deployed, post the URL and the read-token storage location to the
sprint thread. The relay client (issue-34-client) hard-codes
`https://telemetry.domscribe.dev/v1/session` — if for any reason the
production URL differs, the relay needs a corresponding patch before the
client half can verify.

---

## Rollback path — Vercel Edge Function

Triggered by **sprint 2491 replanning trigger #2**: Cloudflare provisioning
blocked > 1 day (zone not attachable, account-creation friction, etc).

The fallback is functionally identical: same payload, same response codes,
same storage semantics. Backend swaps Cloudflare KV → Vercel KV (Upstash
Redis under the hood).

Source: [`rollback-vercel/`](./rollback-vercel/). To activate:

```bash
cd infra/telemetry-worker/rollback-vercel
pnpm install
vercel link                          # link to a fresh Vercel project
vercel kv create domscribe-telemetry # provisions Vercel KV + injects env vars
vercel env add WAU_READ_TOKEN        # add to all environments
vercel --prod
```

Then point the CNAME `telemetry.domscribe.dev` at the Vercel deployment
domain (in Cloudflare DNS, even though the Worker is gone). The relay
client URL stays the same — no code change required.

**Trade-offs against the Cloudflare primary path:**

| Aspect                    | Cloudflare Worker                   | Vercel Edge Function                                                    |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| Fire-and-forget           | Native via `ctx.waitUntil`          | Awaits the KV write — relies on client-side 2s timeout to bound latency |
| Per-account write ceiling | 1000/s (KV)                         | Upstash Redis: 1000 req/s default tier                                  |
| Cost at projected scale   | ~$0/mo (KV free tier 1k writes/day) | ~$0/mo (Vercel KV free tier)                                            |
| WAU readout               | KV `list` prefix-scan, paginated    | Redis `SCAN` with `MATCH` pattern (would need a small handler change)   |

The WAU readout is the only behaviour gap: the rollback only ships the
write path. If activated, file a follow-up to port the WAU handler to
Redis `SCAN` before 2026-08-20 so the falsifier signal stays measurable.

---

## Local development

```bash
cd infra/telemetry-worker
pnpm install
pnpm dev          # wrangler dev — local server on http://127.0.0.1:8787
# in another shell:
pnpm load-test    # drives the local server
```

`wrangler dev` runs the same Worker code under miniflare with an in-memory
KV. Data does not persist across restarts.

## Testing

```bash
pnpm test         # vitest under @cloudflare/vitest-pool-workers
                  # runs the Worker against an in-memory KV — no Cloudflare account needed
```

Test coverage (`test/`):

- Schema strict-mode (unknown fields rejected; privacy guarantee)
- Body-size cap via both declared `content-length` and streamed enforcement
- KV write semantics (key partition by ISO week + session_id, idempotent
  duplicates, `first_seen_at` populated server-side)
- Routing (404 / 405 / `Allow: POST` / `/healthz`)
- Read-endpoint auth (constant-time token comparison, `404` when disabled,
  `400` on malformed week)
- ISO week boundary cases (year-start/year-end rollovers, ISO 53-week years)

## Load testing

[`scripts/load-test.ts`](./scripts/load-test.ts) drives the configured
endpoint with concurrent POSTs and reports p50/p95/p99 latency + error rate.

```bash
# against local wrangler dev:
pnpm load-test

# against a deployed environment:
TELEMETRY_URL=https://telemetry.domscribe.dev/v1/session \
  CONCURRENCY=50 TOTAL=10000 pnpm load-test
```

**Headroom calculation** — the projected steady-state load is far below
any platform ceiling. Working from the DOP falsifier (≥10 weekly-active
relay sessions by 2026-08-20):

| Scale                        | Writes/week | Writes/min | % of KV ceiling (1000/s) |
| ---------------------------- | ----------- | ---------- | ------------------------ |
| 10 WAU (falsifier threshold) | 10          | 0.001      | 0.0001%                  |
| 1 000 WAU                    | 7 000       | 0.7        | 0.07%                    |
| 10 000 WAU                   | 70 000      | 7          | 0.7%                     |
| 100 000 WAU                  | 700 000     | 70         | 7%                       |

Per-key throttling (1 write/sec) does not apply: each `session_id` produces
a unique key. The realistic ceiling is per-account (1000/s globally) and
we have ~14x headroom even at 100k WAU. Load-test acceptance:
**p95 < 500ms against the deployed endpoint, error rate < 1%**.

## Privacy

The payload contains **only** the fields enumerated in the schema. Strict
mode (`z.object().strict()`) rejects any unknown field with `400`, so the
relay can never silently leak content by adding a new field — the deploy
will reject it until both sides are updated. We never log request bodies;
Cloudflare's Workers logs capture URL, status, and timing only.

Stored values are retained for 12 weeks. To purge a specific session
on user request, run:

```bash
pnpm dlx wrangler kv:key delete --binding=SESSIONS "session:<week>:<session_id>"
```

Bulk purge of an entire week:

```bash
pnpm dlx wrangler kv:bulk delete --binding=SESSIONS \
  <(pnpm dlx wrangler kv:key list --binding=SESSIONS --prefix="session:<week>:" | jq -r '.[].name')
```
