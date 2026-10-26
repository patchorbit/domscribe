import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
/** Use an exact source checkout without carrying caller changes or old dist files. */
export async function withPinnedSource<T>(
  repo: string,
  commit: string,
  work: (root: string) => Promise<T>,
): Promise<T> {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw Error('Pinned source requires an exact commit');
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  if (git(['rev-parse', commit + '^{commit}']).trim() !== commit)
    throw Error('Pinned commit is unavailable');
  const parent = fs.mkdtempSync(
      path.join(
        path.dirname(fs.realpathSync(repo)),
        '.domscribe-pilot-source-',
      ),
    ),
    root = path.join(parent, 'source');
  let registered = false,
    completed = false;
  const cleanup = () => {
    if (registered) git(['worktree', 'remove', '--', root]);
    fs.rmdirSync(parent);
  };
  try {
    git(['worktree', 'add', '--detach', root, commit]);
    registered = true;
    if (
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim() !== commit
    )
      throw Error('Source checkout identity mismatch');
    const result = await work(root);
    completed = true;
    cleanup();
    return result;
  } catch (error) {
    if (!completed) {
      try {
        cleanup();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Pinned source cleanup needs attention: ${root}`,
          { cause: cleanupError },
        );
      }
    }
    throw error;
  }
}

import { createHash } from 'node:crypto';
interface ArtifactProvenance {
  commit: string;
  node: string;
  distDigest: string;
  cleanSource: true;
  at: string;
}
function sourceIdentity(root: string, commit: string) {
  const options = {
    cwd: root,
    encoding: 'utf8' as const,
    stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'],
  };
  if (execFileSync('git', ['rev-parse', 'HEAD'], options).trim() !== commit)
    throw Error('Artifact checkout differs from pinned commit');
  if (
    execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=all'],
      options,
    ).trim()
  )
    throw Error('Artifact source checkout is not clean');
}
function distDigest(root: string) {
  const hash = createHash('sha256'),
    base = path.join(root, 'dist/packages');
  let files = 0;
  function walk(dir: string) {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name),
        stat = fs.lstatSync(file);
      if (stat.isSymbolicLink())
        throw Error('Artifact symlinks are unsupported');
      if (stat.isDirectory()) walk(file);
      else if (stat.isFile()) {
        files++;
        hash.update(path.relative(base, file));
        hash.update('\0');
        hash.update(String(stat.mode & 0o777));
        hash.update('\0');
        hash.update(fs.readFileSync(file));
      }
    }
  }
  walk(base);
  if (!files) throw Error('No built artifacts');
  return hash.digest('hex');
}
export function writeArtifactProvenance(
  root: string,
  commit: string,
): ArtifactProvenance {
  sourceIdentity(root, commit);
  const record: ArtifactProvenance = {
    commit,
    node: process.version,
    distDigest: distDigest(root),
    cleanSource: true,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(root, 'dist/.domscribe-artifacts.json'),
    JSON.stringify(record, null, 2),
  );
  return record;
}
export function readArtifactProvenance(
  root: string,
  commit: string,
): ArtifactProvenance {
  sourceIdentity(root, commit);
  const record = JSON.parse(
    fs.readFileSync(path.join(root, 'dist/.domscribe-artifacts.json'), 'utf8'),
  ) as ArtifactProvenance;
  if (
    record.commit !== commit ||
    record.node !== process.version ||
    record.cleanSource !== true ||
    record.distDigest !== distDigest(root)
  )
    throw Error('Built artifacts lack matching pinned-source provenance');
  return record;
}
