/**
 * Manifest Parser - Read and validate manifest.jsonl files
 *
 * This utility provides framework-agnostic manifest parsing and validation.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { ManifestEntry } from '@domscribe/core';
import type { ManifestData, ManifestValidationResult } from './types.js';

/**
 * Read and parse a manifest.jsonl file
 *
 * @param manifestPath - Absolute path to manifest.jsonl
 * @returns Parsed manifest data
 *
 * @example
 * ```typescript
 * const manifest = await readManifest('/path/to/.domscribe/manifest.jsonl');
 * console.log(`Found ${manifest.entries.size} entries`);
 * ```
 */
export async function readManifest(
  manifestPath: string,
): Promise<ManifestData> {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const content = await readFile(manifestPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const entries = new Map<string, ManifestEntry>();
  let metadata: ManifestData['metadata'];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Check if this is metadata
      if (entry.metadata) {
        metadata = entry.metadata;
      } else if (entry.id) {
        // This is a manifest entry
        entries.set(entry.id, entry as ManifestEntry);
      }
    } catch (error) {
      console.warn(`Failed to parse manifest line: ${line}`, error);
    }
  }

  return { metadata, entries };
}

/**
 * Validate manifest schema compliance
 *
 * @param manifest - Parsed manifest data
 * @returns Validation result
 */
export function validateManifestSchema(
  manifest: ManifestData,
): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if manifest has entries
  if (manifest.entries.size === 0) {
    warnings.push('Manifest has no entries');
  }

  // Validate each entry
  for (const [id, entry] of manifest.entries) {
    // Check required fields
    if (!entry.id) {
      errors.push(`Entry missing id`);
    } else if (entry.id !== id) {
      errors.push(`Entry id mismatch: ${entry.id} !== ${id}`);
    }

    if (!entry.file) {
      errors.push(`Entry ${id} missing file`);
    }

    if (!entry.start) {
      errors.push(`Entry ${id} missing start position`);
    } else {
      if (typeof entry.start.line !== 'number' || entry.start.line < 1) {
        errors.push(`Entry ${id} has invalid start line: ${entry.start.line}`);
      }
      if (typeof entry.start.column !== 'number' || entry.start.column < 0) {
        errors.push(
          `Entry ${id} has invalid start column: ${entry.start.column}`,
        );
      }
    }

    if (!entry.tagName) {
      errors.push(`Entry ${id} missing tagName`);
    }

    // Check ID format (8-char nanoid)
    if (!/^[0-9A-HJ-NP-Za-hj-np-z]{8}$/.test(id)) {
      errors.push(`Entry ${id} has invalid ID format (expected 8-char nanoid)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate manifest integrity (no duplicates, all IDs unique, etc.)
 *
 * @param manifest - Parsed manifest data
 * @returns Validation result
 */
export function validateManifestIntegrity(
  manifest: ManifestData,
): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seenIds = new Set<string>();

  for (const [id, entry] of manifest.entries) {
    // Check for duplicate IDs
    if (seenIds.has(id)) {
      errors.push(`Duplicate ID: ${id}`);
    }
    seenIds.add(id);

    // Check that file paths are reasonable
    if (entry.file && entry.file.includes('node_modules')) {
      warnings.push(`Entry ${id} references node_modules: ${entry.file}`);
    }

    // Check for suspicious positions
    if (entry.start?.line && entry.start.line > 10000) {
      warnings.push(
        `Entry ${id} has very large line number: ${entry.start.line}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get all IDs for a specific file
 *
 * @param manifest - Parsed manifest data
 * @param file - File path to filter by
 * @returns Array of IDs for the file
 */
export function getIdsForFile(manifest: ManifestData, file: string): string[] {
  const ids: string[] = [];

  for (const [id, entry] of manifest.entries) {
    if (entry.file.includes(file)) {
      ids.push(id);
    }
  }

  return ids;
}

/**
 * Compare two manifests and return differences
 *
 * @param manifest1 - First manifest
 * @param manifest2 - Second manifest
 * @returns Comparison result
 */
export function compareManifests(
  manifest1: ManifestData,
  manifest2: ManifestData,
): {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
} {
  const ids1 = new Set(manifest1.entries.keys());
  const ids2 = new Set(manifest2.entries.keys());

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  // Check for added and changed
  for (const id of ids2) {
    if (!ids1.has(id)) {
      added.push(id);
      continue;
    }

    const entry1 = manifest1.entries.get(id);
    const entry2 = manifest2.entries.get(id);

    if (JSON.stringify(entry1) !== JSON.stringify(entry2)) {
      changed.push(id);
    } else {
      unchanged.push(id);
    }
  }

  // Check for removed
  for (const id of ids1) {
    if (!ids2.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, changed, unchanged };
}
