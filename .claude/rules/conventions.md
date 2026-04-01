---
description: Software design philosophy, coding style, naming, TypeScript idioms, and patterns used across all packages
---

# Coding Conventions

## Software Design Philosophy

Every code change — feature, bug fix, or refactor — must come from a design perspective. Never just "patch" code. Before writing, step back and consider the larger picture:

- **Think architecturally.** Understand where the change fits within the overall system. Establish the right levels of abstraction. Don't bolt functionality onto the wrong layer.
- **Functions are true units.** Each function should do one thing, be of manageable size, and be independently testable. If a function needs a paragraph to explain, it's doing too much — decompose it.
- **Classes and modules define boundaries.** Each class/module should have a clear contract — what it owns, what it exposes, and what it delegates. Don't let responsibilities leak across boundaries.
- **Readability is non-negotiable.** Code is read far more than it's written. Favor clarity over cleverness.
- **Flat over nested.** Prefer early returns and guard clauses over deeply nested `if/else` chains. Short-circuit out of conditional branches as early as possible.
- **Decompose into smaller parts.** Break solutions into small, reusable, easily testable components. If you can't unit-test a piece in isolation, it's too entangled.

**Guiding principles:** SRP. DRY. Clean Code. KISS. YAGNI.

## Naming

- **Files**: kebab-case (`context-capturer.ts`, `fiber-walker.ts`). Suffixes: `.spec.ts` (tests), `.types.ts` (type-only), `.interface.ts` (interfaces)
- **Classes**: PascalCase, descriptive (`DomscribeInjector`, `AnnotationService`, `ReactAdapter`)
- **Functions**: camelCase, verb-first (`generateEntryId()`, `redactText()`, `isValidElementId()`)
- **Constants**: UPPER_SNAKE_CASE with `as const` (`API_PATHS`, `WS_EVENTS`, `PATTERNS`)
- **Types/Interfaces**: PascalCase. Suffix `-Schema` for Zod schemas, `-Options` for config, `-Result` for returns
- **Error codes**: `DS_` prefix, UPPER_SNAKE_CASE enum (`DS_VALIDATION_FAILED`, `DS_MANIFEST_INVALID`)
- **Console messages**: `[package-name]` prefix (`[domscribe-transform]`, `[VueAdapter]`)

## Exports

- **Named exports only** — no default exports anywhere in the codebase
- **Barrel exports** via `index.ts` with `.js` extensions: `export * from './module.js'`
- **Separate type exports**: `export { Service }; export type { ServiceInput };`
- **Public API** is defined by `src/index.ts` — internal modules are not re-exported

## Imports

Ordered top-to-bottom:

1. Node builtins: `import { existsSync } from 'fs'`
2. Third-party: `import { z } from 'zod'`
3. Internal packages: `import { DomscribeError } from '@domscribe/core'`
4. Relative: `import { FiberWalker } from '../fiber/fiber-walker.js'`
5. Type-only (last): `import type { ExtendedReactFiber } from '../fiber/types.js'`

All imports use `.js` extension (ESM compiled output).

## TypeScript Idioms

- **Schema-first**: Define Zod schemas, derive types with `z.infer<>`. Never hand-write interfaces that duplicate schema shape.
- **`unknown` over `any`**: Use `unknown` for untyped values, narrow with type guards
- **`Nullable<T>`**: Use the project's `Nullable<T>` alias (from core) instead of `T | null`
- **`readonly`**: Mark interface fields and constructor params as `readonly`
- **Constructor DI**: Dependencies injected via `private readonly` constructor params
- **Generics**: Use for parser abstractions, route handlers, storage providers
- **Type guards**: Prefer `function isFoo(x: unknown): x is Foo` over type assertions
- **`as const`**: Use on constant objects and arrays for literal type inference

## Error Handling

- All domain errors use `DomscribeError` extending `Error` with RFC 7807 (Problem Details)
- Catch blocks use `error: unknown` — narrow with `instanceof DomscribeError` then `instanceof Error`
- Errors expose `.toProblemDetails()` for API responses and `.toJSON()` for serialization
- Debug logging is gated on `this.options.debug` — never unconditional

## Patterns

- **Singleton**: Private constructor + static `getInstance()` + static `resetInstance()` (for tests). Safe to call `initialize()` multiple times.
- **Strategy**: Interface with multiple implementations (`FrameworkAdapter` → `ReactAdapter`, `VueAdapter`, `NoopAdapter`)
- **Dependency injection**: Constructor-based, not container-based. Classes receive dependencies, don't reach for globals.
- **Append-only**: Manifest uses JSONL with hash-based staleness — entries are added, never deleted
- **Migrate on read**: Schema migrations run sequentially on deserialization without re-validating through Zod (preserves pre-existing data)
- **Adapter hints**: Framework-specific knowledge (which keys are internals, which hooks to skip) is declared by the adapter via optional interface methods (`getSerializationHints()`), not hardcoded in the generic runtime. The runtime provides the mechanism; the adapter provides the policy.

## Comments & Documentation

- Module-level JSDoc with `@module` tag on main files
- Method-level JSDoc with `@remarks` for non-obvious behaviors
- Algorithm comments with numbered steps and performance notes
- Schema fields get `.describe()` calls for OpenAPI generation
- Inline comments only for non-obvious logic — don't comment what the code already says
