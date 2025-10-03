# Domscribe

> **UI‑aware dev tooling for pixel‑to‑code & pixel‑to‑agent workflows.**
>
> Click elements in your running app, capture just‑enough runtime context, map pixels to exact source lines, and hand off clean instructions to your favorite coding agent via MCP.

---

## ✨ What Domscribe gives you

* **Overlay** – in‑app element & text picker with visual highlights, annotation drawer, and shortcuts.
* **Deterministic UI ↔ Source** – fast resolution from a picked element to file/component/line range.
* **Transform Layer** – dev‑time AST transform that injects stable element IDs; no runtime behavior changes.
* **Manifest** – append‑only DOM→source index with snapshots & repair tools.
* **Runtime Context Capture** – props/state (phase‑gated), event breadcrumbs, and lightweight perf hints.
* **Local Relay** – a small local process with HTTP/WS APIs and an **MCP server** exposing Domscribe tools.
* **Agent Adapters (Phase A)** – plug Domscribe into coding agents you already use via MCP:

  * `domscribe-claude-code`
  * `domscribe-gemini`
  * `domscribe-copilot-agent`

> No API keys are required. Domscribe doesn’t talk to any cloud by default; your agent (Claude/Gemini/Copilot) continues using its own account.

---

## 📦 Monorepo Structure

```
patchorbit/domscribe
├─ packages/
│  ├─ domscribe-core/           # shared types & utils (IDs, hashing, schemas)
│  ├─ domscribe-transform/      # AST transforms (SWC/esbuild) + bundler glue
│  ├─ domscribe-manifest/       # manifest writer/reader + snapshots + repair
│  ├─ domscribe-overlay/        # in‑app UI (picker, drawer, debug)
│  ├─ domscribe-relay/          # local process: HTTP/WS, resolver, MCP
│  ├─ domscribe-react/          # React adapter (devtools/runtime capture)
│  ├─ domscribe-next/           # Next.js adapter/wrapper
│  ├─ domscribe-vue/            # Vue adapter (devtools/runtime capture)
│  ├─ domscribe-claude-code/    # Agent adapter (MCP)
│  ├─ domscribe-gemini/         # Agent adapter (MCP)
│  └─ domscribe-copilot-agent/  # Agent adapter (MCP, tools‑first)
├─ examples/
│  ├─ react-vite-demo/
│  ├─ nextjs-demo/
│  └─ vue-vite-demo/
└─ tooling/
   ├─ eslint-config/
   ├─ tsconfig/
   └─ website/                  # docs site
```

---

## 🚀 Quickstart

### Requirements

* Node.js **LTS** (≥ 18)
* pnpm or npm

### 1) Install packages (pick your framework)

**React (Vite)**

```bash
pnpm add -D @domscribe/transform @domscribe/overlay @domscribe/relay @domscribe/react
```

**Next.js**

```bash
pnpm add -D @domscribe/transform @domscribe/overlay @domscribe/relay @domscribe/next @domscribe/react
```

**Vue (Vite)**

```bash
pnpm add -D @domscribe/transform @domscribe/overlay @domscribe/relay @domscribe/vue
```

### 2) Wire the transform

**Vite (React/Vue)** — *vite.config.ts*

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or: import vue from '@vitejs/plugin-vue'
import domscribe from '@domscribe/transform/vite'

export default defineConfig({
  plugins: [react(), domscribe()], // or: [vue(), domscribe()]
})
```

**Next.js** — *next.config.js*

```js
const { withDomscribe } = require('@domscribe/next')
module.exports = withDomscribe({ reactStrictMode: true })
```

### 3) Run your app & toggle the overlay

```bash
pnpm run dev
```

* Open your app and press **Cmd/Ctrl + Shift + D** to toggle the overlay.
* Click elements/text to create **Annotations**; open the drawer to view/organize them.
* Use **Resolve** to jump directly to the owning source file/lines.

### 4) Connect your coding agent (Phase A)

You can keep using your existing agent—just add Domscribe’s **MCP server**.

**Option A — One‑line helper (recommended)**

```bash
npx domscribe mcp register --agent claude-code   # or: gemini | copilot
```

This writes the agent’s MCP config snippet and validates connectivity.

**Option B — Manual config**

* **stdio** (preferred): configure your agent to launch `npx domscribe mcp serve --stdio`.
* **HTTP**: point the agent to `http://localhost:7080/mcp` (if your agent supports HTTP MCP).

**Common commands** (agent‑dependent)

* `/domscribe resolve` → map current selection to file/component/lines
* `/domscribe patch` → resolve → request context → agent drafts diff → Domscribe validates
* `/domscribe apply` → apply the last validated diff (guarded)

> Each adapter ships an instruction pack so the agent uses the tools correctly and returns clean unified diffs.

---

## 🧠 Concepts (quick)

* **Transform** injects dev‑only `data-ds` IDs → **Manifest** maps IDs to files/components.
* **Overlay** lets you select elements/text and manage **Annotations**.
* **Local Relay** exposes HTTP/WS/MCP to resolve elements and orchestrate annotation lifecycle.
* **Runtime capture** records props/state (phase‑gated) and event/perf breadcrumbs.

---

## 🔌 Local Relay API (dev‑only)

* `GET /__domscribe/resolve?id=<data-ds>` → `{ file, component, range, breadcrumbs }`
* `GET /api/v1/annotations` / `POST /api/v1/annotations`
* WebSocket `/ws` → annotation status, manifest deltas

Stable contracts and full references live in the docs site under `website/`.

---

## 🔒 Privacy & Safety

* **Local‑first**: manifests and annotations live under `.domscribe/` in your workspace.
* **No keys required**: adapters use your agent’s own model/account.
* **Production safety**: dev attributes are stripped from production bundles.

### CI guardrail (recommended)

```yaml
# .github/workflows/domscribe-scan.yml
name: Domscribe Prod Strip Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm i --frozen-lockfile
      - run: pnpm run build
      - name: Scan for dev attributes
        run: npx domscribe scan --path dist
```

---

## 🧰 Examples

* `examples/react-vite-demo`
* `examples/nextjs-demo`
* `examples/vue-vite-demo`

Each shows overlay usage, manifests, and an agent adapter wired via MCP.

---

## 🧪 Tests

* **Unit**: transform, manifest, resolver
* **E2E**: overlay selection & resolve (Playwright)
* **Golden**: manifest snapshots across refactors/HMR

---

## 📤 Local Release (Verdaccio + Nx Release)

- Start Verdaccio locally (configured via `.verdaccio/config.yml`):

  - `pnpm nx local-registry` (starts Verdaccio on `http://localhost:4873` with open publish access per the included config)

- Workspace `.npmrc` routes only the `@domscribe/*` scope to Verdaccio while all other packages continue using the public npm registry. See `.npmrc`:

  - `@domscribe:registry=http://localhost:4873/`
  - `registry=https://registry.npmjs.org/`

- One‑step, non‑interactive releases with Nx Release (defaults baked into package scripts):

  - Patch: `pnpm release:patch`
  - Minor: `pnpm release:minor`
  - Major: `pnpm release:major`
  - Dry run: `pnpm release:dry-run`
  - Publish only (skip versioning): `pnpm release:publish`

Notes
- The scripts set `NPM_CONFIG_REGISTRY=http://localhost:4873` for the process so publishing targets Verdaccio automatically.
- The Verdaccio server config is server‑side. Clients still need either the `.npmrc` mapping above or the environment variable to publish/consume from the local registry.
- Current Nx (21.x) uses `@nx/js:tsc` to build publishable output into `dist/...`. Nx Release then publishes from that folder to the registry.

---

## 🛠️ Development

```bash
pnpm i
pnpm -w build
pnpm -w test
pnpm -w dev
```

---

## 🤝 Contributing

PRs welcome! See `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`. Please open issues for adapters/agents you want prioritized.

---

## 📄 License

MIT — see `LICENSE`.
