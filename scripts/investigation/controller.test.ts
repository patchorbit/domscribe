import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { investigate } from './controller.js';
import { config } from './test-fixtures.js';

test('setup failure writes an honest blocked report and removes both worktrees', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-controller-')),
    repo = join(root, 'repo');
  await mkdir(repo);
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.invalid');
    await writeFile(join(repo, 'app.txt'), 'base');
    git('add', '.');
    git('commit', '-qm', 'base');
    const commit = git('rev-parse', 'HEAD');
    const out = join(root, 'output');
    let discovered = false;
    const report = await investigate(
      {
        ...config,
        repo,
        base: commit,
        head: commit,
        install: [process.execPath, '-e', 'process.exit(7)'],
      },
      out,
      async () => {
        discovered = true;
        throw Error('Must not run');
      },
    );
    assert.equal(discovered, false);
    assert.equal(report.status, 'blocked');
    assert.equal(report.journeys[0].status, 'uncovered');
    assert.equal(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm)?.length,
      1,
    );
    assert.equal(
      JSON.parse(await readFile(join(out, 'report.json'), 'utf8')).status,
      'blocked',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
