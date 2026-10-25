# Domscribe health maintenance

Repair confirmed installation and runtime defects, update compatible dependencies, and verify real installed artifacts before preparing version 0.6.1.

- [x] Reproduce missing runtime dependencies and isolated pnpm module resolution failures; declare dependencies and resolve injected modules from their owning packages while preserving a shared RuntimeManager.
- [x] Incorporate the Nuxt asynchronous runtime initialization fix with contributor credit and regression coverage.
- [x] Reproduce stale React state on alternating commits; resolve the committed fiber, including shared-child bailouts and inserted fragments.
- [x] Update compatible dependencies and scoped transitive overrides; avoid auto-installing consuming framework peers in the library workspace.
- [x] Check emitted JavaScript and declarations for undeclared dependencies, accidentally emitted test helpers, and unresolved workspace protocols.
- [x] Add installed npm/pnpm React/Vue regressions for Vite 5 and 7, scheduled CI, and dependency update automation.
- [x] Run the configured source checks: 2,078 tests across 113 files, lint, build, and typecheck passed on Node 24 / pnpm 9.12.0. Fixture harness lint also passed (existing warnings remain). Workspace audit reports zero vulnerabilities.
- [x] Run eight framework integration fixtures: 184 passed with 16 expected skips. Both Vue browser suites passed.
- [ ] Finish broader framework browser verification against synchronized local registry artifacts.
- [ ] Run remote CI, integrate through repository rules, publish through the existing release workflow, and verify public registry installs.

Original working trees and unpublished assets are preserved. Local test artifacts are disposable; successful source checks alone do not establish that a public npm release works.
