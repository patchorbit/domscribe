/**
 * Ensure `.domscribe` is listed in the project's `.gitignore`.
 * @module @domscribe/relay/cli/init/gitignore-step
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as clack from '@clack/prompts';

import type { InitOptions } from './types.js';

const GITIGNORE = '.gitignore';
const ENTRY = '.domscribe';

/**
 * Check whether a gitignore file already contains a `.domscribe` entry.
 *
 * @remarks
 * Matches `.domscribe` or `.domscribe/` as a standalone line,
 * ignoring leading whitespace and trailing slashes.
 */
function hasEntry(content: string): boolean {
  return content
    .split('\n')
    .some((line) => line.trim().replace(/\/$/, '') === ENTRY);
}

/**
 * Ensure `.domscribe` is present in the project's `.gitignore`.
 *
 * - If the file doesn't exist, creates it with the entry.
 * - If the file exists but lacks the entry, appends it.
 * - If the entry already exists, does nothing.
 */
export function runGitignoreStep(options: InitOptions, cwd: string): void {
  const filePath = join(cwd, GITIGNORE);

  let existing = '';
  let fileExists = false;

  try {
    existing = readFileSync(filePath, 'utf-8');
    fileExists = true;
  } catch {
    // File doesn't exist — we'll create it.
  }

  if (fileExists && hasEntry(existing)) {
    clack.log.info(`${GITIGNORE} already contains ${ENTRY}`);
    return;
  }

  if (options.dryRun) {
    const verb = fileExists ? 'Append to' : 'Create';
    clack.log.info(`Would ${verb.toLowerCase()} ${GITIGNORE} with ${ENTRY}`);
    return;
  }

  const block = `\n# Domscribe artifacts\n${ENTRY}\n`;

  if (fileExists) {
    const separator = existing.endsWith('\n') ? '' : '\n';
    writeFileSync(filePath, existing + separator + block, 'utf-8');
  } else {
    writeFileSync(filePath, block.trimStart(), 'utf-8');
  }

  const verb = fileExists ? 'Added' : 'Created';
  clack.log.success(`${verb} ${ENTRY} to ${GITIGNORE}`);
}
