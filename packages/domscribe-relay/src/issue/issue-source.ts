import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath, lstat } from 'node:fs/promises';
import { IssueSourceSchema } from '@domscribe/core';

function inside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return (
    relative !== '..' &&
    !relative.startsWith('..' + path.sep) &&
    !path.isAbsolute(relative)
  );
}

/** Resolve only inside the chosen checkout, including nearest existing parent for missing files. */
export async function issueSourcePath(
  root: string,
  relative: string,
): Promise<string | undefined> {
  if (!IssueSourceSchema.shape.file.safeParse(relative).success) return;
  const base = await realpath(root);
  const file = path.resolve(base, ...relative.split('/'));
  if (!inside(base, file)) return;
  let current = file;
  while (inside(base, current)) {
    try {
      const actual = await realpath(current);
      if (!inside(base, actual)) return;
      return current === file ? actual : file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      try {
        if ((await lstat(current)).isSymbolicLink()) return;
      } catch (missing) {
        if ((missing as NodeJS.ErrnoException).code !== 'ENOENT') throw missing;
      }
      if (current === base) break;
      current = path.dirname(current);
    }
  }
  return;
}

export async function portableIssueSource(
  root: string,
  captured: string,
): Promise<string | undefined> {
  let file = captured;
  try {
    if (file.startsWith('file:')) file = fileURLToPath(file);
  } catch {
    return;
  }
  // Capture roots must belong to this host; do not guess other machines' absolute paths.
  if (
    !path.isAbsolute(file) &&
    (path.win32.isAbsolute(file) || file.includes('\\'))
  )
    return;
  const absolute = path.resolve(root, file);
  const relative = path
    .relative(path.resolve(root), absolute)
    .split(path.sep)
    .join('/');
  if (!IssueSourceSchema.shape.file.safeParse(relative).success) return;
  return (await issueSourcePath(root, relative)) ? relative : undefined;
}
