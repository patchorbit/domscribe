import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeInvestigation } from './grade.js';
import { ConfigSchema, ProposalSchema } from './schema.js';
import { config, metadata, proposal, observation } from './test-fixtures.js';

test('confirms only a repeatable head semantic regression after base passes', () => {
  const r = gradeInvestigation(
    config,
    proposal,
    [
      observation('base'),
      observation('head', 'Portland', 'Austin'),
      observation('head-repeat', 'Portland', 'Austin'),
    ],
    metadata,
  );
  assert.equal(r.journeys[0].status, 'regression');
  assert.equal(r.journeys[0].findings.length, 2);
  assert.equal(r.journeys[0].findings[0].expectationId, 'lyra-city');
  assert.equal(r.journeys[0].findings[0].expected, 'Austin');
  assert.equal(r.journeys[0].findings[0].actual, 'Portland');
  assert.equal(r.status, 'verified');
});
test('does not blame a PR for an expectation already failing on base', () => {
  const r = gradeInvestigation(
    config,
    proposal,
    [
      observation('base', 'Portland'),
      observation('head', 'Portland'),
      observation('head-repeat', 'Portland'),
    ],
    metadata,
  );
  assert.equal(r.journeys[0].status, 'pre_existing');
  assert.deepEqual(r.journeys[0].findings, []);
});
test('healthy head produces no findings', () => {
  const r = gradeInvestigation(
    config,
    proposal,
    ['base', 'head', 'head-repeat'].map((p) => observation(p)),
    metadata,
  );
  assert.equal(r.journeys[0].status, 'passed');
  assert.deepEqual(r.journeys[0].findings, []);
});
test('inconsistent head failure is inconclusive, not a verified bug', () => {
  const r = gradeInvestigation(
    config,
    proposal,
    [
      observation('base'),
      observation('head', 'Portland'),
      observation('head-repeat', 'Denver'),
    ],
    metadata,
  );
  assert.equal(r.journeys[0].status, 'inconclusive');
  assert.deepEqual(r.journeys[0].findings, []);
});
test('an action/setup failure and incomplete observations cannot become a regression', () => {
  for (const status of ['action_failed', 'setup_failed']) {
    const r = gradeInvestigation(
      config,
      proposal,
      [
        observation('base'),
        {
          ...observation('head'),
          status,
          actuals: [],
          errorCode: 'target_unavailable',
        },
        observation('head-repeat', 'Portland'),
      ],
      metadata,
    );
    assert.equal(r.journeys[0].status, 'inconclusive');
    assert.deepEqual(r.journeys[0].findings, []);
  }
  assert.equal(
    gradeInvestigation(config, proposal, [observation('base')], metadata)
      .status,
    'blocked',
  );
});
test('missing expectation observations never count as passing coverage', () => {
  const missing = {
    ...observation('head'),
    actuals: [{ expectationId: 'lyra-city', value: 'Austin' }],
  };
  const r = gradeInvestigation(
    config,
    proposal,
    [observation('base'), missing, observation('head-repeat')],
    metadata,
  );
  assert.equal(r.journeys[0].status, 'inconclusive');
});
test('rejects fabricated expectation IDs and duplicate observations instead of picking a winner', () => {
  assert.throws(() =>
    gradeInvestigation(
      config,
      proposal,
      [
        {
          ...observation('base'),
          actuals: [{ expectationId: 'made-up', value: 'Austin' }],
        },
      ],
      metadata,
    ),
  );
  assert.throws(() =>
    gradeInvestigation(
      config,
      proposal,
      [observation('base'), observation('base')],
      metadata,
    ),
  );
});
test('strict proposal cannot carry agent-authored assertions, duplicate or unknown journeys', () => {
  assert.throws(() => ProposalSchema.parse({ ...proposal, verdict: 'bug' }));
  assert.throws(() =>
    ProposalSchema.parse({
      ...proposal,
      plans: [...proposal.plans, ...proposal.plans],
    }),
  );
  assert.throws(() =>
    gradeInvestigation(
      config,
      { ...proposal, plans: [{ ...proposal.plans[0], journeyId: 'made-up' }] },
      [],
      metadata,
    ),
  );
  assert.throws(() =>
    ProposalSchema.parse({
      ...proposal,
      plans: [{ ...proposal.plans[0], expected: 'different' }],
    }),
  );
});
test('uncovered journeys remain visible, and a source-only agent run is unqualified', () => {
  const r = gradeInvestigation(
    config,
    {
      version: 1,
      plans: [],
      uncovered: [{ journeyId: 'edit', reason: 'Could not reach editor' }],
    },
    [],
    metadata,
  );
  assert.equal(r.journeys[0].status, 'uncovered');
  assert.equal(r.status, 'blocked');
  const sourceOnly = gradeInvestigation(
    config,
    proposal,
    ['base', 'head', 'head-repeat'].map((p) => observation(p)),
    { ...metadata, agentBrowserUsed: false },
  );
  assert.equal(sourceOnly.status, 'unqualified');
});
test('rejects traversal/absolute app roots and unsafe navigation paths before any process', () => {
  for (const appRoot of [
    '../outside',
    '/outside',
    'a/../../outside',
    'C:\\outside',
  ])
    assert.throws(() => ConfigSchema.parse({ ...config, appRoot }));
  for (const pathname of [
    'https://external.invalid/',
    '//external.invalid',
    '/\\external.invalid',
    '/../other',
  ])
    assert.throws(() =>
      ProposalSchema.parse({
        ...proposal,
        plans: [
          { journeyId: 'edit', steps: [{ action: 'navigate', pathname }] },
        ],
      }),
    );
});
test('valid config and proposal parse, but unresolved commit provenance cannot qualify results', () => {
  assert.equal(ConfigSchema.parse(config).journeys.length, 1);
  assert.equal(ProposalSchema.parse(proposal).plans.length, 1);
  const r = gradeInvestigation(
    config,
    proposal,
    ['base', 'head', 'head-repeat'].map((p) => observation(p)),
    { ...metadata, baseCommit: null },
  );
  assert.equal(r.status, 'unqualified');
});
