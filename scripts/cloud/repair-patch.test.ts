import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectRepairPatch } from './repair-patch.js';
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-patch-test-'));
  const base = path.join(root, 'base'),
    app = path.join(root, 'app');
  fs.mkdirSync(path.join(base, 'src'), { recursive: true });
  const git = (args: string[], cwd = base) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  git(['init']);
  fs.writeFileSync(
    path.join(base, 'src/App.jsx'),
    `export const update=(all,selected,quantity)=>all.map(line=>line.sku===selected.sku?{...line,quantity}:line);\n`,
  );
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
  const seed = git(['rev-parse', 'HEAD']).trim();
  git(['worktree', 'add', '--detach', app, seed]);
  return { root, base, app, seed, git };
}
test('returned artifact includes staged repair and unstaged edits and replays the fix from the seed', async () => {
  const f = fixture();
  try {
    const file = path.join(f.app, 'src/App.jsx');
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, 'utf8')
        .replace('line.sku===selected.sku', 'line.id===selected.id'),
    );
    f.git(['add', 'src/App.jsx'], f.app);
    fs.appendFileSync(file, '// explanation\n');
    const r = collectRepairPatch(f.app, f.seed);
    const fresh = path.join(f.root, 'fresh');
    f.git(['worktree', 'add', '--detach', fresh, f.seed]);
    execFileSync('git', ['apply', '-'], { cwd: fresh, input: r.patch });
    const module = await import(
      'data:text/javascript,' +
        encodeURIComponent(
          fs.readFileSync(path.join(fresh, 'src/App.jsx'), 'utf8'),
        )
    );
    assert.deepEqual(
      module
        .update(
          [
            { id: 'a', sku: 'm', quantity: 1 },
            { id: 'b', sku: 'm', quantity: 2 },
          ],
          { id: 'a', sku: 'm' },
          3,
        )
        .map((x: { quantity: number }) => x.quantity),
      [3, 2],
    );
    assert.deepEqual(r.changedFiles, ['src/App.jsx']);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
test('committed or unrelated changes cannot be returned as a source-only repair', () => {
  const f = fixture();
  try {
    fs.appendFileSync(path.join(f.app, 'src/App.jsx'), '// changed\n');
    f.git(['add', '.'], f.app);
    f.git(
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.invalid',
        'commit',
        '-m',
        'unexpected',
      ],
      f.app,
    );
    assert.throws(() => collectRepairPatch(f.app, f.seed));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
