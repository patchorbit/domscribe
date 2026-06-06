# Code→UI Benchmark v1 — Results

**Spec:** [`v1.md`](./v1.md) (sprint 2613 — landed by Task A)
**Suite:** `@domscribe/benchmark@1.0.0`
**Comparators:** [`@domscribe/benchmark-comparators`](../../packages/domscribe-benchmark-comparators/README.md)

This page hosts the public 45-cell results table for the Code→UI Benchmark. The benchmark measures five source-mapped scenarios (S1–S5) across three fixtures (Vite/React, Nuxt/Vue, Next.js) and three MCP comparators (RCP v1, chrome-devtools-mcp, in-repo WebMCP-conformant reference).

> [!NOTE]
> Last-run timestamp, comparator versions, and the 45-cell results table are populated by the runner in `@domscribe/benchmark` (sprint 2613 Task A). This document is the scaffold; the results below are placeholders until the runner produces `results.json` and the page is regenerated. The placeholders are intentional and unambiguous — empty cells get a literal `—`, not a value.

## Reproduce this

```bash
git clone https://github.com/patchorbit/domscribe.git
cd domscribe
pnpm install
pnpm nx test domscribe-benchmark
# Runner writes results.json next to this page; re-render with:
pnpm nx run domscribe-benchmark:render-results
```

## Comparators

| Name                  | External validity | Version                                         | Notes                                                                                                                            |
| --------------------- | ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `rcp-v1`              | Subject           | (RCP v1 spec, [`docs/rcp/v1.md`](../rcp/v1.md)) | The artifact under measurement; RCP v1 is documentation-versioned per RFC 0003                                                   |
| `chrome-devtools-mcp` | External          | `1.1.1` (pinned in root `package.json`)         | Generic runtime browser-MCP; no build-time source correlation                                                                    |
| `webmcp-reference`    | In-repo fallback  | `0.1.0-in-repo-reference`                       | Minimal WebMCP-conformant reference per RFC 0004 fallback; replace with external WebMCP server when one is installable in-sprint |

### Why one column is an in-repo reference

The benchmark would prefer three external comparators. As of sprint 2613 there is no public WebMCP-conformant server that installs cleanly on a clean clone — the in-repo reference exists so the third column is reproducible. It is, by definition, a comparison where we wrote both sides; that caveat is recorded here and on the column header in the results table. Replacing the reference with a real external server is the structural fix and is tracked as a follow-on.

## Results

> **Status:** Pending Task A's runner. The table below is the schema-true placeholder; cells are populated by `results.json` at runner-completion time.

| Scenario                        | Fixture | `rcp-v1` | `chrome-devtools-mcp` | `webmcp-reference` |
| ------------------------------- | ------- | -------- | --------------------- | ------------------ |
| S1 source-position query        | Vite    | —        | —                     | —                  |
| S1 source-position query        | Nuxt    | —        | —                     | —                  |
| S1 source-position query        | Next    | —        | —                     | —                  |
| S2 style provenance with source | Vite    | —        | —                     | —                  |
| S2 style provenance with source | Nuxt    | —        | —                     | —                  |
| S2 style provenance with source | Next    | —        | —                     | —                  |
| S3 multi-instance enumeration   | Vite    | —        | —                     | —                  |
| S3 multi-instance enumeration   | Nuxt    | —        | —                     | —                  |
| S3 multi-instance enumeration   | Next    | —        | —                     | —                  |
| S4 runtime context probe        | Vite    | —        | —                     | —                  |
| S4 runtime context probe        | Nuxt    | —        | —                     | —                  |
| S4 runtime context probe        | Next    | —        | —                     | —                  |
| S5 annotation→source roundtrip  | Vite    | —        | —                     | —                  |
| S5 annotation→source roundtrip  | Nuxt    | —        | —                     | —                  |
| S5 annotation→source roundtrip  | Next    | —        | —                     | —                  |

**Cell legend:** `pass` (answered correctly per the binary rubric in v1.md), `refused` (tool reported it does not implement the surface), `wrong` (answered incorrectly), `—` (not yet run).

## Methodology

Each comparator implements a single `Comparator` interface (see [`packages/domscribe-benchmark-comparators/src/types/`](../../packages/domscribe-benchmark-comparators/src/types/index.ts)) and is invoked by the runner with a `ScenarioPrompt`. The binary rubric for each scenario (what counts as `pass`) is defined in `v1.md`. No tool gets credit for partial answers; refusal is a recorded outcome, not a missing value.

The fixtures expose components at known source positions documented per fixture in `packages/domscribe-test-fixtures/fixtures/*/README.md`. Source-position changes to fixture components are gated by the same `protocol:freeze-check` CI gate that guards RCP v1, extended in sprint 2613 to fire on benchmark-spec edits without runner updates.

## Falsifier

Engineering portion (sprint 2613 close, 2026-07-10): all 45 cells populated by a reproducible runner; this page linked from `README.md` and `TECHNICAL_SPEC.md`. Adoption portion (sprint 2614 close, 2026-08-07): one of — a third-party public artifact names "Code→UI" or "runtime-context protocol" as Domscribe's category descriptor; an OSS reference-integration PR cites a benchmark scenario by ID; an external repo forks `@domscribe/benchmark` to run their own scoring. See [RFC 0004](../rfcs/0004-code-to-ui-benchmark-v1.md) for the full falsifier and retreat path.

## Visual editors (qualitative)

Cursor Visual Editor, Stagewise, and similar click-driven UI tools are out of the scoring table by design — they have no programmatic query surface and comparing MCP returns to human clicks is not a reproducible comparison. The category-level note: visual editors solve UI→Code (point and tell) without source-correlation guarantees; the Code→UI direction (an agent querying a running app) is the surface this benchmark measures. The [README](../../README.md#features) describes both directions.
