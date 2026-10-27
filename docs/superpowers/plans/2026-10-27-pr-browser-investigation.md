# Browser PR investigation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a browser agent against pinned base/head app instances and produce independently verified PR findings without reporter capture.
**Architecture:** Experimental private script package with strict config/proposal/report schemas, pure grading and fenced rendering, trusted declarative Playwright executor, isolated worktree/app lifecycle controller, read-only Codex/browser discovery adapter. Reuse existing bounded process helpers.
**Tech Stack:** Node24, TypeScript, existing tsx/Playwright/child_process, Zod4 as a root dev dependency matching the existing core version, node:test.
**Spec:** docs/superpowers/specs/2026-10-27-pr-browser-investigation-design.md

## Global constraints

- Isolated clean feature worktree from current main ce9648e; preserve all primary checkouts and lockfiles.
- Trusted local repositories/synthetic data only; local process execution is not a customer security sandbox.
- No credential reads/copies, cloud auth retries, automatic external comments/issues, app fixes, publishing or deployment.
- Agent proposal <=1MiB, <=40 steps/journey; max10 journeys/config. Unique accessible locators; no arbitrary code or assertion changes.
- Confirmed regression requires base-pass and consistent semantic failure on two fresh head runs against approved expectations.
- No full-app-health, model parity, efficiency or demand claims from a small pilot.

## Review focus

- Agent-crafted evidence, changed source or invented expectations cannot become verified regressions.
- Setup/action failure, pre-existing failure and inconsistent head repeats remain explicit.
- Ref/path option injection, symlink escapes, overwritten output and leaked logs/credentials.
- Cancellation/deadline cleanup includes descendants, browsers, worktrees and partially started app sessions.
- Healthy/unchanged revisions and duplicate proposals cannot generate noisy bug reports.

### Task 1: Contract and conservative report grading

**Files:** Create scripts/investigation/{package.json,schema.ts,grade.ts,grade.test.ts,report.ts,report.test.ts,tsconfig.json}; root package.json/pnpm-lock.yaml dev-only Zod declaration if needed.
**Interfaces:** ConfigSchema, ProposalSchema, ObservationSchema, ReportSchema infer types; gradeInvestigation(config, proposals, observations, metadata):Report; renderReport(report):string. Metadata carries exact base/head/config/diff hashes and execution scope. Observations carry setup/action/completed status plus expected/actual per expectation and artifact names. Agent input never supplies observation verdicts.

- [ ] RED tests: base fails ->preexisting; basepass/headfail/repeatfail ->confirmed only when same expectation/actual; repeat mismatch/action failure ->inconclusive; unknown/duplicate journey proposal rejected; healthy results ->no findings; unsafe render content remains fenced.
- [ ] Implement strict schemas, pure grading/fingerprints, bounded report renderer; no new runtime/public package API.
- [ ] Run pnpm exec tsx --test scripts/investigation/*.test.ts; typecheck/lint; commit.

### Task 2: Actual browser verification and isolated lifecycle

**Files:** Create scripts/investigation/{browser.ts,browser.test.ts,workspace.ts,workspace.test.ts,controller.ts,controller.test.ts}; reuse scripts/fixtures/replay-process.mjs.
**Interfaces:** executeJourney(browser, url, plan, approvedJourney, outputDir):Promise<Observation>; prepareWorktrees(repo,base,head,out):preparedContext; investigate(config,{proposal, ...injected discovery boundary}):Promise<Report>. Controller owns observations and source-integrity check.

- [ ] RED tests for unique scoped targets/ambiguous refusal, no password/file steps, fixed expected observations, same-origin paths, immutable source and partial-setup cleanup. Real browser tests prove actual business state, not runner success alone.
- [ ] Implement safe commit pinning, new output/worktree guards, bounded install/start/readiness, fresh base/head/repeat contexts and guaranteed cleanup. Preserve diagnostic failures.
- [ ] Verify controlled regression, healthy change and pre-existing failure in a synthetic-data app with actual React/Vue rendering; commit.

### Task 3: Autonomous discovery CLI, runnable example and delivery

**Files:** Create scripts/investigation/{agent.ts,agent.test.ts,run.ts}; docs/pr-browser-investigation-pilot.md; extend existing CI offline check step; add only necessary fixture/example files under scripts/investigation/examples.
**Interfaces:** discover(config, pinnedContext, urls, out, signal):Promise<Proposal>; CLI --config --out --help, opt-in existing Domscribe MCP. Schema-bound final output; browser MCP accessible; record actual successful calls and unknown model metadata explicitly.

- [ ] RED CLI/adapter tests for malformed/no-browser/incomplete output, timeout/cancellation, no accidental secrets/config loading, and unsupported mode errors.
- [ ] Implement one generic local entry point, optional Domscribe inspection, exact setup docs and comment draft. Validate with a fresh autonomous-agent run on a controlled real app PR; no known-fix/answer-key access, then independently replay its plan.
- [ ] Run configured affected/root checks as warranted, obtain independent review, fix meaningful findings with regression tests, commit/push/open PR, inspect latest CI and merge under standing authority. Record evidence/time/limitations and update sprint continuity to this newer user-approved direction. No publication or hosted-service claims.
