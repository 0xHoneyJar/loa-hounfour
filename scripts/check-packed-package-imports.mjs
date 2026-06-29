#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const failures = [];
const packEnv = { ...process.env, PREPACK_MODE: process.env.PREPACK_MODE ?? 'pack' };

function fail(message) {
  failures.push(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with status ${result.status}:\n${result.stderr || result.stdout}`);
  }

  return result;
}

function normalizePackagePath(packagePath) {
  return packagePath.replace(/^\.\//, '');
}

function collectExpectedFiles() {
  const expected = new Set();

  if (pkg.main) expected.add(normalizePackagePath(pkg.main));
  if (pkg.types) expected.add(normalizePackagePath(pkg.types));

  for (const exportTarget of Object.values(pkg.exports ?? {})) {
    if (typeof exportTarget === 'string') {
      if (!exportTarget.includes('*')) expected.add(normalizePackagePath(exportTarget));
      continue;
    }

    for (const condition of ['types', 'import']) {
      const target = exportTarget?.[condition];
      if (target) expected.add(normalizePackagePath(target));
    }
  }

  return [...expected].sort();
}

function collectImportSpecifiers() {
  const specifiers = new Set();

  for (const [exportName, exportTarget] of Object.entries(pkg.exports ?? {})) {
    if (typeof exportTarget === 'string') {
      if (!exportTarget.includes('*') && exportTarget.endsWith('.js')) {
        specifiers.add(exportName === '.' ? pkg.name : `${pkg.name}/${exportName.replace(/^\.\//, '')}`);
      }
      continue;
    }

    if (exportTarget?.import) {
      specifiers.add(exportName === '.' ? pkg.name : `${pkg.name}/${exportName.replace(/^\.\//, '')}`);
    }
  }

  return [...specifiers].sort();
}

function parsePackFileList(stdout) {
  const parsed = JSON.parse(stdout);
  const pack = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = pack?.files ?? [];

  return new Set(files.map((file) => file.path));
}

const packDryRun = run('npm', ['pack', '--dry-run', '--json'], { env: packEnv });
let packedFiles = new Set();

if (packDryRun.status === 0) {
  try {
    packedFiles = parsePackFileList(packDryRun.stdout);
  } catch (error) {
    fail(`Unable to parse npm pack --dry-run --json output: ${error.message}`);
  }
}

for (const expectedFile of collectExpectedFiles()) {
  if (!packedFiles.has(expectedFile)) {
    fail(`Packed package is missing expected public file: ${expectedFile}`);
  }
}

const tempRoot = await mkdtemp(resolve(root, '.packed-package-audit-'));

try {
  const pack = run('npm', ['pack', '--json', '--pack-destination', tempRoot], { env: packEnv });

  if (pack.status === 0) {
    let tarballPath;

    try {
      const parsed = JSON.parse(pack.stdout);
      const packed = Array.isArray(parsed) ? parsed[0] : parsed;
      tarballPath = resolve(tempRoot, basename(packed.filename));
    } catch (error) {
      fail(`Unable to parse npm pack output: ${error.message}`);
    }

    if (tarballPath) {
      const consumerRoot = resolve(tempRoot, 'consumer');
      mkdirSync(consumerRoot, { recursive: true });

      const install = spawnSync(
        'npm',
        ['install', '--ignore-scripts', '--no-package-lock', '--omit=dev', tarballPath],
        { cwd: consumerRoot, encoding: 'utf8' },
      );

      if (install.status !== 0) {
        fail(`Unable to install packed package in temporary consumer project: ${install.stderr || install.stdout}`);
      } else {
        for (const specifier of collectImportSpecifiers()) {
          const importCheck = spawnSync(
            process.execPath,
            ['--input-type=module', '--eval', `await import(${JSON.stringify(specifier)});`],
            { cwd: consumerRoot, encoding: 'utf8' },
          );

          if (importCheck.status !== 0) {
            fail(`Packed package import failed for ${specifier}: ${importCheck.stderr || importCheck.stdout}`);
          }
        }
      }
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Packed package import audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Packed package import audit passed.');