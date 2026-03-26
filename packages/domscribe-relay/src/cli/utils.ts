/**
 * CLI utility functions
 * @module @domscribe/relay/cli/utils
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { PATHS } from '@domscribe/core';

import { findConfigFile, loadAppRoot } from './config-loader.js';

/**
 * Locate the workspace root (the directory containing `.domscribe/`).
 *
 * @remarks
 * Discovery chain:
 * 1. `.domscribe/` at cwd — single-repo fast path
 * 2. `domscribe.config.*` at cwd — monorepo: resolve appRoot from config
 * 3. Walk up for `.domscribe/` — nested working directory
 * 4. Walk up for `domscribe.config.*` — nested working directory in monorepo
 * 5. Nothing found — returns `undefined` (dormant mode)
 */
export function getWorkspaceRoot(): string | undefined {
  const cwd = process.cwd();

  // 1. .domscribe at cwd (single-repo fast path)
  if (existsSync(path.join(cwd, PATHS.DOMSCRIBE_DIR))) {
    return cwd;
  }

  // 2. Config file at cwd (monorepo: config at repo root)
  const configAtCwd = findConfigFile(cwd);
  if (configAtCwd) {
    return loadAppRoot(configAtCwd);
  }

  // 3. Walk up for .domscribe
  const fromDomscribe = walkUpToFindDomscribe(cwd);
  if (fromDomscribe) return fromDomscribe;

  // 4. Walk up for config file
  return walkUpToFindConfig(cwd);
}

function walkUpToFindDomscribe(startPath: string): string | undefined {
  let dir = path.resolve(startPath);

  // Handle if startPath is a file
  if (!statSync(dir).isDirectory()) {
    dir = path.dirname(dir);
  }

  while (true) {
    if (existsSync(path.join(dir, PATHS.DOMSCRIBE_DIR))) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}

function walkUpToFindConfig(startPath: string): string | undefined {
  let dir = path.resolve(startPath);

  if (!statSync(dir).isDirectory()) {
    dir = path.dirname(dir);
  }

  while (true) {
    const configPath = findConfigFile(dir);
    if (configPath) {
      return loadAppRoot(configPath);
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}
