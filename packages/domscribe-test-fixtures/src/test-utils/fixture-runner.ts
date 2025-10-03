/**
 * Fixture Runner - Build fixtures using bundler programmatic APIs
 *
 * This utility provides a framework-agnostic way to build test fixtures
 * using Vite or Webpack programmatic APIs.
 */

import { build as viteBuild } from 'vite';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type {
  FixtureConfig,
  BuildOptions,
  FixtureBuildResult,
} from './types.js';

/**
 * Get fixture configuration by analyzing the fixture directory
 */
export function getFixtureConfig(fixturePath: string): FixtureConfig {
  const absolutePath = resolve(__dirname, '../../fixtures', fixturePath);

  // Parse path: vite/v5/react-18-ts -> bundler=vite, version=5, framework=react, etc.
  const parts = fixturePath.split('/');
  const bundler = parts[0] as 'vite' | 'webpack';
  const bundlerVersion = parts[1].replace('v', '');
  const frameworkPart = parts[2]; // e.g., "react-18-ts"

  const frameworkMatch = frameworkPart.match(/^(\w+)-(\d+)-(\w+)$/);
  if (!frameworkMatch) {
    throw new Error(`Invalid fixture path format: ${fixturePath}`);
  }

  const framework = frameworkMatch[1] as 'react' | 'vue' | 'angular';
  const frameworkVersion = frameworkMatch[2];
  const language = frameworkMatch[3] as 'ts' | 'js';

  return {
    path: absolutePath,
    bundler,
    framework,
    language,
    bundlerVersion,
    frameworkVersion,
  };
}

/**
 * Build a fixture using Vite
 */
async function buildViteFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { mode = 'development' } = options;
  const startTime = Date.now();

  // Build using Vite programmatic API
  await viteBuild({
    root: config.path,
    mode,
    build: {
      outDir: join(config.path, 'dist'),
      emptyOutDir: true,
    },
    logLevel: 'warn',
  });

  const buildTime = Date.now() - startTime;
  const outputDir = join(config.path, 'dist');
  const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');

  return {
    outputDir,
    manifestPath,
    buildTime,
  };
}

/**
 * Build a fixture using Webpack
 */
async function buildWebpackFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const startTime = Date.now();

  // TODO: Implement webpack build when webpack fixtures are added
  // For now, this is a placeholder
  throw new Error('Webpack fixtures not yet implemented');

  // const buildTime = Date.now() - startTime;
  // const outputDir = join(config.path, 'dist');
  // const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');
  //
  // return {
  //   outputDir,
  //   manifestPath,
  //   buildTime,
  // };
}

/**
 * Build a fixture application
 *
 * This function automatically detects the bundler type and uses the
 * appropriate build method.
 *
 * @param fixturePath - Relative path to fixture (e.g., "vite/v5/react-18-ts")
 * @param options - Build options
 * @returns Build result with output paths and timing
 *
 * @example
 * ```typescript
 * const result = await buildFixture('vite/v5/react-18-ts', { mode: 'development' });
 * console.log(`Built in ${result.buildTime}ms`);
 * console.log(`Output: ${result.outputDir}`);
 * console.log(`Manifest: ${result.manifestPath}`);
 * ```
 */
export async function buildFixture(
  fixturePath: string,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const config = getFixtureConfig(fixturePath);

  // Verify fixture exists
  if (!existsSync(config.path)) {
    throw new Error(`Fixture not found: ${config.path}`);
  }

  // Build based on bundler type
  if (config.bundler === 'vite') {
    return buildViteFixture(config, options);
  } else if (config.bundler === 'webpack') {
    return buildWebpackFixture(config, options);
  } else {
    throw new Error(`Unknown bundler: ${config.bundler}`);
  }
}

/**
 * Modify a file in a fixture (for HMR simulation)
 */
export async function modifyFixtureFile(
  fixturePath: string,
  relativePath: string,
  modifier: (content: string) => string,
): Promise<void> {
  const config = getFixtureConfig(fixturePath);
  const filePath = join(config.path, relativePath);

  const { readFile, writeFile } = await import('fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const modified = modifier(content);
  await writeFile(filePath, modified, 'utf-8');
}
