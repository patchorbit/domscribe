# Real application investigation: Hoppscotch import

On October 27, 2026 (Pacific), we tested the private browser investigator against [Hoppscotch issue 6606](https://github.com/hoppscotch/hoppscotch/issues/6606) and [its proposed fix, PR 6608](https://github.com/hoppscotch/hoppscotch/pull/6608). This is a real reported importer defect in an upstream application, not a deliberately inserted bug. It is a targeted known-issue evaluation: the operator selected the issue and supplied import scenarios and synthetic files. It is not unknown-bug discovery, a coverage rate or evidence of customer demand.

## Protocol

- Broken upstream revision: `63273f8e599e73f0fb38c0739314e8d46b6bc83d`.
- Fixed upstream revision: `2b8748b535c6bcf5b73dfb014766176afc4c7431`.
- Independent shallow source caches/worktrees separated the snapshots. The broken agent checkout excluded future fix history. Neither application source nor manifests/lockfiles were modified.
- Each investigation compared its snapshot to itself, with an empty diff. The agent received a generic HTTP-client brief, two approved import contracts and synthetic files; no issue stack, supplied action plan, source-location hint or fix. Therefore failures on the broken snapshot are **pre-existing**, not new PR regressions.
- The agent explored through full ordinary browser/source tools and proposed actions. The verifier independently executed each plan on base, head and a fresh head repeat, with fresh browser contexts and original approved upload buffers.
- Mixed import data contained numeric `3`, boolean `true`, `null` and an ordinary string environment value. A string-only equivalent was the healthy control. No real service or credentials were involved; request URLs used `example.invalid`.

The observed imported values were checked separately through collection Properties → Variables, saved, reloaded and checked again. A toast is a useful completion signal but does not alone prove data correctness.

## Results and failures

The first run of the unmodified merged investigator explored the actual app but returned both journeys **uncovered**. Its replay contract lacked uploads and menu items and could not describe the unique unnamed import dialog. This was a real usability gap, not successful coverage.

We added bounded approved fixtures, `menuitem` targets and explicitly unnamed unique scopes, with regression tests. The agent then produced a five-step import sequence without being given one. The first broken-snapshot run passed string imports but remained **inconclusive** for mixed imports: reading a success message that never appeared correctly refused an unavailable target. A separate fixed-snapshot run passed both imports across all three phases.

The operator changed the observation representation on **both** snapshots from reading toast text to counting the exact `File imported` status (expected one). The underlying business expectation did not change. The previous inconclusive run remains a configuration-friction result. With the explicit presence contract, the broken snapshot observed zero success announcements in all three mixed-import phases and was classified **pre-existing**; string imports observed one in all three phases. The matched fixed-snapshot presence comparison passed both imports, observing one success announcement in every phase. Across these two final comparisons, all 12 independent journey replays completed: three broken mixed-import failures, three passing broken-snapshot controls and six passing fixed-snapshot imports. These are repeated observations of one real defect, not 12 independent bugs.

Independent manual qualification reproduced `expression.replaceAll is not a function` on broken mixed imports, while strings succeeded on both revisions and mixed imports succeeded on the fixed revision. On the fixed revision the actual values were `attempts: "3"`, `enabled: "true"`, `optional: "null"`, `host: "http://example.invalid"`, and remained identical after save/reload. That separate data check had zero page exceptions. Anonymous guest authentication refresh returned expected HTTP401 responses, so these runs are **not network/console-clean**. Investigator error counts include that noise and are not automatically classified as bugs.

Initial manual harness failures (an incorrect assumption that Import had accessible name `Import`, and a missing output directory) were preserved before correction. In this app many buttons expose name `button` and distinguish themselves by visible text. The generic exact-role/name plus literal-text contract handled this without CSS or positional fallback.

## Setup and reproducibility limits

Environment: Node24.22.1, Domscribe workspace pnpm9.12.0, application pnpm10.34.5, Codex CLI0.164.0, Playwright1.64.1/Chromium156.0.8078.4 and browser MCP0.0.83. Requested model was `gpt-6.1-sol`/low; actual provider model metadata was unavailable. The initial source tool was main `6d84138`; fixture contract commit `da82835` plus controller/agent integration was used for subsequent runs.

App setup used a filtered frozen `pnpm --filter @hoppscotch/selfhost-web... install --frozen-lockfile --ignore-scripts`, then cached generated build/codegen outputs from a prior checkout. The generated inputs were unchanged across the three-file upstream fix. Provenance/hashes were recorded, but this is **not a clean full application build**. A local synthetic guest backend and same-origin proxy made the anonymous UI testable without account setup; it is not production backend/auth coverage. Install/start scripts are operator work, not automatically inferred onboarding. The private evidence includes exact configuration, bootstrap/start scripts, fixtures, logs and screenshots; local machine paths and caches require adaptation elsewhere.

The machine-local evidence lives under the monitoring continuity directory's `development-evidence-2026-10-27/real-app-investigation`: `initial-unmodified`, `case-01`, `case-02`, `presence-01`, `presence-02`, `qualification-*`, `business-fixed` and `protocol.json`. These are local artifacts, not public hosted links. No issues/comments were posted to Hoppscotch.

## Product conclusion

The experiment demonstrates a useful narrow operation: an agent can derive a real import workflow, and independent replay can distinguish a reported failure from its fixed implementation and a healthy control. It also exposes material setup and oracle-authoring work before a customer could use it unattended.

**Domscribe runtime/MCP was disabled throughout.** Ordinary browser/source tools were sufficient for this task. The result supports investigating trustworthy browser regression verification; it does not establish Domscribe-specific advantage, autonomous product understanding, general exploration quality, cheaper execution or readiness for a managed paid service. A next evaluation should withhold a known issue, use a small frozen set of ordinary feature contracts and independently adjudicate findings and missed behavior. Compare optional Domscribe enrichment only on tasks where source/instance ambiguity is actually present.
