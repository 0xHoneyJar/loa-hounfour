/**
 * Edge-case corpus runner. Locks the canonical output and SHA-256 hash
 * of every fixture in `vectors/_canonicalization-edge-cases/`.
 *
 * Drift in either column is a regression — either in `safeCanonicalize`
 * itself or in one of its substrate dependencies (Unicode tables, RFC
 * 8785 implementation, Node.js string handling).
 *
 * Pairs flagged in `_meta.json` as `hash_equal_with` are additionally
 * checked to produce identical hashes — this is where the NFC and
 * key-ordering invariants live.
 *
 * @see SDD §3.7 Group J — canonicalization edge-case corpus (H2)
 * @since v8.5.0 (PR-A2.1)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { safeCanonicalize } from '../../src/utilities/safe-canonicalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corpusRoot = join(__dirname, '..', '..', 'vectors', '_canonicalization-edge-cases');

interface MetaFixture {
  category: string;
  case: string;
  description: string;
  hash_equal_with?: string;
}

interface CorpusMeta {
  schema: string;
  description: string;
  authored_at: string;
  fixtures: MetaFixture[];
}

const meta = JSON.parse(readFileSync(join(corpusRoot, '_meta.json'), 'utf-8')) as CorpusMeta;

function loadFixture(category: string, caseName: string) {
  const dir = join(corpusRoot, category);
  const input = JSON.parse(readFileSync(join(dir, `${caseName}.input.json`), 'utf-8'));
  const expectedCanonical = readFileSync(join(dir, `${caseName}.canonical.txt`), 'utf-8');
  const expectedHash = readFileSync(join(dir, `${caseName}.hash.txt`), 'utf-8').trim();
  return { input, expectedCanonical, expectedHash };
}

describe('canonicalization edge-case corpus', () => {
  it('catalog references at least 30 fixtures (per H2)', () => {
    expect(meta.fixtures.length).toBeGreaterThanOrEqual(30);
  });

  it('catalog spans every required category (per SDD §3.7 Group J)', () => {
    const categories = new Set(meta.fixtures.map((f) => f.category));
    expect(categories).toEqual(
      new Set(['unicode', 'nesting', 'numeric', 'null-absent', 'key-order', 'string-escape']),
    );
  });

  it.each(meta.fixtures.map((f) => [`${f.category}/${f.case}`, f]))(
    '%s — canonical and hash match the locked-in expectations',
    (_label, f) => {
      const { input, expectedCanonical, expectedHash } = loadFixture(f.category, f.case);
      const canonical = safeCanonicalize(input);
      expect(canonical).toBe(expectedCanonical);
      const actualHash = createHash('sha256').update(canonical, 'utf8').digest('hex');
      expect(actualHash).toBe(expectedHash);
    },
  );

  describe('hash-equality pairs (NFC/NFD, key ordering)', () => {
    const pairs = meta.fixtures.filter((f) => f.hash_equal_with !== undefined);

    it.each(pairs.map((f) => [`${f.category}/${f.case}`, f]))(
      '%s hashes equal to its declared peer',
      (_label, f) => {
        const peer = meta.fixtures.find(
          (p) => `${p.category}/${p.case}` === f.hash_equal_with,
        );
        expect(peer, `peer ${f.hash_equal_with} not in catalog`).toBeDefined();
        const a = loadFixture(f.category, f.case);
        const b = loadFixture(peer!.category, peer!.case);
        expect(a.expectedHash).toBe(b.expectedHash);
        // And re-derive both hashes to make sure the lock-in matches the
        // current safeCanonicalize() output.
        const aHash = createHash('sha256').update(safeCanonicalize(a.input), 'utf8').digest('hex');
        const bHash = createHash('sha256').update(safeCanonicalize(b.input), 'utf8').digest('hex');
        expect(aHash).toBe(bHash);
      },
    );
  });
});
