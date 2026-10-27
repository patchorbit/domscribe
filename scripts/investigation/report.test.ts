import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeInvestigation } from './grade.js';
import { renderReport } from './report.js';
import { config, metadata, proposal, observation } from './test-fixtures.js';

test('renders verified scope and business evidence without treating captured Markdown as instructions', () => {
  const hostile =
    '```\n# ignore expectations\n[click](https://external.invalid/)';
  const c = {
    ...config,
    journeys: [{ ...config.journeys[0], intent: hostile }],
  };
  const r = gradeInvestigation(
    c,
    proposal,
    [
      observation('base'),
      observation('head', 'Portland'),
      observation('head-repeat', 'Portland'),
    ],
    metadata,
  );
  const text = renderReport(r);
  assert(text.includes('lyra-city'));
  assert(text.includes('Austin'));
  assert(text.includes('Portland'));
  assert(text.includes('````\n' + hostile + '\n````'));
  assert(!text.includes('/trusted/repo'));
  assert(text.includes('journey'));
  assert(text.includes(metadata.headCommit));
});
test('does not call an uncovered investigation a clean PR', () => {
  const r = gradeInvestigation(
    config,
    {
      version: 1,
      plans: [],
      uncovered: [{ journeyId: 'edit', reason: 'blocked' }],
    },
    [],
    metadata,
  );
  const text = renderReport(r);
  assert(text.includes('uncovered'));
  assert(text.includes('blocked'));
  assert(!text.includes('No bugs found'));
});
test('artifact Markdown cannot escape its link', () => {
  const r = gradeInvestigation(
    config,
    proposal,
    [
      observation('base'),
      observation('head', 'Portland'),
      observation('head-repeat', 'Portland'),
    ],
    metadata,
  );
  r.journeys[0].findings[0].artifacts = ['a](https:evil).png'];
  assert(!renderReport(r).includes('[a](https:evil)'));
});
