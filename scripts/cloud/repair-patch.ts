import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
/** Capture the deliverable against the immutable seed, including staged edits. */
export function collectRepairPatch(
  app: string,
  seed: string,
): { changedFiles: string[]; patch: string } {
  if (!/^[a-f0-9]{40}$/.test(seed)) throw Error('Invalid app seed commit');
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: app,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  if (git(['rev-parse', 'HEAD']).trim() !== seed)
    throw Error('Agent changed the app seed commit');
  const file = fs.lstatSync(path.join(app, 'src/App.jsx'));
  if (!file.isFile() || file.isSymbolicLink())
    throw Error('Repair source must remain a regular file');
  const names = [
    ...git(['diff', '--name-only', '-z', seed, '--']).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean);
  const changedFiles = [...new Set(names)].sort();
  if (changedFiles.length !== 1 || changedFiles[0] !== 'src/App.jsx')
    throw Error('Only src/App.jsx may change');
  const patch = git(['diff', '--binary', seed, '--', 'src/App.jsx']);
  if (!patch) throw Error('Empty repair patch');
  return { changedFiles, patch };
}
