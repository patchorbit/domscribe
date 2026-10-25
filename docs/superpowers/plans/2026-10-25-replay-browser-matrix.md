# Replay Browser Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the target/portable replay APIs in real React and Vue consumers using npm/pnpm and Vite5/7, and make those checks repeat automatically in CI.

**Architecture:** Parameterize the existing local-artifact Chromium consumer harness, use an equivalent compiled Vue SFC fixture, and reuse its source/instance, persisted replay and production-stripping assertions. Add bounded CI matrix jobs consuming the existing package-dist artifact and retain small evidence bundles on success or failure.

**Tech Stack:** Node built-ins, existing Playwright fixture dependency, React18/Vue3, Vite5/7, npm/pnpm, GitHub Actions.

**Spec:** Existing `docs/superpowers/specs/2026-10-25-instance-selection-replay-design.md`; this closes its stated Vue and package-manager browser-verification gap.

## Global Constraints

- No runtime dependency changes, production publishing/deployment, protection bypass or CI Action product implementation.
- Preserve the default React/npm/Vite7 invocation.
- Validate actual framework source and installed versions; passing configuration metadata alone is not sufficient.
- Do not package artifacts concurrently with dist rebuilding.
- Remain explicit that synthetic regression coverage is not adoption validation or Next/Nuxt coverage.

## Review Focus

- Framework flags must not silently exercise the wrong adapter.
- pnpm must use installed tarballs without workspace source aliases or registry fallback masking a missing artifact.
- Fixture source selection and live props must belong to the intended repeated Vue instance.
- Failed installs, browser readiness and production errors must preserve useful evidence and close owned processes.
- CI matrix jobs must remain isolated and bounded, with no production credentials or publishing.

### Task 1: Genuine framework/manager/version selection

**Files:** Modify `scripts/verify-instance-replay.mjs`; create fixture helpers only if keeping the harness readable requires them.

**Interfaces:** CLI `--framework=react|vue`, `--package-manager=npm|pnpm`, `--vite-version=<exact supported version>`, optional `--report-dir=<path>`. Defaults remain react/npm/7.3.7. Result includes requested and actual package/framework versions and mapped source.

- [x] Run the old harness with Vue/pnpm/Vite5 flags and observe the missing Vue evidence assertion fail after it incorrectly exercises React.
- [x] Implement strict argument parsing, actual dependency/install selection and equivalent Vue SFC fixture. Preserve full existing replay assertions and assert Vue source ends in Card.vue.
- [x] Run fresh React/npm/Vite7, React/pnpm/Vite5, Vue/npm/Vite7 and Vue/pnpm/Vite5 consumers; fix demonstrated failures with regressions.

### Task 2: Continuous regression checks and docs

**Files:** Modify `.github/workflows/ci.yml` and `docs/agent-targets-and-replay.md`.

- [x] Add the four representative browser jobs after build-registry, max parallelism two, explicit timeout, existing Playwright install, package artifact download and retained evidence.
- [x] Document exact coverage and CLI usage; preserve the Next/Nuxt new-API browser coverage limitation.
- [x] Validate the workflow and harness behavior, obtain focused independent review, and push the tested PR77 update. Recheck CI before any normal merge; required independent GitHub review remains a separate repository protection.
