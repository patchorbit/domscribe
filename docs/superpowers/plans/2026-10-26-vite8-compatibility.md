# Vite8 Consumer Compatibility Plan

Execute inline with test-driven development and one fresh independent whole-branch review.

Goal: remove a confirmed clean-install blocker for React/Vue Vite8 users, with evidence of current source/runtime/replay functionality and production stripping before expanding peer support.

RED evidence: upstream Vue TodoMVC ff43b02 frozen npm install succeeds on Vite8.0.10; adding Domscribe fails ERESOLVE because adapter and transform peers allow only5–7. Repository replay CLI also refuses Vite8 before setup. A harness-only snapshot expanding peers passed actual TodoMVC source/runtime, fresh-session intended-task replay, edited-identity retirement and production checks; this is experimental evidence, not product support or an unmodified install.

- [x] Expand only react/vue/transform Vite peers to include ^8.0.0; no workspace bundler upgrade or lockfile change.
- [x] Extend replay harness to accept exact8 releases and select matching official React6/Vue6 plugins; preserve older-version paths.
- [x] Fresh npm/pnpm minimal consumers via isolated local registry: adapter/framework/Vite only, no transitive-dependency overrides or force/legacy flags. Exercise React and Vue at8.0.10/8.3.5 boundaries.
- [x] Fresh React and Vue Vite8 browser consumers: instrumentation/source/runtime identity, live state, persisted exact-instance replay, correct business entity, safe negatives, zero app errors and functional uninstrumented production.
- [x] Repeat actual upstream TodoMVC with unmodified Vite8 dependency lock and product artifacts (no patched manifests/pin), plus clean frozen reinstall. Record harness plugin/hook only, no app component changes.
- [x] Add representative clean-install and browser CI8 cases, document actual limits/Node requirement and qualification. Existing5/7 and Next/Nuxt coverage remains.
- [ ] Run configured affected checks and meaningful full suite; independently review/fix findings; rebase onto merged parent81 without changing tested tree, push focused PR, latest-head CI then standing-authorized merge.

Review focus: all transitive peer ranges allow8 without force; React6 optional compiler peers do not mask missing basic dependencies; Vite8 Rolldown virtual modules serve one shared runtime; older5/7 behavior unchanged; TypeScript consumer public declarations remain usable. This is source compatibility, not automatic package publication. Parent81 is still in CI; do not merge a stacked diff before its base is current main.
