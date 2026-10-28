import { createHash } from 'node:crypto';
import {
  ConfigSchema,
  assertFixtureReferences,
  ProposalSchema,
  ObservationSchema,
  MetadataSchema,
  ReportSchema,
  type Report,
} from './schema.js';

export function gradeInvestigation(
  rawConfig: unknown,
  rawProposal: unknown,
  rawObservations: unknown[],
  rawMetadata: unknown,
): Report {
  const config = ConfigSchema.parse(rawConfig),
    proposal = ProposalSchema.parse(rawProposal),
    metadata = MetadataSchema.parse(rawMetadata);
  assertFixtureReferences(proposal, config.fixtures);
  if (rawObservations.length > 30) throw Error('Too many observations');
  const observations = rawObservations.map((o) => ObservationSchema.parse(o));
  const ids = new Set(config.journeys.map((j) => j.id));
  for (const plan of [...proposal.plans, ...proposal.uncovered])
    if (!ids.has(plan.journeyId)) throw Error('Unknown journey');
  const seen = new Set<string>();
  for (const o of observations) {
    const journey = config.journeys.find((j) => j.id === o.journeyId);
    if (!journey) throw Error('Unknown observed journey');
    const key = o.journeyId + ':' + o.phase;
    if (seen.has(key)) throw Error('Duplicate observation phase');
    seen.add(key);
    for (const actual of o.actuals)
      if (!journey.expectations.some((e) => e.id === actual.expectationId))
        throw Error('Unknown expectation');
  }
  const journeys: Report['journeys'] = config.journeys.map((j) => {
    const runs = observations.filter((o) => o.journeyId === j.id);
    const result: Report['journeys'][number] = {
      id: j.id,
      intent: j.intent,
      status: 'inconclusive',
      reason: 'Independent verification is incomplete',
      findings: [],
      observations: runs,
    };
    if (!proposal.plans.some((p) => p.journeyId === j.id))
      return {
        ...result,
        status: 'uncovered',
        reason:
          proposal.uncovered.find((u) => u.journeyId === j.id)?.reason ??
          'No plan proposed',
      };
    const base = runs.find((o) => o.phase === 'base'),
      head = runs.find((o) => o.phase === 'head'),
      repeat = runs.find((o) => o.phase === 'head-repeat');
    if (
      !base ||
      !head ||
      !repeat ||
      runs.some(
        (o) =>
          o.status !== 'completed' ||
          o.actuals.length !== j.expectations.length,
      )
    )
      return result;
    const failures = (run: typeof base) =>
      j.expectations.filter(
        (e) =>
          !Object.is(
            run.actuals.find((a) => a.expectationId === e.id)?.value,
            e.expected,
          ),
      );
    if (failures(base).length)
      return {
        ...result,
        status: 'pre_existing',
        reason:
          'Approved expectation already fails on base; not attributed to this PR',
      };
    const failed = failures(head),
      repeated = failures(repeat);
    if (!failed.length && !repeated.length)
      return {
        ...result,
        status: 'passed',
        reason: 'Approved observations passed on base and both fresh head runs',
      };
    const same =
      failed.length === repeated.length &&
      failed.every(
        (e) =>
          repeated.some((r) => r.id === e.id) &&
          Object.is(
            head.actuals.find((a) => a.expectationId === e.id)?.value,
            repeat.actuals.find((a) => a.expectationId === e.id)?.value,
          ),
      );
    if (!same)
      return {
        ...result,
        reason: 'Head observations did not reproduce consistently',
      };
    return {
      ...result,
      status: 'regression',
      reason:
        'Approved expectation passed on base and failed consistently on two fresh head runs',
      findings: failed.map((e) => ({
        fingerprint: createHash('sha256')
          .update(j.id + '\0' + e.id)
          .digest('hex'),
        expectationId: e.id,
        expected: e.expected,
        actual: head.actuals.find((a) => a.expectationId === e.id)?.value ?? '',
        artifacts: runs.flatMap((r) => r.artifacts),
      })),
    };
  });
  const verified = journeys.filter((j) =>
    ['regression', 'passed', 'pre_existing'].includes(j.status),
  ).length;
  const status =
    verified === 0
      ? 'blocked'
      : !metadata.agentBrowserUsed ||
          !metadata.baseCommit ||
          !metadata.headCommit ||
          !metadata.diffDigest
        ? 'unqualified'
        : verified === journeys.length
          ? 'verified'
          : 'partial';
  return ReportSchema.parse({ version: 1, metadata, status, journeys });
}
