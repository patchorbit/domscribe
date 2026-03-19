# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Detailed conventions, testing patterns, and architecture decisions are in `.claude/rules/`.

## What is Domscribe?

Domscribe is a pixel-to-code development tool that lets developers click elements in running web apps, captures runtime context (props, state, events), and maps them to exact source locations for handoff to coding agents via MCP.

## How to Work on This Codebase

**Read before writing.** Understand the existing patterns in a package before adding code. Match the style of what's already there.

**Core principles:**

- **Schema-first** — Define Zod schemas, derive types with `z.infer<>`. Never hand-write interfaces that duplicate schema shapes.
- **Named exports only** — No default exports. Barrel `index.ts` files define the public API.
- **Module boundaries are enforced** — Check `tags` in `project.json` before adding cross-package imports. If the boundary disallows it, rethink the design — don't just add a tag.
- **ESM with `.js` extensions** — All imports use `.js` extension (compiled output). Module system is `nodenext`.
- **Constructor DI** — Dependencies injected via `private readonly` constructor params. No service locators or global containers.

**Testing:**

- **Unit tests mock dependencies.** Use `vi.mock()` and `vi.fn()`. Constructor DI makes this clean.
- **Don't spy on globals** (`console`, etc.) — test behavior, not log output.
- **Test-fixtures is the black-box layer** — integration/e2e tests there have zero `@domscribe/*` imports. They build real apps and validate outputs.
- **Relay is the exception** — its unit tests use real services with temp directories (integration-style).

**Don't over-engineer.** Match the complexity of existing code. No premature abstractions, no speculative features, no redundant tests.

## Commands

```bash
# Install dependencies (pnpm, NOT npm)
pnpm install

# Build, lint, and test all packages (excludes test-fixtures)
pnpm build:all

# Build only affected packages
pnpm build:affected

# Single package operations
nx build domscribe-core
nx test domscribe-core
nx lint domscribe-core
nx typecheck domscribe-core

# Run specific tests
nx test domscribe-core -- --testPathPattern=annotation
nx test domscribe-core -- -t "test name"

# Integration tests (test-fixtures package)
nx integration domscribe-test-fixtures

# E2E tests (requires Verdaccio + published packages)
nx e2e domscribe-test-fixtures
# Skip env vars: SKIP_SETUP=1, SKIP_PUBLISH=1, SKIP_INSTALL=1

# Local registry pipeline
pnpm release:local          # build → version → sync-dist → publish to Verdaccio
pnpm pipeline:full           # publish → install fixtures → integration + e2e
pnpm pipeline:e2e            # publish → install fixtures → e2e only

# Verdaccio (local npm registry on port 4873)
npx verdaccio --config .verdaccio/config.yml --listen 4873
```

## Architecture

### Package Dependency Graph (bottom-up)

```
@domscribe/core          — Shared types, schemas (zod), utilities, constants
@domscribe/manifest      — Append-only DOM→source index (depends on core)
@domscribe/runtime       — Browser-side context capture, framework adapters (depends on core)
@domscribe/relay         — Local HTTP/WS server + MCP server + CLI (depends on core, manifest)
@domscribe/overlay       — Lit web components for in-app UI (depends on core, runtime, relay)
@domscribe/transform     — AST injection of stable element IDs + bundler plugins (depends on core, manifest, overlay, relay)
@domscribe/react         — React adapter (depends on core, runtime)
@domscribe/vue           — Vue adapter (depends on runtime, core)
@domscribe/next          — Next.js integration via webpack (depends on transform, runtime, react)
@domscribe/nuxt          — Nuxt module (depends on relay, transform, runtime, vue)
@domscribe/test-fixtures — Integration & e2e test suites (private, not published)
```

### Subpath Exports

Several packages expose multiple entry points:

- `@domscribe/transform/plugins/vite`, `@domscribe/transform/plugins/webpack`, `@domscribe/transform/webpack-loader`
- `@domscribe/overlay/auto-init`
- `@domscribe/react/vite`, `@domscribe/react/webpack`, `@domscribe/react/auto-init`
- `@domscribe/vue/vite`, `@domscribe/vue/webpack`, `@domscribe/vue/auto-init`

Dist subpath exports are defined in `distExports` in each package.json, resolved by `scripts/resolve-workspace-deps.mjs`.

### Build System

- **Nx 22.x** orchestrates builds with `@nx/js/typescript` (tsc) for all library packages
- Build outputs go to `dist/packages/{pkgName}`
- `sync-dist` target copies and resolves package.json into dist (versions, exports, workspace deps)
- `scripts/nx-plugin.ts` adds `sync-dist` and `clean` targets to all libraries

### Module Boundary Rules

Defined in `eslint.config.mjs` via Nx enforce-module-boundaries:

- **scope:core** — Can only depend on core
- **scope:infra** — Can depend on core, infra
- **scope:build** — Can depend on core, infra
- **scope:adapter** — Can depend on core, infra, build, adapter

### Test Fixtures

Located in `packages/domscribe-test-fixtures/fixtures/{bundler}/{version}/{framework-ver-lang}/`. Each is a standalone app with its own `package.json` (uses npm, not pnpm). Fixtures are generated via `npx nx g @domscribe/test-fixtures:test-fixture`.

- `_registry/` — Reference components copied into fixtures
- `_templates/` — Generator templates (files use `__tmpl__` suffix, stripped during generation)
- Playwright global setup (`e2e/global-setup.ts`) orchestrates: start Verdaccio → build packages → publish → install into fixtures
- All fixture dev servers use dynamic ports (`port: 0`) with HTTP polling for readiness

### Overlay (Lit Web Components)

Uses shadow DOM — Playwright locators/clicks do not pierce shadow DOM; must use `page.evaluate()` for shadow DOM interactions. The tab uses `setPointerCapture`, so synthetic `.click()` fails; use `page.mouse.click()` with real coordinates.

### Verdaccio

Binds to IPv6 `[::1]` — port availability checks must try both `::1` and `127.0.0.1`. Config at `.verdaccio/config.yml`, storage at `tmp/local-registry/storage`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
