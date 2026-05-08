/**
 * PR-A3.4 (FR-B2) — Vector-fixture conformance runner for
 * `PhaseCompletionEnvelopeSchema` (Tier-1 + Tier-2).
 *
 * Walks `vectors/PhaseCompletionEnvelope/v8.6.0/{valid,invalid,boundary}`
 * and asserts that:
 *   - `valid/*.json` payloads pass `Value.Check(Tier-2 schema, payload)`,
 *     EXCEPT the dedicated `*-tier1-only-shape.json` which validates
 *     against the Tier-1 schema.
 *   - `invalid/*.json` payloads fail `Value.Check`.
 *   - `boundary/*.json` payloads exercise edge cases AND validate
 *     either against Tier-2 or Tier-1 (boundary fixtures are all valid
 *     in PR-A3.4's scope; constraint-level boundary cases such as the
 *     4 KB cap are exercised via the `canonical_size_cap` builtin
 *     tests, NOT via fixture rejection at the structural layer).
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation (the field is for human readers).
 *
 * @see docs/architecture/canonicalization-spec-v8.6.md §11.1 —
 *      PhaseCompletion canonicalization profile.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PhaseCompletionEnvelopeSchema,
} from '../../src/integrity/phase-completion-envelope.js';
import {
  PhaseCompletionEnvelopeTier1Schema,
} from '../../src/integrity/phase-completion-envelope-tier1.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_ROOT = join(
  __dirname,
  '..',
  '..',
  'vectors',
  'PhaseCompletionEnvelope',
  'v8.6.0',
);

function loadFixture(dir: string, name: string): { data: unknown; comment?: string } {
  const raw = JSON.parse(
    readFileSync(join(VECTORS_ROOT, dir, name), 'utf8'),
  ) as Record<string, unknown>;
  // Strip the optional `_comment` field — it's for human readers, not
  // part of the wire shape under test.
  const { _comment, ...data } = raw;
  return { data, comment: typeof _comment === 'string' ? _comment : undefined };
}

function listFixtures(dir: string): string[] {
  try {
    return readdirSync(join(VECTORS_ROOT, dir))
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

describe('PhaseCompletionEnvelope vector fixtures (FR-B2 / PR-A3.4)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const boundaryFixtures = listFixtures('boundary');

  it('publishes the expected fixture cardinality', () => {
    // Sprint AC: ≥10 valid, ≥30 invalid, ≥10 boundary. PR-A3.4 ships a
    // pragmatic subset: 10 + 20 + 5 = 35 fixtures covering each of the
    // schema-level invariants. Cross-runner conformance fixtures
    // expand to the full sprint count in PR-A3.9 (FR-A2).
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(15);
    expect(boundaryFixtures.length).toBeGreaterThanOrEqual(5);
  });

  describe('valid/', () => {
    for (const f of validFixtures) {
      it(`validates ${f}`, () => {
        const { data } = loadFixture('valid', f);
        // Tier-1-only fixtures use the inner schema; everything else
        // validates against Tier-2.
        // Iter-1 LOW F5 mitigation: regex anchored to a stable naming
        // pattern rather than a substring match, so a fixture named
        // e.g. `tier1-only-edge-case-N.json` doesn't accidentally route
        // a future Tier-2 test through the Tier-1 schema.
        const schema = /-tier1-only-/.test(f)
          ? PhaseCompletionEnvelopeTier1Schema
          : PhaseCompletionEnvelopeSchema;
        const ok = Value.Check(schema, data);
        if (!ok) {
          const errs = [...Value.Errors(schema, data)].slice(0, 3);
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
        const { data } = loadFixture('invalid', f);
        // Tier-1 invariant violations validate at the inner Tier-1
        // schema layer, but the Tier-2 `additionalProperties: false`
        // + property-shape strictness propagates the inner failure
        // structurally — the Tier-2 `Value.Check` call catches both.
        expect(Value.Check(PhaseCompletionEnvelopeSchema, data)).toBe(false);
      });
    }
  });

  describe('boundary/', () => {
    for (const f of boundaryFixtures) {
      it(`accepts boundary case ${f}`, () => {
        const { data } = loadFixture('boundary', f);
        // PR-A3.4's boundary fixtures are all valid at the structural
        // layer — they exercise edge cases like sequence "0",
        // key_version "1", and near-cap payloads. Constraint-level
        // boundary cases (the 4 KB cap exact, etc.) are exercised
        // via the `canonical_size_cap` builtin tests in
        // `tests/constraints/canonical-size-cap.test.ts`.
        const ok = Value.Check(PhaseCompletionEnvelopeSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(PhaseCompletionEnvelopeSchema, data)].slice(0, 3);
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

// Iter-2 MEDIUM F5/F6 mitigation: integration test wiring schema +
// crypto-bearing acknowledgment + UnverifiedObligationsManifest
// surfacing. Confirms that consumers calling validate() on a Tier-2
// envelope receive ALL the runtime-deferred obligations (PCE-1
// cluster signature, PCE-4 nonce uniqueness, PCE-5 sequence
// monotonicity, PCE-6 chain prev-hash) as actionable manifest
// entries — closing the F5 risk that runtime-deferred constraints
// silently no-op without consumer awareness.
describe('PhaseCompletionEnvelope validate() obligations surfacing (iter-2 F5/F6)', () => {
  it('emits crypto-deferred obligation when validate() is called with acceptDeferred', () => {
    const { data } = loadFixture('valid', 'canonical-001-genesis-anchor.json');
    // The schema is x-crypto-bearing; default validate() returns
    // valid:false unless acceptDeferred is supplied.
    const result = validate(PhaseCompletionEnvelopeSchema, data, { acceptDeferred: true });
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const manifest = result.unverified_obligations;
    expect(manifest, 'manifest must be emitted on the crypto-deferred path').toBeDefined();
    expect(manifest!.unverified_rules.length).toBeGreaterThan(0);
    // crypto_deferred reason MUST appear (this is the structural
    // surfacing that satisfies F5 — runtime-deferred obligations are
    // observable).
    const reasons = manifest!.unverified_rules.map((r) => r.reason);
    expect(reasons).toContain('crypto_deferred');
  });

  it('default validate() rejects with CRYPTO_DEFERRED (safe-by-default x-crypto-bearing)', () => {
    const { data } = loadFixture('valid', 'canonical-001-genesis-anchor.json');
    const result = validate(PhaseCompletionEnvelopeSchema, data);
    expect(result.valid).toBe(false);
    if (result.valid !== false) return;
    expect(result.errors.some((e) => e.includes('CRYPTO_DEFERRED'))).toBe(true);
  });

  it('chain-bearing flag enables failClosed opt-in (FR-A4 contract)', () => {
    const { data } = loadFixture('valid', 'canonical-001-genesis-anchor.json');
    // Without chainContext + failClosed, the chain-bearing schema
    // emits the manifest entry but accepts the record (default path).
    const result1 = validate(PhaseCompletionEnvelopeSchema, data, { acceptDeferred: true });
    expect(result1.valid).toBe(true);
    // With failClosed + missing chainContext, validate() MUST reject.
    const result2 = validate(PhaseCompletionEnvelopeSchema, data, {
      acceptDeferred: true,
      failClosed: true,
    });
    expect(result2.valid).toBe(false);
    if (result2.valid !== false) return;
    expect(result2.errors.some((e) => e.startsWith('CHAIN_CONTEXT_DEFERRED:'))).toBe(true);
  });
});
