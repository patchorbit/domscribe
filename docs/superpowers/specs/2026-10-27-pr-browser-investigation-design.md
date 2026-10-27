# Browser PR investigation pilot

## Intent and scope

The user approved piloting browser-based PR investigation after discussing a managed autonomous QA service. The first outcome is a locally runnable, read-only investigator: given pinned repository base/head revisions, a repeatable app setup and approved user-journey expectations, it drives a browser, proposes reproduction steps and returns independently verified findings. No human Domscribe capture is required. GitHub signup/install, a hosted control plane, automatic issue/comment posting, scheduled infrastructure and optional application-fix PRs are later delivery layers; this slice does not claim them.

Reuse existing Domscribe/browser/process capabilities, without requiring extra enriched tool calls or claiming superiority. Docker Cloud authenticated agent repair is still unqualified; do not retry unchanged provider authentication or imply a local Git worktree is a security sandbox. Pilot execution is local, for explicitly trusted repositories and synthetic test data. It uses the normal existing Codex CLI sign-in, without reading/copying credential values.

## Input and user contract

Add experimental private tooling in scripts/investigation, invoked with pnpm exec tsx scripts/investigation/run.ts --config=<file> --out=<new-directory>. A strict version1 JSON config selects a local Git repository, base/head refs, install/start argv arrays, app subdirectory, startup timeout, agent deadline, and approved journeys. The start argv accepts a literal {port} replacement; the controller supplies a dynamic localhost port. Child commands are argv, never interpolated shell strings. No credentials in config or probe steps. Support plain React/Vue Vite apps initially, including an optional existing Domscribe integration/MCP entry point; do not claim zero-config support for every repo.

Each journey has an id, intent and expected observations: a unique accessible target and expected text/value/checked state/count. These expectations come from the trusted operator/customer contract, not the agent. The pilot example uses synthetic business records. The agent can choose browser actions, but cannot change expected outcomes or assert its own conclusions as verified. Reading source, docs and relevant issue text helps discovery; the MVP takes a supplied product brief rather than independently trusting all historical issues.

Refs are resolved to exact commits with option-safe Git argv. Base must be an ancestor of head. Create two detached Git worktrees under a new task-owned run directory; never modify the source checkout. Install/start both with bounded resources and cleanup. Capture commit IDs, diff digest, config digest and tool versions. Preserve failures as evidence. An unavailable installation/server/browser is blocked, not a passing investigation.

## Agent proposal

A fresh read-only Codex CLI session sees the isolated head source, base/head app URLs, bounded Git diff, supplied journey intent/expectations, and a full Playwright browser MCP. Optional Domscribe MCP adds runtime/source inspection; use it only if helpful. No browser-agent condition loses ordinary source or browser capabilities. No access to a hidden grader/known fix is needed. Use --ignore-user-config to avoid unrelated MCP servers; normal auth stays opaque. Record actual model metadata if emitted, otherwise unknown; do not infer model parity or token cost.

The final structured response is a bounded version1 proposal listing one plan per covered journey and explicit uncovered journey reasons. Plans contain at most40 steps: click/fill/check/select with unique role/name locators and optional accessible ancestor scope. No arbitrary CSS, JavaScript, shell, URLs, browser storage mutation or agent-authored assertion code. The initial app URL is controller-selected; a navigate action accepts only a same-origin relative pathname. Password/file inputs are refused. Target ambiguity stops rather than choosing first/nth. App navigation/network are limited to the configured local test origins during independent verification. This is a narrow proof format, not universal browser automation.

The agent must actually use its browser during discovery for a run to count as agent-investigated. A valid source-only proposal can still be recorded as unqualified. Domscribe tool usage is optional; its absence cannot be silently presented as evidence of benefit.

## Independent browser verification and classification

The controller validates the proposal and runs its declarative plans with trusted Playwright code. It creates a fresh browser context for base, head, and a second fresh head repeat. No reused storage or discovery browser state; no agent-modified source is graded. Compare expectations using real browser observations, preserving before/after screenshots and app console/page/network errors. Verify working trees remain clean, so editing the app or setup during discovery cannot manufacture a result. Do not package Domscribe artifacts while rebuilding them.

A confirmed PR regression requires the approved expectation to pass on base and fail semantically on both fresh head runs, with all actions completing. The failing expectation and observed values must agree across both head runs. A valid journey failing on base is pre-existing; head action/setup failures, inconsistent repeats and missing plans are inconclusive/uncovered. A passing observation is evidence for that journey only. Do not report full-app health or new bugs simply because the agent says so. Expected behavior can intentionally change in a PR; the operator must keep the configured contract current.

The report distinguishes confirmed regressions, pre-existing failures, inconclusive results and verified passing journeys. Stable fingerprints bind journey and expectation IDs to deduplicate equivalent findings within one report. Render one reviewable Markdown PR-comment draft with relative artifact links and clear tested scope. Do not post it, create issues, fix app code, publish packages or deploy. Findings are untrusted text; use fenced rendering and bounds. Private raw logs stay in the local mode0700 evidence directory; the comment draft omits account/workspace paths and raw agent transcript.

## Validation

First meaningful failing regressions cover fabricated/contradictory proposals, duplicate plans, unknown expectation IDs, base failures, action failures, inconsistent head repeats, unchanged/healthy heads, cleanup, unsafe refs/subdirectories and report bounds. Then implement the smallest working flow.

Fresh real-browser acceptance must include a real app implementation with controlled PR commits: one business regression, one healthy/layout-only change, and a pre-existing failure control. These are deliberately constructed test changes, not organically discovered customer incidents. At least one fresh autonomous-agent discovery run uses the generic entry point and yields a controller-verified result without reporter capture or patch hints. Compare an optional Domscribe-assisted run only when the same scenario/tool access can be preserved; record parity limitations and setup work separately. Existing larger-app repairs are historical, not proof of this new investigator.

Run new offline/unit/process/type/lint checks and existing affected checks, plus independent code review. Add offline tests to CI; live model calls are opt-in and not part of ordinary CI. Required latest-head CI must pass before standing-authorized merge. No new release is authorized. Report pilot limitations and next step toward a hosted customer experience, rather than implying that signup/repo onboarding already exists.
