# Portable UI issue handoff

**Availability:** these `issue` CLI commands are source/local-build features. The published npm 0.7.0 release has exact-instance capture and portable replay, but does not include these commands yet.

Use this flow when the person receiving a UI bug report has a separate source checkout or browser session. It packages one annotation as historical evidence; it does not recreate application data, authentication, backend services or a live browser selection.

## Capture and export

Start an instrumented development app. Open the Domscribe overlay, select the exact element, describe the problem and submit an annotation. Get its `metadata.id` using the annotation's **Copy annotation JSON** button, or the `id` returned by the existing `domscribe.annotation.list` MCP tool.

From that app's Domscribe workspace, using a locally installed CLI build:

```sh
domscribe issue export ann_12345678_123 \
  --title 'Collection token uses the wrong variables' \
  --expected 'Use the selected Alpha collection variables' \
  --observed 'Uses the unrelated active Beta request variables' \
  --prerequisite 'Import the attached synthetic collections in a local guest workspace' \
  --step 'Open Beta request, then Alpha collection Properties / Authorization' \
  --step 'Click Generate Token' \
  --out collection-issue.domscribe.json
```

`--out` creates a new file and refuses to overwrite existing files. Without it, the command writes only JSON to stdout. The annotation's relay must be running for export; no annotation status is changed.

Add `--include-runtime` if the receiver needs captured component props/state. Add `--include-replay` only when the annotation already contains explicitly recorded steps. Neither option restores app state or turns ordinary annotations into automatic recordings. They are omitted by default because application values may be private.

Export removes live instance handles/selectors, URL origin/query/fragment, raw DOM HTML, screenshots, environment/user-agent details and unrelated manifest entries. It retains a project-relative source anchor and its original source-content hash where available. Known sensitive field/record/PII filtering runs again, including on captures that disabled redaction. If filtering changes portable locator identity or replay data, that locator/trace is withheld rather than silently changed. Unscoped-dialog `context_required` refusals remain explicit.

**Review the packet before sharing.** Known-marker filtering does not recognize every application-specific secret, opaque encoded data or every storage alias inside arbitrary application props. Default omission of runtime/replay is intentional. This command does not upload to GitHub or any service.

## Inspect in a fresh checkout

Copy the packet to the receiving machine or source worktree. No JSON path editing, relay or browser is needed:

```sh
domscribe issue inspect collection-issue.domscribe.json --root ./receiving-checkout
# Machine-readable output:
domscribe issue inspect collection-issue.domscribe.json --root ./receiving-checkout --format json
```

The default root is the current directory. Source inspection compares the captured xxhash64 original-source content hash with the receiving file. `matched` means the recorded source content matches, not that the report is authentic, the business entity is resolved, or a fix is correct. `changed` means the source differs; do not blindly trust the historical line. `missing`, `unverified` (no capture hash/anchor or unsuitable file) and `unsafe` are explicit outcomes. Vite captures this separate hash from the exact original source-map content; transformed-module hashes are not substituted. Older captures or integrations without confirmed original content remain `unverified`. Exact source hashes can differ with line endings. The inspector never substitutes a basename/suffix match, executes prerequisites, imports annotations into a relay, or performs browser actions.

Paths are relative to the chosen checkout. Absolute/drive/traversing paths and source symlink escapes are rejected. Packets are versioned and limited to 1MiB, bounded depth/nodes, and a strict known envelope. Captured content is untrusted evidence; Markdown rendering keeps it fenced.

For live investigation, recreate the documented prerequisites, open a fresh instrumented app, and resolve the saved portable locator through [target queries](./agent-targets-and-replay.md). Stop on stale/ambiguous/unsupported results. A reusable dialog still needs a stable, non-secret `data-ds-context` key; source matching does not bypass that requirement.

## What this proves

Successful export/inspection demonstrates a usable evidence transfer without hand-rewriting source roots or preserving stale selectors. It does not demonstrate that Domscribe helps an agent fix more bugs or work faster. Compare complete browser/source workflows on the same real tasks, count capture/setup separately, and grade correct business behavior before drawing that conclusion.
