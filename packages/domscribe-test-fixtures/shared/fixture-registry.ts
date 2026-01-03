/**
 * Fixture Registry - Discover and load fixture.json manifests
 *
 * Shared between integration tests (Vitest) and e2e tests (Playwright).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Fixture capabilities
 */
export interface FixtureCapabilities {
  /** Whether runtime capture is supported */
  runtimeCapture: boolean;
  /** Available capture strategies */
  strategies: string[];
  /** Whether smoke test module is present */
  smokeTest: boolean;
}

/**
 * Dev server configuration
 */
export interface FixtureDevServer {
  /** Command to start the dev server */
  command: string;
  /** Port to use (0 = auto) */
  port: number;
  /** Regex pattern indicating the server is ready */
  readyPattern: string;
}

/**
 * Fixture identity manifest (fixture.json)
 *
 * Standalone fixtures (vite/webpack) have `bundler` + `bundlerVersion`.
 * Meta-framework fixtures (next/nuxt) have `baseFramework` instead —
 * they manage their own bundler internally.
 */
export interface FixtureManifest {
  /** Unique fixture identifier */
  id: string;
  /** UI framework */
  framework: string;
  /** Framework version (major) */
  frameworkVersion: string;
  /** Bundler name (standalone fixtures only) */
  bundler?: string;
  /** Bundler version (standalone fixtures only) */
  bundlerVersion?: string;
  /** Base UI framework for meta-frameworks (e.g. 'react' for next, 'vue' for nuxt) */
  baseFramework?: string;
  /** Language variant */
  language: 'ts' | 'js';
  /** Classification tags */
  tags: string[];
  /** Runtime capabilities */
  capabilities: FixtureCapabilities;
  /** Dev server config */
  devServer: FixtureDevServer;
}

/**
 * A discovered fixture with its manifest and filesystem path
 */
export interface DiscoveredFixture {
  /** Parsed fixture.json manifest */
  manifest: FixtureManifest;
  /** Absolute path to the fixture directory */
  path: string;
}

/**
 * Filter criteria for discovering fixtures
 */
export interface FixtureFilter {
  framework?: string;
  bundler?: string;
  language?: 'ts' | 'js';
  tag?: string;
  tags?: string[];
}

const SUPPORTED_BUNDLERS = ['vite', 'webpack'] as const;
type SupportedBundler = (typeof SUPPORTED_BUNDLERS)[number];

const META_FRAMEWORKS = ['next', 'nuxt'] as const;
type MetaFramework = (typeof META_FRAMEWORKS)[number];

const FIXTURES_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures',
);

/**
 * Recursively find all fixture.json files under the fixtures directory.
 */
function findFixtureJsonFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    // Skip internal directories
    if (entry.startsWith('_')) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Check for fixture.json directly in this directory
      const manifestPath = join(fullPath, 'fixture.json');
      if (existsSync(manifestPath)) {
        results.push(fullPath);
      } else {
        // Recurse deeper
        results.push(...findFixtureJsonFiles(fullPath));
      }
    }
  }

  return results;
}

/**
 * Load a fixture manifest from a directory.
 */
function loadManifest(fixturePath: string): FixtureManifest | null {
  const manifestPath = join(fixturePath, 'fixture.json');
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as FixtureManifest;
  } catch {
    return null;
  }
}

/**
 * Discover all fixtures, optionally filtered.
 */
export function discoverFixtures(filter?: FixtureFilter): DiscoveredFixture[] {
  const fixtureDirs = findFixtureJsonFiles(FIXTURES_ROOT);
  const fixtures: DiscoveredFixture[] = [];

  for (const dir of fixtureDirs) {
    const manifest = loadManifest(dir);
    if (!manifest) continue;

    // Apply filters
    if (filter) {
      if (filter.framework && manifest.framework !== filter.framework) continue;
      if (filter.bundler && manifest.bundler !== filter.bundler) continue;
      if (filter.language && manifest.language !== filter.language) continue;
      if (filter.tag && !manifest.tags.includes(filter.tag)) continue;
      if (filter.tags && !filter.tags.every((t) => manifest.tags.includes(t)))
        continue;
    }

    fixtures.push({ manifest, path: dir });
  }

  return fixtures;
}

/**
 * Get a fixture by its unique ID.
 */
export function getFixtureById(id: string): DiscoveredFixture | undefined {
  const all = discoverFixtures();
  return all.find((f) => f.manifest.id === id);
}

/**
 * Check whether a discovered fixture can actually be built:
 * - Standalone: has a supported bundler (vite or webpack)
 * - Meta-framework: has a recognized meta-framework (next or nuxt)
 * - Has node_modules installed (more than just .package-lock.json)
 */
export function isBuildableFixture(fixture: DiscoveredFixture): boolean {
  const { bundler, framework } = fixture.manifest;

  const hasSupportedBundler =
    typeof bundler === 'string' &&
    SUPPORTED_BUNDLERS.includes(bundler as SupportedBundler);

  const isMetaFramework = META_FRAMEWORKS.includes(framework as MetaFramework);

  if (!hasSupportedBundler && !isMetaFramework) {
    return false;
  }

  // Check that deps are actually installed
  const nodeModulesPath = join(fixture.path, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    return false;
  }

  try {
    const entries = readdirSync(nodeModulesPath);
    // A bare node_modules with only .package-lock.json is not installed
    return entries.filter((e) => !e.startsWith('.')).length > 0;
  } catch {
    return false;
  }
}
