import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, realpath } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
const exec = promisify(execFile);
async function git(repo: string, args: string[]): Promise<string> {
  return (
    await exec('git', ['-C', repo, ...args], {
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
    })
  ).stdout.trim();
}
export async function safeAppRoot(
  worktree: string,
  appRoot: string,
): Promise<string> {
  const root = await realpath(worktree),
    app = await realpath(resolve(root, appRoot)),
    rel = relative(root, app);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('../'))
    throw Error('App root outside worktree');
  return app;
}
export async function prepareWorktrees(
  repo: string,
  base: string,
  head: string,
  out: string,
) {
  const source = await realpath(
      await git(repo, ['rev-parse', '--show-toplevel']),
    ),
    output = join(
      await realpath(dirname(resolve(out))),
      basename(resolve(out)),
    );
  const inside = relative(source, output);
  if (
    !inside ||
    (inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside))
  )
    throw Error('Output must be outside source repository');
  // Never reuse or overwrite caller files, including on an early pinning error.
  await mkdir(output, { mode: 0o700 });
  const owned: string[] = [];
  const cleanup = async () => {
    for (const path of [...owned].reverse())
      await git(source, ['worktree', 'remove', '--force', path]);
    owned.length = 0;
  };
  try {
    const baseCommit = await git(source, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      base + '^{commit}',
    ]);
    const headCommit = await git(source, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      head + '^{commit}',
    ]);
    await git(source, ['merge-base', '--is-ancestor', baseCommit, headCommit]);
    const diff = (
      await exec(
        'git',
        [
          '-C',
          source,
          'diff',
          '--no-ext-diff',
          '--no-textconv',
          '--unified=3',
          baseCommit,
          headCommit,
          '--',
        ],
        { timeout: 30000, maxBuffer: 2 * 1024 * 1024 },
      )
    ).stdout;
    const baseDir = join(output, 'base'),
      headDir = join(output, 'head');
    for (const [commit, dir] of [
      [baseCommit, baseDir],
      [headCommit, headDir],
    ]) {
      await git(source, ['worktree', 'add', '--detach', dir, commit]);
      owned.push(dir);
    }
    const indexFlags = {
      base: await git(baseDir, ['ls-files', '-v', '-z']),
      head: await git(headDir, ['ls-files', '-v', '-z']),
    };
    return {
      indexFlags,
      source,
      baseCommit,
      headCommit,
      baseDir,
      headDir,
      output,
      diff,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
export type Prepared = Awaited<ReturnType<typeof prepareWorktrees>>;
export async function assertUnchanged(context: Prepared): Promise<void> {
  for (const [path, commit] of [
    [context.baseDir, context.baseCommit],
    [context.headDir, context.headCommit],
  ]) {
    const flags = await git(path, ['ls-files', '-v', '-z']);
    if (
      flags !==
      (path === context.baseDir
        ? context.indexFlags.base
        : context.indexFlags.head)
    )
      throw Error('Source changed: hidden index flags');
    const head = await git(path, ['rev-parse', 'HEAD']);
    const changes = await git(path, [
      'status',
      '--porcelain',
      '--untracked-files=normal',
    ]);
    const index = await git(path, [
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      'HEAD',
      '--',
    ]);
    if (head !== commit || changes || index)
      throw Error('Source changed during investigation');
  }
}
