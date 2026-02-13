/**
 * Verify that golden test vectors match the current contract version.
 * Exit 1 if vectors/VERSION doesn't match CONTRACT_VERSION.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION } from '../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionFile = join(__dirname, '..', 'vectors', 'VERSION');

if (!existsSync(versionFile)) {
  console.error('MISSING: vectors/VERSION file');
  console.error('Create it with: echo "' + CONTRACT_VERSION + '" > vectors/VERSION');
  process.exit(1);
}

const vectorVersion = readFileSync(versionFile, 'utf8').trim();

if (vectorVersion !== CONTRACT_VERSION) {
  console.error(`MISMATCH: vectors/VERSION is "${vectorVersion}" but CONTRACT_VERSION is "${CONTRACT_VERSION}"`);
  console.error('Update vectors/VERSION to match the current contract version.');
  process.exit(1);
}

console.log(`OK: vectors/VERSION matches CONTRACT_VERSION (${CONTRACT_VERSION})`);
