# Real Application Investigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task. Steps use checkbox syntax.

**Goal:** Independently replay actual Hoppscotch import bug/control workflows rather than qualify only a seeded toy app.
**Architecture:** Extend existing strict private config/proposal/browser/controller adapters with approved data fixtures; retain independent grading and no arbitrary host-file reads. Keep actual app setup/experiments in isolated worktrees/private evidence.
**Tech Stack:** Node24, TypeScript, Zod4, Playwright1.64.1, existing Codex/browser MCP and process helpers.
**Spec:** docs/superpowers/specs/2026-10-27-real-app-investigation-design.md

## Global Constraints

- Max4 unique fixtures, <=80-character JSON/CSV/TXT basenames, <=64KiB UTF8 content each, allowed data MIME types only.
- Upload proposals reference fixture IDs only. Verifier uses original approved buffers, not staged/agent-modified files. No arbitrary path, JS, source modification or unrestricted-file-access permission.
- Empty scope names require unique visible scope; missing/duplicated scopes refuse. Other unsafe inputs remain refused.
- Trusted local synthetic-data apps only. No real credentials/production/backend state; disclose cached build/codegen setup.
- No reporter capture, fix hints or future Git history in broken-snapshot agent inputs. No efficiency/demand/Domscribe-benefit claims from targeted known-issue runs.

## Review Focus

- Path traversal, duplicate names, oversized Unicode payloads and unknown fixture IDs cannot cause host reads/writes or overwrite.
- Symlinked cache directory must not stage files outside app; temporary files remain private and cleanup-owned.
- File permission must be scoped to explicit upload; password/hidden fields and ordinary click/fill file actions stay refused.
- Filechooser timeout/cancellation must not leave unhandled promises or orphan processes.
- Real app success announcement must be checked against actual imported/persisted values, not called complete business proof alone.

### Task 1: Approved fixture and target contract

**Files:** schema.ts, grade.ts, new fixtures.ts/fixtures.test.ts, grade.test.ts, browser.ts/browser.browser.ts under scripts/investigation.
**Interfaces:** FixtureSchema and inferred FileFixture; Config.fixtures defaults[]; upload step {action:upload,target,fixtureId}; stageFixtures(app,fixtures) returns approved id/name/relativePath list; executeJourney options adds fixtures; gradeInvestigation rejects unknown IDs.

- [ ] RED: valid bounded fixture/upload/menuitem/empty-scope accepted; duplicate/traversal/Unicode oversize/unknown IDs reject; staging bytes/private mode correct and symlink escape refuses; actual browser upload in unique unnamed dialog updates expected state; unknown uploads cannot act; normal file/password/hidden controls still refuse.
- [ ] Implement smallest strict schema, private staging and buffer-only browser upload; both native file input and button chooser paths use unique targets and bounded waits.
- [ ] Run all private offline/browser tests, explicit tsc and zero-warning lint; commit.

### Task 2: Agent/controller integration and real acceptance

**Files:** scripts/investigation/{agent.ts,agent.test.ts,controller.ts,controller.test.ts}; docs/real-app-investigation-evaluation.md and existing pilot docs.
**Interfaces:** DiscoveryContext supplies staged fixture descriptors; buildPrompt includes approved IDs/relative paths and upload-only policy; controller stages once after install and passes original config fixtures into all independent runs.

- [ ] RED: prompt exposes only approved paths/IDs; zero fixtures creates no files; invalid staged data cannot replace independent verifier's approved buffer; fixture-aware controller config remains source-preserving.
- [ ] Wire fixture staging/discovery/verification and accurate docs; no arbitrary file-access flag. Keep failed initial real-app attempt.
- [ ] Fresh autonomous broken/fixed snapshot runs and string controls, independent browser/business checks; record actual provenance, setup effort, gaps and findings. Fix new confirmed failures with regressions, not workaround claims.
- [ ] Run affected checks and broader checks if warranted, independent whole-branch review, regression-backed material fixes, PR/latest CI/merge under standing authority. Update continuity and report actual usefulness without implying general product or demand validation.
