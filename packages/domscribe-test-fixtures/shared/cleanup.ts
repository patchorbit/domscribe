/**
 * Fixture cleanup utilities
 *
 * Removes build artifacts and framework-specific directories
 * to ensure tests start from a clean state.
 */

import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import type { DiscoveredFixture } from './fixture-registry.js';

/** Directories to clean before tests */
const CLEAN_DIRS = ['.domscribe', '.next', '.output', '.nuxt'];

/**
 * Remove build artifacts (.domscribe, .next, .output, .nuxt) from fixtures.
 * Call once at the start of a test suite to ensure a clean slate.
 */
export function cleanFixtures(fixtures: DiscoveredFixture[]): void {
  for (const fixture of fixtures) {
    for (const dir of CLEAN_DIRS) {
      const fullPath = join(fixture.path, dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
}
