#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, 'src/validators/index.ts');
const source = readFileSync(sourcePath, 'utf8');

const findings = [];

function report(message) {
  findings.push(message);
}

const registrations = [...source.matchAll(/registerCrossFieldValidator\('([^']+)'/g)].map((m) => m[1]);
const duplicateIds = [...new Set(registrations.filter((id, index) => registrations.indexOf(id) !== index))].sort();

if (registrations.length === 0) {
  report('No cross-field validator registrations found.');
}

if (duplicateIds.length > 0) {
  report(`Duplicate cross-field validator registrations: ${duplicateIds.join(', ')}`);
}

if (!source.includes('export function registerCrossFieldValidator')) {
  report('registerCrossFieldValidator is not exported.');
}

for (const format of ['date-time', 'uri', 'uuid']) {
  if (!source.includes(`FormatRegistry.Has('${format}')`) || !source.includes(`FormatRegistry.Set('${format}'`)) {
    report(`Missing runtime format registration guard for ${format}.`);
  }
}

if (!source.includes('const cache = new Map')) {
  report('Compiled validator cache declaration not found.');
}

if (!source.includes('TypeCompiler.Compile(schema)')) {
  report('Validator compilation path not found.');
}

console.log('Validator registry advisory scan (non-blocking):');
console.log('- This script is inventory evidence only.');
console.log('- It intentionally exits 0 so check:all can surface drift without claiming full contract enforcement.');
console.log('- Runtime enforcement evidence belongs in focused tests such as tests/validators/registry-contract.test.ts.');

if (findings.length > 0) {
  console.warn(`Advisory findings (${findings.length}):`);
  for (const finding of findings) {
    console.warn(`- ${finding}`);
  }
} else {
  console.log(`No advisory findings across ${registrations.length} registrations.`);
}

process.exit(0);
