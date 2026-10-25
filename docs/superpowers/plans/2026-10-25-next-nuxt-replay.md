# Next and Nuxt Replay Verification Plan

> **For agentic workers:** Use superpowers:executing-plans inline; obtain one independent whole-branch review. Steps use checkboxes.

**Goal:** Close the Next/Nuxt exact-instance and portable replay browser gap, fixing reproduced integration defects with regression tests.

**Architecture:** Extend the existing isolated local-tarball consumer harness and equivalent customer-editor fixtures. Exercise native Next App Router SSR/hydration (15 Webpack, 16 Turbopack) and Nuxt SSR/hydration (3 and 4), with the same exact-source/props/state, fresh-session replay and production assertions. Keep framework setup and commands in a small helper.

**Tech Stack:** Existing Node/Playwright harness, Next15.5.28/16.4.3, React19.3.1, Nuxt3.21.11/4.6.2, Vue3.5.44; npm/pnpm.

**Spec:** `docs/superpowers/specs/2026-10-25-instance-selection-replay-design.md` and the user's authorized continuation of framework and realistic-app verification.

## Constraints and review focus

- Reuse isolated worktree on branch codex/next-nuxt-portable-replay, based on freshly fetched main2e0d92d. Preserve user checkouts and lockfiles.
- Keep default React/Vite verification working. No publication/deployment, credentials, settings or CI Action product work.
- Assert actual installed framework versions, expected source files, and committed component state after hydration; no framework-state injection.
- pnpm local-artifact overrides remain explicit; do not claim unmodified published-package success.
- Bound SSR startup/build/browser operations and clean owned process trees, including failures. Retain logs/screenshots.
- Verify conditional production elements and production UI actions; a replay success alone is insufficient.
- Add navigation/lifecycle evidence where it exposes a real gap. Report unsupported paths honestly.

## Task 1: Native SSR consumers

- [x] Baseline React consumer passes; current Next invocation fails because only React/Vue are accepted (RED).
- [x] Extend CLI with next/nuxt and exact framework-version, native config/source/commands, bounded builds and cleanup. Share fixture UI.
- [x] Run fresh Next15/npm, Next16/pnpm, Nuxt3/npm, Nuxt4/pnpm consumers. Record actual versions, mapped sources, all outcomes. Fix product failures only after reproducing them.

## Task 2: Regression delivery and readiness

- [x] Add representative bounded CI cases and accurate docs for passing paths; rerun default React/Vue regressions.
- [x] Run affected configured checks and obtain independent review; address material findings with regressions.
- [ ] Push focused PR, inspect latest CI, and record final status.
- [ ] Update continuity ledger with exact evidence and remaining realistic-app/lifecycle gaps. Do not claim readiness or measured user advantage prematurely.

## Execution evidence

- Old harness Next invocation rejected (RED). Original React baseline passed seven checks.
- Native Next15/npm, Next16/pnpm and Nuxt4/pnpm initially passed; Nuxt3/npm consistently failed cold readiness. Diagnostic browser showed native Nuxt plugin importing raw runtime ESM and app query importing optimized runtime, with separate singletons. Isolated exclude hypothesis passed on a cold cache.
- Regression unit initially failed (1 failed /32 passed). Nuxt module now preserves existing optimizeDeps excludes and adds runtime exclusion idempotently after its dev guard. Configured Nuxt test/lint/build passed;41 tests. Fresh Nuxt3 cold consumer then passed eight checks. One attempted install hit /tmp inode exhaustion; retained failure evidence and cleaned completed temporary dependencies before fresh success.
- All eight representative consumer combinations passed eight browser checks each. No console/page/network errors. Latest process-helper reruns: Next16/pnpm, Nuxt3/npm and Vue/pnpm also passed eight each.
- Full uncached configured unit suite passed2114 tests in11 projects (test dependencies already built; excluded dependency tasks to avoid concurrent artifact mutation).
- Independent review found one P2: direct-child build timeout could leave workers. Reproduced surviving worker on timeout and cleaned it; replaced with detached owned-group async build, TERM/KILL deadline and retained logs. Two process regression tests pass; focused re-review has no material findings. Applied bounded polling to avoid a termination-signal race in its Linux test.
- Whole-branch readiness/push and real-site navigation evidence remain in progress.
