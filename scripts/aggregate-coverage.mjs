/**
 * @module aggregate-coverage
 *
 * Reads coverage-summary.json from each package's test-output directory,
 * computes a weighted-average line coverage percentage across all packages,
 * and writes a shields.io-compatible JSON endpoint to coverage/shields.json.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'fs';
import { resolve, dirname, join } from 'path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

const summaryFiles = readdirSync(join(ROOT, 'packages'))
  .filter((d) => d.startsWith('domscribe-'))
  .map((d) =>
    join('packages', d, 'test-output/vitest/coverage/coverage-summary.json'),
  )
  .filter((f) => existsSync(join(ROOT, f)));

if (summaryFiles.length === 0) {
  console.error(
    'No coverage-summary.json files found. Run tests with coverage first.',
  );
  process.exit(1);
}

let totalCovered = 0;
let totalStatements = 0;

for (const file of summaryFiles) {
  const abs = resolve(ROOT, file);
  const summary = JSON.parse(readFileSync(abs, 'utf8'));
  const totals = summary.total;

  if (!totals?.statements) {
    console.warn(`Skipping ${file} — no total.statements`);
    continue;
  }

  totalCovered += totals.statements.covered;
  totalStatements += totals.statements.total;

  const pkg = file.split('/')[1];
  const pct = totals.statements.pct;
  console.log(`  ${pkg}: ${pct}%`);
}

if (totalStatements === 0) {
  console.error('No statement data found across packages.');
  process.exit(1);
}

const percentage = ((totalCovered / totalStatements) * 100).toFixed(1);

const color =
  percentage >= 90
    ? 'brightgreen'
    : percentage >= 80
      ? 'green'
      : percentage >= 70
        ? 'yellowgreen'
        : percentage >= 60
          ? 'yellow'
          : 'red';

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${percentage}%`,
  color,
};

const outDir = resolve(ROOT, 'coverage');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const outPath = resolve(outDir, 'shields.json');
writeFileSync(outPath, JSON.stringify(badge, null, 2) + '\n');

console.log(`\nAggregate coverage: ${percentage}% (${summaryFiles.length} packages)`);
console.log(`Badge JSON written to ${outPath}`);
