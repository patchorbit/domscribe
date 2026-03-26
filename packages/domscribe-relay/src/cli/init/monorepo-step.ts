/**
 * Monorepo detection and config file creation step.
 * @module @domscribe/relay/cli/init/monorepo-step
 */
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import * as clack from '@clack/prompts';
import { PATHS } from '@domscribe/core';

import { findConfigFile, loadAppRoot } from '../config-loader.js';
import type { InitOptions } from './types.js';

/**
 * Result of the monorepo step.
 */
export interface MonorepoResult {
  /** Resolved absolute path to the app root (equals cwd for single-repo). */
  readonly appRoot: string;
}

/**
 * Write `domscribe.config.json` at the given directory.
 * Idempotent: skips if file exists and `--force` is not set.
 */
function writeConfigIfNeeded(
  cwd: string,
  appRoot: string,
  options: InitOptions,
): void {
  const configPath = path.join(cwd, PATHS.CONFIG_JSON_FILE);

  if (existsSync(configPath) && !options.force) {
    clack.log.info(`Config already exists: ${PATHS.CONFIG_JSON_FILE}`);
    return;
  }

  const content = JSON.stringify({ appRoot }, null, 2) + '\n';

  if (options.dryRun) {
    clack.log.info(`Would write ${PATHS.CONFIG_JSON_FILE}:\n${content.trim()}`);
    return;
  }

  writeFileSync(configPath, content, 'utf-8');
  clack.log.success(`Created ${PATHS.CONFIG_JSON_FILE}`);
}

/**
 * Run the monorepo detection and config creation step.
 *
 * @returns The resolved app root — equals `cwd` for single-repo projects,
 *   or the subdirectory path for monorepos.
 */
export async function runMonorepoStep(
  options: InitOptions,
  cwd: string,
): Promise<MonorepoResult> {
  // Non-interactive: --app-root flag provided
  if (options.appRoot) {
    const resolved = path.resolve(cwd, options.appRoot);

    if (!existsSync(resolved)) {
      clack.log.error(`Directory not found: ${resolved}`);
      return process.exit(1) as never;
    }

    writeConfigIfNeeded(cwd, options.appRoot, options);
    return { appRoot: resolved };
  }

  // Config already exists — reuse it unless --force
  const existingConfig = findConfigFile(cwd);
  if (existingConfig && !options.force) {
    const appRoot = loadAppRoot(existingConfig);
    clack.log.info(`Using existing config: ${path.basename(existingConfig)}`);
    return { appRoot };
  }

  // Interactive prompt
  const isMonorepo = await clack.confirm({
    message: 'Is this a monorepo?',
    initialValue: false,
  });

  if (clack.isCancel(isMonorepo)) {
    clack.cancel('Setup cancelled.');
    return process.exit(0) as never;
  }

  if (!isMonorepo) {
    return { appRoot: cwd };
  }

  const appRootInput = await clack.text({
    message: 'Where is your frontend app? (relative path)',
    placeholder: 'apps/web',
    validate: (value = '') => {
      if (!value.trim()) return 'Path is required';
      const abs = path.resolve(cwd, value);
      if (!existsSync(abs)) return `Directory not found: ${abs}`;
      return undefined;
    },
  });

  if (clack.isCancel(appRootInput)) {
    clack.cancel('Setup cancelled.');
    return process.exit(0) as never;
  }

  const resolved = path.resolve(cwd, appRootInput);
  writeConfigIfNeeded(cwd, appRootInput, options);
  return { appRoot: resolved };
}
