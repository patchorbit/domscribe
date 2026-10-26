import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { gradeRepair } from './repair-grade.js';
const commit = 'a'.repeat(40),
  hash = 'b'.repeat(64);
const initial = { 'line-a': 1, 'line-b': 2, 'line-c': 1 };
const edited = { 'line-a': 3, 'line-b': 2, 'line-c': 1 };
function valid() {
  const patch =
    'diff --git a/src/App.jsx b/src/App.jsx\n--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-bug\n+fix\n';
  return {
    appSeedCommit: 'e'.repeat(40),
    versions: { node: 'v24.22.1' },
    artifactProvenance: {
      commit,
      node: 'v24.22.1',
      cleanSource: true,
      distDigest: 'f'.repeat(64),
    },
    verification: {
      kind: 'exported-patch-fresh-worktree',
      seedCommit: 'e'.repeat(40),
      patchSha256: createHash('sha256').update(patch).digest('hex'),
    },
    schemaVersion: 1,
    condition: 'baseline',
    sourceCommit: commit,
    initialSourceHash: hash,
    changedFiles: ['src/App.jsx'],
    patch:
      'diff --git a/src/App.jsx b/src/App.jsx\n--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -1 +1 @@\n-bug\n+fix\n',
    agent: {
      exitCode: 0,
      incomplete: false,
      tools: ['browser.browser_navigate'],
      runtimeTargets: [] as string[],
    },
    before: {
      pageErrors: [],
      consoleErrors: [],
      networkErrors: [],
      observed: { 'line-a': 3, 'line-b': 3, 'line-c': 1 },
    },
    after: {
      saved: edited,
      reloaded: edited,
      sorted: { 'line-a': 1, 'line-b': 4, 'line-c': 1 },
      filtered: { 'line-a': 1, 'line-b': 2, 'line-c': 2 },
      cancelled: initial,
      production: edited,
      productionInstrumented: false,
      pageErrors: [],
      consoleErrors: [],
      networkErrors: [],
    },
  };
}
test('accepts independently verified targeted repair including persisted, sorted, filtered and production states', () => {
  assert.doesNotThrow(() => gradeRepair(valid(), 'baseline', commit, hash));
});
test('rejects exit zero when the wrong sibling changes or reload loses the correction', () => {
  for (const key of [
    'saved',
    'reloaded',
    'sorted',
    'filtered',
    'cancelled',
    'production',
  ] as const) {
    const r = valid();
    r.after[key] = { 'line-a': 9, 'line-b': 9, 'line-c': 9 };
    assert.throws(() => gradeRepair(r, 'baseline', commit, hash), key);
  }
});
test('requires the intended before-defect, not a startup or dependency failure', () => {
  const r = valid();
  r.before.observed = initial;
  assert.throws(() => gradeRepair(r, 'baseline', commit, hash));
});
test('rejects unrelated, empty or untracked fix artifacts and stale provenance', () => {
  const empty = valid();
  empty.patch = '';
  assert.throws(() => gradeRepair(empty, 'baseline', commit, hash));
  const outside = valid();
  outside.changedFiles.push('vite.config.mjs');
  assert.throws(() => gradeRepair(outside, 'baseline', commit, hash));
  const hidden = valid();
  hidden.patch += 'diff --git a/package.json b/package.json\n';
  assert.throws(() => gradeRepair(hidden, 'baseline', commit, hash));
  assert.throws(() => gradeRepair(valid(), 'domscribe', commit, hash));
  assert.throws(() => gradeRepair(valid(), 'baseline', 'c'.repeat(40), hash));
  assert.throws(() => gradeRepair(valid(), 'baseline', commit, 'd'.repeat(64)));
});
test('rejects a successful agent report without real browser use, errors or production stripping', () => {
  const noBrowser = valid();
  noBrowser.agent.tools = [];
  assert.throws(() => gradeRepair(noBrowser, 'baseline', commit, hash));
  const incomplete = valid();
  incomplete.agent.incomplete = true;
  assert.throws(() => gradeRepair(incomplete, 'baseline', commit, hash));
  const instrumented = valid();
  instrumented.after.productionInstrumented = true;
  assert.throws(() => gradeRepair(instrumented, 'baseline', commit, hash));
  const errors = valid();
  (errors.after.pageErrors as unknown[]).push('crash');
  assert.throws(() => gradeRepair(errors, 'baseline', commit, hash));
});
test('enriched trial must actually use exact-target/source runtime tools', () => {
  const r = valid();
  r.condition = 'domscribe';
  assert.throws(() => gradeRepair(r, 'domscribe', commit, hash));
  r.agent.tools.push('domscribe.domscribe.targets.query');
  r.agent.runtimeTargets.push('line-b');
  assert.throws(() => gradeRepair(r, 'domscribe', commit, hash));
  r.agent.runtimeTargets[0] = 'line-a';
  assert.doesNotThrow(() => gradeRepair(r, 'domscribe', commit, hash));
});

test('a reproduced quantity error with application errors cannot qualify', () => {
  const r = valid();
  (r.before.consoleErrors as unknown[]).push('crash');
  assert.throws(() => gradeRepair(r, 'baseline', commit, hash));
});

test('requires verified artifacts and grading the exported patch from its immutable seed', () => {
  const r = valid();
  r.verification.kind = 'live-agent-tree';
  assert.throws(() => gradeRepair(r, 'baseline', commit, hash));
  const stale = valid();
  stale.artifactProvenance.commit = 'c'.repeat(40);
  assert.throws(() => gradeRepair(stale, 'baseline', commit, hash));
});
