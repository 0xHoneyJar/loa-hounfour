/**
 * PR-A3.6 (FR-B9 + FR-B10) — Vector-fixture conformance runner for
 * `PlanSignoffEnvelopeSchema` and `PlanAmendmentRequestSchema`.
 *
 * Walks `vectors/PlanSignoffEnvelope/v8.6.0/{valid,invalid,boundary}`
 * and `vectors/PlanAmendmentRequest/v8.6.0/{valid,invalid,boundary}`
 * and asserts:
 *   - `valid/*.json` payloads pass `Value.Check`.
 *   - `invalid/*.json` payloads fail `Value.Check`.
 *   - `boundary/*.json` payloads pass at the structural layer
 *     (constraint-level boundary cases — TTL upper bound 2^53-1,
 *     consumer-policy severity correction, etc. — are exercised
 *     via the FR-C4 builtin tests and the constraint-loading
 *     conformance test, NOT via fixture rejection at the
 *     structural layer).
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlanSignoffEnvelopeSchema } from '../../src/governance/plan-signoff-envelope.js';
import { PlanAmendmentRequestSchema } from '../../src/governance/plan-amendment-request.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(schemaDir: string): string {
  return join(__dirname, '..', '..', 'vectors', schemaDir, 'v8.6.0');
}

function loadFixture(
  schemaDir: string,
  bucket: string,
  name: string,
): { data: unknown; comment?: string } {
  const raw = JSON.parse(
    readFileSync(join(vectorsRoot(schemaDir), bucket, name), 'utf8'),
  ) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  return { data, comment: typeof _comment === 'string' ? _comment : undefined };
}

function listFixtures(schemaDir: string, bucket: string): string[] {
  try {
    return readdirSync(join(vectorsRoot(schemaDir), bucket))
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

describe('PlanSignoffEnvelope vector fixtures (FR-B9 / PR-A3.6)', () => {
  const validFixtures = listFixtures('PlanSignoffEnvelope', 'valid');
  const invalidFixtures = listFixtures('PlanSignoffEnvelope', 'invalid');
  const boundaryFixtures = listFixtures('PlanSignoffEnvelope', 'boundary');

  it('publishes the expected fixture cardinality', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(5);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(8);
    expect(boundaryFixtures.length).toBeGreaterThanOrEqual(3);
  });

  describe('valid/', () => {
    for (const f of validFixtures) {
      it(`validates ${f}`, () => {
        const { data } = loadFixture('PlanSignoffEnvelope', 'valid', f);
        const ok = Value.Check(PlanSignoffEnvelopeSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(PlanSignoffEnvelopeSchema, data)].slice(0, 3);
          throw new Error(
            `Expected valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('invalid/', () => {
    for (const f of invalidFixtures) {
      it(`fails schema check ${f}`, () => {
        const { data } = loadFixture('PlanSignoffEnvelope', 'invalid', f);
        expect(Value.Check(PlanSignoffEnvelopeSchema, data)).toBe(false);
      });
    }
  });

  describe('boundary/', () => {
    for (const f of boundaryFixtures) {
      it(`accepts boundary case ${f}`, () => {
        const { data } = loadFixture('PlanSignoffEnvelope', 'boundary', f);
        const ok = Value.Check(PlanSignoffEnvelopeSchema, data);
        if (!ok) {
          const errs = [
            ...Value.Errors(PlanSignoffEnvelopeSchema, data),
          ].slice(0, 3);
          throw new Error(
            `Expected boundary fixture to be schema-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });
});

describe('PlanAmendmentRequest vector fixtures (FR-B10 / PR-A3.6)', () => {
  const validFixtures = listFixtures('PlanAmendmentRequest', 'valid');
  const invalidFixtures = listFixtures('PlanAmendmentRequest', 'invalid');
  const boundaryFixtures = listFixtures('PlanAmendmentRequest', 'boundary');

  it('publishes the expected fixture cardinality', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(5);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(6);
    expect(boundaryFixtures.length).toBeGreaterThanOrEqual(2);
  });

  describe('valid/', () => {
    for (const f of validFixtures) {
      it(`validates ${f}`, () => {
        const { data } = loadFixture('PlanAmendmentRequest', 'valid', f);
        const ok = Value.Check(PlanAmendmentRequestSchema, data);
        if (!ok) {
          const errs = [
            ...Value.Errors(PlanAmendmentRequestSchema, data),
          ].slice(0, 3);
          throw new Error(
            `Expected valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('invalid/', () => {
    for (const f of invalidFixtures) {
      it(`fails schema check ${f}`, () => {
        const { data } = loadFixture('PlanAmendmentRequest', 'invalid', f);
        expect(Value.Check(PlanAmendmentRequestSchema, data)).toBe(false);
      });
    }
  });

  describe('boundary/', () => {
    for (const f of boundaryFixtures) {
      it(`accepts boundary case ${f}`, () => {
        const { data } = loadFixture(
          'PlanAmendmentRequest',
          'boundary',
          f,
        );
        const ok = Value.Check(PlanAmendmentRequestSchema, data);
        if (!ok) {
          const errs = [
            ...Value.Errors(PlanAmendmentRequestSchema, data),
          ].slice(0, 3);
          throw new Error(
            `Expected boundary fixture to be schema-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });
});

describe('PlanSignoffEnvelope validate() obligations surfacing', () => {
  it('default validate() rejects with CRYPTO_DEFERRED (safe-by-default x-crypto-bearing)', () => {
    const { data } = loadFixture(
      'PlanSignoffEnvelope',
      'valid',
      'canonical-001-single-operator-T2.json',
    );
    const result = validate(PlanSignoffEnvelopeSchema, data);
    expect(result.valid).toBe(false);
    if (result.valid !== false) return;
    expect(result.errors.some((e) => e.includes('CRYPTO_DEFERRED'))).toBe(true);
  });

  it('emits crypto-deferred + chain-bearing obligations under acceptDeferred', () => {
    const { data } = loadFixture(
      'PlanSignoffEnvelope',
      'valid',
      'canonical-001-single-operator-T2.json',
    );
    const result = validate(PlanSignoffEnvelopeSchema, data, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const manifest = result.unverified_obligations;
    expect(manifest, 'manifest must be emitted on the deferred path').toBeDefined();
    expect(manifest!.unverified_rules.length).toBeGreaterThan(0);
    const reasons = manifest!.unverified_rules.map((r) => r.reason);
    expect(reasons).toContain('crypto_deferred');
  });
});

describe('PlanAmendmentRequest validate() obligations surfacing', () => {
  it('default validate() succeeds (NOT crypto-bearing) and emits chain-bearing obligation', () => {
    const { data } = loadFixture(
      'PlanAmendmentRequest',
      'valid',
      'canonical-001-minor-schema-drift.json',
    );
    const result = validate(PlanAmendmentRequestSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const manifest = result.unverified_obligations;
    expect(
      manifest,
      'manifest must surface the x-chain-bearing obligation',
    ).toBeDefined();
    // validate() emits x-crypto-bearing / x-integrity-bearing /
    // x-chain-bearing dispatch entries; constraint-file runtime-deferred
    // entries (PAR-2/3/4/6) surface via `npm run check:constraints` rather
    // than at validate() time per the v8.5.0 boundary.
    const reasons = manifest!.unverified_rules.map((r) => r.reason);
    expect(reasons).toContain('context_absent');
  });

  it('failClosed: true rejects when chain context not supplied (x-chain-bearing FR-A4 contract)', () => {
    const { data } = loadFixture(
      'PlanAmendmentRequest',
      'valid',
      'canonical-001-minor-schema-drift.json',
    );
    const result = validate(PlanAmendmentRequestSchema, data, {
      failClosed: true,
    });
    expect(result.valid).toBe(false);
  });
});
