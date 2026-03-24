#!/usr/bin/env node
/**
 * Syncs the workspace version into plugin manifests.
 *
 * Reads the version from the root package.json and updates all plugin
 * manifest files that have a "version" field. Designed to run after
 * `nx release version` and before the git commit.
 *
 * Usage: node scripts/sync-versions.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const workspaceRoot = process.cwd();
const rootPkg = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'package.json'), 'utf-8'),
);
const version = rootPkg.version;

/** Plugin manifests that contain a "version" field to keep in sync. */
const PLUGIN_MANIFESTS = [
  '.plugin/plugin.json',
  'packages/domscribe-relay/src/plugins/gemini/gemini-extension.json',
  'packages/domscribe-relay/src/plugins/claude-code/.claude-plugin/plugin.json',
  'packages/domscribe-relay/src/plugins/cursor/.cursor-plugin/plugin.json',
];

let changed = false;

for (const relPath of PLUGIN_MANIFESTS) {
  const absPath = resolve(workspaceRoot, relPath);
  const manifest = JSON.parse(readFileSync(absPath, 'utf-8'));

  if (manifest.version === version) continue;

  const oldVersion = manifest.version;
  manifest.version = version;
  writeFileSync(absPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  ${relPath}: ${oldVersion} -> ${version}`);
  changed = true;
}

if (!changed) {
  console.log('  sync-versions: all plugin manifests already up to date');
}
