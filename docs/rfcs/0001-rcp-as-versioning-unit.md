# RFC 0001: Extract the agent-facing contract into `@domscribe/protocol` as the versioning unit for RCP v1

**Status:** Proposed
**Author:** Principal Eng (sprint 2371)
**Date:** 2026-05-28

## Context

The DOP memo (sprint 2371) commits Domscribe to the "neutral bridge" category by publishing a **Runtime Context Protocol (RCP)** that IDE vendors integrate against, rather than competing as another AI IDE. That commits _engineering_ to a question the memo does not answer: **what, concretely, is RCP — and how do we ship it so that IDE-vendor relations have something to point at?**

Today the agent-facing surface is scattered. The MCP server in `@domscribe/relay` exposes 12 tools and 4 prompts. The wire schemas for `ManifestEntry`, `RuntimeContext`, and `Annotation` live in `@domscribe/core` alongside unrelated utilities (error system, PII redaction, ID generation). Tool naming is already inconsistent — `README.md` advertises dotted names like `domscribe.query.bySource` while `TECHNICAL_SPEC.md` §3.4 still lists dashed names like `annotation-get`. There is no stability policy and no SemVer commitment on either. We need this decision _now_ because every week we delay, more downstream code (skill files, plugin marketplaces, the `npx domscribe init` wizard) hardens around names we will have to break.

## Decision

We extract the agent-facing contract — MCP tool & prompt surface, plus the wire schemas (`ManifestEntry`, `RuntimeContext`, `Annotation`, error envelopes) — into a new package `@domscribe/protocol`, version it independently from the implementation packages, and publish RCP v1.0.0 against it with an explicit stability policy. `@domscribe/core` keeps utilities and shrinks; relay/runtime/mcp depend on `@domscribe/protocol` for shapes and names.

## Alternatives considered

**Alt A — Treat the existing `@domscribe/core` schemas + the MCP server as "the protocol" and add a `docs/rcp/v1.md` page on top.** This is the cheapest path. The tradeoff: protocol version becomes coupled to `@domscribe/core`'s version, so any internal refactor of error utilities or ID helpers triggers a protocol bump — meaning the SemVer stamp is meaningless, which means IDE vendors have no real signal of stability and will reasonably treat us as "a tool with docs," not a protocol. The stability stamp is exactly the asset we are trying to create.

**Alt B — Define RCP as a transport-neutral abstract spec (`docs/rcp/v1.md`) with bindings: MCP binding, gRPC binding, JSON-RPC binding.** This is what real standards bodies do. The tradeoff: we are one team shipping the only implementation; "transport-neutral with bindings" is a 6-month yak-shave that produces a beautiful spec and zero adoption. The MCP binding is the only one that matters in 2026 because every target IDE (Cursor, Claude Code, Cline, Continue, Codex) already speaks it. Premature abstraction.

## The strongest counter-argument

"Don't publish a v1 protocol off a v0.5 product. Until a non-author implements RCP, you're documenting your own API and calling it a protocol — and you'll be stuck with v1's mistakes." This is the strongest "no," and it's right that the standards literature is full of v1s frozen too early. The reason it still loses: the entire bet of the sprint is that IDE-vendor relations won't engage with "our API surface" but will engage with "the protocol." Publishing v1 is the precipitating action that _generates_ the integration energy DOP's falsifier measures. Waiting for an external implementation before publishing means waiting forever — nobody will implement an unstamped contract. The cost of v1-mistake lock-in is bounded (we ship v1.1 with additive fields; we ship v2 with a deprecation window), and is structurally smaller than the cost of six more months of competing with Stagewise on positioning instead of on category.

## Blast radius — high

Shares fate with this change: every shipped IDE plugin (Claude Code, Copilot, Cursor, Gemini, Kiro), the `npx domscribe init` wizard's MCP config, the `skills/` content, the `gemini-extension.json`, the README's tool table, every fixture in `domscribe-test-fixtures`, and every downstream user's `.mcp.json`. Tool-name normalization in particular will break existing plugin configs unless we ship aliases through the migration window. The package extraction also re-shapes the dependency graph documented in `TECHNICAL_SPEC.md` §2.3 — `scope:core` no longer owns the wire shapes.

## Reversibility

- **Within 2 weeks of publish:** Roll `@domscribe/protocol` back into `@domscribe/core`, un-stamp v1, retract the spec page. Tool renames already shipped require aliases on the old names indefinitely. Cost: a sprint.
- **At 3 months:** The protocol stamp is itself the wedge — pulling it back is a public admission that RCP was marketing, not engineering. Cost: category-positioning credibility, which is most of what the sprint was buying. Not truly reversible.

## Falsifier

By **2026-08-20** (sprint N+6), `@domscribe/protocol@1.0.0` is published with a stability-policy doc, **and** at least one of: (a) an IDE-vendor doc links to the RCP spec, (b) ≥1 npm package not authored by Patch Orbit declares `@domscribe/protocol` as a dependency, (c) ≥10 weekly-active relay sessions reported via opt-in telemetry. **Zero of three → we collapse `@domscribe/protocol` back into `@domscribe/core` in the following sprint and recategorize Domscribe as a tool with stable APIs.**

## Implications for PM

Four sprint workstreams fall out, in this order:

1. **Extract `@domscribe/protocol` package** (Zod schemas relocate from `@domscribe/core`; `relay`/`runtime`/`mcp` depend on it). Blocks everything else.
2. **Normalize MCP tool names against a single grammar** before stamping v1. Per the spec note in this team's memory, MCP SEP-986 permits dots up to 128 chars, but Windsurf enforces stricter rules — staff engineers decide between dotted and underscore form, but must canonicalize one and ship aliases for the legacy names through one minor cycle.
3. **Opt-in telemetry hook in the relay daemon** — single periodic POST of an anonymous session count, gated on a flag in `.domscribe/config.json`, defaulting off. This is the only way to measure DOP-falsifier (c); without it, the bet is unmeasurable, so it must land in this sprint.
4. **Publish `docs/rcp/v1.md`** with explicit stability policy: which fields are stable, which are experimental, how deprecations work.

**Explicitly out of scope for this RFC:** extracting `FrameworkAdapter` into a public adapter SDK. The DOP memo bundles that with RCP, but they are different bets — RCP is the agent-facing protocol; `FrameworkAdapter` is an internal extension point. Lifting it to a public SDK is real work and worth doing, but it does not constrain the protocol decision and should not gate v1. A follow-on RFC will own that question once the protocol package exists.

**Out of scope: `docs/architecture.md`.** The principal-eng verifier checklist references a "seven decisions" architecture doc that does not exist in this repo. This RFC stands up `docs/rfcs/` as the canonical decision record going forward; the architecture doc itself is a separate follow-on.
