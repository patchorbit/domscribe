# RFC 0002: Ratify RCP v1 — `snake_case` canonical grammar, locked package boundary, opt-in telemetry, source-position as differentiator

**Status:** Proposed
**Author:** Principal Eng (sprint 2491)
**Date:** 2026-05-29
**Relationship to RFC 0001:** Ratifies RFC 0001 as Accepted; resolves the three deferrals (tool-name grammar, telemetry shape, protocol-boundary specifics) it left to staff engineers; adds a new architectural constraint reflecting the post–Google I/O 2026 landscape.

## Context

RFC 0001 (sprint 2371) committed to extracting the agent-facing contract into `@domscribe/protocol` and stamping RCP v1.0.0, but left three load-bearing questions open: canonical tool-name grammar, telemetry shape, and the precise contents of the new package. Sprint 2491's DOP memo (2026-05-29) tightens the deadline — Google I/O 2026 (2026-05-19) shipped WebMCP as an open standard for browser-resident agent channels and rolled Chrome DevTools MCP into mainline Chrome. Both put runtime-only MCPs in front of the IDE-vendor mental model. If Domscribe ratifies RCP v1 inside the next two weeks, it lands as "the build-time, framework-aware complement"; if it ships in August, it lands as "a fourth runtime MCP."

The execution risk RFC 0001 named has also crystallized in the code. `packages/domscribe-relay/src/mcp/tools/tool.defs.ts` already registers 13 dotted tool names with mixed camelCase suffixes (`domscribe.annotation.updateStatus`, `domscribe.query.bySource`); the README documents these forms; the tool source files use dashes (`annotation-update-status.tool.ts`). Three conventions in one surface, before v1.

## Decision

We make four commitments, ordered by reversibility cost.

**(1) Canonical MCP tool grammar is `snake_case`** (e.g. `domscribe_annotation_update_status`, `domscribe_query_by_source`). The current dotted forms ship as compatibility aliases registered alongside the canonical names through `@domscribe/protocol@1.x`; they emit a deprecation log line on call and are removed at v2. The `MCP_TOOLS` constant in `tool.defs.ts` becomes `{ canonical: string, aliases: string[] }` per tool — single source of truth, no scattered string literals.

**(2) `@domscribe/protocol` contains exactly:** wire Zod schemas (`Annotation`, `AnnotationInteraction`, `AnnotationContext`, `RuntimeContext`, `ManifestEntry`, `SourcePosition`, `StyleInfo`, `ComponentMetadata`), the `DomscribeErrorCode` enum, the `MCP_TOOLS` constant + per-tool input/output schemas, the RFC 7807 problem-details envelope shape, and the `WS_EVENTS` constant — nothing else. Runtime classes (`DomscribeError`, ID generators, `migrateAnnotation`) stay in `@domscribe/core`. The protocol package has zero runtime dependencies beyond `zod`.

**(3) `SourcePosition` is a required (non-optional) field on the output schemas of every `resolve_*` and `query_*` tool.** This is a protocol-level enforcement of the build-time-AST differentiation against WebMCP and Chrome DevTools MCP — both can return DOM state, neither can return `{ file, line, column }`. Encoding it in the schema means an alternative implementation that omits it is not RCP-conformant by construction.

**(4) Telemetry is a single fire-and-forget HTTPS POST** from `@domscribe/relay` to `https://telemetry.domscribe.dev/v1/session` at relay startup and every 24h while running. Payload: `{ protocol_version, daemon_version, session_id (rotating per install), platform, node_version, primary_framework }` — never annotation content, manifest content, source paths, or file contents. Gated on `.domscribe/config.json` → `telemetry.enabled` (default `false`); `npx domscribe init` surfaces a yes/no prompt with the full payload shown inline. POST has a 2-second timeout and never blocks startup.

## Alternatives considered

**Keep dotted names as canonical, no rename.** Cheapest, preserves the README, ships v1 fastest. The tradeoff: Windsurf's stricter validator (`^[a-zA-Z0-9_-]{1,64}$`) silently drops dotted tools — meaning the v1 stamp would launch broken for one of the IDE vendors we are explicitly courting — and the broader MCP-server ecosystem (Anthropic's first-party servers, most community servers) is overwhelmingly `snake_case`. We would publish a v1 that looks foreign next to every reference implementation an IDE-vendor partnerships engineer reads. This is not a spec-compliance argument — SEP-986 permits dots up to 128 chars — it is an ecosystem-LCD argument.

**Include the runtime `DomscribeError` class and ID generators in `@domscribe/protocol`.** Tighter co-location, fewer cross-package imports. The tradeoff: every internal refactor of error construction or ID alphabets would trigger a protocol bump, gutting the SemVer signal RFC 0001 paid to create. The wire envelope and the runtime class are distinct objects; only the envelope must be SemVer-stable.

## The strongest counter-argument

"Renaming 13 tools the same week you stamp v1 is exactly the mistake RFC 0001 warned about — you are freezing a churned surface." It is a real concern, and the standards literature is full of v1s frozen too early. It still loses because aliases through v1.x give the migration window the warning was about; the alternative is freezing the _current_ inconsistent surface, which is strictly worse than freezing a normalized one with a one-minor-cycle alias bridge. The RFC 0001 caution was against freezing without a deprecation channel, not against renaming with one.

## Blast radius — high

Shares fate: `@domscribe/relay` MCP server, `@domscribe/core` (schemas relocate out — `scope:core` no longer owns wire shapes), `@domscribe/mcp` stdio proxy, every shipped IDE plugin config (Claude Code, Copilot, Cursor, Gemini, Kiro, Cline, Continue, Codex), `gemini-extension.json`, `skills/` content, README §3 tool table, `TECHNICAL_SPEC.md` §2.3 (dependency graph) and §3.4 (tool list), every fixture in `domscribe-test-fixtures`, every downstream user's `.mcp.json`. New infrastructure: the telemetry endpoint (Cloudflare Worker + KV counter, projected <$1/mo at current scale); its failure must not block relay startup.

## Reversibility

- **Within 2 weeks of publish:** Roll `@domscribe/protocol` back into `@domscribe/core`, retract the v1 tag and the stability-policy doc, keep dotted-name aliases as the canonical form. Telemetry endpoint can be torn down by retracting the `.config.json` flag. Cost: ~1 sprint plus a public retraction post.
- **At 3 months:** Tool-name rename is reversible only by re-promoting dotted names to canonical and demoting `snake_case` to alias — possible but costs the credibility the v1 stamp bought. Package extraction is not reversible at this horizon; downstream consumers have already adopted `@domscribe/protocol` imports. Telemetry data already collected is retained or purged per stated policy.

## Falsifier

By **2026-06-12** (sprint 2491 close), all of: `@domscribe/protocol@1.0.0` published to npm with `docs/rcp/v1.md` stability policy; all 13 canonical `snake_case` tool names registered with dotted aliases functional and tested; telemetry endpoint live and receiving ≥1 real session from a non-author install. **Any of three slipping → escalate to Kaushik before re-cutting v1.** Partial v1 (e.g., schemas extracted but tool-name rename deferred) is strictly worse than a one-sprint slip — it ships the stability stamp on an unstable surface. (Inherited from RFC 0001: by 2026-08-20, at least one of: IDE-vendor doc references RCP, ≥1 non–Patch-Orbit npm package depends on `@domscribe/protocol`, ≥10 weekly-active relay sessions via telemetry. Zero → collapse the package.)

## Implications for PM

Four workstreams, ordered by blocking dependency: **(1)** stand up `@domscribe/protocol` package with the boundary above (Zod schemas + `MCP_TOOLS` + error code enum + RFC 7807 envelope + `WS_EVENTS`); migrate `@domscribe/core`, `@domscribe/relay`, `@domscribe/runtime`, `@domscribe/mcp` to import from it; update `scope:core` and `nx` boundary tags. **(2)** Refactor `MCP_TOOLS` to `{ canonical, aliases }` shape, register both names with the MCP SDK, emit a deprecation log on alias hit, and gate tool registration through a single helper. **(3)** Make `SourcePosition` required on `resolve_*` / `query_*` output schemas — existing tests must fail until the relay emits it, then pass. **(4)** Add telemetry POST to relay startup + 24h interval, `.domscribe/config.json` schema for the `telemetry` block, `npx domscribe init` yes/no prompt with payload inline. README, `TECHNICAL_SPEC.md` §2.3 and §3.4, `gemini-extension.json`, and `skills/` content update in parallel as docs PRs.

**Explicitly out of scope (deferred to follow-on RFCs):** `FrameworkAdapter` public SDK extraction (different bet, different surface); a transport-neutral RCP abstract spec with non-MCP bindings (premature per RFC 0001 §Alt B and unchanged by I/O 2026); `docs/architecture.md` "seven decisions" doc (known gap; RFCs remain the canonical decision record). RFC 0001's status should be moved from Proposed to Accepted as part of this sprint's docs PR.
