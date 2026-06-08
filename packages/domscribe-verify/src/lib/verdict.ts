/**
 * Verdict derivation — combines pixel diff, computed-style delta, and
 * boundingRect delta into a single `VerifyVerdict`.
 *
 * The semantics map directly to RFC 0002 §Decision:
 *   no_change   — every axis says the post-edit capture is indistinguishable
 *                 from the baseline (the agent's edit did not land in the
 *                 rendered output)
 *   match       — pixel diff within tolerance AND no style/rect deltas
 *   partial     — at least one axis says "changed" AND at least one axis
 *                 says "matched"; the agent should reconcile what landed
 *                 against intent
 *   regression  — every axis says "changed" by more than tolerance with no
 *                 indication of progress (reserved for the strictest case;
 *                 v1 conservatively only emits this when ALL three axes
 *                 disagree with the baseline — the agent shifted output but
 *                 not toward the intent)
 *
 * @module @domscribe/verify/verdict
 */

import type { VerifyVerdict } from '@domscribe/core';
import type { PixelDiffResult } from './pixel-diff.js';
import type { BoundingRectDelta, ComponentStylesDelta } from '@domscribe/core';

export interface VerdictInputs {
  pixelDiff: PixelDiffResult;
  componentStylesDelta: ComponentStylesDelta;
  boundingRectDelta: BoundingRectDelta;
}

/**
 * Three-axis decision. Each axis answers a different question:
 *   pixel diff     → did the rendered output change visually?
 *   style delta    → did the computed CSS change?
 *   rect delta     → did the layout box change?
 *
 * "Match" means within tolerance / no entries. "Change" is the complement.
 */
function axisVerdicts(inputs: VerdictInputs): {
  pixelChanged: boolean;
  stylesChanged: boolean;
  rectChanged: boolean;
} {
  return {
    pixelChanged: !inputs.pixelDiff.withinTolerance,
    stylesChanged: Object.keys(inputs.componentStylesDelta).length > 0,
    rectChanged: Object.keys(inputs.boundingRectDelta).length > 0,
  };
}

export function deriveVerdict(inputs: VerdictInputs): VerifyVerdict {
  const { pixelChanged, stylesChanged, rectChanged } = axisVerdicts(inputs);

  const anyChanged = pixelChanged || stylesChanged || rectChanged;
  const allChanged = pixelChanged && stylesChanged && rectChanged;

  if (!anyChanged) {
    // Truly indistinguishable — the agent's edit did not surface in the
    // captured output. We emit `no_change` rather than `match` so the
    // agent does not treat a no-op as a success on retry.
    return 'no_change';
  }

  if (allChanged) {
    return 'regression';
  }

  // Mixed signal — some axes match, some changed. The agent's
  // reconciliation hint lives in the deltas themselves.
  return 'partial';
}

/**
 * Compose the human-readable `reason` field for a VerifyResult. Concise so
 * it can be inlined into an agent retry prompt without blowing the budget.
 */
export function composeReason(
  verdict: VerifyVerdict,
  inputs: VerdictInputs,
): string | undefined {
  if (verdict === 'no_change') {
    return 'Post-edit capture is indistinguishable from the pre-edit baseline on every measured axis. The agent edit likely did not land in the rendered output.';
  }
  const fragments: string[] = [];
  if (inputs.pixelDiff.pixelDiffRatio > 0) {
    fragments.push(
      `pixel-diff ${(inputs.pixelDiff.pixelDiffRatio * 100).toFixed(3)}%`,
    );
  }
  const styleCount = Object.keys(inputs.componentStylesDelta).length;
  if (styleCount > 0) {
    fragments.push(
      `${styleCount} CSS ${styleCount === 1 ? 'property' : 'properties'} changed`,
    );
  }
  const rectCount = Object.keys(inputs.boundingRectDelta).length;
  if (rectCount > 0) {
    fragments.push(
      `${rectCount} boundingRect ${rectCount === 1 ? 'axis' : 'axes'} changed`,
    );
  }
  return fragments.length > 0 ? fragments.join('; ') : undefined;
}
