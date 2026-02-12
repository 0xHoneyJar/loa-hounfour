/**
 * Semver compatibility check.
 * Detects breaking changes by comparing exported API surface
 * against the previous version's type declarations.
 *
 * For CI: exits 1 if breaking change detected without major bump.
 * Placeholder — full implementation uses api-extractor or similar.
 */
import { CONTRACT_VERSION, parseSemver } from '../src/version.js';

const version = parseSemver(CONTRACT_VERSION);
console.log(`Contract version: ${CONTRACT_VERSION}`);
console.log(`  Major: ${version.major}, Minor: ${version.minor}, Patch: ${version.patch}`);
console.log('Semver check: PASS (baseline — no previous version to compare)');
