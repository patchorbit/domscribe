# Browser mirror CLI guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for this native maintenance task.

**Goal:** Port the confirmed mirror URL/output safety corrections to the original OSS helper.

**Architecture:** Same Node-only helper and existing test/CI entrypoints. No package, framework, dependency, workflow permission, release or local system change.

**Tech Stack:** Existing Node builtins and configured Prettier3.9.10.

**Spec:** This small plan contains the complete maintenance contract; continuous-build authority selects native execution.

## Global Constraints

- Fresh remote main59e2e19; isolated .worktrees/domscribe-ci-mirror-guards-20261031, preserve all primary/user work.
- Preserve current archive/security/Azure order, fallback, transport, metadata, package signatures and generic validation errors.
- Validate exact raw HTTP/HTTPS official host and /ubuntu[/] syntax, refusing normalization-dependent ports, paths, queries/fragments, userinfo and encoded hosts.
- Output must be a new file, created exclusively; symlink/hardlink/existing-output aliases cannot overwrite input. Manual retry chooses another output path.
- Existing three workflow preparations belong to three distinct jobs; each has fresh RUNNER_TEMP, so the new exclusive-output contract fits all callers.
- Evidence uses only owned temporary files. No local /etc/sudo, cloud, credentials, dependency changes or publication. OSS standing normalmerge/latestCI/review, admin only if review rules otherwise block our PR.

## Review Focus

Same-byte URL validation/emission; input/output alias safety; generic errors preserve privacy; all workflow caller output paths are fresh; Node/runtime formatting compatibility without application changes.

### Task 1: Safe raw mirror parsing and exclusive output

**Files:** scripts/fixtures/browser-mirrors.mjs and browser-mirrors.test.mjs.

**Interfaces:** Existing preferUbuntuMirrors(content) and input/output CLI. Reuse reviewed/fixed managed helper policy without a new public interface.

- [ ] Baseline7 tests pass; copied five new regressions fail on actual current OSS helper (12total/7PASS/5FAIL). Retain real output.
- [ ] Port exact fixed helper; run12 tests GREEN and formatter3.9.10 with this repo config. Existing installed formatter may be used explicitly; no new install/consumer qualification claimed. No full unchanged application suite locally; latest hosted required CI remains mandatory.
- [ ] One fresh most-capable read-only whole-change review; one Root regression-backed material pass if required, no re-review loop. Push ready focused PR/attach; latest-head required checks pass; normal merge preferably, standing admin only if otherwise blocked, exacttree/postmain/nativegate. Do not publish or deploy.

## Self-review

The managed adaptation independently confirmed both latent defects. This port repairs the original helper instead of leaving it behind; all original positive/negative tests and caller behavior remain, with deliberate refusal of existing output. Source-only local tests do not establish hosted speed, TLS, mirror availability or application functionality.
