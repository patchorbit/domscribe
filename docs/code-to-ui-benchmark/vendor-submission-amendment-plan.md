# Code→UI Benchmark — Sprint 2612 vendor-submission amendment plan

**Owner:** staff-swe-4 (sprint 2613 Task B)
**Trigger to execute:** `docs/code-to-ui-benchmark/v1-results.md` is live and populated by Task A's runner with non-placeholder results.

## Why this exists

Sprint 2612 (PE [RFC 0003](../rfcs/0003-documentation-versioned-rcp-v1.md) / [sprint 2492 plan](../sprints/2492.md)) commits to filing four IDE-vendor-directory submissions (Cursor MCP / Cline / Continue / Codex) and one Cursor forum reply. The Code→UI Benchmark page is a category-level credibility surface that strengthens every one of those submissions — but only if it's amended in while the review windows are still open. This document is the checklist Task B's owner runs at the moment the results page goes live.

## Current state (as of sprint 2613 kickoff, 2026-06-26)

| Sprint 2612 deliverable                     | Expected location     | State on `main` | Amendable?                   |
| ------------------------------------------- | --------------------- | --------------- | ---------------------------- |
| `docs/submissions.md` (submission tracker)  | `docs/submissions.md` | **Missing**     | Depends on sprint 2612 close |
| `docs/install/<channel>.json` × 8           | `docs/install/`       | **Missing**     | Depends on sprint 2612 close |
| `docs/posts/2026-06-cursor-forum-146166.md` | `docs/posts/`         | **Missing**     | Depends on sprint 2612 close |
| Cursor MCP directory PR                     | external repo         | Not filed       | Once filed                   |
| Cline directory PR                          | external repo         | Not filed       | Once filed                   |
| Continue directory PR                       | external repo         | Not filed       | Once filed                   |
| Codex directory PR                          | external repo         | Not filed       | Once filed                   |

**Implication:** Sprint 2612's vendor-submission deliverables have not landed on `main` as of sprint 2613 kickoff. The amendment plan below is the procedure to execute the moment they do. If sprint 2612 closes without those deliverables landing, the amendment scope changes from "amend existing submissions" to "include the benchmark link from the first submission" and the surface is even simpler.

## Amendment procedure

For each Sprint 2612 submission that is still in review (per `docs/submissions.md` review-status column) when this PR's [`v1-results.md`](./v1-results.md) is populated:

1. **Read the submission's review status** in `docs/submissions.md`. If it is `merged` or `closed`, skip to step 4.
2. **Push an addendum commit** to the submission PR adding the `/benchmark` link to the README/description section of the directory entry. Use this language verbatim so the four submissions converge on the same category descriptor:

   > Domscribe is the Code→UI category — runtime-context queries from a coding agent to a running browser, source-correlated by the build-time RCP v1 protocol. See [Code→UI Benchmark v1 results](https://github.com/patchorbit/domscribe/blob/main/docs/code-to-ui-benchmark/v1-results.md) for a 45-cell scoring against `chrome-devtools-mcp` and a WebMCP-conformant reference across React, Vue, and Next.js fixtures.

3. **Update `docs/submissions.md`** with a row noting the amendment date and the commit SHA of the addendum.
4. **For submissions whose review window is closed** (no longer accepting commits), add a one-line entry to [`docs/sprints/2613.md`](../sprints/2613.md) under the "Sprint 2612 submission amendments — could not amend" section, naming the directory and the close reason.

## Cursor forum reply (sprint 2612 T9)

If the forum reply at [`forum.cursor.com/t/146166`](https://forum.cursor.com/t/click-to-source-from-browser-visual-editor-inspect-open-file-line/146166) is posted but the thread is still active, post a one-paragraph follow-up linking to `/benchmark` (do not edit the original — Cursor's forum etiquette favors transparent threading over silent edits). If the thread has gone cold (no replies in 7+ days at the moment this amendment is executed), do not bump it — surface to Kaushik instead.

## Cutoff for executing this plan

Per [RFC 0004 falsifier](../rfcs/0004-code-to-ui-benchmark-v1.md): by **2026-07-10 sprint 2613 close**. After that date the engineering window is closed and any unexecuted amendments are deferred to the sprint 2614 retro decision.
