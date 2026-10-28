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
test('cancellation retires the active install process and both detached worktrees', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-cancel-')),
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
    const commit = git('rev-parse', 'HEAD'),
      out = join(root, 'out'),
      abort = new AbortController();
    const running = investigate(
      {
        ...config,
        repo,
        base: commit,
        head: commit,
        install: [
          process.execPath,
          '-e',
          'console.log(process.pid);setInterval(()=>{},1000)',
        ],
      },
      out,
      async () => {
        throw Error('Must not discover');
      },
      abort.signal,
    );
    let pid = 0;
    const deadline = Date.now() + 4000;
    while (!pid && Date.now() < deadline) {
      try {
        pid = Number(
          (await readFile(join(out, 'base-install.log'), 'utf8')).trim(),
        );
      } catch {
        /* Install has not started yet. */
      }
      if (!pid) await new Promise((r) => setTimeout(r, 20));
    }
    abort.abort();
    const report = await running;
    assert(pid > 0);
    assert.equal(report.status, 'blocked');
    assert.throws(() => process.kill(pid, 0));
    assert.equal(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm)?.length,
      1,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('discovery source edits cannot manufacture independently verified results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-integrity-')),
    repo = join(root, 'repo');
  await mkdir(repo);
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.invalid');
    await writeFile(
      join(repo, 'server.cjs'),
      "require('node:http').createServer((_,r)=>r.end('ready')).listen(Number(process.argv[2]),'127.0.0.1')",
    );
    git('add', '.');
    git('commit', '-qm', 'base');
    const commit = git('rev-parse', 'HEAD');
    const report = await investigate(
      {
        ...config,
        repo,
        base: commit,
        head: commit,
        install: [process.execPath, '-e', 'process.exit(0)'],
        start: [process.execPath, 'server.cjs', '{port}'],
      },
      join(root, 'out'),
      async (context) => {
        await writeFile(
          join(context.prepared.headDir, 'server.cjs'),
          'tampered',
        );
        return {
          proposal: { version: 1, plans: [], uncovered: [] },
          browserUsed: true,
          domscribeUsed: false,
          model: null,
        };
      },
    );
    assert.equal(report.status, 'blocked');
    assert.equal(report.journeys[0].findings.length, 0);
    assert.equal(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm)?.length,
      1,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
