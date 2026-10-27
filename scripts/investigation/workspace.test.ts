import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareWorktrees, assertUnchanged, safeAppRoot } from './workspace.js';

test('pins detached worktrees, preserves source, detects mutations and cleans partial setup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-workspace-')),
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
    const base = git('rev-parse', 'HEAD');
    await writeFile(join(repo, 'app.txt'), 'head');
    git('commit', '-qam', 'head');
    const head = git('rev-parse', 'HEAD');
    await writeFile(join(repo, 'user-work'), 'preserved');
    const context = await prepareWorktrees(repo, base, head, join(root, 'out'));
    try {
      assert.equal(context.baseCommit, base);
      assert.equal(context.headCommit, head);
      assert.equal(
        await readFile(join(context.baseDir, 'app.txt'), 'utf8'),
        'base',
      );
      await assertUnchanged(context);
      await writeFile(join(context.headDir, 'app.txt'), 'tampered');
      await assert.rejects(() => assertUnchanged(context), /Source changed/);
      await symlink(root, join(context.baseDir, 'escape'));
      await assert.rejects(
        () => safeAppRoot(context.baseDir, 'escape'),
        /outside/,
      );
    } finally {
      await context.cleanup();
    }
    assert.equal(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm)?.length,
      1,
    );
    assert.equal(await readFile(join(repo, 'user-work'), 'utf8'), 'preserved');
    await assert.rejects(() =>
      prepareWorktrees(repo, '--help', head, join(root, 'bad')),
    );
    assert.equal(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm)?.length,
      1,
    );
    await assert.rejects(
      () => prepareWorktrees(repo, base, head, join(root, 'out')),
      /exist/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
