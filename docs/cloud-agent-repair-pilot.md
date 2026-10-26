# Agent repair pilot

This development experiment asks a coding agent to reproduce and fix a seeded cart bug. Two variants share an SKU; editing one incorrectly updates both. The baseline gets full Playwright MCP and source access. The Domscribe condition gets the same tools plus a persisted annotation and exact source/runtime queries.

**Cloud qualification is pending provider setup.** The native Codex kit starts, but attaching either existing provider-secret reference returned `409 failedPrecondition` without details. Without a binding, a minimal model request returned `401 Unauthorized`. All accepted diagnostic sandboxes were confirmed deleted. These observations concern this account/run; they do not establish a general platform defect. No credential values were retrieved or copied.

## Run locally

Use Node 24, pnpm 9.12.0 and an authenticated Codex CLI. Each invocation builds Domscribe artifacts without the Nx cache in an isolated worktree at public commit `23063854647954f4001d05a21a928bdc12bdc6fc`, validates their provenance, and creates a separate app worktree for the agent. The primary checkout and its lockfile are preserved.

```sh
pnpm exec tsx scripts/cloud/repair-run.ts --local --condition=baseline
pnpm exec tsx scripts/cloud/repair-run.ts --local --condition=domscribe
```

Local runs use the current CLI sign-in and automatic approval review with workspace write permissions. They install Playwright MCP 0.0.83 in the temporary experiment directory. The agent has eight minutes; setup/build commands have separate deadlines. These runs use your model account. An exact model ID may not be reported by the CLI; raw events and measured token usage are retained when available. No model-provider credential is copied into the app or a cloud sandbox.

## Run in Docker Cloud

After an existing OpenAI provider binding works, run one condition at a time:

```sh
pnpm exec tsx scripts/cloud/repair-run.ts \
  --condition=domscribe \
  --provider-secret=secrets/<existing-resource-UUID>
```

The argument is a resource reference, not a token. The [Docker SDK provider-credential guide](https://docs.docker.com/ai/sandboxes-api/cookbook/get-a-stored-secret-into-a-sandbox/) describes attaching such references. This runner does not create or rotate them. It signs in to Docker through interactive SDK OAuth, launches one medium Codex kit, runs the existing replay smoke followed by the repair task, collects bounded evidence, and confirms deletion of that sandbox UID. The original 25-minute execution and 30-minute expiration limits apply. Cloud bootstrap setup can continue after the sandbox reaches RUNNING; the pilot separately checks tool/server readiness.

CI runs offline tests and CLI/type/lint/syntax checks. It does not allocate sandboxes or call a model. This is not a GitHub issue-to-PR Action.

## Acceptance and evidence

The fixture uses browser localStorage, not a backend. Both variants receive the same plain issue and browser-first instructions; the Domscribe variant also receives instructions to inspect its annotation and runtime. That additional work is part of the condition and prevents treating a one-pair tool-count comparison as an efficiency benchmark.

The controller must first observe the intended corruption: quantities become `3 / 3 / 1`. The agent may change only `src/App.jsx`. Its patch must include staged and unstaged changes against the immutable seed commit; commits, extra files, symlink substitutions and empty patches fail qualification. The exported patch is applied to a fresh worktree with a fresh frozen npm install. The independent browser verifier then checks:

- Saving and reloading changes only the selected line (`3 / 2 / 1`).
- Reversing and filtering the list preserve the intended line identity.
- Cancel leaves the original cart intact.
- Production UI works without Domscribe instrumentation.
- No application console, page or network errors occur.

The Domscribe condition also needs a successful runtime query that resolves the selected `line-a`, not just a completed tool call or an ambiguous source lookup. An agent's self-report or exit zero alone cannot pass.

The printed evidence directory contains `pilot-result.json`, `repair-report.json`, `repair.patch`, raw agent JSONL, before/after screenshots, the enriched annotation and build/server logs. Reports identify local versus Docker execution, source/seed/harness/artifact digests, actual tool versions, completed MCP calls and available measured usage. Required cloud transfers retain fixed names and existing size limits. Cancellation stops owned command groups and servers. The grader is kept outside the agent worktree; it is not a security boundary against an adversarial process with access to the whole VM.

Earlier local development trials produced correct source-only fixes in both conditions. Independent review then found and fixed gaps in staged-patch capture, production-build cancellation and artifact provenance. Those earlier trials are diagnostic evidence. Final qualification uses the fresh source and exported-patch path above. See this thread's dated evidence for final results; do not describe local results as cloud verification or claim market demand, speed or cost advantages from one seeded task.

## Local qualification, October 25, 2026

Both final local trials passed after the review fixes. Each independently built all 15 package targets from clean pinned source, verified the same artifact digest, and applied the exported patch to a separate fresh app worktree before grading. Both returned the identical minimal SKU-to-line-ID fix and passed every business assertion with zero application errors. The Domscribe trial resolved the selected line's props and source, including recovering from an ambiguous source-only query with an exact instance.

| Condition           | Independent result | Completed MCP calls | Exact runtime evidence     |
| ------------------- | ------------------ | ------------------: | -------------------------- |
| Full browser/source | Pass               |                   5 | Browser/source workflow    |
| Same plus Domscribe | Pass               |                  15 | Resolved selected `line-a` |

These counts are MCP calls, not all agent actions, and the enriched prompt requires extra Domscribe work. Strategies differed and the exact model ID was not reported. There is one final trial per condition. The result establishes local repair and evidence feasibility; it does not show a navigation, speed, cost or adoption advantage. Cloud qualification remains pending the provider binding. Actual versions: Node 24.22.1, Codex CLI 0.164.0, Playwright MCP 0.0.83, Chromium 156.0.8078.4, React 18.3.1 and Vite 7.3.7.
