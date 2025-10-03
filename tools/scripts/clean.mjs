#!/usr/bin/env node
import { rmSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const DIST_SUBPATHS = [
  'dist/packages/domscribe-core',
  'dist/packages/domscribe-manifest',
  'dist/packages/domscribe-transform',
];

/**
 * Removes the package build output for @domscribe packages in a cross-platform way.
 * The function intentionally tolerates missing directories so repeated invocations
 * remain idempotent.
 */
export function removeDist() {
  for (const subpath of DIST_SUBPATHS) {
    const distPath = resolve(process.cwd(), subpath);
    rmSync(distPath, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    removeDist();
  } catch (error) {
    console.error('Failed to clean dist output for @domscribe packages:', error);
    process.exitCode = 1;
  }
}
