# RFC 0002 — Post-Edit Verification MCP Tools

- **Status:** Implemented (v1: delta-based verification)
- **Packages:** `@domscribe/core`, `@domscribe/verify`, `@domscribe/relay`, `@domscribe/overlay`
- **Depends on:** RFC 0001 (component-style capture)

> This document reconstructs the RFC 0002 spec that earlier commits cite
> (annotation schema v3, `verifyHistory`, `VerifyResult`) and records the
> design as implemented. The original draft was removed in a repo cleanup;
> the normative constraints below match the code.

## Problem

Coding agents editing UI code cannot reliably tell whether their edit took
effect. The universal failure modes:

1. **Silent no-ops** — the agent edits the wrong file, a non-applying style
   path (specificity, conditional class), or HMR fails, and the agent
   declares success anyway.
2. **Vision-blind regressions** — agents that verify by screenshot rely on
   a vision model to compare images, and vision models are demonstrably
   unreliable at exactly the deltas that matter for styling work (small
   offsets, near-identical shades, spacing changes).

Every mainstream agent stack verifies by "screenshot + eyeball" as of
mid-2026. None offers a deterministic, element-scoped comparison in the dev
inner loop.

## Design

Two MCP tools on the relay close the loop deterministically:

1. **`domscribe.verify.baseline`** — called *before* the edit. Captures a
   snapshot of the target element from the live page over the existing
   relay↔browser WS channel: the RFC 0001 computed-style allowlist
   (≤32 properties) plus the element's bounding rect. Returns an opaque
   `baselineId`. Baselines are in-memory and session-scoped (max 100,
   oldest evicted) — they describe the live page *now*, so persisting them
   would only produce stale comparisons.

2. **`domscribe.verify.afterEdit`** — called *after* the edit and HMR.
   Re-captures the same element, computes deltas against the baseline, and
   returns a `VerifyResult` (core schema, annotation schema v3):
   - `verdict`: `match` | `partial` | `no_change` | `regression`
   - `componentStylesDelta`: per-property `{ property, before, after }`
   - `boundingRectDelta`: per-field `{ field, before, after }` (0.5 px
     epsilon for sub-pixel jitter)
   - `notes`: deterministic explanation
   When an `annotationId` is supplied, the result is appended to that
   annotation's `context.verifyHistory` (append-only).

### Deltas first, pixels later

The v1 verdict is computed from **style and geometry deltas only** — not
pixel diffs. Grounds for this ordering:

- Computed-style deltas are exact, cheap (no screenshot pipeline), immune
  to anti-aliasing noise, and directly actionable in code
  (`padding: 8px → 12px` tells the agent what to fix; a red pixel overlay
  does not).
- The research consensus (Design2Code's low-level metrics, UI2Code^N's
  finding that CLIP-similarity rewards *degrade* refinement, the
  VLM-blindness benchmarks) is that element-level structured deltas are the
  reliable regression oracle, while holistic visual judgment belongs to
  the calling agent.
- The pixel path stays open: `VerifyResultSchema.pixelDiffRatio` and
  `screenshotRef` are reserved, and `@domscribe/verify` already ships the
  pixelmatch comparator used by the falsifier harness. A future revision
  can add element-scoped screenshot capture without changing the contract.

### Verdict semantics (deterministic, intent-agnostic)

The tool measures; the agent judges intent. The caller may declare
`expectedChanges: [{ property, value? }]` — the style changes the edit was
meant to make (values compare as `getComputedStyle` strings).

| Situation | Verdict |
| --- | --- |
| No style and no geometry delta | `no_change` |
| No expectations declared, something changed | `match` + caveat note (change detection only) |
| All expectations met, nothing unexpected | `match` |
| All expectations met, extra properties changed | `partial` (unexpected properties listed) |
| Some expectations met (incl. wrong-value changes) | `partial` |
| No expectation met, other properties changed | `regression` |

Geometry deltas never downgrade a verdict on their own — rect movement is
usually a consequence of an intended style change (padding grows the box).
They are always reported.

### Degradation without `captureStyles`

Style capture is gated on the runtime's `captureStyles` flag (default off
in v0.x per RFC 0001). Without it, verification falls back to geometry-only
change detection: `expectedChanges` cannot be evaluated and the result
notes say so. The baseline response reports `hasComponentStyles` so agents
can prompt the user to enable the flag when full deltas matter.

## Wire surface

- `POST /api/v1/verify/baseline` `{ entryId }` →
  `{ captured, baselineId?, browserConnected, hasComponentStyles?, hasBoundingRect?, error? }`
- `POST /api/v1/verify/check` `{ baselineId, expectedChanges?, annotationId? }` →
  `{ verified, browserConnected, result?: VerifyResult, error? }`

The WS `context:response` payload gains an optional
`elementInfo.boundingRect` (serialized `DOMRect`), captured by the overlay's
relay service.

## Delta engine

`@domscribe/verify` exports the pure functions the relay uses (no DOM, no
I/O — unit-testable in isolation):

- `diffStyleMaps(before, after): StylePropertyDelta[]`
- `diffBoundingRects(before, after, epsilon?): BoundingRectDelta[]`
- `resolveVerdict({ styleDeltas, rectDeltas, expectedChanges? })`

## Falsifier gate

RFC 0002's success criterion is a ≥60% retry-resolution rate on the styling
falsifier corpus: after a failed first attempt, an agent given the
`VerifyResult` deltas should resolve the task on retry at least 60% of the
time. Measuring this requires the agent-driving falsifier mode
(`--mode=agent`), which is tracked separately — see
`docs/sprints/3071-rfc-0001-baseline.md` for the harness gap analysis.

## Agent workflow

```
1. domscribe.query.bySource / domscribe.resolve  → entryId
2. domscribe.verify.baseline { entryId }         → baselineId
3. edit source, wait for HMR
4. domscribe.verify.afterEdit { baselineId, expectedChanges }
5. verdict = no_change?  → the edit did not land; fix and repeat 3–4
   verdict = partial/regression? → consult deltas; fix and repeat 3–4
   verdict = match? → done (agent confirms intent visually if it can)
```
