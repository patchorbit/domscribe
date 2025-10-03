# AGENTS.md

This is the living technical specification and implementation guide for Domscribe.

This file provides comprehensive guidance to AI coding agents when working with this repository. **READ THIS ENTIRE FILE CAREFULLY** before making any changes to understand the complete system architecture.

---

## General Guidelines for AI Coding Agents

### Key General Documents

1. `AGENTS.md`: The primary specification document for the entire project. Always follow the comprehensive guidance provided here.
2. `./agent_docs/TECHNICAL_CONCEPTS.md`: Consult this document to understand the technical concepts used in the project and to follow best practices for each concept. Detailed information about each technical concept can be found in the `./agent_docs/technical_concepts` directory, where each technical concept has its own file.
3. `./agent_docs/AGENT_ADAPTERS_SPEC.md`: This document specifies the agent adapter. Follow this specification closely when implementing the agent adapters.
4. `./agent_docs/AGENT_ADAPTERS_PHASED_PLAN.md`: Use this document to understand the full set of planned development phases for agent adapters. It provides a high-level overview of the direction and future capabilities for agent adapters, which is helpful context when implementing them.
5. `./agent_docs/ADAPTERS_POSTURE.md`: This document outlines our posture on framework adapters and agent adapters, balancing technical sustainability with ecosystem growth and business value.

### Rules

1. If you have any questions while implementing any aspect of the project, ask me. Do not make assumptions. It is better to ask for clarification than to proceed based on an incorrect assumption.
2. Write unit tests for all code you write, and ensure that overall code coverage remains above 80%.
3. Ensure all files conform to Prettier and ESLint rules.
4. Establish appropriate levels of abstraction in your code. Use your understanding of the project’s direction to inform these decisions.
5. Code should be readable, maintainable, and simple. Follow SOLID, DRY, YAGNI, KISS, and other clean code principles.
6. Write clear and concise documentation for every function, class, and module.
7. Use the latest stable features of the language and ecosystem, but carefully assess the maturity of libraries and understand tradeoffs before adopting them.

### Sprints

| Sprint    | Status         |
| --------- | -------------- |
| v1 launch | 🟢 In progress |
| v2 launch | 🔴 Not started |

Current sprint is "v1 launch".

#### Key Documents for the "v1 launch" sprint

1. `./agent_docs/IMPLEMENTATION_PLAN_v1.md`: This document outlines the implementation plan for the v1 launch of the project. Ensure you adhere to this plan.

---

## TL;DR

**Domscribe** lets you click or select UI in a live web app, capture precise **visual + runtime context**, and route it (locally or via a relay) to **AI coding agents** that generate source‑level changes. It is:

- **Adapter‑driven** (framework & agent) on a shared abstraction layer.
- **Annotation‑centric**: interactions become durable, structured annotations.
- **Manifest‑backed**: a DOM→source mapping manifest resolves UI elements to code.
- **Local‑first** with optional **cloud intelligence** for codebase‑aware agents.

---

## Canonical Vocabulary

To avoid drift, the following terms are used consistently across docs and code:

- **Annotation**: A structured record describing a user interaction (element click or text selection) plus context (visual, runtime, manifest snapshot, intent). Status lifecycle: `queued → processing → processed | failed → archived`.
- **Manifest**: The append‑only DOM→source mapping index keyed by an injected `data-ds` **Element ID** (8‑char nanoid). Maps to file path, component, and source ranges.
- **Transform Layer** (`@domscribe/transform`): Build‑time/dev‑time instrumentation that injects element IDs and produces/updates the manifest. Dev‑only; stripped in production.
- **Overlay** (`@domscribe/overlay`): In‑app UI providing element/text pickers, annotation management, and (Pro/Enterprise) AI chat.
- **Relay** (`@domscribe/relay`): A local development server process that exposes WebSocket + HTTP APIs, a Manifest Resolver, an Overlay asset server, and an MCP server for agent access.
- **Cloud Relay** (`@domscribe/cloud-relay`): A hosted service (Pro/Enterprise) that proxies agent calls, adds codebase/framework/team intelligence, and manages API keys server‑side.
- **Adapters**: Pluggable shims: framework adapters (`@domscribe/react`, `@domscribe/next`, `@domscribe/vue`, …) and agent adapters (`@domscribe/agent-claude`, `@domscribe/agent-openai`).

---

## Product Overview

**What it solves**

- AI agents lack **precise, visual, and runtime** context from the actual running UI.
- Developers manually hunt for source locations that correspond to pixels/states.

**What Domscribe provides**

1. **DOM‑aware selection** of elements or text to express intent.
2. **Runtime context capture** (props, state snapshots; phase‑gated) alongside visual context.
3. **Bidirectional resolution** between UI and source via the **Manifest Resolver**.
4. **Agent integrations** via MCP locally (Free) or via **Cloud Relay** (Pro/Enterprise) with codebase/framework/team intelligence.

**Primary Workflow**

1. Pick element or select text in the running app (via the Overlay).
2. Domscribe creates an **Annotation** including visual, runtime, and manifest context.
3. **Free**: a local MCP‑exposed workflow lets any compatible agent process annotations.
   **Pro/Enterprise**: Cloud Relay enhances the agent with codebase/framework/team intelligence and returns reviewed patches.
4. Changes are previewed and applied to source files (via your existing agent tooling/flow).

---

## Architecture at a Glance

```
Dev App (Vite/Next/Webpack)   ⇄    Domscribe Relay (local process)
 ├─ Transform Layer                 ├─ WebSocket (state & chat)
 ├─ Framework Adapter               ├─ Development HTTP APIs
 └─ Overlay injection               ├─ Manifest Resolver (p99 ≤10ms)
                                    ├─ Overlay Assets server
                                    └─ MCP Server (stdio JSON‑RPC)

                   (optional)
                         ╲
                          ╲  Cloud Relay (Pro/Enterprise)
                           ╲  ├─ Agent proxy (SDKs)
                            ╲ ├─ Intelligence (codebase/framework/team)
                             ╲└─ API key custody & governance
```

### Performance & Safety Principles

- **Dev‑only** transformations; **zero production overhead** (all attributes and hooks removed in production builds).
- **HMR‑friendly** with framework‑native caches; sub‑10ms incremental transform target.
- **Append‑only** manifest with fast indexed lookups and snapshot recovery.
- **Failsafe**: If Relay fails, the dev server continues unaffected; Overlay indicates degraded status.

---

## Core Capabilities

1. **Element & Text Selection** with visual feedback and bounding boxes.
2. **DOM→Source Mapping** via injected `data-ds` IDs and a structured manifest.
3. **Runtime Context Capture** (phase‑gated):
   - _Phase 1 (Free)_: props & component/state snapshots via framework devtool APIs.
   - _Phase 2 (Free)_: event flow breadcrumbs + basic perf metrics (e.g., render timing via Performance API).

4. **Overlay**: side drawer for the picker, annotation lifecycle, and (Pro/Enterprise) AI chat.
5. **Agent Integrations**: local MCP ops (Free) or Cloud Relay (Pro/Enterprise) with calibrated system prompts, toolchains, and codebase awareness.
6. **Code Graph & Framework Intelligence** _(Pro/Enterprise)_: component lineage, owners, routes, style modules, dependency hot‑spots, and prop/state flow hints; served by Cloud Relay APIs.
7. **Patch Validation Pipeline** _(Pro/Enterprise)_: build/test/snapshot run with cached artifacts, preview diffs, one‑click apply/revert, and flaky‑test shielding.

---

## Packages (Target Monorepo Structure)

```
packages/
├─ domscribe/                 # @domscribe (entrypoint)
├─ domscribe-core/            # @domscribe/core
├─ domscribe-transform/       # @domscribe/transform
├─ domscribe-overlay/         # @domscribe/overlay
├─ domscribe-relay/           # @domscribe/relay
├─ domscribe-next/            # @domscribe/next (React/Next.js)
├─ domscribe-vue/             # @domscribe/vue
├─ domscribe-angular/         # @domscribe/angular
├─ domscribe-agent-claude/    # @domscribe/agent-claude (aka domscribe-claude-code)
├─ domscribe-agent-openai/    # @domscribe/agent-openai (aka domscribe-copilot-agent/openai)
├─ domscribe-agent-gemini/    # @domscribe/agent-gemini
├─ domscribe-cloud-relay/     # @domscribe/cloud-relay
└─ domscribe-test-fixtures/   # kitchen‑sink sample apps
```

### Framework Support Levels

- **Level 1 (Full)** — **React/Next.js** (CSR/SSR/RSC)
  - Transform via SWC plugin; server components mapped to nearest client boundary; style impact covers CSS Modules and CSS‑in‑JS (emotion/styled‑components) where source maps are available.

- **Level 2 (Beta)** — **Vue 3/Vite**, **SvelteKit**
  - esbuild transforms; manifest stability guarantees maintained; style impact limited to modules and Svelte `style` blocks.

- **Level 3 (Experimental)** — **Angular v18**
  - TypeScript transformer + template AST mapping; initial coverage for bindings and structural directives; style impact via component styles and global styles with source maps.

> "Dev‑only, zero production overhead" applies to all levels: transforms are stripped in production bundles and CI enforces this via a scanner.

---

## Integration Modes (Tiers)

### Mode A — File‑based (Free)

- **Storage**: Local‑first; annotations at `.domscribe/annotations/*`.
- **Access**: Agents consume annotations & manifest via **MCP operations** exposed by the Relay; the MCP process has **no direct FS access**—it calls the Relay’s HTTP endpoints.
- **Overlay**: picker + annotation lifecycle UI.
- **Privacy**: zero network dependencies.

**Free includes** the full technical foundation (transform, manifest, overlay, Phase 1 & 2 runtime capture, MCP exposure).

### Mode B — Intelligence via Cloud Relay (Pro)

- **Adds**: cloud‑side agent proxying (SDK), calibrated system prompts, and **codebase/framework intelligence**.
- **Storage**: optional annotation sync (CRDT) for multi‑device continuity.
- **Security**: API keys live server‑side; never exposed to the browser.

### Mode C — Team Intelligence Platform (Enterprise)

- **Adds**: team/organization intelligence (workflow & design/system insights), multi‑agent orchestration, CI/CD hooks, business analytics, SSO/SCIM, audit, and deployment verification.
- **Design Intelligence**: runtime design token compliance, visual regression checks (Figma/API), and styling consistency reports.
- **Production Analytics**: privacy‑preserving aggregation and error‑to‑component linking.

> **Tier boundary clarity:** Technical capture/mapping is Free; intelligence, synchronization, orchestration, and enterprise governance are paid.

---

## Transform Layer (`@domscribe/transform`)

**Responsibilities**

- Inject `data-ds` IDs into host elements during dev builds.
- Maintain/append the **Manifest** (`id → file, line/column, component, …`).
- Preserve HMR stability and reuse framework caches (Webpack/Vite/Next SWC/native caches).

**Integration patterns**

- **Vite** (`@domscribe/transform/vite`): plugin injection.
- **Webpack** (`@domscribe/transform/webpack`): loader + plugin for middleware and overlay injection.
- **Fallback**: AST‑based universal transform (esbuild/SWC) when framework hooks aren’t available.

**Targets**

- HMR impact ≤ **10ms** incremental; build time overhead ≤ **2%**.

---

## Manifest Generation & Stability

**Goals:** deterministic UI→source resolution across HMR, refactors, merges, and branch switches; zero production impact; easy debugging.

- **Element IDs**: Inject an 8‑char nanoid into a `data-ds` attribute on the **host element** at transform time. IDs are **opaque and stable** within a branch; never derived from text or positions.
- **Hydration safety**: We **never** change React/Vue/Svelte **keys**. IDs live alongside keys; transforms avoid introducing provider wrappers that could perturb reconciliation.
- **Source ranges**: AST locates nearest stable node; we record `{start,end}` (line/col), `component`, and style linkages. If a node moves or is synthesized, we fallback to the nearest **stable ancestor** and mark the entry `isApproximateLocation: true`.
- **HMR behavior**: On file change we re‑emit entries **for that file only**; unmodified IDs remain. We track a `{fileHash → idMap}` to preserve stable IDs across edits.
- **Refactors & merges**: When symbols move files, a **repair pass** uses symbol hashes/import graphs to re‑attach orphaned IDs. Orphans are kept (not deleted) until re‑attached or archived.
- **Snapshots & recovery**: `manifest.snapshots/` stores periodic JSONL snapshots keyed by commit SHA. On checkout, we load the nearest snapshot and run a **diff‑repair**.
- **Multi‑bundle / iframe**: ID namespace is `frameId:id`. The Relay aggregates per‑bundle manifests; cross‑bundle lineage is via a route/registry.
- **CI guardrail (prod strip)**: A validation step fails CI if any `data-ds` attribute is found in a production bundle. Local Relay also exposes `POST /api/v1/scan/bundle` for pre‑commit checks.
- **Diagnostics**: Overlay shows **Resolve time**, `id`, and matched source path; a debug panel can replay the last 10 resolutions with timings.

## Overlay (`@domscribe/overlay`)

**Features**

- Element picker & text selection with highlight.
- Side drawer: list, edit, retry, archive annotations; status streaming via WebSocket.
- (Pro/Enterprise) Chat panel multiplexed to provider agents via Cloud Relay.
- Mobile‑responsive; CSP‑compatible injection.

**Storage**

- Free: local annotations under `.domscribe/annotations/` with clear subfolders.
- Pro/Enterprise: optional cloud sync (CRDT), conflict resolution, activity indicators.

---

## Relay (`@domscribe/relay`)

A single local process hosting four logical services:

1. **WebSocket**
   - Streams annotation status, manifest deltas, cache clears, and overlay commands.
   - (Pro/Enterprise) also streams AI chat and sync status events.
   - Robust reconnection with exponential backoff (1s → 30s) and per‑client state.

2. **Development HTTP APIs**
   - `GET/POST/PUT/DELETE /api/v1/annotations` for **annotation lifecycle**.
   - `POST /api/v1/annotations/:id/{process|complete|retry}` state transitions.
   - `GET /api/v1/health`, `POST /api/v1/cache/clear`, `POST /api/v1/manifest/rebuild`.

3. **Manifest Resolver** (performance‑critical)
   - `GET /__domscribe/resolve?id=<data-ds>` and selector/component queries.
   - Separate, aggressively cached endpoint with **p99 ≤10ms** target.

4. **Overlay Assets Server**
   - Serves tier‑aware JS/CSS bundles, protocol descriptors, and debug tools.

**MCP Server**

- Transport: stdio JSON‑RPC.
- **Security boundary**: No direct filesystem access; calls Relay HTTP APIs.
- Operations: `listQueuedAnnotations`, `getAnnotation`, `processAnnotation`, `completeAnnotation`, `failAnnotation`, `retryAnnotation`, plus **read‑only** manifest ops (`getManifest`, `resolveElement`, `getManifestDelta`, `rebuildManifestIndex`).

**Process & Port Management**

- Detect free port with validation; persist assignment in `os.tmpdir()` with lock files and stale‑entry cleanup.
- Startup budget: <500ms init, <100MB RSS; automatic restart (3 attempts) with backoff.
- Graceful shutdown order: **Overlay assets → WebSocket → API → MCP**, with a 10s graceful window then 30s force.

**Resilience**

- Classify errors (recoverable vs non‑recoverable), enter failsafe (disable Domscribe) without disrupting the dev server, and surface actionable overlay statuses.

---

## Cloud Relay (`@domscribe/cloud-relay`) — Technical Design

### Purpose & Value

Cloud Relay augments the local Relay with **hosted intelligence, orchestration, and governance** while keeping source code and runtime state local by default. It provides:

- **Code Graph & Framework Intelligence** (cross‑file lineage, ownership, route + style mapping).
- **Patch Validation Pipeline** (build/test/snapshot runs with artifacts & one‑click apply/revert).
- **Sync & Collaboration** (CRDT‑based annotation sync and search across devices/teammates).
- **Provider Proxy** (server‑side custody of API keys; request shaping, caching, and rate control).
- **Enterprise Controls** (SSO/SCIM, RBAC/policy, audit, webhooks/CI gates).

### High‑Level Architecture

```
                +-------------------+
Overlay/Relay   |  API Gateway      |  HTTPS/WebSocket (mTLS for internal)
   ───────────▶|  (REST + WS)      |───────────────────────────────────────┐
                +-------------------+                                       │
                       │                                                    │
                       ▼                                                    ▼
               +-------------------+   events   +-------------------------+  +------------------+
               |  Event Bus        |◀────────▶|  Validation Orchestrator|  |  Sync Service    |
               |  (NATS/Kafka)     |            |  (queuer + runners)     |  |  (CRDT + search) |
               +-------------------+            +-------------------------+  +------------------+
                       │                            │    │
                       ▼                            │    ▼
               +-------------------+                │ +--------------------+
               |  Code Intel Svc   |◀──────────────┘ | Provider Proxy     |
               |  (Graph queries)  |                  | (LLM SDKs + cache) |
               +-------------------+                  +--------------------+
                       │                                       │
                       ▼                                       ▼
               +-------------------+                    +--------------------+
               |  Metadata Store   | (Postgres)         |  Artifact Store    |
               +-------------------+                    |  (S3 compatible)   |
                                                        +--------------------+
```

### Tenancy & Data Boundaries

- **Multi‑tenant** at the database schema level (`tenant_id`, `project_id`, `seat_id`).
- **Secrets vault** (KMS‑backed) per tenant for BYOK credentials; sealed at rest; rotated.
- **Data minimization**: no source files uploaded by default. Graph is derived from **manifests + map metadata** your local Relay streams
  (file paths, symbol edges, hashes)—not file contents. Optional content ingestion is Enterprise‑only and opt‑in.

### Services (Responsibilities)

1. **API Gateway** (REST + WS)
   - Auth (JWT signed by IdP; PATs; short‑lived session tokens for Relay).
   - Request shaping, schema validation (OpenAPI), rate limiting, per‑seat quotas.
   - WS channels: `annotations`, `validation`, `sync`, `events`.

2. **Provider Proxy**
   - Custodies provider keys server‑side; supports **BYOK** (OpenAI, Anthropic, etc.).
   - Normalizes SDK calls, retries (idempotency keys), circuit breakers, and **per‑provider rate limits**.
   - Response caching (content‑hash keyed) with TTL; stores **non‑sensitive** traces for debugging.

3. **Code Intelligence Service**
   - Maintains an **incremental Code Graph** from manifest deltas + lightweight symbol telemetry.
   - Graph model: _nodes_ (component/file/route/style) and _edges_ (imports, render, style, ownership, route).
   - APIs: `getComponentLineage`, `ownersForSelector`, `styleImpact`, `reachableFiles`, `routeToComponent`.

4. **Validation Orchestrator**
   - Queues **Validation Jobs**; schedules **ephemeral runners** (Docker/Firecracker) with a minimal buildkit.
   - Inputs: patch bundle or repo ref; project build recipe (cached); env hints.
   - Steps: checkout → dep cache restore → build → test → snapshot → artifact publish → status webhook.
   - Sandboxing: **network‑restricted**, readonly tokens; time + CPU/mem quotas; provenance logs.

5. **Sync Service**
   - CRDT store for annotations + metadata; supports **offline merge**, conflict resolution, and search indices.
   - Batch sync + dedup; exposes **delta cursors** and **event streams**.

6. **Event Bus**
   - Decouples services; topic per tenant/project. At‑least‑once delivery, idempotent consumers.

7. **Storage**
   - **Postgres** for metadata (tenants, seats, projects, jobs, graph tables, audit).
   - **S3‑compatible** bucket for artifacts (build logs, coverage, snapshots).
   - **Redis** for hot caches (graph responses, session tokens, rate buckets).

### API Surface (selected)

- `POST /v1/graph/lineage` → `{ selector|componentRef }` → `{ nodes, edges, owners }`
- `POST /v1/graph/style-impact` → `{ selector|id }` → `{ cssModules, styledBlocks, tokens }`
- `POST /v1/validation/run` → `{ patch|commit, recipeId }` → `{ jobId }`
- `GET /v1/validation/jobs/:jobId` → status, timings, artifacts (URLs)
- `POST /v1/annotations/sync` → CRDT deltas; returns server cursor
- `GET /v1/events/stream?topic=validation` → server‑sent events / WS
- `POST /v1/webhooks/ci` → inbound CI status; `POST /v1/webhooks/validation-status` → outbound to customer CI

**MCP Bridge:** Cloud Relay exposes a provider implementing the same MCP ops as local Relay **plus** graph/validation ops. Agents can switch endpoints by capability discovery.

### Data Models (key tables)

- `tenants(id, kms_key_ref, plan, platform_fee, created_at, updated_at)`
- `projects(id, tenant_id, name, repo_url, default_recipe, created_at, updated_at)`
- `seats(id, tenant_id, user_id, role, credits_balance, created_at)`
- `graph_nodes(id, project_id, kind, ref, hash, meta, created_at, updated_at)`
- `graph_edges(id, project_id, src_id, dst_id, type, weight, created_at)`
- `validation_jobs(id, project_id, seat_id, input_ref, recipe_id, state, timings, artifacts, created_at)`
- `annotations_docs(id, project_id, crdt_doc, updated_at)`
- `audit_events(id, tenant_id, actor, action, target, payload, created_at)`

### Security Model

- **AuthN/Z**: OIDC (Enterprise SSO), PATs (Pro), short‑lived **Relay session tokens**. RBAC roles: `owner`, `maintainer`, `developer`, `viewer`.
- **Secrets**: BYOK keys encrypted with tenant KMS key; access via short‑lived data‑plane tokens. No keys to browser.
- **Isolation**: per‑tenant row‑level security; per‑project namespaces for artifacts; runner sandboxes.
- **Compliance**: audit logs (immutable), data retention policies, signed artifacts (SHA‑256 + timestamp).

### Usage Metering & Credits

- **Credit unit** measures Cloud Relay compute, not LLM tokens.
- **Examples**:
  - Graph query: **1–5 credits** depending on node/edge scan.
  - Validation run (cached deps): **100–300 credits**; cold start **500+**.
  - Sync batch: **0.5–2 credits** per 100 KB.

- Real‑time **seat quotas** and **tenant overage** with soft/hard caps; webhook on threshold.

### Observability & SLOs

- **Metrics**: p50/p95/p99 per API; queue depth; runner utilization; cache hit rate; credit burn/seat.
- **Tracing**: OpenTelemetry end‑to‑end (Gateway ⇄ services ⇄ provider SDKs ⇄ runners).
- **Logs**: structured JSON with redaction; tenant/project correlation IDs.
- **SLO targets**: Graph API p95 ≤ 250 ms; Validation status latency ≤ 2 s; Webhook delivery success ≥ 99.9%.

### Scaling & Resilience

- Stateless services with HPA; sharded Postgres; multi‑AZ S3; Redis with replica.
- **Backpressure**: rate limiters + priority queues (Enterprise > Pro > Free trials).
- **DR**: daily snapshots, PITR; RTO 1h, RPO 15m.

### Self‑Host Option (Enterprise add‑on)

- Delivered via **Helm chart**; dependencies: Postgres, S3‑compatible store, Redis, NATS/Kafka, runner pool.
- Air‑gapped mode: disable Provider Proxy; relay only graph/validation/sync using customer LLM endpoints.
- Support tiers & SLAs as per contract.

### Failure Modes & Degradation

- **Cloud outage**: Overlay falls back to local Resolve; Pro features greyed with retry/backoff.
- **Validation runner failure**: automatic retry with exponential backoff; partial artifacts persisted.
- **Provider rate limit**: jittered backoff; queue rebalancing across models/regions.

### Versioning & Compatibility

- Capability discovery endpoint: `GET /v1/capabilities` (semver per service).
- Overlay/Relay pin a minimal capability set; graceful feature downgrade when newer features are unavailable.

### Example Flows

**A) Code Graph lineage query**

1. Overlay sends `selector` → local Relay → Cloud Relay `graph/lineage`.
2. Code Intel Svc resolves nodes/edges from cached graph; misses trigger background enrichment.
3. Gateway returns lineage + owners in ≤250 ms p95.

**B) Patch Validation**

1. Agent posts `validation/run` with patch bundle.
2. Orchestrator schedules runner (warm pool); restores dep cache; runs build/tests/snapshots.
3. Publishes artifacts (diffs, coverage) and status events; webhook to CI.
4. Overlay shows one‑click **apply/revert** (Pro/Enterprise only).

---

## Validation Recipes & Runner Spec

A declarative spec defines how Cloud Relay validates patches. Repos can include `domscribe.validation.yaml`; otherwise a project‑level default is used.

```yaml
# domscribe.validation.yaml (v1)
version: 1
runner:
  image: node:22
  cpu: '2'
  memory: '4Gi'
  network: false
cache:
  deps: true
  paths: ['.pnpm-store', 'node_modules/.cache']
steps:
  - name: install
    run: pnpm install --frozen-lockfile
  - name: build
    run: pnpm build
  - name: test
    run: pnpm test -- --reporter=json
  - name: snapshot
    run: pnpm test:ui || true
artifacts:
  include:
    - coverage/**
    - .domscribe/diffs/**
timeouts:
  total: 15m
  step: 10m
```

**Semantics**

- Precedence: repo file > project default. Unknown fields ignored with warnings.
- Runners: ephemeral Firecracker/Containerd VMs; read‑only tokens; **no egress** unless `network: true`.
- Caching: dep caches restored by lockfile hash; build caches keyed by recipe + env.
- Artifacts: logs, coverage, visual diffs stored in S3‑compatible bucket; signed with SHA‑256 + timestamp.
- Failure model: `install|build|test|snapshot` failures mark job `failed` with categorized error; retryable failures backoff (jitter).
- Webhooks: outbound status to CI; inbound `/v1/webhooks/ci` to correlate PRs/commits.

## API Conventions & Error Model

**Style**: JSON over HTTPS; base path `/v1`; OpenAPI descriptions available. Errors follow **RFC 7807** (problem+json) with `code`, `title`, `detail`, `instance`.

- **Error codes (`code`)**: `DS_GRAPH_NOTREADY`, `DS_GRAPH_NOTFOUND`, `DS_VALIDATION_TIMEOUT`, `DS_RATE_LIMIT`, `DS_UNAUTHORIZED`, `DS_FORBIDDEN`, `DS_CONFLICT`, `DS_PAYWALL_REQUIRED`.
- **Idempotency**: Mutating POSTs accept `Idempotency-Key`; duplicates within 24h return the original result.
- **Pagination**: `cursor` + `limit` (max 500). Responses contain `nextCursor` when more data is available.
- **Rate limits**: `x-rate-limit-limit`, `x-rate-limit-remaining`, `x-rate-limit-reset` headers.
- **Versioning**: semantic version per service; `GET /v1/capabilities` advertises supported ops and limits.
- **HTTP codes**: 200/201 success; 202 for async acceptance; 400 validation; 401/403 auth; 404 not found; 409 conflict; 422 unprocessable; 429 throttled; 5xx server/provider.
- **MCP bridge**: Cloud Relay implements MCP ops superset; agents select endpoints by capability.

## CLI & Configuration

**CLI commands**

- `ds relay start|stop|status|logs` — manage local Relay lifecycle.
- `ds overlay inject` — inject overlay into a running dev server (when auto‑inject is disabled).
- `ds validate --patch <file|stdin>` — send a patch bundle to Cloud Relay validation.
- `ds graph query --selector "..."` — run lineage/owner/style impact queries.

**Configuration precedence**

1. `domscribe.config.{ts,js}` (project root)
2. Environment variables
3. Built‑in defaults

**Key options** (`domscribe.config.ts`)

```ts
export default {
  relay: { port: 0, logLevel: 'info', host: '127.0.0.1' },
  overlay: { autoInject: true, debugPanel: false },
  cloud: {
    url: 'https://api.cloud.domscribe.com',
    token: process.env.DS_TOKEN,
  },
  privacy: { redactPII: true, blockSelectors: ['[data-private]'] },
};
```

**Environment variables**: `DS_RELAY_PORT`, `DS_RELAY_LOG_LEVEL`, `DS_RELAY_HOST`, `DS_CLOUD_URL`, `DS_TOKEN`, `DS_TRACE`.

## Micro‑frontends & Iframes

**Broker model**

- Parent overlay coordinates child overlays inside iframes using `postMessage` with **origin allowlist**.
- Each frame gets a **frameId**; `data-ds` namespace is `frameId:id`.
- Relay aggregates per‑bundle manifests; route registry links cross‑bundle ownership/lineage.

**Security & limits**

- Third‑party iframes disabled by default; opt‑in allowlist required, with dev‑mode consent banner.
- Sandboxed iframes must expose a minimal RPC shim; otherwise only visual capture is allowed (no runtime context).

**Failure & fallback**

- If a child overlay is unavailable, selection degrades to bounding‑box capture with a warning; lineage falls back to parent context.

## Observability & Local Debugging

- **Logs (Relay):** categories `transform|manifest|ws|api|mcp` with levels `error|warn|info|debug|trace`.
- **Tracing:** set `DS_TRACE=1` to emit OpenTelemetry spans to a local collector; Cloud Relay propagates `traceparent` across services.
- **Overlay debug panel:** toggle via `overlay.debugPanel`; shows last 10 resolves with timings, queue depth, cache hit rate, and recent errors.
- **Counters & budgets:** Resolver p99 target ≤10 ms (local), Graph API p95 ≤250 ms (cloud), HMR overhead ≤10 ms, build overhead ≤2%.

## Schema Versioning & Migrations

- All serialized models include a `schemaVersion` (semver). JSON Schemas are published at `/schema/v{major}`.
- Local Relay auto‑migrates annotations up to **two minor versions** forward; beyond that, files are backed up to `archived/` and a migration report is shown in the Overlay.
- Manifest JSONL is **append‑only**; index files can be rebuilt deterministically from snapshots.

## Data & Storage Models

## Data & Storage Models

### Annotation (canonical)

```ts
interface Annotation {
  metadata: {
    id: string; // ann_<nanoid>_<timestamp>
    timestamp: string; // ISO 8601
    mode: 'element-click' | 'text-selection';
    status: 'queued' | 'processing' | 'processed' | 'failed' | 'archived';
    agentId?: string;
    errorDetails?: string;
  };
  interaction: {
    type: 'element-annotation' | 'text-selection';
    selectedText?: string;
    selectedElement?: {
      tagName: string;
      selector: string;
      dataDs?: string; // present if transformed
      attributes?: Record<string, string>;
      innerText?: string; // first 100 chars
      computedStyles?: Record<string, string>;
    };
    boundingRect?: {
      x: number;
      y: number;
      width: number;
      height: number;
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  context: {
    pageUrl: string;
    pageTitle: string;
    viewport: { width: number; height: number };
    userAgent: string;
    domSnapshot?: string;
    manifestSnapshot?: ManifestEntry[];
    userMessage?: string;
    environment?: {
      nodeVersion?: string;
      frameworkVersion?: string;
      packageManager?: string;
    };
    runtimeContext?: {
      componentProps?: unknown;
      componentState?: unknown;
      eventFlow?: unknown;
      performance?: unknown;
    };
  };
  agentResponse?: {
    message?: string;
    patches?: CodePatch[];
    appliedAt?: string;
  };
}
```

### Manifest Entry (canonical)

```ts
interface ManifestEntry {
  id: string; // 8-char nanoid
  file: string; // path from project root
  start: { line: number; column: number };
  end?: { line: number; column: number };
  component: string;
  props?: Record<string, unknown>;
  parent?: string;
  children?: string[];
  styles?: { file?: string; modules?: boolean; inline?: string };
  isApproximateLocation?: boolean;
  isHOC?: boolean;
  renderProp?: string;
  wrappers?: string[];
}
```

### On‑disk Layout

```
.domscribe/
├─ annotations/
│  ├─ queued/ | processing/ | processed/ | failed/ | archived/
├─ manifest.jsonl                # append‑only
├─ manifest.index.json           # fast lookup index
├─ manifest.snapshots/           # timestamped recovery points
├─ transform-cache/              # file hashes + AST results
├─ sessions/                     # WebSocket session metadata
├─ agent-instructions/           # Markdown for agent awareness
└─ cloud-sync/ (Pro/Ent)         # CRDT + team caches
```

---

## Caching & Performance

**Hierarchy**: L1 memory (AST/manifest/transform) → L2 disk (`node_modules/.cache/domscribe`) → L3 framework‑native caches → L4 cloud intelligence caches (Pro/Enterprise).

**Invalidation**: xxhash64 content hashes; batch file updates; warmup on startup/idle.

**Targets**: ≥90% cache hit; HMR overhead ≤10ms; build overhead ≤2%.

---

## Security & Privacy Model

- **Dev‑only** operation; transforms removed in production.
- **MCP isolation**: stdio JSON‑RPC; **no filesystem access**; Relay mediates via HTTP.
- **Network boundaries**: dev server proxy only `/__domscribe/*` routes.
- **Data ownership**: Free is local‑only; Pro/Enterprise offers optional sync.
- **Enterprise controls**: SSO/SCIM, audit logs, compliance reporting, governance.

### Threat Model (Dev & Cloud)

**Dev (local)**

- **Overlay/script abuse**: CSP nonces, origin lock, integrity checksum on overlay bundle.
- **Transform leakage to prod**: CI scanner denies if `data-ds` present; transform asserts strip in production; validation bundle scan.
- **Relay exposure**: random high port + CSRF token; localhost‑only by default; optional mTLS for remote use.

**Cloud**

- **Runner isolation**: Firecracker VMs, **no egress** by default; per‑step CPU/mem/time quotas; read‑only repo tokens.
- **Secrets**: BYOK in KMS; short‑lived data‑plane tokens to Provider Proxy; zero keys to browser.
- **Supply chain**: signed artifacts; SBOM capture; dependency policy checks (Enterprise).
- **Abuse & DoS**: per‑seat/tenant rate and credit quotas; circuit breakers on provider calls.

### Privacy Controls

- **Redaction**: email/phone/CC regex scrub on snapshots; configurable `privacy.blockSelectors` to exclude text capture.
- **Manual review**: Overlay redaction UI before sync; CRDT keeps redacted diffs only.
- **Data minimization**: Cloud Graph uses manifest edges/metadata, not source contents, unless Enterprise opts‑in.

---

## Monetization (Revision 2) — open‑core + usage‑metered Pro + quote‑based Enterprise

**Positioning:** Free owns capture/mapping; paid tiers sell **time to merged patch** (graph + validation + sync) and **governance**.

### Free (OSS) — adoption engine

Includes:

- Transform, manifest, overlay, **Phase 1 & 2 runtime capture**, file‑based MCP integration.
- Local‑only annotation storage; docs, examples, community support.

**Guardrails & caps (to keep Free useful but not “enough”):**

- Local‑only (no cloud sync); single‑user focus.
- ≤ **50 active annotations** (archive to add more). No bulk actions.
- **Read‑only APIs**: `resolve(id)`, `getManifest`, `listAnnotations`, `getAnnotation`.
- **Not included**: Code Graph/lineage queries, patch validation pipeline, provider SDK proxy, CI/webhooks, governance.

### Pro — **\$19–\$25 / dev / mo** (BYOK + credits)

Adds:

- **Cloud Relay** (provider SDK proxy) with **Codebase & Framework Intelligence** (Code Graph, lineage, owners, routes, style impact).
- **Patch Validation**: build/test/snapshot runs with artifacted previews and one‑click apply/revert.
- **Sync**: CRDT multi‑device continuity; search/filter/tags/dedup for annotations.
- **Performance**: request batching/caching for faster agent rounds.

**Included usage:** **2k credits / seat / month**; **overage** \$4–\$8 per **1k credits**.
**Trial:** 14‑day, **5k credits**.
**BYOK:** customers keep LLM tokens on their own provider accounts; **credits meter Cloud Relay compute** (graph queries, validation runs, sync ops), _not_ LLM tokens.

### Enterprise — **Contact sales** (quote‑based)

- **Pricing:** **\$120–\$240 / seat / mo** **+ platform fee \$1k–\$3k / mo**, annual commit.
- **Adds** everything in Pro plus: **Team Intelligence**, multi‑agent orchestration, CI/CD gates, policy engine (RBAC/approvals), SSO/SCIM, audit logs, deployment verification, success management.
- **Add‑ons:**
  - **Design Intelligence** (tokens compliance, visual regression, styling consistency): **\$500–\$1k / mo**.
  - **Production Analytics** (privacy‑preserving component error/usage linking): **\$500–\$2k / mo**.
  - **Self‑host Relay license** with SLA: **\$10k–\$50k / yr** (scale/SLA dependent).

### API surface by tier

- **Free:** `resolveElement`, `getManifest`, `listAnnotations`, `getAnnotation`.
- **Pro:** + `getComponentLineage`, `ownersForSelector`, `styleImpact`, `runValidation`, `listValidationArtifacts`, `applyPatch`, `revertPatch`, `syncAnnotations`.
- **Enterprise:** + `setPolicy`, `requireApproval`, `postCIStatus`, `createAuditEvent`, `configureSSO/SCIM`.

> **Why pay:** measurable reduction in **time‑to‑first‑validated‑patch**, superior accuracy via code graph, and governance for teams.

**KPIs to monitor:** Free→Pro activation %, time‑to‑validated‑patch (<10 min target), credits per active seat (overage 10–25% of Pro MRR), Enterprise pilot→deal ≥40%.

---

## Technical Stack

- **TypeScript** (monorepo), **Nx**, **Vitest**, **ESLint**.
- **chokidar**, **xxhash64**, **detect-port**, **tree-kill**.
- **SWC/esbuild** for transforms; **WebSocket** for realtime; **Rust** for cloud relay.
- **Verdaccio** for local registry testing.

---

## Appendix — Integration Snippets

**Vite**

```ts
import { domscribe } from '@domscribe/transform/vite';
export default { plugins: [react(), domscribe()] };
```

**Webpack**

```ts
import { DomscribeWebpackPlugin } from '@domscribe/transform/webpack';
module.exports = {
  module: {
    rules: [{ test: /\.(jsx?|tsx?)$/, use: ['@domscribe/webpack-loader'] }],
  },
  plugins: [new DomscribeWebpackPlugin()],
};
```

**Next.js**

```ts
// next.config.js
export default withDomscribe({
  /* existing config */
});
```

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:

- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool

<!-- nx configuration end-->
