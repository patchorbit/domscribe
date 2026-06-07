# Styling-annotation falsifier (RFC 0001)

This directory is the measurement instrument for sprint 2734's thesis:

> ≥70% agent one-shot styling-completion rate on `@domscribe/test-fixtures`
> by sprint 2734+6.

It is **not** a product feature. It is the rig that lets us answer "did
the agent's edit actually produce the right pixels" in CI.

## Layout

```
styling/
  tailwind-app/         # Tailwind v3 + Vite React fixture (annotations A001–A005)
  styled-app/           # styled-components + Vite React fixture (annotations A101–A105)
  annotations.json      # the 10 styling annotations the falsifier grades against
  baselines/            # canonical-after PNGs (per fixture/per id)
  scripts/falsifier.ts  # Playwright + pixelmatch harness
```

Each annotation component has two exports — `Foo` (the as-shipped, broken
state) and `FooFixed` (the canonical correct state). The fixture App
exposes them as `#A001/before` and `#A001/after` hash routes.

## Why two states per component?

The falsifier's job is to grade an agent edit. To do that it needs a
known-correct rendering to diff against. By committing both states in
source, we get:

1. A reproducible baseline (no "what did this render last week?" drift).
2. A clean grading signal — pixel-diff against `/after` is a binary
   pass/fail.
3. A self-test that proves the harness mechanism works
   independently of any agent.

## Running

```bash
# CI default — verifies the mechanism (should be 100% pass).
pnpm test:falsifier

# Re-record baselines after editing an /after route.
pnpm test:falsifier:record

# Grade an external agent's output directory.
pnpm test:falsifier -- --mode=measure --agent-output=/path/to/agent/png/dir
```

The harness writes one JSON object to stdout:

```json
{
  "mode": "self-test",
  "total": 10,
  "passes": 10,
  "fails": 0,
  "oneShotRate": 1.0,
  "annotations": [
    {
      "id": "A001",
      "fixture": "tailwind",
      "passed": true,
      "pixelDiffRatio": 0,
      "diffPixels": 0
    }
  ]
}
```

Exit code is non-zero when `fails > 0`, except in `--mode=record` which
always exits 0.

## Determinism

Pixel-diff stability requires removing every source of jitter. We:

- Disable animations and transitions globally via `index.html`.
- Lock viewport, scale, locale, timezone, and reduced-motion in Playwright.
- Use deterministic asset filenames in the Vite output.
- Force the default system font stack on `body` (no remote fonts).
- Set `caret: 'hide'` and `animations: 'disabled'` on every screenshot.

We allow up to 0.5% pixel-diff to absorb sub-pixel AA jitter on text. The
canonical-after path normally diffs at 0 — the floor exists for CI worker
quirks, not as license for "close enough" agent edits.

## Adding a new annotation

1. Add a component pair `FooAnnX / FooAnnXFixed` under
   `<fixture>-app/src/components/`.
2. Register a `before`/`after` route in `<fixture>-app/src/App.tsx`.
3. Add an entry to `annotations.json` with the source location and intent.
4. Run `pnpm test:falsifier:record` to update the baseline.
5. Run `pnpm test:falsifier` and confirm the new entry passes.

## What this harness deliberately does NOT do

- It does not invoke an agent. The agent-integration loop is built on
  top of this — see `--mode=measure`.
- It does not assert on `componentStyles` or `styleSource` output. Those
  are runtime-capture concerns (validated in `@domscribe/runtime` and
  `@domscribe/relay` unit tests). The falsifier asks one question only:
  "do the after-state pixels match the baseline".

## Task A dependency note

The corpus references `styleSource` shape in the intent text only as
forward-context for the agent. The falsifier itself does not require
`styleSource` to be populated; it grades on pixels. Once Task A's
build-time `styleSource` lands, the agent-side prompts can lean on it
without any harness change.
