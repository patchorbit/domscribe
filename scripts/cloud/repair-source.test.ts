import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPinnedSource } from './repair-source.js';
test('pinned build excludes newer commits and dirty caller files and cleans after callback failure', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-source-test-')),
    repo = path.join(parent, 'repo');
  fs.mkdirSync(repo);
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  const commit = (message: string) =>
    git([
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-am',
      message,
    ]);
  try {
    git(['init']);
    fs.writeFileSync(path.join(repo, 'source.txt'), 'pinned');
    git(['add', '.']);
    commit('pinned');
    const pinned = git(['rev-parse', 'HEAD']).trim();
    fs.writeFileSync(path.join(repo, 'source.txt'), 'newer');
    commit('newer');
    fs.writeFileSync(path.join(repo, 'source.txt'), 'dirty caller');
    let checkout = '';
    await assert.rejects(
      withPinnedSource(repo, pinned, async (root) => {
        checkout = root;
        assert.equal(
          fs.readFileSync(path.join(root, 'source.txt'), 'utf8'),
          'pinned',
        );
        throw Error('callback failure');
      }),
      /callback failure/,
    );
    assert(!fs.existsSync(checkout));
    assert.equal(
      fs.readFileSync(path.join(repo, 'source.txt'), 'utf8'),
      'dirty caller',
    );
    assert.equal(
      (git(['worktree', 'list', '--porcelain']).match(/^worktree /gm) || [])
        .length,
      1,
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('artifact provenance rejects dist changes after a verified clean-source build', async () => {
  const parent = fs.mkdtempSync(
      path.join(os.tmpdir(), 'repair-artifacts-test-'),
    ),
    repo = path.join(parent, 'repo');
  fs.mkdirSync(repo);
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  try {
    git(['init']);
    fs.writeFileSync(path.join(repo, '.gitignore'), 'dist\n');
    git(['add', '.']);
    git([
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'seed',
    ]);
    const commit = git(['rev-parse', 'HEAD']).trim();
    fs.mkdirSync(path.join(repo, 'dist/packages/test'), { recursive: true });
    const output = path.join(repo, 'dist/packages/test/file.js');
    fs.writeFileSync(output, 'original');
    const { writeArtifactProvenance, readArtifactProvenance } =
      await import('./repair-source.js');
    writeArtifactProvenance(repo, commit);
    assert.equal(readArtifactProvenance(repo, commit).commit, commit);
    fs.writeFileSync(output, 'stale or altered artifact');
    assert.throws(() => readArtifactProvenance(repo, commit));
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
