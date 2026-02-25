/**
 * Generate RELEASE-INTEGRITY.json — SHA-256 checksums for all published artifacts.
 * Consumers can verify downloaded schemas, vectors, and constraints against this manifest.
 *
 * Usage: npx tsx scripts/generate-release-integrity.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

function sha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function walkDir(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

interface FileChecksum {
  path: string;
  sha256: string;
  size_bytes: number;
}

const dirs = [
  { dir: join(root, 'schemas'), ext: '.json', category: 'schemas' },
  { dir: join(root, 'vectors', 'conformance'), ext: '.json', category: 'vectors' },
  { dir: join(root, 'constraints'), ext: '.json', category: 'constraints' },
] as const;

const checksums: Record<string, FileChecksum[]> = {};
const totals: Record<string, number> = {};
let totalFiles = 0;

for (const { dir, ext, category } of dirs) {
  const files = walkDir(dir, ext);
  checksums[category] = files.map((f) => ({
    path: relative(root, f),
    sha256: sha256(f),
    size_bytes: statSync(f).size,
  }));
  totals[category] = checksums[category].length;
  totalFiles += checksums[category].length;
}

const manifest = {
  release_version: pkg.version,
  generated_at: new Date().toISOString(),
  generator: 'generate-release-integrity.ts',
  totals: {
    ...totals,
    total: totalFiles,
  },
  verification: 'sha256sum <file> | grep $(jq -r \'.checksums.<category>[] | select(.path=="<file>") | .sha256\' RELEASE-INTEGRITY.json)',
  checksums,
};

const outPath = join(root, 'RELEASE-INTEGRITY.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`RELEASE-INTEGRITY.json generated:`);
console.log(`  version:     ${manifest.release_version}`);
console.log(`  schemas:     ${totals.schemas}`);
console.log(`  vectors:     ${totals.vectors}`);
console.log(`  constraints: ${totals.constraints}`);
console.log(`  total:       ${totalFiles} files`);
