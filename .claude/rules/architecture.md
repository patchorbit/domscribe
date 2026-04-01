---
description: Module boundaries, schema-first design, package structure, and build system invariants
---

# Architecture Guide

## Module Boundary Rules

Dependencies flow in one direction only. Checked at lint time via `@nx/enforce-module-boundaries`.

```
scope:core     → can only depend on core
scope:infra    → can depend on core, infra
scope:build    → can depend on core, infra
scope:adapter  → can depend on core, infra, build, adapter
```

Package-to-scope mapping:

- **core**: `@domscribe/core`
- **infra**: `@domscribe/manifest`, `@domscribe/relay`
- **build**: `@domscribe/transform`
- **adapter**: `@domscribe/react`, `@domscribe/vue`, `@domscribe/runtime`, `@domscribe/overlay`, `@domscribe/next`, `@domscribe/nuxt`

**Before adding a cross-package import**: check `tags` in the source package's `project.json` to verify the dependency is allowed. If it's not, the architecture needs to be reconsidered — don't just add the tag.

## Schema-First Design

Zod schemas are the single source of truth for data shapes:

1. Define the schema: `export const FooSchema = z.object({...})`
2. Derive the type: `export type Foo = z.infer<typeof FooSchema>`
3. Add `.describe()` on fields for OpenAPI generation
4. Validate at system boundaries (API routes, deserialization) — not internally

Never create a hand-written interface that duplicates a Zod schema's shape. If you need a type, derive it.

## Package Structure Template

```
packages/domscribe-{name}/
├── src/
│   ├── index.ts                 # Barrel export (public API surface)
│   ├── lib/
│   │   ├── {feature}/
│   │   │   ├── {feature}.ts
│   │   │   ├── {feature}.spec.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts         # Feature barrel
│   │   ├── errors/
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   └── index.ts
│   │   └── utils/
│   └── {subpath-entry}/         # For distExports subpaths
│       └── index.ts
├── project.json                 # Nx project config with scope tags
├── package.json                 # With distExports for subpath entries
├── tsconfig.lib.json            # Extends ../../tsconfig.base.json
├── tsconfig.spec.json           # Test-specific config
└── vite.config.ts               # Vitest config with coverage thresholds
```

## Subpath Exports

Packages with multiple entry points define them in `distExports` in package.json:

```json
{
  "distExports": {
    "./plugins/vite": "./plugins/vite/index.js",
    "./plugins/webpack": "./plugins/webpack/index.js"
  }
}
```

These are resolved by `scripts/resolve-workspace-deps.mjs` during `sync-dist`. Don't manually edit the `exports` field in dist package.json — it's generated.

## Build System Invariants

- **ESM only**: `module: "nodenext"`, `moduleResolution: "nodenext"` — all imports use `.js` extension
- **Target**: `es2024` across all packages
- **Output**: `dist/packages/{pkgName}` — uniform across the monorepo
- **Build orchestration**: Nx with `@nx/js:tsc` executor. `dependsOn: ["^build"]` ensures correct order.
- **sync-dist**: Copies package.json into dist, resolves workspace deps to real versions, maps distExports to exports field
- **Custom Nx plugin** (`scripts/nx-plugin.ts`): Adds `sync-dist` and `clean` targets to all library packages

## Adding a New Package

1. Create under `packages/domscribe-{name}/`
2. Follow the package structure template above
3. Add appropriate `tags` in `project.json` (`scope:core|infra|build|adapter`)
4. Add TypeScript path aliases to `tsconfig.base.json`
5. Add `distExports` in package.json if the package has subpath entry points
6. Verify module boundaries: `nx lint domscribe-{name}`

## Key Design Decisions

- **Append-only manifest**: JSONL format, entries are never deleted. Hash-based staleness detection via xxhash64. BatchWriter flushes every 50 entries or 100ms.
- **Stable IDs across HMR**: Content-hash caching with >80% target hit rate. `IDStabilizer` uses per-cache-dir singletons.
- **Shadow DOM isolation**: Overlay uses Lit web components with shadow DOM to prevent CSS/JS conflicts with the host app.
- **Zero production impact**: All instrumentation is dev-only. Production builds strip `data-ds` attributes, overlay scripts, and relay connections.
- **Dynamic ports**: Dev servers and relay use `port: 0`. Never hardcode port numbers.
- **IPv6-aware**: Verdaccio binds to `[::1]` — port availability checks must try both `::1` and `127.0.0.1`.
- **Bounded serialization**: Props and state serialization is constrained by depth (6/4), array length (20), string length (2048), property count (50), and byte budget (256 KB). Adapters provide `SerializationHints` via `getSerializationHints()` to skip framework-internal keys (React: `_owner`, `__reactFiber$*`; Vue: `__v_*`).
- **Shared runtime options**: `DomscribeRuntimeOptions` (including `serialization` constraints) is defined once in `@domscribe/runtime` and re-exported by adapter packages. Framework-specific capture options remain in each adapter.
