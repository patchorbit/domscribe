# @domscribe/benchmark-comparators

External MCP comparators and an in-repo WebMCP-conformant reference server for the [Code→UI Benchmark v1](../../docs/code-to-ui-benchmark/v1-results.md).

Companion package to `@domscribe/benchmark` (the spec + runner — owned by sprint 2613 Task A). The runner imports `Comparator` implementations from here and produces the public 45-cell results table. This package contains the comparators only; the scenarios and scoring rubric live in the benchmark spec.

## Why a separate package

Comparators have a different stability surface than the benchmark spec:

- The **WebMCP-conformant reference** is a fallback implementation per [RFC 0004](../../docs/rfcs/0004-code-to-ui-benchmark-v1.md). It exists so the benchmark's third column is reproducible on a clean clone when no external WebMCP-conformant server installs cleanly in the sprint window.
- The **chrome-devtools-mcp** comparator is a thin shim over the external [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) dev-dep. The version is pinned in the root `package.json` and recorded on `/benchmark` with the results.

Both columns are intentionally drop-in replaceable so the benchmark can re-score with a real external WebMCP server once one is available.

## What's in here

| Surface                    | Purpose                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/`               | `Comparator`, `ScenarioPrompt`, `ComparatorResponse`, `CellOutcome` — the contract the runner depends on                                                                      |
| `src/webmcp-reference/`    | Minimal in-repo reference: implements selector queries / computed-style reads / devtools enumeration; refuses S4 props/state and S5 annotation→source (the gap RCP v1 closes) |
| `src/chrome-devtools-mcp/` | Comparator shim; the actual MCP transport is injected via `ChromeDevtoolsMcpClient` so the comparator stays unit-testable                                                     |

## Caveats

The in-repo WebMCP reference is, by definition, a comparison where we wrote both sides. The `/benchmark` page surfaces this as the `external-validity: in-repo-fallback` flag on the column. Replacing the reference with a real external WebMCP-conformant server is the structural fix.
