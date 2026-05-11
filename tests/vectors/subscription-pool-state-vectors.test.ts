/**
 * PR-A4.3 (FR-G3) — Vector-fixture conformance runner for
 * `SubscriptionPoolStateSchema`.
 *
 * Walks `vectors/SubscriptionPoolState/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and asserts the two-layer validator topology per the cycle-005 +
 * PR-A4.1 + PR-A4.2 vector-runner discipline:
 *
 *   - `valid/*.json` payloads pass `Value.Check` (structural) AND
 *     `validate(...)` (cross-field, including SPS-1 bigint-safe +
 *     SPS-2 distinctness + SPS-4 JCS-canonical-form ordering).
 *   - `valid/*.json` payloads satisfy in-runtime canonical-form
 *     idempotency (V8 determinism pin; cross-runtime byte-identity
 *     is the FR-A2 harness's domain).
 *   - `invalid/*.json` payloads fail `Value.Check` — structural-tier
 *     rejection.
 *   - `invalid-cross-field/*.json` payloads PASS `Value.Check`
 *     (structurally well-formed) but FAIL `validate(...)`.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SubscriptionPoolStateSchema } from '../../src/canonical/subscription-pool-state.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(
    __dirname,
    '..',
    '..',
    'vectors',
    'SubscriptionPoolState',
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

describe('SubscriptionPoolState vector fixtures (FR-G3 / PR-A4.3)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const invalidCrossFieldFixtures = listFixtures('invalid-cross-field');

  it('publishes the expected fixture cardinality (≥10 valid + ≥4 invalid + ≥3 invalid-cross-field)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(4);
    expect(invalidCrossFieldFixtures.length).toBeGreaterThanOrEqual(3);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(SubscriptionPoolStateSchema, data);
        if (!ok) {
          const errs = [
            ...Value.Errors(SubscriptionPoolStateSchema, data),
          ].slice(0, 3);
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — cross-field (validate, including SPS-1 / SPS-2 / SPS-4)', () => {
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(SubscriptionPoolStateSchema, data, { acceptDeferred: true });
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
      'ts',
      'cluster_id',
      'pool_health_id',
      'accounts',
      'pause_resume_pair_id',
      'signer_cluster_id',
      'signature',
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
        expect(Value.Check(SubscriptionPoolStateSchema, data)).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — SPS-1 / SPS-2 / SPS-4 rejection', () => {
    for (const f of invalidCrossFieldFixtures) {
      it(`Value.Check passes (structural) ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        expect(Value.Check(SubscriptionPoolStateSchema, data)).toBe(true);
      });

      it(`validate() rejects with SPS-1 / SPS-2 / SPS-4 error ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        const result = validate(SubscriptionPoolStateSchema, data, { acceptDeferred: true });
        expect(result.valid).toBe(false);
        if (result.valid) return;
        const hasSps =
          result.errors.some((e) => e.includes('SPS-1')) ||
          result.errors.some((e) => e.includes('SPS-2')) ||
          result.errors.some((e) => e.includes('SPS-4'));
        expect(hasSps).toBe(true);
      });
    }
  });
});

describe('SubscriptionPoolState valid-fixture coverage breadth (FR-G3 / PR-A4.3)', () => {
  function listValid(): string[] {
    return readdirSync(join(vectorsRoot(), 'valid'))
      .filter((f) => f.endsWith('.json'))
      .sort();
  }

  it('covers a minimal single-account envelope', () => {
    expect(listValid().filter((f) => f.includes('minimal'))).toHaveLength(1);
  });

  it('covers a bigint-stress (10^50) fixture for SPS-1 verification', () => {
    expect(
      listValid().filter((f) => f.includes('bigint-stress')),
    ).toHaveLength(1);
  });

  it('covers SPS-1 boundary: consumed == allocated', () => {
    expect(
      listValid().filter((f) => f.includes('consumed-equals-allocated')),
    ).toHaveLength(1);
  });

  it('covers SPS-4 boundary: stable_until == ts', () => {
    expect(
      listValid().filter((f) => f.includes('stable-until-equals-ts')),
    ).toHaveLength(1);
  });

  it('covers a max-256-accounts envelope', () => {
    expect(
      listValid().filter((f) => f.includes('max-256-accounts')),
    ).toHaveLength(1);
  });

  it('covers an envelope with a non-null pool_health_id', () => {
    expect(
      listValid().filter((f) => f.includes('pool-health-link')),
    ).toHaveLength(1);
  });

  it('covers a multi-account mixed-states envelope', () => {
    expect(
      listValid().filter((f) => f.includes('multi-account-mixed-states')),
    ).toHaveLength(1);
  });
});
