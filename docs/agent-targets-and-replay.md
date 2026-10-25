# Exact instance selection and portable replay

These APIs are on the local `codex/instance-selection-replay` feature branch. They are not part of the published 0.6.1 packages yet.

A `data-ds` ID identifies a source element. Repeated rows can share it. An `instanceId` identifies one live DOM instance and has a strict, transient browser selector. Its `locator` describes the target independently of that session.

## Agent queries

Use MCP `domscribe.targets.query` or HTTP `POST /api/v1/targets/query`:

```json
{ "mode": "list", "entryId": "aB3dEf7h", "limit": 50 }
```

The response contains `status`, `targets`, `total`, and `browserConnected`. Each target includes `instanceId`, `entryId` when mapped, `selector`, `locator`, and `disabled`. Resolve an entry ID with the existing source-resolution tools for its source file and position.

To inspect an instance, send `{"instanceId":"<returned instance ID>"}`. To locate a capture in a new session, send `{"locator":<saved locator>}`. `domscribe.query.bySource` also accepts an optional `instanceId` or `locator` and returns `selectionStatus`, `targets` and `total` alongside its existing fields.

Only `resolved` identifies one exact target and returns its available runtime context. `listed` is discovery, not a selection. `ambiguous`, `not_found`, `stale`, `wrong_page`, `not_ready`, `ambiguous_browser`, and `unavailable` are explicit stopping conditions. Reconnect/retry readiness failures or refine ambiguous targets; do not choose the first candidate. Keep one browser session connected to the relay for these queries.

Handles survive DOM moves. Removed/recycled targets and changed source or identity constraints invalidate them. Never persist a handle as the only identity for a later session. Browser drivers still check visibility, enabled state, overlays and normal actionability; discovery does not imply that an element can be clicked immediately.

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

New overlay annotations store `interaction.selectedElement.target`. An explicit trace can be stored in `context.replay`; creating an annotation alone does not record the preceding interactions. Annotation schema v4 adds these optional fields, and old annotations remain readable. Locating/refreshing an annotation uses its portable target; old annotations only use a unique legacy match.

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

The runner validates the trace, resolves its portable target before every action, and stops at the first uncertainty or driver error. A successful result reports executed actions, not business correctness. Supply your own UI assertions. The runner does not invoke framework handlers or alter component state.

Portable locators use a pathname, tag, bounded identity attributes/text and identified ancestor scopes. All captured constraints must match; there are no `nth-child` or first-match fallbacks. They do not navigate to a page or recreate authentication, backend data, uploads or arbitrary application state. Labels/test IDs are useful when repeated rows otherwise have indistinguishable identity. Changed identity can legitimately require a new capture. Redacted locator identity cannot be replayed.

Current support is the main document's light DOM. Shadow roots and frames are not traversed. This is a foundation for agent integrations, not a general session recorder or a GitHub Action.

## Verification

After building and synchronizing dist packages:

```sh
NX_DAEMON=false pnpm exec nx run-many -t build,sync-dist \
  --exclude domscribe-test-fixtures --parallel=2 --skipNxCache
node scripts/verify-instance-replay.mjs
```

The harness installs local tarballs into a temporary consumer, uses the fixture project's existing Playwright dependency and installed Chromium, persists an annotation, closes the browser context, reorders rows in a fresh context, and replays the same four UI steps through the relay. It also verifies source-only ambiguity, exact runtime props, stale-handle refusal, ambiguity stopping, application page errors, and production DOM instrumentation removal. Evidence is retained in the printed temporary directory. This browser harness currently covers React 18/Vite 7; it does not establish Vue/Next/Nuxt browser coverage for the new APIs.
