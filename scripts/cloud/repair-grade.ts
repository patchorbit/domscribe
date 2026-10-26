import { createHash } from 'node:crypto';
/** Grade controller-owned browser observations, never an agent's final claims. */
export function gradeRepair(
  input: unknown,
  condition: string,
  commit: string,
  sourceHash: string,
): void {
  function require(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
  }
  function object(value: unknown): Record<string, unknown> {
    require(typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value), 'Missing repair evidence object');
    return value as Record<string, unknown>;
  }
  function state(value: unknown, quantities: number[], name: string) {
    const actual = object(value);
    require(Object.keys(actual).sort().join(',') ===
      'line-a,line-b,line-c', `Unexpected cart identity in ${name}`);
    require(quantities.every(
      (q, i) => actual[['line-a', 'line-b', 'line-c'][i]] === q,
    ), `Incorrect cart quantities in ${name}`);
  }
  const r = object(input);
  require(r.schemaVersion === 1 &&
    ['baseline', 'domscribe'].includes(condition) &&
    r.condition === condition, 'Wrong repair condition/schema');
  require(r.sourceCommit === commit &&
    r.initialSourceHash ===
      sourceHash, 'Repair provenance differs from requested source');
  require(Array.isArray(r.changedFiles) &&
    r.changedFiles.length === 1 &&
    r.changedFiles[0] === 'src/App.jsx', 'Only src/App.jsx may change');
  require(typeof r.patch === 'string' &&
    r.patch.length > 0 &&
    r.patch.length < 128 * 1024, 'Missing or oversized patch');
  const headers = r.patch
    .split('\n')
    .filter((line) => line.startsWith('diff --git '));
  require(headers.length === 1 &&
    headers[0] ===
      'diff --git a/src/App.jsx b/src/App.jsx', 'Patch changes unexpected paths');
  require(r.patch
    .split('\n')
    .some(
      (line) => line.startsWith('+') && !line.startsWith('+++'),
    ), 'Patch has no added source');
  const provenance = object(r.artifactProvenance),
    verification = object(r.verification);
  require(provenance.commit === commit &&
    provenance.cleanSource === true &&
    typeof provenance.distDigest === 'string' &&
    /^[a-f0-9]{64}$/.test(provenance.distDigest) &&
    provenance.node ===
      object(r.versions)
        .node, 'Artifacts lack verified pinned-source provenance');
  require(typeof r.appSeedCommit === 'string' &&
    /^[a-f0-9]{40}$/.test(r.appSeedCommit) &&
    verification.kind === 'exported-patch-fresh-worktree' &&
    verification.seedCommit === r.appSeedCommit &&
    verification.patchSha256 ===
      createHash('sha256')
        .update(r.patch)
        .digest(
          'hex',
        ), 'Exported patch was not independently verified from its seed');
  const agent = object(r.agent);
  require(agent.exitCode === 0 &&
    agent.incomplete === false, 'Agent did not complete successfully');
  require(Array.isArray(agent.tools) &&
    agent.tools.every(
      (t) => typeof t === 'string',
    ), 'Missing agent tool evidence');
  require(agent.tools.some((t) =>
    String(t).startsWith('browser.'),
  ), 'Agent did not use the browser');
  const runtimeUsed = agent.tools.some((t) =>
    /^domscribe\..*(targets[._]query|query[._]bySource)/.test(String(t)),
  );
  require(condition === 'domscribe'
    ? runtimeUsed
    : !agent.tools.some((t) =>
        String(t).startsWith('domscribe.'),
      ), 'Agent tool use differs from condition');
  require(Array.isArray(agent.runtimeTargets) &&
    (condition === 'domscribe'
      ? agent.runtimeTargets.includes('line-a')
      : agent.runtimeTargets.length ===
        0), 'Missing exact selected-line runtime evidence');
  const before = object(r.before);
  for (const name of ['pageErrors', 'consoleErrors', 'networkErrors'])
    require(Array.isArray(before[name]) &&
      before[name].length === 0, `Before reproduction reported ${name}`);
  state(before.observed, [3, 3, 1], 'before reproduction');
  const after = object(r.after);
  for (const name of ['saved', 'reloaded', 'production'])
    state(after[name], [3, 2, 1], name);
  state(after.sorted, [1, 4, 1], 'sorted');
  state(after.filtered, [1, 2, 2], 'filtered');
  state(after.cancelled, [1, 2, 1], 'cancelled');
  require(after.productionInstrumented ===
    false, 'Production instrumentation remains');
  for (const name of ['pageErrors', 'consoleErrors', 'networkErrors'])
    require(Array.isArray(after[name]) &&
      after[name].length === 0, `Application reported ${name}`);
}
