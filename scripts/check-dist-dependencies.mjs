#!/usr/bin/env node
/** Check that emitted JavaScript and declarations only import declared packages. */
import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const builtins = new Set(
  builtinModules.map((name) => name.replace(/^node:/, '')),
);
const failures = [];
let checked = 0;

function checkFile(file, declared, owner) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
  );
  function check(specifier) {
    if (!specifier || /^[.#/]/.test(specifier) || specifier.startsWith('node:'))
      return;
    const name = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0];
    if (name !== owner && !builtins.has(name) && !declared.has(name)) {
      failures.push(`${file}: ${name} is not a runtime or peer dependency`);
    }
  }
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      check(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require')) &&
      node.arguments.length &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      check(node.arguments[0].text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      check(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  checked++;
}

function walk(directory, declared, owner) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) walk(file, declared, owner);
    else if (/\.(?:[cm]?js|d\.[cm]?ts)$/.test(entry.name))
      checkFile(file, declared, owner);
  }
}

for (const entry of readdirSync('dist/packages', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join('dist/packages', entry.name);
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  if (pkg.private) continue;
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const [name, version] of Object.entries(pkg[field] ?? {})) {
      if (String(version).startsWith('workspace:')) {
        failures.push(
          `${pkg.name}: ${field}.${name} must be synchronized before packing`,
        );
      }
    }
  }
  walk(
    directory,
    new Set(
      Object.keys({
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      }),
    ),
    pkg.name,
  );
}

assert.equal(failures.length, 0, [...new Set(failures)].join('\n'));
assert(checked > 0, 'No emitted package files were checked');
console.log(
  `Checked runtime and declaration imports in ${checked} emitted files`,
);
