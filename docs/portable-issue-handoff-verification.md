# Portable issue handoff verification — October 27, 2026

The hypothesis is that a useful UI bug handoff preserves the selected instance, source anchor, expected/observed behavior and setup requirements across people and sessions. This slice removes manual annotation JSON/path rewriting. It does not establish demand or an advantage over a complete browser/source agent.

The `issue export` and `issue inspect` commands are source/local-build features, absent from published npm 0.7.0. See [the usage guide](./portable-issue-handoff.md).

## Fresh acceptance

Both paths installed locally packed artifacts in isolated consumers. The pnpm path used explicit local-tarball overrides; these are not unmodified registry installs. Node 24.22.1 and Chromium 156.0.8078.4 were used.

| Path                                    | Native capture and transfer                                                                                                                                                                                 | Source evidence                                                                                                                        | Other browser assertions                                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 18.3.1 / Vite 7.3.7 / npm 11.19.1 | Overlay-selected Orion editor Save annotation exported through the installed CLI; reporter browser and relay stopped; unchanged packet inspected offline in a separate source Git worktree; zero JSON edits | `src/main.jsx:6:458`, original source hash `1bdb30697bf58a2d`; identical checkout matched; modified receiving source reported changed  | Wrong-customer locator refused; stale/ambiguous targets refused; fresh-context reordered-row replay updated the intended customer; production instrumentation absent; zero app page/console/network errors |
| Vue 3.5.44 / Vite 8.3.5 / pnpm 9.12.0   | Same native export/offline transfer flow, adapter-only installation with no top-level runtime/overlay dependency                                                                                            | `src/Editor.vue:13:5`, original source hash `60427786f5442eb8`; identical checkout matched; modified receiving source reported changed | Same assertions, plus recycled action-node identity retirement; production customer update correct; zero app page/console/network errors                                                                   |

These are controlled customer-editor fixtures. The annotation records an explicit acceptance scenario; it is not evidence of discovering or repairing a real customer bug. Packet integrity was checked before/after transfer, and inspection created no relay state in the receiving checkout. Captured automation durations are fixture-operation timings, not human usability or repair measurements. The headless browser driver exercised native UI controls; it did not inject a fabricated annotation.

## Repeatable browser check

The permanent browser harness now supports `--issue-handoff`. CI enables it on its existing React/npm/Vite7 and Vue/pnpm/Vite5 rows. Both exact configurations passed freshly with local artifacts (12 and 14 assertion groups respectively), including Vue's raw-runtime capture option. Build/synchronize first, then pack/test without concurrent builds:

```sh
NX_DAEMON=false NX_NO_CLOUD=true pnpm exec nx run-many -t sync-dist --parallel=2
node scripts/verify-instance-replay.mjs --framework=react --package-manager=npm \
  --vite-version=7.3.7 --schema-peer --issue-handoff --report-dir=./tmp/issue-react
node scripts/verify-instance-replay.mjs --framework=vue --package-manager=pnpm \
  --vite-version=5.4.21 --scope=list --schema-peer --adapter-only --raw-runtime \
  --issue-handoff --report-dir=./tmp/issue-vue
```

The report includes the native annotation, exported packet, screenshots and CLI inspection logs. An initial permanent-harness attempt correctly refused unsynchronized artifacts restored by a preceding Nx task check; synchronization was rerun before packing. The earlier Vue8 result remains a separate qualification, not a substitute for the permanent Vue5 path.

A separate compatibility check used the actual historical native Hoppscotch Generate Token annotation from the October 26 run (upstream `63273f8`). The new installed CLI exported it with no packet edits or annotation-record mutations, retained `context_required`, and inspected it offline in a fresh source worktree as `unverified` because the legacy capture lacks original-source metadata. Synthetic private client/environment markers were absent. This was a historical-annotation check, not a fresh Hoppscotch browser or agent repair run.

## Failures that changed the implementation

- Initial React capture incorrectly compared transformed React Refresh code with the original source. A probe confirmed 3,722 incoming characters versus 1,766 original-source characters. A distinct optional `sourceHash` now comes only from an exact absolute source-map match. Legacy or unconfirmed hashes remain unverified. Source locations were correct; checksum provenance was wrong.
- Existing-ID manifest deduplication discarded the new original-source metadata. Real-file regressions now verify a one-time metadata upgrade, restart persistence, last-record mapping and no inherited hash when the latest record omitted it.
- Independent review found private dictionary keys escaping value-only redaction, already-redacted locators advertised as actionable, validation errors echoing private field names, and a valid large Markdown payload overflowing an argument list. Each was reproduced by a failing regression before its fix; re-review found no remaining material findings.
- The first CLI build exposed optional relay-lock host typing; an explicit readiness guard fixed it. Invalid test invocations and malformed test fixture IDs were setup failures, not product regressions.

## Configured checks

From the repository root, uncached:

```sh
NX_DAEMON=false NX_NO_CLOUD=true pnpm exec nx run-many \
  -t lint,test,build,typecheck --exclude domscribe-test-fixtures \
  --parallel=2 --skipNxCache --output-style=stream
```

All configured targets passed across 16 projects: 2,223 unit tests. After two further source-hash cache regressions and their fix, the complete manifest lint/test/build/typecheck targets passed uncached with 180 tests. All four affected projects were checked again before task completion. New tests contain non-null assertion lint warnings; no lint errors. Existing fixture warning remains.

After sequential artifact synchronization, `node scripts/check-dist-dependencies.mjs` passed all 497 emitted runtime/declaration files. Artifact packaging began only after building/synchronization ended. The fresh native subprocess/browser flows above then passed on these artifacts. Full-suite and affected logs preserve failed attempts as well as passing results.

## Limits and next experiment

Source matching checks content consistency, not report authenticity, business identity or fix correctness. Runtime and recorded replay are opt-in; known-marker filtering is not a universal detector of opaque application secrets. Main-document/light-DOM replay, explicit app prerequisites and stable dialog business context still apply. This slice's original-source metadata is qualified through Vite; integrations without a confirmed original source remain unverified. New CLI paths were not freshly qualified on Next/Nuxt in this slice.

Next, use the native packet on a real application bug with a fresh receiving agent and no hand-edited context. Compare against a complete ordinary browser/source workflow, count capture/setup separately, and grade business behavior independently. The previous larger Hoppscotch comparison had all four repairs pass and showed no correctness advantage; this slice does not change that result. Managed orchestration remains an unproven expansion.
