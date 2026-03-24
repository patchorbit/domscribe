/**
 * Package manager detection from lockfiles.
 * @module @domscribe/relay/cli/init/detect-package-manager
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { PackageManagerId } from './types.js';

/**
 * Detect the package manager by checking for lockfiles in the given directory.
 * Falls back to npm if no lockfile is found.
 */
export function detectPackageManager(cwd: string): PackageManagerId {
  if (existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (
    existsSync(path.join(cwd, 'bun.lock')) ||
    existsSync(path.join(cwd, 'bun.lockb'))
  )
    return 'bun';

  return 'npm';
}
