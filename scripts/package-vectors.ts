/**
 * Package conformance vectors into vectors.tar.gz distribution artifact.
 *
 * Includes manifest.json and all conformance vector files.
 * Verifies the archive is self-describing (contains manifest) and < 5MB.
 *
 * Usage: tsx scripts/package-vectors.ts
 *
 * @since v8.0.0
 */
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VECTORS_DIR = join(ROOT, 'vectors');
const MANIFEST_PATH = join(VECTORS_DIR, 'manifest.json');
const OUTPUT_PATH = join(ROOT, 'vectors.tar.gz');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Pre-flight: ensure manifest exists
if (!existsSync(MANIFEST_PATH)) {
  console.error('ERROR: vectors/manifest.json not found.');
  console.error('Run "npm run vectors:manifest" first.');
  process.exit(1);
}

// Create tar.gz from vectors/ directory
console.log('Packaging vectors...');
execSync(`tar -czf vectors.tar.gz vectors/manifest.json vectors/conformance/ vectors/VERSION`, {
  cwd: ROOT,
  stdio: 'inherit',
});

// Verify archive exists and check size
if (!existsSync(OUTPUT_PATH)) {
  console.error('ERROR: Failed to create vectors.tar.gz');
  process.exit(1);
}

const stats = statSync(OUTPUT_PATH);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

if (stats.size > MAX_SIZE_BYTES) {
  console.error(`ERROR: vectors.tar.gz is ${sizeMB}MB (limit: 5MB)`);
  process.exit(1);
}

// Verify self-describing (manifest is in archive)
const listing = execSync(`tar -tzf vectors.tar.gz`, { cwd: ROOT, encoding: 'utf-8' });
if (!listing.includes('vectors/manifest.json')) {
  console.error('ERROR: Archive does not contain vectors/manifest.json');
  process.exit(1);
}

const vectorCount = listing.split('\n').filter((l) => l.endsWith('.json') && l.includes('conformance')).length;

console.log(`OK: vectors.tar.gz (${sizeMB}MB, ${vectorCount} vectors, self-describing)`);
