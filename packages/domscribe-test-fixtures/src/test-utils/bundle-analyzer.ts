/**
 * Bundle Analyzer - Extract data-ds attributes from build output
 *
 * This utility provides framework-agnostic bundle analysis to extract
 * data-ds attributes and validate production stripping.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ParsedBundle } from './types.js';

/**
 * Parse bundle output and extract data-ds attributes
 *
 * @param outputDir - Path to build output directory
 * @returns Parsed bundle information
 *
 * @example
 * ```typescript
 * const bundle = await parseBundle('/path/to/dist');
 * console.log(`Found ${bundle.dataDs.length} data-ds attributes`);
 * console.log(`Element count: ${bundle.elementCount}`);
 * ```
 */
export async function parseBundle(outputDir: string): Promise<ParsedBundle> {
  const files = await readdir(outputDir, { recursive: true });

  let html = '';
  let js = '';

  // Read all HTML and JS files
  for (const file of files) {
    const filePath = join(outputDir, file.toString());

    if (file.toString().endsWith('.html')) {
      html += await readFile(filePath, 'utf-8');
    } else if (
      file.toString().endsWith('.js') ||
      file.toString().endsWith('.mjs')
    ) {
      js += await readFile(filePath, 'utf-8');
    }
  }

  // Extract data-ds attributes
  const dataDs = extractDataDsAttributes(html + js);

  // Count total elements (approximate)
  const elementCount = countElements(html);

  return {
    html,
    js,
    dataDs,
    elementCount,
  };
}

/**
 * Extract all data-ds attribute values from content
 *
 * @param content - HTML/JS content
 * @returns Array of data-ds values
 */
function extractDataDsAttributes(content: string): string[] {
  const regex = /data-ds="([^"]+)"/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  // Deduplicate
  return Array.from(new Set(matches));
}

/**
 * Count HTML elements in content (approximate)
 *
 * @param html - HTML content
 * @returns Approximate element count
 */
function countElements(html: string): number {
  // Match opening tags
  const regex = /<([a-z][a-z0-9]*)\b[^>]*>/gi;
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Check if bundle contains any data-ds attributes
 *
 * @param outputDir - Path to build output directory
 * @returns True if data-ds found, false otherwise
 */
export async function hasDataDsAttributes(outputDir: string): Promise<boolean> {
  const bundle = await parseBundle(outputDir);
  return bundle.dataDs.length > 0;
}

/**
 * Validate that production bundle has zero data-ds attributes
 *
 * @param outputDir - Path to build output directory
 * @returns True if clean (no data-ds), false if data-ds found
 */
export async function validateProductionStrip(
  outputDir: string,
): Promise<{ clean: boolean; foundAttributes: string[] }> {
  const bundle = await parseBundle(outputDir);

  return {
    clean: bundle.dataDs.length === 0,
    foundAttributes: bundle.dataDs,
  };
}

/**
 * Get detailed bundle statistics
 *
 * @param outputDir - Path to build output directory
 * @returns Bundle statistics
 */
export async function getBundleStats(outputDir: string): Promise<{
  totalSize: number;
  htmlSize: number;
  jsSize: number;
  dataDsCount: number;
  elementCount: number;
}> {
  const bundle = await parseBundle(outputDir);

  return {
    totalSize: bundle.html.length + bundle.js.length,
    htmlSize: bundle.html.length,
    jsSize: bundle.js.length,
    dataDsCount: bundle.dataDs.length,
    elementCount: bundle.elementCount,
  };
}
