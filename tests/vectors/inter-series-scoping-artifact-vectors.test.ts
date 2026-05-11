/**
 * PR-A4.2 (FR-G2) — Vector-fixture conformance runner for
 * `InterSeriesScopingArtifactSchema`.
 *
 * Walks `vectors/InterSeriesScopingArtifact/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and asserts the two-layer validator topology per the cycle-005
 * vector-runner discipline (PR-A3.5 / PR-A3.8 / PR-A4.1 precedent):
 *
 *   - `valid/*.json` payloads pass `Value.Check` (structural) AND
 *     `validate(...)` (cross-field, including ISSA-2 + ISSA-3
 *     well-formedness).
 *   - `valid/*.json` payloads satisfy in-runtime canonical-form
 *     idempotency (V8 determinism pin; cross-runtime byte-identity is
 *     the FR-A2 harness's domain).
 *   - `invalid/*.json` payloads fail `Value.Check` — structural-tier
 *     rejection (additionalProperties + minItems + minimum/maximum +
 *     enum + pattern + literal discriminator).
 *   - `invalid-cross-field/*.json` payloads PASS `Value.Check`
 *     (structurally well-formed) but FAIL `validate(...)` — cross-field
 *     tier rejection covering ISSA-2 (id distinctness).
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InterSeriesScopingArtifactSchema } from '../../src/canonical/inter-series-scoping-artifact.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(
    __dirname,
    '..',
    '..',
    'vectors',
    'InterSeriesScopingArtifact',
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

describe('InterSeriesScopingArtifact vector fixtures (FR-G2 / PR-A4.2)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const invalidCrossFieldFixtures = listFixtures('invalid-cross-field');

  it('publishes the expected fixture cardinality (≥10 valid + ≥5 invalid + ≥1 invalid-cross-field)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(5);
    expect(invalidCrossFieldFixtures.length).toBeGreaterThanOrEqual(1);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(InterSeriesScopingArtifactSchema, data);
        if (!ok) {
          const errs = [
            ...Value.Errors(InterSeriesScopingArtifactSchema, data),
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

  describe('valid/ — cross-field (validate, including ISSA-2 + ISSA-3)', () => {
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(InterSeriesScopingArtifactSchema, data);
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
      'parent_series_id',
      'signoff_envelope_id',
      'proposed_series_goals',
      'constitutional_hash_proof',
      'conformance_chain',
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
        expect(Value.Check(InterSeriesScopingArtifactSchema, data)).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — ISSA-2 rejection (validate() tier)', () => {
    for (const f of invalidCrossFieldFixtures) {
      it(`Value.Check passes (structural) ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        expect(Value.Check(InterSeriesScopingArtifactSchema, data)).toBe(true);
      });

      it(`validate() rejects with ISSA-2 or ISSA-3 error ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        const result = validate(InterSeriesScopingArtifactSchema, data);
        expect(result.valid).toBe(false);
        if (result.valid) return;
        const hasIssa =
          result.errors.some((e) => e.includes('ISSA-2')) ||
          result.errors.some((e) => e.includes('ISSA-3'));
        expect(hasIssa).toBe(true);
      });
    }
  });
});

describe('InterSeriesScopingArtifact valid-fixture coverage breadth (FR-G2 / PR-A4.2)', () => {
  function listValid(): string[] {
    return readdirSync(join(vectorsRoot(), 'valid'))
      .filter((f) => f.endsWith('.json'))
      .sort();
  }

  it('covers an empty proof_path (one-leaf tree)', () => {
    const fixtures = listValid();
    let found = false;
    for (const f of fixtures) {
      const raw = JSON.parse(
        readFileSync(join(vectorsRoot(), 'valid', f), 'utf8'),
      ) as { constitutional_hash_proof?: { proof_path?: unknown[] } };
      if (
        Array.isArray(raw.constitutional_hash_proof?.proof_path) &&
        raw.constitutional_hash_proof.proof_path.length === 0
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('covers a left-position proof step', () => {
    const fixtures = listValid().filter((f) => f.includes('proof-single-step-left'));
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a right-position proof step', () => {
    const fixtures = listValid().filter((f) => f.includes('proof-single-step-right'));
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers the matching-twins position-discriminator case', () => {
    const fixtures = listValid().filter((f) =>
      f.includes('matching-twins'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a populated conformance_chain', () => {
    const fixtures = listValid().filter((f) =>
      f.includes('conformance-chain-populated'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a multi-goal artifact (≥3 entries)', () => {
    const fixtures = listValid();
    let found = false;
    for (const f of fixtures) {
      const raw = JSON.parse(
        readFileSync(join(vectorsRoot(), 'valid', f), 'utf8'),
      ) as { proposed_series_goals?: unknown[] };
      if (
        Array.isArray(raw.proposed_series_goals) &&
        raw.proposed_series_goals.length >= 3
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('covers an artifact with a non-null signoff_envelope_id', () => {
    const fixtures = listValid().filter((f) =>
      f.includes('with-signoff-envelope'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers conformance_impact_pct boundary fixtures (min and max)', () => {
    const minFixtures = listValid().filter((f) =>
      f.includes('boundary-min'),
    );
    const maxFixtures = listValid().filter((f) =>
      f.includes('boundary-max'),
    );
    expect(minFixtures.length).toBeGreaterThanOrEqual(1);
    expect(maxFixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a deep proof_path (≥16 steps)', () => {
    const fixtures = listValid();
    let found = false;
    for (const f of fixtures) {
      const raw = JSON.parse(
        readFileSync(join(vectorsRoot(), 'valid', f), 'utf8'),
      ) as { constitutional_hash_proof?: { proof_path?: unknown[] } };
      if (
        Array.isArray(raw.constitutional_hash_proof?.proof_path) &&
        raw.constitutional_hash_proof.proof_path.length >= 16
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
