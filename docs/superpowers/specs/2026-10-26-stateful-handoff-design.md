# Reliable stateful issue handoff

The user authorized fixing the three gaps demonstrated by the Hoppscotch
experiment. Product changes start from remote main b25ded2 in a fresh worktree,
not the research branch. Existing primary checkouts and benchmark patches stay
unchanged. Implementation, review, PR creation and merge after latest-head CI
are authorized; publishing and production deployment are separate.

## Outcomes

1. Vue/React Vite consumers using Zod3 alongside Domscribe's Zod4 initialize with
   their normal plugin configuration. Domscribe's injected runtime/overlay graph
   must retain its own schema dependency and a shared runtime singleton, including
   isolated pnpm installs. No global Zod alias/dedupe, user optimizer override,
   consumer lockfile rewrite, or production instrumentation.
2. A selected Vue control rendered through shared UI wrappers captures the
   component belonging to its manifest source, rather than silently treating
   generic anchor props as application context. Runtime metadata states the
   actual component and whether requested source ownership matched. Missing
   framework/source metadata preserves explicitly labeled nearest-component
   context, never a false claim of source ownership. Existing serialization,
   redaction, includeProps/includeState and block selectors remain effective.
3. A portable control locator in a dialog cannot silently resolve in another
   record's otherwise identical dialog. Require an explicit non-secret
   `data-ds-context` identity within each dialog scope; unknown context refuses
   with `unsupportedReason: context_required`. This is my fail-closed product
   choice, consistent with the user's safe-refusal goal. Live DOM inspection
   stays available; it does not assert business identity. Context keys changing
   on retained nodes invalidate live handles. Legacy locators lacking keys may
   not bypass the guard. Existing row/list semantics remain supported.

## Boundaries and design calls

- Reuse current schemas, adapter interface, bridge and relay/overlay APIs.
- Vite dependency handling belongs in plugins, discovered through actual
  installed package resolution; preserve configured includes/excludes and
  overlay-disabled operation. Qualify Vite7/8 and relevant Vite5 behavior.
- Add optional source-aware adapter resolution. Vue walks its component parent
  chain by exact normalized source path, bounded with cycle protection. Do not
  guess by basename, arbitrary props/state hashes, component names or positions.
  Frameworks without reliable owner metadata are explicitly labeled unavailable.
- Source context is obtained for the already selected live instance; revalidate
  after asynchronous manifest lookup so a retired selection never captures a
  replacement node's context. No tree-wide ancestor data dump.
- Explicit context attributes are bounded/redacted by existing locator privacy
  rules. Never automatically put input values or credentials into identity.
  Native dialogs, ARIA dialogs/alertdialogs and nested dialogs require coverage.
- Keep DOM resolution distinct from proof of business behavior. Safe refusal on
  unmodified Hoppscotch is an acceptable fix; adding keys to a test fixture is
  opt-in demonstration, not a claim of automatic business-key discovery.

## Acceptance

Meaningful RED→GREEN tests cover mixed-schema initialization, source ownership
through nested/teleported wrappers, owner unavailable/duplicate basename/cycle,
privacy/bounds/selection races, wrong-record dialog, old unguarded locator,
retained node context change, nested/empty/redacted context and ordinary rows.
Run affected configured Nx unit/lint/build/typecheck and an uncached broader
suite before readiness. Fresh local-artifact npm/pnpm browser consumers must
verify connected relay, useful selected-owner props, wrong-context refusal,
correct-context business action, and production stripping. Re-run the original
Hoppscotch capture with optimizer overrides removed; record failures as well as
successes. Independent design/implementation review resolves material findings.
Do not rerun the four agent repair trials until these foundations pass.

## Builder-check resolutions

- Each dialog scope uses a key on that dialog or the selected element's ancestor
  path inside it, never a sibling or a key borrowed across a nested-dialog
  boundary. Portable locators carry ordered per-dialog context keys and compare
  the complete current dialog chain one-to-one. Legacy requests without this
  evidence refuse, even when today's candidate now has a key. Targeting a
  dialog itself follows the same rule.
- Source matching shares an exact normalized absolute-path namespace; supported
  file/Vite URL forms and separators may normalize, but relative paths without
  a trustworthy root conversion cannot match by suffix/basename.
- Initialization tests cover cold first load and an optimizer restart, not merely
  success after a manual reload. Preserve the app's own Zod3 parse behavior.

## Initialization ruling after reproduction

The fresh isolated-pnpm browser test reproduces an application Zod3 parser
working while shared Domscribe schema evaluation throws `z.partialRecord`.
The minimal schema-boundary fix uses explicit `zod/v4` imports for core schemas
and the browser-safe relay schema. These construct Domscribe's own Classic
schemas; they do not accept user Mini schemas. Keep the declared Zod4 dependency
without changing the application's Zod or adding consumer overrides. A second,
independently reproduced Vite8 problem split RuntimeManager between raw and
optimized adapter imports. React/Vue Vite plugins now predeclare their injected
adapter/runtime/overlay graph through nested package resolution. They preserve
explicit consumer exclusions; Nuxt's raw-runtime configuration is unchanged.
These solve separate schema-major and module-identity failures. Node imports of
Zod4 root/classic remain compatible; prove browser and full-suite behavior.
