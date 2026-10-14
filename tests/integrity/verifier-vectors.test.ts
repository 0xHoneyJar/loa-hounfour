/**
 * Reference-verifier conformance suite (FR-C2, SDD §5) through the TS
 * reference functions. The Go port runs the same files in
 * vectors/runners/go/verify/vectors_test.go; scripts/run-verifier-parity.sh
 * diffs the two runners' manifests.
 *
 * Also locks the suite to its deterministic generator: regenerating
 * in-memory must reproduce every committed file byte for byte.
 *
 * @since v8.8.0 (FR-C2)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVerifierCases, runVerifierCase, VERIFIER_KINDS } from '../../scripts/lib/verifier-cases.js';
import { buildVerifierSuite, TEST_KEY_NOTICE } from '../../scripts/generate-verifier-vectors.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cases = loadVerifierCases(repoRoot);

const REQUIRED: Record<string, string[]> = {
  'audit-trail': ['valid-3-entries', 'content-tampered-index-1', 'chain-broken-index-2', 'genesis-mismatch', 'empty-trail-valid'],
  signature: ['valid', 'body-tampered', 'wrong-key', 'malformed-signature', 'missing-signature-unverifiable', 'quorum-field-omitted-valid'],
  revocation: ['not-revoked', 'revoked-before-at', 'revoked-after-at-not-yet', 'list-not-yet-valid', 'list-expired', 'two-lists-latest-wins'],
};

describe('verifier conformance suite (TS reference)', () => {
  for (const c of cases) {
    it(`${c.kind}/${c.case}`, async () => {
      const result = JSON.parse(JSON.stringify(await runVerifierCase(c))) as unknown;
      expect(result).toEqual(c.expected);
    });
  }

  it('contains every case SDD §5 requires', () => {
    for (const [kind, names] of Object.entries(REQUIRED)) {
      const have = new Set(cases.filter((c) => c.kind === kind).map((c) => c.case));
      for (const n of names) expect(have.has(n), `${kind}/${n}`).toBe(true);
    }
  });

  it('_meta.json lists exactly the case files', () => {
    const meta = JSON.parse(readFileSync(join(repoRoot, 'vectors/verifier/_meta.json'), 'utf8')) as {
      cases: { kind: string; case: string }[];
    };
    const listed = meta.cases.map((c) => `${c.kind}/${c.case}`).sort();
    const onDisk = VERIFIER_KINDS.flatMap((k) =>
      readdirSync(join(repoRoot, 'vectors/verifier', k))
        .filter((f) => f.endsWith('.json'))
        .map((f) => `${k}/${f.slice(0, -5)}`),
    ).sort();
    expect(listed).toEqual(onDisk);
  });

  it('every key file carries the test-key notice', () => {
    const dir = join(repoRoot, 'vectors/verifier/keys');
    const files = readdirSync(dir).filter((f) => f !== 'README.md');
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) {
      expect(readFileSync(join(dir, f), 'utf8').split('\n')[0]).toBe(`# ${TEST_KEY_NOTICE}`);
    }
  });

  it('committed files equal a fresh deterministic regeneration', () => {
    for (const [rel, content] of buildVerifierSuite()) {
      expect(readFileSync(join(repoRoot, rel), 'utf8'), rel).toBe(content);
    }
  });
});
