/**
 * Domscribe config file discovery and loading.
 * @module @domscribe/relay/cli/config-loader
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { DomscribeConfigSchema, PATHS } from '@domscribe/core';

/**
 * Config filenames to scan, in priority order.
 * JSON is preferred; `.js` and `.ts` are reserved for future use.
 */
const CONFIG_FILENAMES = [
  PATHS.CONFIG_JSON_FILE,
  PATHS.CONFIG_JS_FILE,
  PATHS.CONFIG_FILE,
] as const;

/**
 * Find a Domscribe config file in the given directory.
 * Returns the absolute path to the first match, or `undefined`.
 */
export function findConfigFile(dir: string): string | undefined {
  for (const name of CONFIG_FILENAMES) {
    const filePath = path.join(dir, name);
    if (existsSync(filePath)) return filePath;
  }
  return undefined;
}

/**
 * Read a `domscribe.config.json` and resolve the `appRoot` to an absolute path
 * relative to the config file's directory.
 */
export function loadAppRoot(configPath: string): string {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const config = DomscribeConfigSchema.parse(parsed);
  return path.resolve(path.dirname(configPath), config.appRoot);
}
