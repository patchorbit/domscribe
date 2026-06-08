# Sprint 3071 — RFC 0001 baseline + positioning verdict

**Author:** Staff SWE (sprint run 3071, issue #51)
**Date:** 2026-06-08
**Decides:** the positioning language for `verify_after_edit` (RFC 0002).
**Does not decide:** whether to ship `verify_after_edit` — that bet is made by the DOP memo and RFC 0002; this doc only sequences how it is framed.

---

## TL;DR

| Quantity                                                    | Value                                   | Source                                          |
| ----------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| RFC 0001 falsifier (≥70% agent one-shot styling completion) | **unmeasured**                          | no agent-integration harness exists on `main`   |
| RFC 0001 mechanism self-test                                | **10/10 (100%), 0 pixel diff**          | `styling/scripts/falsifier.ts --mode=self-test` |
| Positioning verdict                                         | **self-correction layer (<85% branch)** | conservative default in absence of measurement  |
| Slack alert (≥85% trigger)                                  | **not posted**                          | threshold neither met nor measurable            |

The lift of the comparator into `@domscribe/verify` (this PR, Task A3) is independently validated by the self-test: the harness re-imports the comparator and continues to grade all 10 baselines at 0 pixel diff.

## What the harness can measure today

The RFC 0001 falsifier harness (`packages/domscribe-test-fixtures/styling/scripts/falsifier.ts`) supports three modes:

1. **`self-test`** — builds the Tailwind and styled-components fixture apps, screenshots each annotation's `afterRoute`, and diffs against the committed baseline. Expected pass rate is **100% by design** — this is the harness's own correctness check, not a measurement of agent capability. The README is explicit:

   > It does not invoke an agent. The agent-integration loop is built on top of this — see `--mode=measure`.

2. **`record`** — re-captures the baseline PNGs from the canonical `/after` routes.

3. **`measure --agent-output=<dir>`** — production grading: reads one screenshot per annotation from an external directory (produced by an agent-integration harness) and diffs against the baseline. **This is the mode that would actually answer "what is the agent's one-shot styling completion rate?"**

## What is missing

The agent-integration loop required to run `--mode=measure` does **not** exist on `main`. Specifically, there is no harness that:

- Reads each annotation from `styling/annotations.json`,
- Drives an agent (Claude / Codex / similar) through the edit using the intent + source-file context,
- Boots the fixture from the post-edit source,
- Screenshots the rendered element into a per-annotation PNG,
- Hands the directory to `falsifier.ts --mode=measure`.

Until that loop exists, the inherited RFC 0001 falsifier (≥70% one-shot agent styling completion by sprint 2734+6) is **unmeasured**. The self-test pass rate is structurally **not** a substitute — the self-test screenshots the canonical-after route, not an agent's edit, so it cannot fall below 100% no matter how poorly an agent would perform.

## Self-test result (mechanism-only)

```
mode=self-test, total=10, passes=10, fails=0, oneShotRate=1.0
all annotations: pixelDiffRatio=0, diffPixels=0
```

Raw JSON: [`3071-rfc-0001-baseline.harness-self-test.json`](./3071-rfc-0001-baseline.harness-self-test.json).

The 100% pass rate means:

- The Vite build for both fixtures is reproducible.
- Chromium + screenshot capture is locale/font/viewport-deterministic in this CI environment.
- The lifted comparator in `@domscribe/verify` (this PR) diffs identically to the inline version it replaces — none of the 10 baseline diffs shifted off zero.

The 100% pass rate **does not mean** the agent's one-shot styling completion rate is 100%. That number is unknown.

## Methodology

- **Where:** ephemeral dev sandbox; node v20.19.4; pnpm 9.12.0; playwright 1.58.2 (chrome-headless-shell 1208); locale `en-US`, timezone `UTC`, viewport `800×600`, scale 1, animations disabled (matches the harness defaults).
- **Source:** worktree at `origin/main@a171724` (RFC 0001 Task B merge), plus the `@domscribe/verify` lift introduced by this PR.
- **Command:** `pnpm --filter @domscribe/test-fixtures test:falsifier`.
- **Reproducibility:** the same command on the same commit on a CI runner with the documented Playwright cache returns the same JSON. Re-recording baselines (`--mode=record`) would only be needed if the canonical-after routes or the Chromium build changes.

## Positioning verdict

Per RFC 0002 §Implications-for-PM and issue #51, the baseline gates how `verify_after_edit` is framed:

- **≥85% → trust layer.** Verify catches the long tail; the build is conservative; PM may consider deferring relay registration (Task B) if capacity is tight.
- **<85% → self-correction layer.** Verify is load-bearing for the value loop; the full build proceeds.

The baseline is unmeasured. The conservative default in the absence of measurement is the **self-correction layer** branch — we cannot justify treating verify as a long-tail polish layer when we have no evidence the short tail is solved. The full build proceeds; the Slack alert (which fires only on ≥85%) is **not** posted.

## What this means for Task B

No change. Task B (runtime `ScreenshotCapturer` + relay `verify_after_edit` MCP tool) ships as planned, soft-recommended in MCP prompts, no lifecycle gate. The package-level value of `@domscribe/verify` is independent of the agent one-shot rate — the harness already consumes it, and the relay tool will consume it on the same contract.

## Follow-up — agent-integration harness (next sprint)

The cleanest way to retire this measurement gap is to add `--mode=agent` (or a separate driver script under `styling/scripts/`) that:

1. For each annotation in `annotations.json`, spawns the agent under test with a fixed prompt (intent + sourceFile + sourceLine + the merged RFC 0001 `styleSource` + `componentStyles`).
2. Applies the agent's edit to a scratch copy of the fixture, builds it, screenshots `afterRoute`.
3. Writes `<id>.png` into a deterministic agent-output directory.
4. Invokes the existing `--mode=measure` with that directory.

This is the prerequisite for measuring both the inherited RFC 0001 falsifier (≥70% one-shot) **and** the RFC 0002 falsifier (≥60% retry-resolution rate). Sized as a separate sprint task; out of scope for issue #51 (per the issue's "Out of scope" enumeration, which lists agent-side work as a P1 follow-up rather than in-scope).

## References

- [RFC 0001 — Two-tier component-style attribution](../rfcs/0001-component-styles-capture.md)
- [RFC 0002 — Post-edit verification as an MCP diagnostic tool](../rfcs/0002-post-edit-verify-mcp-tool.md)
- Issue [#51](https://github.com/patchorbit/domscribe/issues/51), Issue [#52](https://github.com/patchorbit/domscribe/issues/52)
- PRs [#49](https://github.com/patchorbit/domscribe/pull/49), [#50](https://github.com/patchorbit/domscribe/pull/50) (RFC 0001 Tasks A and B)
- Harness source: [`packages/domscribe-test-fixtures/styling/scripts/falsifier.ts`](../../packages/domscribe-test-fixtures/styling/scripts/falsifier.ts)
- Harness README: [`packages/domscribe-test-fixtures/styling/README.md`](../../packages/domscribe-test-fixtures/styling/README.md)
