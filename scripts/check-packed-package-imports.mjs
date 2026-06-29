#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const failures = [];

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

function collectImportTargets() {
  const targets = new Set();

  if (pkg.main) targets.add(normalizePackagePath(pkg.main));

  for (const exportTarget of Object.values(pkg.exports ?? {})) {
    if (typeof exportTarget === 'string') {
      if (!exportTarget.includes('*') && exportTarget.endsWith('.js')) {
        targets.add(normalizePackagePath(exportTarget));
      }
      continue;
    }

    const target = exportTarget?.import;
    if (target) targets.add(normalizePackagePath(target));
  }

  return [...targets].sort();
}

function parsePackFileList(stdout) {
  const parsed = JSON.parse(stdout);
  const pack = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = pack?.files ?? [];

  return new Set(files.map((file) => file.path));
}

const packDryRun = run('npm', ['pack', '--dry-run', '--json']);
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

const tempRoot = await mkdtemp(resolve(tmpdir(), 'loa-hounfour-pack-audit-'));

try {
  const pack = run('npm', ['pack', '--json', '--pack-destination', tempRoot]);

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
      const unpackRoot = resolve(tempRoot, 'unpacked');
      mkdirSync(unpackRoot, { recursive: true });
      const unpack = spawnSync('tar', ['-xzf', tarballPath, '-C', unpackRoot], {
        encoding: 'utf8',
      });

      if (unpack.status !== 0) {
        fail(`Unable to unpack package tarball: ${unpack.stderr || unpack.stdout}`);
      } else {
        const packageRoot = resolve(unpackRoot, 'package');

        for (const importTarget of collectImportTargets()) {
          const targetUrl = pathToFileURL(resolve(packageRoot, importTarget)).href;
          try {
            await import(targetUrl);
          } catch (error) {
            fail(`Packed package import failed for ${importTarget}: ${error.message}`);
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
