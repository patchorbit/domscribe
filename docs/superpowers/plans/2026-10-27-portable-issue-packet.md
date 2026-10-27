# Portable issue packet implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export a reviewable annotation packet and inspect it safely in a fresh checkout without JSON surgery.
**Architecture:** Strict core packet schemas; pure manifest source hash; relay-side evidence transformation and offline inspection; read-only Commander subcommands. Existing HTTP annotation API supplies captures, without adding server routes.
**Tech Stack:** TypeScript, Zod4, Node fs/path, existing xxhash-wasm in manifest, Commander, Vitest, real browser consumer harness.
**Spec:** docs/superpowers/specs/2026-10-27-portable-issue-packet-design.md

## Global constraints

- Existing isolated worktree, fresh main bb396a1; primary checkouts preserved.
- Packet version1, <=1MiB encoded; maximum JSON nesting12 and10000nodes. No added runtime dependency.
- Explicit expected/observed; runtime/replay opt-in; privacy reapplied; no live handles or broad annotation dump.
- Offline inspect is read-only and distinguishes source matching from target/action correctness.
- No publish/deploy/settings/credentials/hosted-service implementation.

## Review focus

- Known secret/PII and workspace paths in opted-in runtime or reporter text.
- Old source, symlinks/traversal, outside root and missing capture hashes.
- Privacy changes to locator identity or replay values must remove actionability.
- Imported pathological JSON, unknown fields/versions and Markdown fence injection.
- CLI errors, no relay, existing output files and working offline in fresh roots.

### Task 1: Validated portable evidence and offline source inspection

**Files:** Create core lib/types/issue.ts and issue.spec.ts; export in core index.ts. Create manifest source-hash.ts; export in manifest index.ts. Create relay issue/issue-packet.ts and issue-packet.spec.ts.
**Interfaces:** `IssuePacketSchema`, inferred `IssuePacket`, `IssueExportOptionsSchema`; `hashSource(content:string):Promise<string>`; `createIssuePacket(annotation, root, options):Promise<IssuePacket>`; `inspectIssuePacket(packet,root):Promise<{packet,sourceStatus}>`; `renderIssuePacket(inspection):string`. Source statuses matched/changed/missing/unverified/unsafe. Export source anchor comes only from matching selected manifest ID; no fallback to unrelated entry. Source checksum uses recorded manifest hash, not a new export-time blessing.

- [ ] Write failing tests for strict validation, copied-root match/changed source, no handles, no external paths, privacy and redacted actionability, and bounds. Expected: missing public API assertions fail.
- [ ] Implement smallest schema, pure hash helper and bounded transformation/offline inspector that satisfy tests. Never read through unsafe source symlinks.
- [ ] Run configured core/manifest/relay tests, lint/build/typecheck. Expected all pass. Commit task.

### Task 2: CLI export/inspect and runnable usage

**Files:** Create relay cli/commands/issue.command.ts and issue.command.spec.ts; register in cli/program.ts; add docs/portable-issue-handoff.md and README link.
**Interfaces:** Commander `createIssueCommand()` for independently instantiated tests; production IssueCommand export. Existing RelayControl/status and RelayHttpClient only for export. Offline inspect has no relay dependency. stdout JSON vs Markdown is deterministic; --out uses exclusive create.

- [ ] Write failing command tests using injected/mocked relay boundaries and real temp output files for missing relay/options, offline fresh-root report, existing output preservation and malformed/deep packet rejection. Expected missing command behavior fails.
- [ ] Implement CLI wiring and error handling; document local-source availability and privacy/replay limits. Run configured affected checks plus meaningful CLI subprocess verification from packed artifacts. Expected all pass. Commit task.

### Task 3: Native capture-to-fresh-checkout verification and delivery

**Files:** Extend existing temporary browser harness only as needed; commit a concise product guide/evidence report in docs, no machine-specific credentials or app data.
**Interfaces:** Real selected annotation exported via actual installed CLI; offline inspect after reporter browser/relay closes in new source checkout. Preserve exact selected source hash/identity without operator rewriting packet.

- [ ] Reproduce old CLI missing command/old manual JSON gap before claiming fix. Run new React/Vue native annotation export, fresh-root match and changed-source negative, privacy marker assertions and production stripping. Expected correct business source or explicit safe refusal.
- [ ] Full configured suite; independent whole-branch review, regression fix material findings, focused PR, latest-head CI and authorized merge. Record all failures/workarounds and exact scope. Do not publish or infer agent advantage/demand. Retain a precise next comparison step.
