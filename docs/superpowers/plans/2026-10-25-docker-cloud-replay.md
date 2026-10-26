# Docker Cloud Replay Runner Plan

> **For agentic workers:** Use superpowers:executing-plans inline and obtain independent whole-branch review. Steps use checkboxes.

**Goal:** Execute the existing Domscribe browser replay verification through the Docker Cloud Sandboxes Node SDK, retaining evidence and cleaning up owned cloud resources reliably.

**Architecture:** A TypeScript development runner uses `@docker/sandboxes` directly. It launches one shell kit, clones a pinned public Domscribe commit into an isolated Git worktree, builds local artifacts and runs the existing browser harness. It downloads an allowlisted, bounded evidence bundle and records resource identity, process exit, browser result and confirmed deletion separately. A small orchestration module accepts the SDK-shaped client for deterministic lifecycle failure tests; live verification exercises the actual SDK/service.

**Tech Stack:** Node24, TypeScript/tsx, Docker SDK0.53.0, existing pnpm9/Playwright harness.

**Spec / user direction:** The approved next milestone in this conversation: SDK-driven shell-kit cloud smoke test first; coding-agent and GitHub issue wrapper follow after this works. User explicitly said to keep going while away. Choose routine implementation details autonomously.

## Constraints and review focus

- Reuse isolated worktree on codex/docker-cloud-replay from fresh main92e939a. Preserve primary repositories and unrelated lockfiles; root dev dependency/lock update is intentional for the SDK.
- Public repository and exact commit only. No model-provider credentials or production deployment/publication. Do not retrieve credential values; use SDK-managed interactive authentication or existing explicit environment credentials without logging values.
- One owned sandbox at a time; bound compute/lifetime, launch/setup/run/download/cleanup deadlines and retries. Save identity immediately after accepted creation; never delete a replacement resource with the same name.
- On command, readiness, transfer, result-validation or cleanup failure, retain useful local evidence and return failure. Connection EOF or exit0 alone is not browser success.
- Download fixed evidence names under a fixed remote directory, reject invalid results/oversized files, avoid logging arbitrary secrets or copying repository credentials.
- Clean up after failures using an independent deadline; accurately record unconfirmed cleanup. Client.close is separate from sandbox deletion. Preserve original error when cleanup also fails.
- Local/CI unit, type and shell-script checks run without Docker credentials/cloud charges. Live smoke is explicit, uses a shell kit, and records actual tested scope. No full issue-to-PR Action implementation in this change.

## Task 1: Runner and lifecycle regressions

- [x] Add private SDK dev dependency and inspect installed public types/examples for exact APIs.
- [x] Write meaningful failing regressions: process failure/EOF, missing or failed browser result, cleanup on readiness/command/download failure, UID mismatch, cleanup failure preserving primary cause, bounded artifact transfer. Observe RED before implementing.
- [x] Implement minimal runner, fixed pinned bootstrap script, evidence validation and safe lifecycle cleanup; make tests pass and typecheck against installed SDK.

## Task 2: Real verification and delivery

- [x] Run configured affected checks, process regression tests, shell syntax and representative local command/packaging validation.
- [x] Attempt a fresh SDK cloud run using available approved authentication; exercise genuine Chromium/relay/selection/state/replay/production flow and retain artifacts. If account consent/login is unavailable while user is away, finish all independent work and report the exact blind spot without claiming cloud success.
- [ ] Obtain independent review, fix material findings with regressions, update docs, push a focused PR and inspect CI. Respect merge protections; earlier admin-bypass approvals were PR-specific.
- [ ] Update development-state.md and daily automation continuity with exact results, cloud cost/resource cleanup status and the next useful step.
