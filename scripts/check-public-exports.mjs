#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJsonPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const failures = [];

function fail(message) {
  failures.push(message);
}

function pathExists(packagePath) {
  const rel = packagePath.replace(/^\.\//, '');
  return existsSync(resolve(root, rel));
}

if (!pkg.main || !pkg.types) {
  fail('package.json must declare both main and types.');
}

for (const requiredFileEntry of ['dist', 'schemas', 'RELEASE-INTEGRITY.json']) {
  if (!pkg.files?.includes(requiredFileEntry)) {
    fail(`package.json files[] must include ${requiredFileEntry}.`);
  }
}

for (const [exportName, exportTarget] of Object.entries(pkg.exports ?? {})) {
  if (typeof exportTarget === 'string') {
    if (exportTarget.includes('*')) {
      const base = exportTarget.split('*')[0];
      if (!pathExists(base)) {
        fail(`Export ${exportName} points at missing base path ${base}.`);
      }
      continue;
    }
    if (!pathExists(exportTarget)) {
      fail(`Export ${exportName} points at missing path ${exportTarget}.`);
    }
    continue;
  }

  for (const condition of ['types', 'import']) {
    const target = exportTarget?.[condition];
    if (!target) {
      fail(`Export ${exportName} is missing ${condition}.`);
      continue;
    }
    if (!target.startsWith('./dist/')) {
      fail(`Export ${exportName}.${condition} must point under ./dist/.`);
      continue;
    }
    if (!pathExists(target)) {
      fail(`Export ${exportName}.${condition} points at missing path ${target}.`);
    }
  }
}

for (const fileEntry of pkg.files ?? []) {
  if (!pathExists(fileEntry)) {
    fail(`package.json files[] entry does not exist: ${fileEntry}.`);
  }
}

if (failures.length > 0) {
  console.error('Public export/package surface check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Public export/package surface check passed.');
