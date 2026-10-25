# Instance Selection and Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Select the correct rendered instance and replay captured targets in a fresh browser session without guessing.

**Architecture:** Add versioned target/replay contracts to core and a DOM target registry to runtime. Integrate exact resolution into relay/MCP and annotation capture, and execute replay through a supplied browser driver.

**Tech Stack:** TypeScript, Zod, Vitest, existing Nx/pnpm workspace; Chromium/Playwright only in verification harnesses.

**Spec:** `docs/superpowers/specs/2026-10-25-instance-selection-replay-design.md`

## Global Constraints

- No new runtime dependencies, package version bumps, publishing, deployment or GitHub Action.
- Multiple matches stop resolution; no positional guessing.
- Browser drivers perform actual UI actions; no framework-state mutation.
- Main-document light DOM only; explicit privacy and readiness boundaries.

## Review Focus

- Recycled DOM nodes must invalidate old identity rather than target a different record.
- Duplicate siblings, removal and sorting must not erase or confuse other instances.
- Redacted/blocked targets and password/file inputs must not leak through locator/replay paths.
- Multiple browsers, malformed requests and stale handles must produce explicit failures.
- A replay resolution/action failure must stop all subsequent actions.

### Task 1: Strict rendered targets and portable locators

**Files:** create core `lib/types/target.ts`, runtime `targets/target-registry.ts` and tests; modify core/runtime exports, runtime manager and element tracker.

**Interfaces:** `PortableLocator`, `ElementTarget`, `TargetQuery`, `TargetResolution`; `RuntimeManager.queryTargets(query)` and `describeTarget(element)`; target registry resolves exact/portable targets without context capture.

- [x] Write and run failing real-DOM tests: three shared IDs resolve ambiguously; exact Lyra selection survives sort; removal/recycling invalidates a handle; portable locator resolves after fresh DOM creation; duplicate/changed scope and wrong route fail; privacy filtering excludes blocked targets.
- [x] Implement bounded locator matching, instance lifecycle, strict source lookup and runtime APIs. Preserve legacy count/entry-ID contracts.
- [x] Run runtime and core suites; commit the tested contracts and registry.

### Task 2: Replay and annotation persistence

**Files:** create core replay driver helper/tests and runtime replay recorder tests; modify annotation schema, bridge dispatch and overlay store capture/locate/refresh.

**Interfaces:** `ReplayTrace`, `ReplayStep`, `ReplayDriver`, `replaySteps(trace, driver)`; `RuntimeManager.createReplayStep(element, action)`; optional `SelectedElement.target` stores an `ElementTarget`.

- [x] Write and run failing tests: resolve each portable step anew, stop on ambiguity or action error, reject unsafe/redacted recording, preserve legacy annotations, and locate the intended repeated annotation after remount.
- [x] Implement schema validation, driver sequencing and annotation integration. Legacy source/selector fallback is unique-only.
- [x] Run core/runtime/overlay suites; commit the replay and annotation paths.

### Task 3: Relay and agent target queries

**Files:** modify relay schema/ws/client/source query, overlay relay handler; create target query HTTP route and MCP tool with boundary tests.

**Interfaces:** `POST /api/v1/targets/query`, `domscribe.targets.query`, `WSServer.requestTargets(query)`; source query optionally accepts `instanceId` or `locator`, returns target status/candidates.

- [x] Write and run failing boundary tests for request validation, ambiguous selection, exact instance context, multiple-browser refusal and MCP serialization.
- [x] Implement request/response plumbing using published-style serializable contracts, and source query selection forwarding.
- [x] Run relay/core/runtime/overlay suites and affected builds/lint; commit.

### Task 4: Real-browser replay and review

**Files:** add focused consumer/browser regression harness and usage documentation.

- [x] Build local packages, install them into an isolated consumer, capture UI steps, recreate Chromium context, replay through real browser actions, assert wrong-row ambiguity is refused and selected row is correct.
- [x] Run configured full unit suites and affected lint/build checks uncached with bounded workers. Record actual tested scope and failures.
- [x] Obtain a fresh whole-branch review, address material findings with regression tests, and commit final documentation/evidence references. Do not merge or publish.
