# Experimental browser PR investigation

This private source tool investigates a **trusted local app** on pinned base/head commits. An agent browses the app and proposes reproduction steps. A separate browser executor replays them on base, head and a fresh head repeat against operator-approved expectations. It writes a local report and PR-comment **draft**; it never posts the draft or changes the app.

This is an experiment toward PR investigation. There is no managed service, GitHub App, scheduled crawler, billing or automatic fix delivery in this slice. A local Git worktree and Codex read-only mode are **not a security boundary for arbitrary customer repositories**. Install/start commands execute trusted repository code with the local user's permissions. Use synthetic data only, on a machine/environment appropriate for that code. Browser origin filters do not contain malicious server code or browser-agent tools.

## Run

Use Node24, pnpm9.12 and Git. From an isolated Domscribe source worktree:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm exec tsx scripts/investigation/run.ts --help
pnpm exec tsx scripts/investigation/run.ts --config=/absolute/path/config.json --out=/absolute/path/new-run
```

Codex CLI must already be installed and signed in normally. The runner does not read or copy authentication values. The explicit `agent.model`/`agent.reasoningEffort` settings default to the locally tested `gpt-6.1-sol`/`low`; choose an available model for your account. Requested settings are recorded separately from unknown actual model metadata. It ignores unrelated user configuration/MCP servers and uses a fresh ephemeral read-only session. Agent/browser subprocesses, app startup, installs and the whole run have deadlines. Use a new output directory with an existing parent, outside the source repository; existing directories are refused. SIGINT/SIGTERM trigger cleanup. The primary source checkout is preserved; two detached worktrees are installed, started and then removed.

Exit0 means **investigation completed for all configured journeys**, including confirmed regressions/pre-existing failures; it does not mean the PR is healthy. Exit2 means partial, blocked or source-only/unqualified investigation. Invalid configuration/pinning or fatal cleanup returns1. No live model calls run in ordinary CI.

Copy [the TodoMVC configuration](../scripts/investigation/examples/todomvc.json) and set `repo`, `base` and `head` to your local repository/refs. Refs are pinned to exact SHAs; base must be an ancestor of head. `appRoot` is relative to the repository root and may not escape through symlinks. `install` and `start` are argument arrays, with `{port}` substituted into the start command. No shell interpolation or credentials belong in this configuration. The app must bind that exact localhost port and return a successful homepage response.

The supplied brief and journeys are the product contract. The pilot does not independently learn the product by trusting all historical issues. Specify useful business outcomes, including the unaffected record when identity matters. A successful click alone is not a business assertion. Expectations are fixed by the operator; the agent cannot change them.

## Reproduce the controlled Vue case

The acceptance application is upstream [TodoMVC](https://github.com/tastejs/todomvc/tree/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/examples/vue), with deliberate local test commits. These are controlled regressions, not organically discovered customer incidents. Create a local bare cache, then a detached worktree; do not edit an existing application checkout:

```sh
git clone --filter=blob:none --bare https://github.com/tastejs/todomvc.git /tmp/domscribe-todomvc.git
git --git-dir=/tmp/domscribe-todomvc.git worktree add --detach /tmp/domscribe-todomvc-case ff43b02e59dfa604386bb382034b2cd07c2bcd8a
```

For a healthy control, compare the same commit, or commit a harmless heading class. For a regression control, make a local commit changing `event.target.value.trim()` in `examples/vue/src/components/TodoHeader.vue` to `event.target.value.trim().toUpperCase()`. Point the config's `base` at the preceding good commit and `head` at that local commit. The generic runner receives the PR diff and approved case-preservation contract, with no reporter annotation or hidden fix. It must discover the UI steps itself. For a pre-existing-failure control, separately configure the existing `todos` heading observation to expect `Tasks`; label this intentionally unmet test contract clearly. Never treat that control as a customer bug.

## Results and evidence

The private output directory is mode0700. It retains `report.json`, `comment.md`, `proposal.json`, a bounded diff, raw agent/app/install logs and browser screenshots. Raw logs/screenshots may contain repository/UI data: review before sharing. The draft omits raw transcripts and replaces agent-authored uncovered reasons with a stable message; private report details may contain host paths and need review; artifact links are relative local links, not hosted URLs.

- **regression**: all actions complete, approved base observations pass, and the same expectations fail with the same actual values on both fresh head runs.
- **passed**: those approved observations pass all three runs. This says nothing about unexplored behavior.
- **pre_existing**: at least one approved observation already fails on base. The whole journey is conservatively excluded from PR attribution; split independent outcomes into separate journeys to avoid hiding a new failure behind an unrelated baseline failure.
- **inconclusive/uncovered**: action/setup/locator failure, missing plan, missing observations or inconsistent head results. These cannot become verified bugs or passing coverage.

A schema-valid proposal without an actual completed agent browser call is marked unqualified. Domscribe usage is recorded separately and is optional. This pilot alone does not establish Domscribe's incremental value, reliability rate, cost advantage or demand.

## Optional Domscribe inspection

For an already instrumented synthetic-data app, install `@domscribe/mcp` as a direct app development dependency and set `domscribe: true`. The app's dev startup must start its relay/overlay integration normally. The adapter runs that app-local MCP entry point in the head app's directory. It does not install/inject Domscribe automatically. Compare against the same full browser/source workflow before claiming benefit. Published npm capabilities and local source pilot tooling are separate.

## Current limits

Plans support click, fill, check, select, approved fixture upload, Enter/Escape/Tab and same-origin pathname navigation. Targets use exact accessible role/name, optional literal visible-text filtering and one accessible ancestor. Empty accessible names, including an unnamed dialog scope, are explicit and still must resolve uniquely. No CSS/nth/first fallback, arbitrary verification JS, hover, double-click, password/hidden inputs, arbitrary host-file upload, storage seeding, backend restoration or login restoration. Main-document controls and synthetic local app data are the qualified scope. Cross-origin HTTP assets/API dependencies and WebSocket handshakes are blocked during independent replay; the app origin’s corresponding WebSocket origin is allowed for local HMR. These browser controls are not an OS network firewall. Missing text/value targets remain inconclusive, even when their disappearance might be a real regression. Use an explicit count expectation when absence itself is the approved business observation; do not rewrite a contract merely to obtain a finding.

### Approved synthetic uploads

Optional `fixtures` contains at most four unique IDs and filenames. Each entry has `id`, `name`, `mimeType` and inline `content`. Names are JSON/CSV/TXT basenames of at most 80 characters; content is limited to 64KiB UTF8 per file. MIME types are `application/json`, `text/plain` or `text/csv`. Use synthetic data only; inline config content is retained in private evidence and is not a secret store.

The agent receives IDs and private relative paths staged below the disposable head app's `node_modules/.cache`. A proposal uses `{ "action": "upload", "target": { "role": "button", "name": "Choose File" }, "fixtureId": "sample" }`, with an ordinary unique target or dialog scope. The executor supports a visible native file input or a button that opens a file chooser. It uploads a buffer from the original validated configuration, ignoring changes to staged files. Arbitrary paths are never accepted in replay. Ordinary click/fill actions still refuse file inputs. Staging refuses symlink escapes, uses private files and is removed with the disposable worktree. This remains trusted local testing, not containment of malicious customer code.

Each phase has a fresh browser context, but a persistent backend would still share server state; do not infer reset/independence of backend data. Observation waits are bounded, not proof that all asynchronous work finished. Console/page error counts are recorded and need interpretation; they are not automatically classified as PR bugs. Expected contracts can intentionally change in a PR and need human maintenance.

```sh
pnpm exec tsx --test scripts/investigation/*.test.ts
pnpm exec tsx --test scripts/investigation/browser.browser.ts
pnpm exec tsc -p scripts/investigation/tsconfig.investigation.json
pnpm exec eslint scripts/investigation --max-warnings=0
```

## Recorded acceptance, October 27, 2026

Two fresh autonomous runs of the generic CLI used actual upstream TodoMVC Vue at `ff43b02`, with deliberate local test commits: layout-only `add444d` and title-normalization regression `bb16774`. Both revisions were freshly installed using the upstream frozen `npm ci` path and replayed in separate browser contexts. No reporter annotation or seeded action plan was supplied.

The regression comparison independently observed `Invoice review` on base and `INVOICE REVIEW` on both fresh head runs. The heading passed, while the deliberately wrong `Tasks` expectation was labeled pre-existing. The separate healthy/layout comparison passed both real expectations and reported no new findings. All 18 independent observations completed, with zero recorded console/page errors and zero failed/HTTP4xx/5xx app requests. Qualification was also rechecked from successful MCP app-navigation events against app startup origins using the final parser.

Environment: Node 24.22.1, pnpm 9.12.0, Codex CLI 0.164.0, Playwright 1.64.1, browser MCP 0.0.83; requested model `gpt-6.1-sol`/low, actual provider model metadata unknown. The agent used ordinary browser/source access; **Domscribe MCP was disabled**. These controlled cases establish an executable investigation/reporting path, not product differentiation, organic bug discovery, broad coverage, efficiency or demand.

Failed attempts were retained: API output-schema rejection; converted structured-output runs ending before tool use; a browser MCP approval gate correctly producing uncovered results; an overstrict sparse-index guard; and an Nx configuration-inference error. The final adapter validates ordinary final JSON locally and approves only the configured browser server within that invocation. A separate uncached overlay compilation failure was corrected by explicitly preserving the helper's optional-context return type.

The final two autonomous comparisons were repeated after review fixes for scoped counts, WebSocket routing and draft privacy; both retained the same classifications and zero recorded errors. The independent verifier also refuses missing/duplicated count scopes and proves that disallowed WebSocket servers receive no handshake while local sockets still work.

See [the real Hoppscotch evaluation](real-app-investigation-evaluation.md) for a reported upstream failure, setup costs, failed attempts and the limits of what that experiment demonstrates.
