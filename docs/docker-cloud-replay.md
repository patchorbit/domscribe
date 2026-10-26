# Docker Cloud replay smoke test

This development runner uses the official [`@docker/sandboxes` Node SDK](https://docs.docker.com/ai/sandboxes-api/get-started/) to run Domscribe's existing browser verification in a disposable cloud sandbox. It checks that a saved annotation selects the intended customer after rows reorder in a fresh Chromium session, reads the correct source/props/state, and changes only that customer. It also checks stale and ambiguous targets, application errors, and production instrumentation removal.

The workload builds a pinned public Domscribe commit and installs its tarballs into a new React 18.3.1/npm/Vite 7.3.7 consumer. This is source-artifact verification; the unreleased APIs are not in npm 0.6.1. Other framework/browser combinations are covered separately by the portable-replay CI matrix. A cloud smoke run does not establish that an agent can fix arbitrary issues.

## Run

Use Node 24 and the repository's pnpm 9.12.0. From an isolated worktree:

```sh
pnpm install --frozen-lockfile
pnpm exec tsx scripts/cloud/run.ts --help
pnpm exec tsx scripts/cloud/run.ts
```

The default commit is the reviewed foundation at `92e939a643b7f882b5f997e3197413befcc93b41`. To verify another public commit containing the same harness:

```sh
pnpm exec tsx scripts/cloud/run.ts \
  --commit=<exact-40-character-lowercase-SHA> \
  --report-dir=/path/to/an/empty/evidence-directory
```

The default OAuth flow displays a Docker sign-in link. Authentication is handled by the SDK and held in memory for this process; Docker CLI login is separate. For unattended use, `--auth=pat` reads `DOCKER_ID` and `DOCKER_PAT` from the environment. Supply them through your secret store. Do not put credential values in command arguments, files, reports, or GitHub issue text. No model-provider credential is needed. The runner rejects SDK endpoint environment overrides before authentication.

One `medium` shell sandbox is requested with automatic deletion after 30 minutes. Execution is limited to 25 minutes, artifact collection to another minute, and explicit cleanup to another minute. Running it uses your Docker account's cloud resources. There is no automatic cloud run on a PR: CI only runs offline lifecycle tests, type checking, lint and shell syntax validation.

Inside the sandbox, the bootstrap creates an isolated worktree, installs dependencies with the frozen lockfile, builds/syncs artifacts without the Nx cache, and installs Chromium with its Linux dependencies. Node 24 is installed from the official checksum-verified distribution if needed. Host workspaces, credentials and secret files are not uploaded. The optional stored-secrets feature is omitted entirely when launching this workload.

## Evidence and failure handling

The CLI prints the local evidence directory. Keep these files together:

- `cloud-result.json`: requested commit, SDK version, accepted sandbox identity, process exit, browser validation and cleanup outcome.
- `bootstrap.log`: bounded streamed setup/build/browser output.
- `provenance.json`, `result.json`, `trace.json`, `replayed.png`: executed source/runtime, browser assertions, persisted four-step trace and replay screenshot.
- Consumer install, dev-server and production-build logs; available failure screenshots.

Success requires all eight named browser assertions, zero recorded application console/page/network errors, matching source/runtime provenance, the saved trace/screenshot, and confirmed deletion of the same sandbox UID. A zero process exit or closed connection alone cannot pass. The fixed evidence allowlist is limited to 4 MiB per file, 16 MiB total; streamed output is limited to 8 MiB. These limits fail the run rather than silently accepting incomplete evidence.

Cleanup runs after readiness, execution, artifact or validation failure with its own deadline, including cancellation with Ctrl-C. A same-name replacement with a different UID is never deleted. Both primary and cleanup failures are retained. `unknown_creation` means the launch response was lost before identity was obtained; `unconfirmed` means an accepted sandbox was not confirmed deleted. Inspect that run in Docker before starting another; the runner does not claim that client shutdown deleted a sandbox. A rejected validation request is recorded as `not_created`.

Reports and logs are private local evidence by default. Review them before sharing: the fixed public demo needs no credentials, but future application workloads may capture private UI data. This runner has no general-purpose secret scrubber and is not a boundary for arbitrary untrusted issue instructions.

## Verified cloud scope

On October 25, 2026, the actual SDK/service run completed in about two minutes on source `92e939a`: Node 24.22.1, npm 11.19.1, Chromium 156.0.8078.4, React 18.3.1 and Vite 7.3.7. All eight browser checks passed, all three application error collections were empty, evidence downloaded, and same-UID deletion was confirmed. This was one fresh controlled consumer, not an autonomous issue repair or a cloud framework matrix.

## Offline validation

These commands do not authenticate or allocate cloud resources:

```sh
pnpm exec tsx --test scripts/cloud/*.test.ts
pnpm exec tsc -p scripts/cloud/tsconfig.cloud.json
pnpm exec eslint scripts/cloud/*.ts --max-warnings=0
bash -n scripts/cloud/bootstrap.sh
```

The SDK is a private development dependency, pinned at 0.53.0. Its `undici` dependency is narrowly overridden to 6.29.1 to include the upstream security patch; it does not enter Domscribe's public package exports.

The next experiment is the [agent repair pilot](./cloud-agent-repair-pilot.md), with independent grading of the exported fix. Its local and cloud results are reported separately. GitHub issue ingestion, repository write credentials and opening fix PRs remain separate work.
