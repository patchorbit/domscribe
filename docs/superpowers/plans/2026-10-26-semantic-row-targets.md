# Semantic Row Target Safety Implementation Plan

> Execute inline with superpowers:executing-plans; obtain one fresh independent review of the whole branch before delivery.

Goal: prevent an exact row-action handle from silently following a recycled business entity and allow portable replay of ordinary semantic rows without requiring added test IDs.

Diagnosis: at main bfb108d, table/list ancestors without identity attributes/headings are omitted. Changing a sibling invoice ID leaves the Retry button fingerprint unchanged. Fresh-session row actions are ambiguous. The new runtime regressions first failed in five cases (resolved instead of stale; ambiguous instead of resolved), while the original 568 runtime tests passed.

Scope: runtime target-registry identity/matching; runtime regressions; existing browser consumer harness extended with table/list variants; accurate usage/limitations and Sprint1 real-app acceptance matrix. No public schema, dependencies, framework adapters, release or deployment changes.

- [x] RED: retained invoice-row button must retire when sibling identity changes; reordered native/ARIA table/list locators must select the original business row in a fresh runtime.
- [x] GREEN: capture bounded privacy-filtered segmented semantic-row text in ancestor constraints and local fingerprints; use identical conjunctive matching, preserve segment boundaries and existing non-row locators.
- [x] Extend negative tests for duplicate rows, changed identity, private/editable descendants and over-limit row identity; test stable handle under moves.
- [x] Extend real-browser local-tarball consumer verification to semantic table/list rows, actual recycled DOM slots, fresh-session replay, correct business entity, source/runtime correspondence and production removal. Run representative React/Next and Vue/Nuxt cases; label fixtures versus actual apps honestly.
- [x] Establish at least three realistic acceptance workflows spanning maintained Next and an independent Vue app; document confirmed versus planned coverage.
- [ ] Run configured affected lint/test/build/typecheck uncached, broader configured suite before readiness, independent review, fix material findings with regressions, push focused PR, follow latest-head CI and merge with standing authority.

Review focus: no wrong-entity action under DOM reuse; no private/form values in row identity; duplicate/unsupported scopes stop safely; segment collisions do not retain a stale handle; old non-row locator behavior remains compatible. The existing four-ancestor/main-document/light-DOM boundaries remain explicit. Scope text changes can conservatively require recapture.

Review rulings: include all relevant ancestors in private local fingerprints and mark portable overflow unsupported instead of weakening prior business scope. Detect PII on contiguous/spaced filtered text before JSON segment serialization; retain raw local fingerprints. New regression tests first failed on the reviewed head. The initial fix shortened redacted long identity and changed unsupported to not_found; preserve raw-bound unsupported status before exporting redacted bounded identity. Original over-limit tests caught this and must stay green.
