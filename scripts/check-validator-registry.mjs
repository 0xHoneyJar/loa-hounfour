#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, 'src/validators/index.ts');
const source = readFileSync(sourcePath, 'utf8');

const failures = [];

function fail(message) {
  failures.push(message);
}

const registrations = [...source.matchAll(/registerCrossFieldValidator\('([^']+)'/g)].map((m) => m[1]);
const duplicates = registrations.filter((id, index) => registrations.indexOf(id) !== index);

if (registrations.length === 0) {
  fail('No cross-field validator registrations found.');
}

if (duplicates.length > 0) {
  fail(`Duplicate cross-field validator registrations: ${[...new Set(duplicates)].join(', ')}`);
}

if (!source.includes('export function registerCrossFieldValidator')) {
  fail('registerCrossFieldValidator must remain an exported function.');
}

for (const format of ['date-time', 'uri', 'uuid']) {
  if (!source.includes(`FormatRegistry.Has('${format}')`) || !source.includes(`FormatRegistry.Set('${format}'`)) {
    fail(`Missing runtime format registration guard for ${format}.`);
  }
}

if (!source.includes('const cache = new Map')) {
  fail('Compiled validator cache declaration is missing.');
}

if (!source.includes('TypeCompiler.Compile(schema)')) {
  fail('Validator compilation path is missing.');
}

if (failures.length > 0) {
  console.error('Validator registry check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validator registry check passed (${registrations.length} unique registrations).`);
