# Reliable instance selection and portable replay

The October 25 pilot showed that one source ID can represent several rendered elements, while a document-local handle cannot identify an element after reload. Build the foundations that let agents select an exact instance, retain a portable target, and replay UI steps through their existing browser driver.

## Contract

- Preserve existing source IDs as build-time identities. Expose document-scoped instance handles and strict browser selectors separately. Handles survive DOM moves, fail after removal or identity changes, and never silently bind to another instance.
- Source-only runtime queries return all eligible instance descriptors and an explicit ambiguous result when multiple elements match. Context is captured only for a uniquely resolved element. Multiple connected browser clients are an explicit ambiguity for new target queries.
- A versioned portable locator contains a pathname, element tag, bounded identity attributes/text and bounded identified ancestor scopes. Exclude form values and positional selectors. Apply configured privacy/block rules. Locators match all recorded identity constraints; zero or several matches stop resolution. Cross-route resolution stops; it does not navigate automatically. Unsupported frame/shadow-root targets fail explicitly.
- Capture both the instance and portable locator in new annotations. Reopening/locating an annotation uses its portable locator and refuses ambiguity. Legacy annotations retain a unique-only fallback; never select the first duplicate source ID.
- Export versioned click/fill/check/select replay steps and a sequential browser-driver interface. Resolve the portable target fresh before each step. The browser driver performs real UI actions; runtime code does not invoke React handlers or mutate framework state. Stop on the first unresolved target or browser-action failure. Explicit recording refuses password/file inputs and redacted values; no automatic event recorder or credential capture.
- Agent-facing HTTP/MCP target query supports listing, exact handle resolution and portable resolution. Existing source query accepts an optional handle or locator and forwards instance/ambiguity information.
- No new runtime dependencies, package version bumps, publishing, deployment or GitHub Action. Existing user working trees and lockfiles remain unchanged. This work stays on a local feature branch.

## Verification

Use real DOM tests for repeated source elements, sorting, sibling removal, attribute changes, detached/recycled targets, reload and privacy boundaries. Test replay stopping on missing/ambiguous targets and driver errors. Verify actual relay serialization and MCP schemas. Build/install local artifacts in an isolated React/Vite consumer; replay a recorded sequence in a fresh Chromium session and reject an ambiguous capture. Run configured unit, lint and build checks with bounded parallelism. Vue/Next integration beyond unchanged package suites is explicitly untested unless exercised.

## Decisions

The browser driver owns app startup, navigation, authentication, fixture data, waiting and assertions. Portable replay does not promise to reconstruct arbitrary backend state or infer intended behavior. Stable application labels/test IDs improve matching; insufficient identity produces ambiguity rather than a positional guess. The first implementation supports the main document's light DOM only. Strict instance selectors are transient development instrumentation and never initialize in production.
