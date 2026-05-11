/**
 * PR-A4.4 (FR-G4) — Vector-fixture conformance runner for
 * `RevocationListSchema`.
 *
 * Walks `vectors/RevocationList/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and asserts the two-layer validator topology per the cycle-005 +
 * PR-A4.1/A4.2/A4.3 vector-runner discipline.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RevocationListSchema } from '../../src/canonical/revocation-list.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(
    __dirname,
    '..',
    '..',
    'vectors',
    'RevocationList',
    'v8.7.0',
  );
}

function loadFixture(
  bucket: string,
  name: string,
): { data: unknown; comment?: string } {
  const raw = JSON.parse(
    readFileSync(join(vectorsRoot(), bucket, name), 'utf8'),
  ) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  return { data, comment: typeof _comment === 'string' ? _comment : undefined };
}

function listFixtures(bucket: string): string[] {
  const dir = join(vectorsRoot(), bucket);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

describe('RevocationList vector fixtures (FR-G4 / PR-A4.4)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const invalidCrossFieldFixtures = listFixtures('invalid-cross-field');

  it('publishes the expected fixture cardinality (≥10 valid + ≥10 invalid + ≥5 invalid-cross-field)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidCrossFieldFixtures.length).toBeGreaterThanOrEqual(5);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(RevocationListSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(RevocationListSchema, data)].slice(0, 3);
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — cross-field (validate with acceptDeferred per crypto-bearing)', () => {
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(RevocationListSchema, data, {
          acceptDeferred: true,
        });
        if (!result.valid) {
          throw new Error(
            `Expected valid; errors: ${JSON.stringify(result.errors)}`,
          );
        }
      });
    }
  });

  describe('valid/ — in-runtime canonical-form idempotency (V8 determinism pin)', () => {
    const EXPECTED_TOP_LEVEL_KEY_ORDER = [
      'envelope_kind',
      'contract_version',
      'cluster_id',
      'list_id',
      'issued_at',
      'valid_from',
      'valid_until',
      'max_staleness_seconds',
      'nonce',
      'prev_envelope_hash',
      'next_page_hash',
      'revoked_keys',
      'signer_key_id',
      'signature',
      'quorum_signatures',
      'root_of_trust_id',
    ];

    for (const f of validFixtures) {
      it(`canonical-form idempotency ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const canonical = JSON.stringify(data);
        const reSerialized = JSON.stringify(JSON.parse(canonical));
        expect(reSerialized).toBe(canonical);
        const observedKeys = Object.keys(data as Record<string, unknown>);
        expect(observedKeys).toEqual(EXPECTED_TOP_LEVEL_KEY_ORDER);
      });
    }
  });

  describe('invalid/ — structural rejection (Value.Check tier)', () => {
    for (const f of invalidFixtures) {
      it(`fails Value.Check ${f}`, () => {
        const { data } = loadFixture('invalid', f);
        expect(Value.Check(RevocationListSchema, data)).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — RL-N rejection (validate tier)', () => {
    for (const f of invalidCrossFieldFixtures) {
      it(`Value.Check passes (structural) ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        expect(Value.Check(RevocationListSchema, data)).toBe(true);
      });

      it(`validate() rejects with at least one RL-N error ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        const result = validate(RevocationListSchema, data, {
          acceptDeferred: true,
        });
        expect(result.valid).toBe(false);
        if (result.valid) return;
        const hasRl =
          result.errors.some((e) => /RL-(1|5|7|9|10|12)\b/.test(e));
        expect(hasRl).toBe(true);
      });
    }
  });
});

describe('RevocationList valid-fixture coverage breadth (FR-G4 / PR-A4.4)', () => {
  function listValid(): string[] {
    return readdirSync(join(vectorsRoot(), 'valid'))
      .filter((f) => f.endsWith('.json'))
      .sort();
  }

  it('covers a genesis envelope (null prev_envelope_hash, empty revoked_keys)', () => {
    expect(listValid().filter((f) => f.includes('genesis-empty'))).toHaveLength(
      1,
    );
  });

  it('covers a continuation page with no new revocations (RL-8 non-constraint lock)', () => {
    expect(
      listValid().filter((f) => f.includes('continuation-no-new')),
    ).toHaveLength(1);
  });

  it('covers all 5 RevocationReason enum members', () => {
    expect(
      listValid().filter((f) => f.includes('all-reasons-represented')),
    ).toHaveLength(1);
  });

  it('covers a closed validity window (valid_until non-null)', () => {
    expect(
      listValid().filter((f) => f.includes('closed-validity-window')),
    ).toHaveLength(1);
  });

  it('covers a quorum-signatures envelope with primary in the set', () => {
    expect(
      listValid().filter((f) => f.includes('quorum-with-primary-member')),
    ).toHaveLength(1);
  });

  it('covers a 32-signer quorum (maxItems boundary)', () => {
    expect(
      listValid().filter((f) => f.includes('quorum-max-32-signers')),
    ).toHaveLength(1);
  });

  it('covers a root_of_trust_id binding (Layer 2 recovery hook)', () => {
    expect(
      listValid().filter((f) => f.includes('root-of-trust-binding')),
    ).toHaveLength(1);
  });

  it('covers a 100-entry revoked_keys envelope (RL-1 scale exercise)', () => {
    expect(
      listValid().filter((f) => f.includes('many-revocations-100')),
    ).toHaveLength(1);
  });
});
