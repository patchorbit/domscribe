<p align="center">
  <img src="./docs/logo.png" alt="Domscribe" width="200" />
</p>

<h1 align="center">Domscribe</h1>

<p align="center">
  <a href="https://www.npmjs.com/search?q=%40domscribe"><img src="https://img.shields.io/npm/v/%40domscribe/core?label=npm&color=cb3837" alt="npm version" /></a>
  <a href="https://github.com/patchorbit/domscribe/actions"><img src="https://img.shields.io/github/actions/workflow/status/patchorbit/domscribe/ci.yml?label=CI" alt="CI status" /></a>
  <a href="#"><img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Narratoe/1bedc40fc56874758abd3b7caf4d6748/raw/domscribe-coverage.json" alt="test coverage" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-417e38?logo=node.js&logoColor=white" alt="Node.js >= 18" />
  <a href="https://github.com/patchorbit/domscribe/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome" /></a>
</p>

<p align="center">
  <a href="https://domscribe.com"><img src="./docs/demo.gif" alt="Domscribe demo — click an element, capture context, resolve to source" /></a>
</p>

---

**AI coding agents edit your source files blind — they can't see your running frontend, and your frontend can't tell them where to look.**

Domscribe bridges both directions: click a DOM element to tell your agent what to change, or let your agent query any source location to see exactly what it looks like live in the browser. Build-time stable IDs, deep runtime context (props, state, DOM), framework-agnostic, any MCP-compatible agent. Zero production impact.

---

## What Domscribe Does

### Code → UI: Let the agent see the browser

Your agent is editing `Button.tsx` line 12. It calls `domscribe.query.bySource` and instantly gets back the live DOM snapshot, current props, component state, and rendered attributes — without any human interaction. The agent can verify what an element looks like _before_ changing it and confirm the result _after_.

<p align="center">
  <img src="./docs/code-to-ui.png" alt="Code → UI: Let the agent see the browser" />
</p>

Here's an example response that the agent might get back:

```json
{
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "line": 12,
    "column": 4,
    "componentName": "Button",
    "tagName": "button"
  },
  "runtime": {
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" },
    "domSnapshot": {
      "tagName": "button",
      "attributes": { "class": "btn-secondary", "type": "submit" },
      "innerText": "Save changes"
    }
  },
  "browserConnected": true
}
```

### UI → Code: Point and tell

A developer clicks an element in the browser overlay, types "make this button use the primary color," and submits. Domscribe captures the element's source location, runtime context, and user intent as an annotation. The agent claims it, navigates to the exact file and line, and implements the change.

<p align="center">
  <img src="./docs/ui-to-code.png" alt="UI → Code: Point and tell" />
</p>

The annotation is stored as a JSON file in your repository in the `.domscribe/annotations` directory. Here's an example:

```json
{
  "found": true,
  "annotationId": "ann_A1B2C3D4_1710500000",
  "userIntent": "Make this button use the primary color from the design system",
  "element": {
    "tagName": "button",
    "dataDs": "A1B2C3D4",
    "selector": "main > div > button",
    "attributes": { "class": "btn-secondary", "type": "submit" },
    "innerText": "Save changes"
  },
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "line": 12,
    "column": 4,
    "componentName": "Button",
    "tagName": "button"
  },
  "runtimeContext": {
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" }
  }
}
```

Once the agent is done with the edits, it calls `domscribe.annotation.respond` with a description of what it did. The overlay shows the result in real time via WebSocket.

---

## Install

Domscribe has two sides: **app-side** (bundler + framework plugins) and **agent-side** (MCP for your coding agent). Both are needed for the full workflow.

### Step 1 — Add to Your App

<details>
<summary><strong>Next.js (15 + 16)</strong> — <code>npm install -D @domscribe/next</code></summary>

```ts
// next.config.ts
import type { NextConfig } from 'next';
import { withDomscribe } from '@domscribe/next';

const nextConfig: NextConfig = {};

export default withDomscribe()(nextConfig);
```

</details>

<details>
<summary><strong>Nuxt 3+</strong> — <code>npm install -D @domscribe/nuxt</code></summary>

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@domscribe/nuxt'],
});
```

</details>

<details>
<summary><strong>React 18–19</strong> — <code>npm install -D @domscribe/react</code></summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { domscribe } from '@domscribe/react/vite';

export default defineConfig({
  plugins: [react(), domscribe()],
});
```

Webpack plugin:

```ts
// webpack.config.js
const { DomscribeWebpackPlugin } = require('@domscribe/react/webpack');

module.exports = {
  plugins: [new DomscribeWebpackPlugin()],
};
```

</details>

<details>
<summary><strong>Vue 3+</strong> — <code>npm install -D @domscribe/vue</code></summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { domscribe } from '@domscribe/vue/vite';

export default defineConfig({
  plugins: [vue(), domscribe()],
});
```

Webpack plugin:

```ts
// webpack.config.js
const { DomscribeWebpackPlugin } = require('@domscribe/vue/webpack');

module.exports = {
  plugins: [new DomscribeWebpackPlugin()],
};
```

</details>

<details>
<summary><strong>Any framework</strong> — <code>npm install -D @domscribe/transform</code> (DOM→source mapping only, no runtime capture)</summary>

Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { domscribe } from '@domscribe/transform/plugins/vite';

export default defineConfig({
  plugins: [domscribe()],
});
```

Webpack plugin:

```js
// webpack.config.js
const {
  DomscribeWebpackPlugin,
} = require('@domscribe/transform/plugins/webpack');

module.exports = {
  plugins: [new DomscribeWebpackPlugin()],
};
```

</details>

> **Working examples:** See [`packages/domscribe-test-fixtures/fixtures/`](./packages/domscribe-test-fixtures/fixtures/) for complete app setups across every supported framework and bundler combination.

### Step 2 — Connect Your Coding Agent

Domscribe exposes its full tool surface (12 tools + 4 prompts) via MCP. Agent plugins bundle the MCP config and a skill file that teaches the agent how to use the tools effectively.

For agents with first-class plugin support, install the plugin and you're done:

#### Claude Code

```shell
/plugin marketplace add patchorbit/domscribe
/plugin install domscribe@domscribe
```

#### GitHub Copilot

```bash
copilot plugin install patchorbit/domscribe
```

#### Gemini CLI

```bash
gemini extensions install https://github.com/patchorbit/domscribe
```

#### Amazon Kiro

Open the Powers panel → **Add power from GitHub** → enter `https://github.com/patchorbit/domscribe`.

#### Cursor

_(Coming soon — pending marketplace approval)_

#### Any agent (Skills and MCP)

Install the Domscribe skills:

```sh
npx skills add patchorbit/domscribe
```

Then add this MCP config to your agent:

```json
{
  "mcpServers": {
    "domscribe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@domscribe/mcp"]
    }
  }
}
```

---

## How It Works

<p align="center">
  <img src="./docs/architecture.png" alt="Domscribe architecture diagram" />
</p>

**1. Inject.** At build time, `DomscribeInjector` hooks into your bundler's transform phase (Vite, Webpack, or Turbopack). It parses each source file, finds every JSX/Vue template element, generates an HMR-stable ID via xxhash64 content hashing, and injects `data-ds="{id}"`. Each ID is recorded in `.domscribe/manifest.jsonl` with its file path, line, column, tag name, and component name.

**2. Capture.** At runtime, framework adapters (React fiber walking, Vue VNode inspection) extract live props, state, and component metadata from every instrumented element. The overlay UI (Lit web components in shadow DOM) lets you click any element and see its full context.

**3. Relay.** The relay daemon (Fastify, localhost-only) connects the browser and your agent. It exposes REST endpoints, WebSocket real-time events, and an MCP stdio adapter. A file lock at `.domscribe/relay.lock` prevents duplicate instances across dev server restarts.

**4. Agent.** Your coding agent connects via MCP and gets two capabilities. It can **query by source** to see what any line of code looks like live in the browser. And it can **process annotations** — user-submitted instructions attached to specific elements — to claim, implement, and respond to UI change requests.

---

## Comparison

| Feature               | Domscribe                                    | [Stagewise](https://github.com/stagewise-io/stagewise) | [DevInspector MCP](https://github.com/mcpc-tech/dev-inspector-mcp) | [React Grab](https://github.com/aidenybai/react-grab) | [Frontman](https://github.com/frontman-ai/frontman) |
| --------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| Build-time stable IDs | ✅ `data-ds` via AST                         | ❌ Proxy-based                                         | ❌ No stable IDs                                                   | ❌ `_debugSource`                                     | ❌ Source maps                                      |
| DOM→source manifest   | ✅ JSONL, append-only                        | ❌                                                     | ❌                                                                 | ❌                                                    | ❌                                                  |
| Code→live DOM query   | ✅ Agent queries source, gets live runtime   | ❌                                                     | ❌                                                                 | ❌                                                    | ❌                                                  |
| Runtime props/state   | ✅ Fiber + VNode walking                     | ⚠️ Shallow                                             | ⚠️ DOM-level + JS eval                                             | ⚠️ Shallow (bippy)                                    | ⚠️ Framework APIs                                   |
| Multi-framework       | ✅ React · Vue · Next.js · Nuxt · extensible | ✅ React + Vue + Angular                               | ✅ React + Vue + Svelte + Solid + Preact                           | ❌ React only                                         | ⚠️ Next.js + Astro + Vite                           |
| Multi-bundler         | ✅ Vite + Webpack + Turbopack                | ❌ N/A (proxy)                                         | ✅ Vite + Webpack + Turbopack                                      | ❌ N/A                                                | ❌ Dev server middleware                            |
| MCP tools             | ✅ 12 tools + 4 prompts                      | ❌ Proprietary protocol                                | ✅ 9 tools                                                         | ⚠️ Lightweight add-on                                 | ❌ Built-in agent                                   |
| Agent-agnostic        | ✅ Any MCP client                            | ⚠️ IDE extensions only                                 | ✅                                                                 | ✅                                                    | ❌ Bundled Elixir agent                             |
| In-app element picker | ✅ Lit shadow DOM                            | ✅ Toolbar                                             | ✅ Inspector bar                                                   | ✅ Click-to-capture                                   | ✅ Chat interface                                   |
| Source mapping        | ✅ Deterministic (AST IDs)                   | ⚠️ AI-inferred                                         | ⚠️ AST-injected (not stable)                                       | ⚠️ `_debugSource` (workaround needed)                 | ⚠️ Source maps                                      |
| License               | ✅ MIT                                       | ⚠️ AGPL                                                | ✅ Open source                                                     | ✅ Open source                                        | ⚠️ Apache + AGPL                                    |

No single competitor combines build-time stable IDs, deep runtime capture, bidirectional source↔DOM querying, and an MCP tool surface in a framework-agnostic way.

---

## Bundler Support — DOM→Source Mapping

The transform plugins work with any framework. Install one and every JSX/Vue template element gets a `data-ds` ID mapped to its exact source location.

| Bundler   | Plugin                                 | Parser                   |
| --------- | -------------------------------------- | ------------------------ |
| Vite 5    | `@domscribe/transform/plugins/vite`    | Acorn (JS/JSX) or VueSFC |
| Webpack 5 | `@domscribe/transform/plugins/webpack` | Babel (TS/JSX) or VueSFC |
| Turbopack | Self-initializing loader               | Babel (TS/JSX)           |

### Transformer Configuration

All plugins accept the same core options. Bundler-specific differences are noted below.

#### Shared Options

**Relay** — controls the local relay daemon that connects the browser and your agent:

| Option      | Type      | Default       | Description                                 |
| ----------- | --------- | ------------- | ------------------------------------------- |
| `autoStart` | `boolean` | `true`        | Auto-start the relay daemon if not running  |
| `port`      | `number`  | `0` (dynamic) | Relay server port (only used when starting) |
| `host`      | `string`  | `'127.0.0.1'` | Relay server host (only used when starting) |

**Overlay** — configures the in-app element picker and annotation UI:

| Option        | Type                              | Default       | Description                              |
| ------------- | --------------------------------- | ------------- | ---------------------------------------- |
| `overlay`     | `boolean \| OverlayPluginOptions` | `true`        | Enable/disable or configure the overlay  |
| `initialMode` | `'collapsed' \| 'expanded'`       | `'collapsed'` | Initial display mode for the overlay tab |
| `debug`       | `boolean`                         | `false`       | Enable debug logging in the overlay      |

#### Vite Plugin

```ts
import { domscribe } from '@domscribe/transform/plugins/vite';

domscribe({
  include: /\.(jsx|tsx|vue)$/i, // File pattern to transform (default)
  exclude: /node_modules|\.test\.|\.spec\./i, // Files to skip (default)
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1' },
  overlay: true, // or { initialMode: 'collapsed', debug: false }
});
```

#### Webpack Plugin

```ts
import { DomscribeWebpackPlugin } from '@domscribe/transform/plugins/webpack';

new DomscribeWebpackPlugin({
  enabled: true, // Defaults to true in dev, false in production
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1' },
  overlay: true,
});
```

#### Turbopack Loader

Turbopack has no plugin system, so the loader is self-initializing — it manages relay lifecycle and overlay injection directly.

```ts
// next.config.ts (turbopack)
{
  turbopack: {
    rules: {
      '*.{tsx,jsx}': {
        loaders: [{
          loader: '@domscribe/transform/turbopack-loader',
          options: {
            enabled: true,
            debug: false,
            relay: { autoStart: true, port: 0, host: '127.0.0.1' },
            overlay: true,
          },
        }],
      },
    },
  },
}
```

## Framework Support — Runtime Context Capture

Framework adapters capture live props, state, and component metadata from the running app. We ship adapters for:

| Framework     | Adapter            | Capture Strategy                                 |
| ------------- | ------------------ | ------------------------------------------------ |
| React 18–19   | `@domscribe/react` | Fiber walking, DevTools hook, BestEffort         |
| Vue 3         | `@domscribe/vue`   | VNode inspection, Composition + Options API      |
| Next.js 15–16 | `@domscribe/next`  | React adapter + `withDomscribe()` config wrapper |
| Nuxt 3+       | `@domscribe/nuxt`  | Vue adapter + auto-configured Nuxt module        |

Using a different framework? The `FrameworkAdapter` interface in `@domscribe/runtime` lets you build your own adapter — implement `getComponentInstance`, `captureProps`, and `captureState`, and the rest of the pipeline (element tracking, PII redaction, relay transmission) works automatically. See the [Custom Adapters Guide](./packages/domscribe-runtime/CUSTOM_ADAPTERS.md) for the full interface, a worked example, and integration instructions.

### RuntimeManager Configuration

`RuntimeManager` is the browser-side singleton that captures live props, state, and DOM context from instrumented elements. It is initialized automatically by the framework adapters (`@domscribe/react`, `@domscribe/vue`, etc.), but you can configure it directly:

```ts
import { RuntimeManager } from '@domscribe/runtime';

const runtime = RuntimeManager.getInstance();
await runtime.initialize({
  adapter: myAdapter,
  debug: false,
  redactPII: true,
  blockSelectors: [],
});
```

| Option           | Type               | Default       | Description                                                                 |
| ---------------- | ------------------ | ------------- | --------------------------------------------------------------------------- |
| `adapter`        | `FrameworkAdapter` | `NoopAdapter` | Framework adapter for runtime context capture                               |
| `debug`          | `boolean`          | `false`       | Enable debug logging                                                        |
| `redactPII`      | `boolean`          | `true`        | Redact potentially sensitive values (emails, tokens, etc.) in captured data |
| `blockSelectors` | `string[]`         | `[]`          | CSS selectors for elements to skip during capture                           |

The `FrameworkAdapter` interface expected by `adapter`:

```ts
interface FrameworkAdapter {
  readonly name: string;
  readonly version?: string;
  getComponentInstance(element: HTMLElement): Nullable<unknown>;
  captureProps(component: unknown): Nullable<Record<string, unknown>>;
  captureState(component: unknown): Nullable<Record<string, unknown>>;
  getComponentName?(component: unknown): Nullable<string>;
  getComponentTree?(component: unknown): Nullable<ComponentTreeNode>;
}
```

---

## MCP Tools Reference

### Source Query (Code → UI)

| Tool                       | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `domscribe.query.bySource` | Query a source file + line and get live runtime context from the browser (props, state, DOM snapshot) |
| `domscribe.manifest.query` | Find all manifest entries by file path, component name, or element ID                                 |
| `domscribe.manifest.stats` | Manifest coverage statistics (entry count, file count, component count, cache hit rate)               |

### Element Resolution (UI → Code)

| Tool                      | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `domscribe.resolve`       | Resolve a single `data-ds` element ID to its ManifestEntry (file, line, col, component) |
| `domscribe.resolve.batch` | Resolve multiple element IDs in one call                                                |

### Annotation Workflow

| Tool                                | Description                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `domscribe.annotation.process`      | Atomically claim the next queued annotation (`claimNext` — prevents concurrent agent conflicts) |
| `domscribe.annotation.respond`      | Attach agent response and transition to `PROCESSED`                                             |
| `domscribe.annotation.updateStatus` | Manually transition annotation status                                                           |
| `domscribe.annotation.get`          | Retrieve annotation by ID                                                                       |
| `domscribe.annotation.list`         | List annotations with status/filter options                                                     |
| `domscribe.annotation.search`       | Full-text search across annotation content                                                      |

### System

| Tool               | Description                                       |
| ------------------ | ------------------------------------------------- |
| `domscribe.status` | Relay daemon health, manifest stats, queue counts |

### MCP Prompts

| Prompt              | Purpose                             |
| ------------------- | ----------------------------------- |
| `process_next`      | Guide through annotation processing |
| `check_status`      | Check relay status                  |
| `explore_component` | Explore component metadata          |
| `find_annotations`  | Search for annotations              |

---

## Annotation Lifecycle

| From         | To           | Trigger                                    |
| ------------ | ------------ | ------------------------------------------ |
| `QUEUED`     | `PROCESSING` | Agent calls `domscribe.annotation.process` |
| `PROCESSING` | `PROCESSED`  | Agent calls `domscribe.annotation.respond` |
| `PROCESSING` | `FAILED`     | Agent error or timeout                     |
| `PROCESSED`  | `ARCHIVED`   | Developer archives via overlay             |

A developer clicks an element in picker mode, types an instruction in the sidebar, and submits. The annotation is stored as `QUEUED`. A coding agent picks it up via `domscribe.annotation.process` (atomic — no two agents process the same annotation), resolves the source location, edits the code, and calls `domscribe.annotation.respond`. The overlay receives a WebSocket broadcast and shows the agent's response in real time.

---

## Relay CLI

```bash
domscribe serve     # Start relay server (foreground or --daemon)
domscribe status    # Check relay daemon status
domscribe stop      # Stop relay daemon
domscribe init      # Initialize workspace (.domscribe directory)
domscribe mcp       # Run as MCP server via stdio
```

For agent MCP configuration, use the standalone binary:

```bash
domscribe-mcp       # Standalone MCP server binary (use this in your agent's MCP config)
```

---

## Zero Production Impact

`withDomscribe()` and the Nuxt module only activate in dev mode. In production, `@domscribe/overlay` is aliased to a no-op stub — zero `data-ds` attributes, zero relay connections, zero overlay scripts in the production bundle. This is enforced by `production-strip.test.ts` in CI, which runs against every real fixture.

---

## Integration Tests

CI runs four pipeline stages, with integration and e2e parallelized across fixtures:

```
checks (lint, test, build, typecheck)
    ↓
build-registry (build → publish to Verdaccio → upload storage artifact)
    ↓
integration [8 fixtures in parallel]     e2e [14 fixtures in parallel]
```

All tests run against real published packages via a Verdaccio local registry — no mocked package resolution. The `build-registry` job publishes once and uploads the registry storage as an artifact; downstream matrix jobs download it and start Verdaccio from the pre-populated storage.

**Fixtures**: React 18/19 (Vite 5, Webpack 5), Next.js 15/16, Vue 3 (Vite 5, Webpack 5), and Nuxt 3. Integration tests validate builds programmatically (Vite/Webpack only). E2E tests use Playwright with real browser interaction including shadow DOM piercing.

---

## Packages

| Package                    | Description                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `@domscribe/core`          | Zod schemas, RFC 7807 error system, ID generation, PII redaction, constants         |
| `@domscribe/manifest`      | Append-only JSONL manifest, IDStabilizer (xxhash64), BatchWriter, ManifestCompactor |
| `@domscribe/relay`         | Fastify HTTP/WS server, MCP stdio adapter, CLI, annotation lifecycle                |
| `@domscribe/transform`     | Parser-agnostic AST injection (Acorn, Babel, VueSFC), bundler plugins               |
| `@domscribe/runtime`       | Browser-side ElementTracker, ContextCapturer, BridgeDispatch                        |
| `@domscribe/overlay`       | Lit web components (shadow DOM), element picker, annotation UI                      |
| `@domscribe/react`         | React fiber walking, props/state extraction, Vite + Webpack plugins                 |
| `@domscribe/vue`           | Vue 3 VNode resolution, Composition + Options API support, Vite + Webpack plugins   |
| `@domscribe/next`          | `withDomscribe()` config wrapper for Next.js 15 + 16                                |
| `@domscribe/nuxt`          | Nuxt 3+ module with auto-relay and runtime plugin                                   |
| `@domscribe/test-fixtures` | Black-box integration + e2e suite (not published)                                   |

---

## Contributing

```bash
pnpm install
nx run-many -t build test lint typecheck
```

Conventions are in `.claude/rules/`. PRs welcome.

---

## License

[MIT](./LICENSE)
