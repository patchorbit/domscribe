# Exact instance selection and portable replay

These APIs are in the repository following PR #77. They are not part of the published 0.6.1 packages yet.

A `data-ds` ID identifies a source element. Repeated rows can share it. An `instanceId` identifies one live DOM instance and has a strict, transient browser selector. Its `locator` describes the target independently of that session.

## Agent queries

Use MCP `domscribe.targets.query` or HTTP `POST /api/v1/targets/query`:

```json
{ "mode": "list", "entryId": "aB3dEf7h", "limit": 50 }
```

The response contains `status`, `targets`, `total`, and `browserConnected`. Each target includes `instanceId`, `entryId` when mapped, `selector`, `locator`, `disabled`, and the effective `inputType` for inputs. Resolve an entry ID with the existing source-resolution tools for its source file and position.

To inspect an instance, send `{"instanceId":"<returned instance ID>"}`. To locate a capture in a new session, send `{"locator":<saved locator>}`. `domscribe.query.bySource` also accepts an optional `instanceId` or `locator` and returns `selectionStatus`, `targets` and `total` alongside its existing fields.

Only `resolved` identifies one exact target and returns its available runtime context. `listed` is discovery, not a selection. `ambiguous`, `not_found`, `stale`, `wrong_page`, `not_ready`, `unsupported`, `ambiguous_browser`, and `unavailable` are explicit stopping conditions. Reconnect/retry readiness failures or refine ambiguous targets; do not choose the first candidate. Keep one browser session connected to the relay for these queries. After HMR, the manifest can briefly lag newly rendered source IDs; retry source resolution while updates settle instead of substituting an old mapping.

Handles survive DOM moves. Removed/recycled targets and changed source or identity constraints invalidate them. Never persist a handle as the only identity for a later session. Browser drivers still check visibility, enabled state, overlays and normal actionability; discovery does not imply that an element can be clicked immediately.

Semantic table rows and list items (`tr`, `li`, `[role="row"]`, and `[role="listitem"]`) also constrain actions using their non-private, non-editable text. An ordinary row with a customer name beside an unlabeled Edit button can therefore be identified without adding a test ID. Row text changes retire local handles, including when a virtualized or position-keyed list retains the same action DOM node. Text segments remain separate so differently divided cell values cannot collide by concatenation. Input values and blocked/editable descendants are excluded. Duplicate rows remain ambiguous; long or redacted identity still stops portable replay. Changes to other visible row content may conservatively require a new capture.

PII is checked before segment encoding, including email/card/phone values split across text nodes; sensitive row identity is redacted as a whole and cannot be replayed. Local fingerprints retain complete raw ancestor constraints privately. If more than four identified ancestor scopes are needed, the portable locator is explicitly unsupported rather than silently dropping an outer business identity. The same applies when raw identity exceeds size limits even if redaction would shorten it.

## Explicit recording

In the instrumented page's JavaScript context:

```ts
const runtime = RuntimeManager.getInstance();
if (!runtime.isReady()) return; // retry after the dev runtime initializes
const step = runtime.createReplayStep(element, {
  action: 'fill',
  value: 'Austin',
});
const trace = { version: 1, steps: [step] };
```

Actions are `click`, `fill` with `value`, `check` with `checked`, and `select` with an option `value`. Recording is explicit and does not scrape inputs or install an event recorder. Password/file input recording, blocked targets, and values requiring configured PII redaction are refused. Do not include credentials in manually authored traces.

New overlay annotations store `interaction.selectedElement.target`. An explicit trace can be stored in `context.replay`; creating an annotation alone does not record the preceding interactions. Annotation schema v4 adds these optional fields, and old annotations remain readable. The live target is captured at selection time; submission refuses a stale/recycled selection. Locating/refreshing an annotation uses its portable target; old annotations only use a unique legacy match.

## Replay through a real browser driver

The core package exports a driver-independent runner. For example, with a connected `RelayHttpClient` and Playwright page:

```ts
const result = await replaySteps(trace, {
  resolve: (locator) => relay.queryTargets({ locator }),
  async act(step, target) {
    const element = page.locator(target.selector);
    if (step.action === 'click') await element.click();
    else if (step.action === 'fill') await element.fill(step.value!);
    else if (step.action === 'check') await element.setChecked(step.checked!);
    else if (step.action === 'select') await element.selectOption(step.value!);
  },
});
```

The runner validates the trace, resolves its portable target before every action, and stops at the first uncertainty or driver error. It checks the freshly resolved effective input type and refuses password/file targets, including inputs whose type changed after recording. A successful result reports executed actions, not business correctness. Supply your own UI assertions. The runner does not invoke framework handlers or alter component state.

Portable locators use a pathname, tag, bounded identity attributes/text and identified ancestor scopes. All captured constraints must match; there are no `nth-child` or first-match fallbacks. They do not navigate to a page or recreate authentication, backend data, uploads or arbitrary application state. Labels/test IDs are useful when repeated rows otherwise have indistinguishable identity. Changed identity can legitimately require a new capture. Redacted locator identity cannot be replayed. Over-limit identity is explicitly marked `unsupportedReason: "identity_too_long"`; portable resolution returns `unsupported` and recording refuses it. It is never matched by a truncated prefix. Local handles still compare the full identity.

Current support is the main document's light DOM. Shadow roots and frames are not traversed. This is a foundation for agent integrations, not a general session recorder or a GitHub Action.

## Verification

After building and synchronizing dist packages:

```sh
NX_DAEMON=false pnpm exec nx run-many -t build,sync-dist \
  --exclude domscribe-test-fixtures --parallel=2 --skipNxCache
node scripts/verify-instance-replay.mjs
node scripts/verify-instance-replay.mjs --framework=vue --package-manager=pnpm \
  --vite-version=5.4.21 --scope=list --report-dir=/tmp/vue-replay-evidence
node scripts/verify-instance-replay.mjs --framework=next --package-manager=pnpm \
  --framework-version=16.4.3 --scope=table --report-dir=/tmp/next-replay-evidence
node scripts/verify-instance-replay.mjs --framework=nuxt --package-manager=npm \
  --framework-version=3.21.11 --report-dir=/tmp/nuxt-replay-evidence
```

The harness installs local tarballs into a temporary consumer, uses the fixture project's existing Playwright dependency and installed Chromium, persists an annotation, closes the browser context, reorders rows in a fresh context, and replays the same four UI steps through the relay. Assertions cover exact mapped source/props, committed editor state after typing/checking, stale handles after unmount and across sessions, ambiguity refusal, application console/page/network failures, production instrumentation removal (including conditional editors), and correct production UI updates.

CI runs eight representative combinations, with at most two replay jobs simultaneously:

| Integration                 | Consumer versions         | Package manager |
| --------------------------- | ------------------------- | --------------- |
| React/Vite                  | React18.3.1 / Vite7.3.7   | npm             |
| React/Vite                  | React18.3.1 / Vite5.4.21  | pnpm            |
| Vue/Vite                    | Vue3.5.44 / Vite7.3.7     | npm             |
| Vue/Vite                    | Vue3.5.44 / Vite5.4.21    | pnpm            |
| Next App Router / Webpack   | Next15.5.28 / React19.3.1 | npm             |
| Next App Router / Turbopack | Next16.4.3 / React19.3.1  | pnpm            |
| Nuxt SSR                    | Nuxt3.21.11 / Vue3.5.44   | npm             |
| Nuxt SSR                    | Nuxt4.6.2 / Vue3.5.44     | pnpm            |

The default remains React18/npm/Vite7. Use `--framework-version` for exact Next15/16 or Nuxt3/4 releases; use `--vite-version` for React/Vue consumers. Mixed or unsupported flags are rejected. Native SSR consumers use their framework integrations and normal hydration, not the Vite SPA integration. Nuxt excludes the runtime from Vite prebundling so its native plugin and consumer queries share one runtime on cold startup. Each run checks actual installed versions, expected framework source, and local runtime resolution.

`--scope=article` keeps the original labeled-card fixture. `--scope=table` and `--scope=list` use sibling business text with no added row label or test ID. They deliberately retain position-keyed action nodes during a customer replacement and verify that old handles/selectors retire, old portable identity does not resolve, the new runtime props belong to the replacement, and only that customer's UI data changes. CI runs the Vue/pnpm/Vite5 case as a list and the Next16/pnpm case as a table. The other six cases retain article coverage.

The [real-application acceptance matrix](./real-app-acceptance.md) records separate maintained-application tests and their installation/actionability limits.

These are representative synthetic regression cases, not the full version/manager/router matrix or an adoption benchmark. Additional local testing on the Domscribe website (Next16.4.3 / React19.2.4) verified exact installation-tab source/state among six repeated instances, persisted replay after a fresh browser session, safe page-navigation failure, mobile navigation state/replay after reload, and controlled HMR identity changes without resurrecting retired handles. Its production build and UI also worked without instrumentation. This is one maintained app, not evidence for every router, virtualized list, framework version, or agent workflow advantage. Package installs use local tarballs, with explicit pnpm local-artifact overrides so unpublished artifacts cannot be replaced by registry copies. This is not evidence that the new APIs are in the published npm release.

Logs and result JSON are retained in the printed temporary directory on success and failure. `--report-dir` copies a compact evidence bundle. Traces and screenshots are retained when available, with best-effort failure screenshots after browser startup. Server startup and builds are bounded, and the harness stops its owned server process group and relay.
