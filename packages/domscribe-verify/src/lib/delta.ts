/**
 * Deterministic delta computation for post-edit verification (RFC 0002).
 *
 * Pure functions — no DOM, no browser, no I/O. The relay's verify tools
 * capture element snapshots (computed styles + bounding rect) before and
 * after an agent edit and feed them here; the resulting deltas are the
 * structured, deterministic half of the verify contract. Judging whether a
 * detected change matches the *intent* is deliberately left to the calling
 * agent — these functions only report what changed, precisely.
 *
 * @module @domscribe/verify/delta
 */
import type {
  BoundingRect,
  BoundingRectDelta,
  StylePropertyDelta,
  VerifyVerdict,
} from '@domscribe/core';

/**
 * A change the agent intended to make, declared at verify time.
 * When `value` is present, the property must resolve to exactly that value
 * (as reported by `getComputedStyle`) for the expectation to count as met.
 */
export interface ExpectedChange {
  property: string;
  value?: string;
}

export interface VerdictInput {
  styleDeltas: StylePropertyDelta[];
  rectDeltas: BoundingRectDelta[];
  /**
   * Optional declared intent. When absent the verdict degrades to pure
   * change detection: `no_change` vs `match`-with-a-caveat-note.
   */
  expectedChanges?: ExpectedChange[];
}

export interface VerdictResult {
  verdict: VerifyVerdict;
  notes?: string;
}

/**
 * Sub-pixel geometry jitter tolerated before a rect field counts as changed.
 * Browsers report fractional pixels; half a device pixel is noise.
 */
export const RECT_EPSILON_PX = 0.5;

const RECT_FIELDS = [
  'x',
  'y',
  'width',
  'height',
  'top',
  'right',
  'bottom',
  'left',
] as const;

/**
 * Diff two style maps (property → resolved value).
 * Reports one entry per property whose value differs, with `null` marking
 * a property absent on one side. Key order follows the before-map first,
 * then after-only properties in their own order — deterministic for tests.
 */
export function diffStyleMaps(
  before: Record<string, string>,
  after: Record<string, string>,
): StylePropertyDelta[] {
  const deltas: StylePropertyDelta[] = [];

  for (const [property, beforeValue] of Object.entries(before)) {
    const afterValue = after[property] ?? null;
    if (afterValue !== beforeValue) {
      deltas.push({ property, before: beforeValue, after: afterValue });
    }
  }

  for (const [property, afterValue] of Object.entries(after)) {
    if (!(property in before)) {
      deltas.push({ property, before: null, after: afterValue });
    }
  }

  return deltas;
}

/**
 * Diff two bounding rects field-by-field.
 * Deltas at or below `epsilon` (default half a pixel) are dropped as
 * rendering jitter.
 */
export function diffBoundingRects(
  before: BoundingRect,
  after: BoundingRect,
  epsilon: number = RECT_EPSILON_PX,
): BoundingRectDelta[] {
  const deltas: BoundingRectDelta[] = [];

  for (const field of RECT_FIELDS) {
    const beforeValue = before[field];
    const afterValue = after[field];
    if (Math.abs(afterValue - beforeValue) > epsilon) {
      deltas.push({ field, before: beforeValue, after: afterValue });
    }
  }

  return deltas;
}

interface ExpectationOutcome {
  met: ExpectedChange[];
  wrongValue: { expected: ExpectedChange; delta: StylePropertyDelta }[];
  unchanged: ExpectedChange[];
  unexpected: StylePropertyDelta[];
}

function classifyExpectations(
  styleDeltas: StylePropertyDelta[],
  expectedChanges: ExpectedChange[],
): ExpectationOutcome {
  const deltaByProperty = new Map(styleDeltas.map((d) => [d.property, d]));
  const expectedProperties = new Set(expectedChanges.map((e) => e.property));

  const met: ExpectedChange[] = [];
  const wrongValue: { expected: ExpectedChange; delta: StylePropertyDelta }[] =
    [];
  const unchanged: ExpectedChange[] = [];

  for (const expected of expectedChanges) {
    const delta = deltaByProperty.get(expected.property);
    if (!delta) {
      unchanged.push(expected);
    } else if (expected.value !== undefined && delta.after !== expected.value) {
      wrongValue.push({ expected, delta });
    } else {
      met.push(expected);
    }
  }

  const unexpected = styleDeltas.filter(
    (d) => !expectedProperties.has(d.property),
  );

  return { met, wrongValue, unchanged, unexpected };
}

function formatProperties(items: { property: string }[]): string {
  return items.map((i) => i.property).join(', ');
}

/**
 * Resolve a deterministic verdict from the computed deltas.
 *
 * Rules:
 * - No style and no geometry delta → `no_change` (the edit did not reach
 *   the rendered element — wrong file, wrong selector, or HMR miss).
 * - No declared expectations → `match` with a caveat note; the caller must
 *   inspect the deltas to confirm intent.
 * - All expectations met, nothing unexpected → `match`.
 * - All expectations met but extra properties changed → `partial`.
 * - Some expectations met → `partial`.
 * - No expectation met while other properties changed → `regression`.
 *
 * Geometry deltas never downgrade a verdict on their own: rect movement is
 * usually a consequence of an intended style change (padding grows the
 * box). They are reported for the agent to judge.
 */
export function resolveVerdict(input: VerdictInput): VerdictResult {
  const { styleDeltas, rectDeltas, expectedChanges } = input;

  if (styleDeltas.length === 0 && rectDeltas.length === 0) {
    return {
      verdict: 'no_change',
      notes:
        'No style or geometry delta detected — the edit did not affect the rendered element. ' +
        'Check the file, the selector, and that HMR applied the change.',
    };
  }

  if (!expectedChanges || expectedChanges.length === 0) {
    return {
      verdict: 'match',
      notes:
        'Change detected. No expectedChanges were declared, so this verdict reflects ' +
        'change detection only — inspect the deltas to confirm they match the intent.',
    };
  }

  const outcome = classifyExpectations(styleDeltas, expectedChanges);
  const allMet =
    outcome.wrongValue.length === 0 && outcome.unchanged.length === 0;

  if (allMet && outcome.unexpected.length === 0) {
    return { verdict: 'match' };
  }

  if (allMet) {
    return {
      verdict: 'partial',
      notes: `All expected changes applied, but unexpected properties also changed: ${formatProperties(outcome.unexpected)}.`,
    };
  }

  if (outcome.met.length > 0 || outcome.wrongValue.length > 0) {
    const parts: string[] = [];
    if (outcome.wrongValue.length > 0) {
      parts.push(
        outcome.wrongValue
          .map(
            ({ expected, delta }) =>
              `${expected.property} changed to "${delta.after}" (expected "${expected.value}")`,
          )
          .join('; '),
      );
    }
    if (outcome.unchanged.length > 0) {
      parts.push(`unchanged: ${formatProperties(outcome.unchanged)}`);
    }
    return {
      verdict: 'partial',
      notes: `${outcome.met.length}/${expectedChanges.length} expected changes applied. ${parts.join('. ')}.`,
    };
  }

  const changed =
    styleDeltas.length > 0
      ? `other properties changed: ${formatProperties(styleDeltas)}`
      : `only geometry changed: ${rectDeltas.map((d) => d.field).join(', ')}`;
  return {
    verdict: 'regression',
    notes: `None of the expected changes were applied, but ${changed}. The edit likely landed on the wrong element or property.`,
  };
}
