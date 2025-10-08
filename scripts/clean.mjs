#!/usr/bin/env node
/**
 * Removes dist output for a single project.
 *
 * Per-project script designed to be called as an Nx target:
 *   node scripts/clean.mjs <projectName>
 */
import { rmSync } from 'fs';
import { resolve } from 'path';

const projectName = process.argv[2];
if (!projectName) {
  console.error('Usage: node scripts/clean.mjs <projectName>');
  process.exit(1);
}

const distPath = resolve(process.cwd(), 'dist/packages', projectName);
rmSync(distPath, { recursive: true, force: true });
console.log(`Removed dist/packages/${projectName}`);
