# Stateful handoff implementation plan

> **For agentic workers:** Use superpowers:executing-plans; implement sequentially
> in the isolated worktree, with independent review before delivery.

**Goal:** Fix the three observed installation/context/replay gaps.
**Architecture:** Plugin-owned dependency initialization; optional source-aware
adapter capture; explicit dialog context guards in portable target identity.
**Tech stack:** Existing TypeScript/Nx/Vitest, Vite, Vue/React, browser consumers.
**Spec:** `docs/superpowers/specs/2026-10-26-stateful-handoff-design.md`.

## Global constraints

Preserve primary checkouts/lockfiles. Schema-first public types. No global Zod
alias or arbitrary state fingerprint. Bounded/redacted capture. Legacy locator
requests cannot bypass new guards. No publish/deploy/credential changes.

## Review focus

- Isolated pnpm dependency resolution and overlay=false must both initialize.
- Same-basename components and metadata missing in supported frameworks must
  not masquerade as a source match.
- DOM replacement during async source lookup must refuse stale capture.
- Legacy/nested/redacted dialog locators must not act on the wrong record.
- Context keys stay explicit; regular row identity and production builds survive.

### Task 1 — Mixed-schema Vite initialization

Files: Vite plugins in transform/react/vue and focused browser consumer regression
under scripts/fixtures; affected plugin specs only where a contract needs it.

- [ ] Reproduce normal app Zod3 + local-artifact Domscribe4 browser failure with
  no optimizer override; assert schema works and runtime/relay connect.
- [ ] Establish clean affected baseline through configured Nx tasks.
- [ ] Fix dependency ownership/pre-optimization in plugins using actual installed
  resolution, retaining user settings and disabled-overlay behavior.
- [ ] Verify npm/pnpm and Vite boundaries; production stripping. Commit slice.

### Task 2 — Source-owning component capture

Files: core runtime-context schema, runtime adapter/capture/bridge, Vue adapter,
relay/overlay capture consumers and their regression specs.

Interface: optional adapter `resolveSourceComponent(element, sourceFile)` returns
an instance and proven source file; capture options accept requested source file;
runtime context metadata labels matched/nearest/unavailable ownership.

- [ ] Add failing tests for owner props through wrappers, exact path vs basename,
  metadata unavailable, cycles and existing privacy/capture options.
- [ ] Implement bounded Vue parent resolution and core/runtime metadata.
- [ ] Resolve manifest before selected-instance capture through overlay/relay;
  revalidate the instance after the async lookup. Add failing race coverage.
- [ ] Real wrapped Vue/Hoppscotch owner capture; representative React compatibility,
  fresh-session source context, redaction and production stripping. Commit slice.

### Task 3 — Dialog context guards

Files: core target schema/replay validation, runtime target registry/specs,
consumer fixtures and API documentation.

Interface: `data-ds-context` is an explicit non-secret locator attribute;
`unsupportedReason` also accepts `context_required`.

- [ ] Failing wrong-record, legacy, retained-node, nested-dialog, empty/redacted
  context and existing-row regression cases.
- [ ] Enforce context coverage when capturing AND resolving portable locators;
  preserve raw overflow checks and local inspection behavior.
- [ ] Verify unmodified Hoppscotch refuses portable dialog replay; explicit-key
  fixture replays only the intended record and preserves neighbors. Document
  main-only API behavior and required context integration. Commit slice.

### Task 4 — Review and delivery

- [ ] Run all affected configured checks and uncached broader unit suite, fresh
  browser/npm/pnpm validation and original Hoppscotch flows without overrides.
- [ ] Independent review; fix material findings with regression tests.
- [ ] Push focused PR(s), attach them, follow latest-head CI and merge with
  standing admin-bypass authority only after required checks pass.
- [ ] Update continuity ledger with commit/commands/results/limitations and next
  meaningful experiment; no commercial advantage claims from setup fixes.
