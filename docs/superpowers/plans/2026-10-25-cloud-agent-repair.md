# Cloud Agent Repair Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Obtain one fresh independent whole-branch review. Steps use checkboxes.

**Goal:** Run and independently grade a seeded UI repair in Docker Cloud using full browser tools, with and without Domscribe.

**Architecture:** A small controlled cart fixture and held-out Playwright verifier run in isolated cloud Git worktrees. The existing SDK lifecycle runner gains narrowly tested kit/secret-reference/extra-artifact options. A pilot CLI builds the fixed workload, launches one condition at a time, invokes the stock coding agent, downloads evidence and checks the independent result.

**Tech Stack:** Node24, pnpm9, @docker/sandboxes0.53.0, stock Codex kit, React18/Vite7 source artifacts, Playwright MCP0.0.83.

**Spec:** docs/superpowers/specs/2026-10-25-cloud-agent-repair-design.md

## Global constraints

- Preserve primary checkouts. Reuse isolated codex/cloud-agent-repair from main2306385.
- Existing OpenAI cloud secret resource reference only; no credential values or host auth/config.
- One cloud sandbox at a time, bounded lifecycle and same-UID deletion; no GitHub issue-to-PR wrapper.
- Full browser/source baseline; only Domscribe availability differs. Record actual model/version/usage, do not claim efficiency from one trial.
- Real seeded bug must fail independently before agent and pass held-out browser assertions afterward. Source-only nonempty patches, no verifier/config/dependency edits.

## Review focus

- Missing provider/tool readiness must fail rather than launch repeated agents.
- Agent exit0 or self-report cannot override a failed independent assertion.
- Evidence from another source/condition or a modified verifier cannot qualify.
- Secret references must never become token values, command-shell injection or arbitrary source URLs.
- Cleanup must survive failed agents, evidence transfers and cancellation; ordinary replay defaults remain identical.

## Task1: Controlled fixture and independent grader

- [x] Write failing regression tests for grading invalid before/after state, empty/out-of-scope patches and condition/provenance mismatches.
- [x] Implement a stable-ID cart fixture, common issue prompt and independent Playwright verification outside the agent worktree.
- [x] Prove the intended defect fails, and a temporary control correction passes, without giving the control patch to agent sessions. Preserve RED/GREEN evidence.

## Task2: Native agent execution and delivery

- [x] Add RED lifecycle tests for codex kit + nonempty secret reference + bounded safe extra artifacts; implement smallest extension and rerun default17tests.
- [x] Implement pilot bootstrap/CLI with exact public-source build, full browser MCP, enriched-only Domscribe, source-only patch evidence and held-out grader.
- [ ] Run native provider readiness probe, then one trial per condition sequentially. Retain failed trials and same-UID cleanup outcomes.
- [ ] Run affected configured checks, independent review, resolve material findings, document actual scope/results, commit/push focused PR and inspect CI.
- [ ] Update continuity ledger and automation with merged PR79, pilot results/limits and next action. No inferred admin bypass for a new PR.

## Review and qualification ledger

Independent review found staged-patch omission (P1), missing production-build cancellation (P2), and unverified local artifact provenance (P2). Regression tests reproduced the gaps. Capture now uses the immutable app seed, includes staged/unstaged edits, rejects agent commits, and applies the exported artifact to a fresh verification worktree/install. Local source builds use a separate exact-commit worktree and validated artifact digest; source cleanup is exercised on failure. Production builds receive cancellation signals and subsequent launches check cancellation.

Final local baseline and Domscribe conditions both passed the strengthened path, returning identical minimal patches and the same artifact/harness digests. Both had zero application errors and working uninstrumented production UI. Counts were 5 versus 15 completed MCP calls; no efficiency claim. Cloud provider attachment returned explicit409failedPrecondition; kit without binding reaches the model API but returns401. All accepted diagnostic VMs were deleted. Native cloud trial remains blocked pending account setup; no release/deploy or GitHub issue wrapper.
