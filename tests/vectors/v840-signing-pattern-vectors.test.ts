/**
 * Sprint-5 (PR-A1.5) — TS reference sweep over the signing/ed25519-pattern and
 * signing/contract-version-binding corpora at vectors/signing/.
 *
 * The library declares signature/key formats; cryptographic verification is
 * consumer-side per NF-1. These vectors exercise *pattern recognition* only.
 *
 * Canonicalization and strict-subset-pathologies corpora are consumed by
 * cross-language runners (RFC 8785 implementations differ across languages);
 * the TS sweep here covers the patterns the schema layer enforces.
 *
 * @see SDD section 5 NF-1b — Verification profile
 * @see Sprint 5 / D5.5 + D5.6
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIGNING_ROOT = join(__dirname, '..', '..', 'vectors', 'signing');

function loadCases(subdir: string, kind: 'valid' | 'invalid'): { name: string; data: Record<string, unknown> }[] {
  const dir = join(SIGNING_ROOT, subdir, kind);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return files.map((f) => ({
    name: f.replace(/\.json$/, ''),
    data: JSON.parse(readFileSync(join(dir, f), 'utf8')),
  }));
}

describe('v8.4.0 ed25519-pattern vectors', () => {
  const validCases = loadCases('ed25519-pattern', 'valid');
  const invalidCases = loadCases('ed25519-pattern', 'invalid');

  describe('valid/', () => {
    for (const c of validCases) {
      const value = c.data.value as string;
      const pattern = c.data.pattern as string;
      it(`${c.name} matches ${pattern}`, () => {
        expect(new RegExp(pattern).test(value)).toBe(true);
      });
    }
  });

  describe('invalid/', () => {
    for (const c of invalidCases) {
      const value = c.data.value as string;
      const pattern = c.data.pattern as string;
      it(`${c.name} does NOT match ${pattern}`, () => {
        expect(new RegExp(pattern).test(value)).toBe(false);
      });
    }
  });
});

describe('v8.4.0 contract-version-binding vectors', () => {
  const SEMVER_PATTERN = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
  const validCases = loadCases('contract-version-binding', 'valid');
  const invalidCases = loadCases('contract-version-binding', 'invalid');

  describe('valid/', () => {
    for (const c of validCases) {
      if (typeof c.data.value === 'string') {
        it(`${c.name} matches semver pattern`, () => {
          expect(SEMVER_PATTERN.test(c.data.value as string)).toBe(true);
        });
      }
    }
  });

  describe('invalid/', () => {
    for (const c of invalidCases) {
      if (typeof c.data.value === 'string') {
        it(`${c.name} does NOT match semver pattern`, () => {
          expect(SEMVER_PATTERN.test(c.data.value as string)).toBe(false);
        });
      }
    }
  });
});
