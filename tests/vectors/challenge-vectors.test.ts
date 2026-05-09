/**
 * PR-A3.7 (FR-A1) — Vector-fixture conformance runner for
 * `ChallengeSchema`.
 *
 * Walks `vectors/Challenge/v8.6.0/{valid,invalid}` and asserts:
 *   - `valid/*.json` payloads pass `Value.Check` (structural).
 *   - `valid/*.json` payloads pass `validate(..., { acceptDeferred: true })`.
 *     CHL-1..CHL-4 are runtime-deferred / consumer-policy, so this
 *     second layer verifies envelope-level deferral and manifest
 *     emission — NOT in-library cross-field DSL evaluation. Per the
 *     PR-A3.5 two-layer vector-runner discipline: every fixture
 *     exercised through both Value.Check AND validate() so the gap
 *     between shape-correct and contract-correct closes (the
 *     manifest emission check catches the "x-crypto-bearing flag
 *     dropped silently in a refactor" failure mode that pure
 *     Value.Check would miss).
 *   - `invalid/*.json` payloads fail `Value.Check`.
 *
 * Cardinality assertion: 54 valid (9 challenge_type × 6 requested_effect)
 * plus 6 invalid (one per missing required field).
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChallengeSchema } from '../../src/governance/challenge.js';
import {
  CHALLENGE_TYPES,
  CHALLENGE_REQUESTED_EFFECTS,
} from '../../src/governance/challenge-types.js';
import { validate } from '../../src/validators/index.js';

// iter-1 F-006 / iter-2 F-001 / iter-4 F-002 mitigation: TYPES and
// EFFECTS pull from the source-of-truth canonical arrays exported
// alongside the schemas themselves. Tests no longer reverse-engineer
// the schema's internal anyOf encoding (which would silently break
// under a future TypeBox refactor); the schemas and the tests
// consume the same arrays. Strict-additive enum widening is a
// single-edit diff at the source of truth; the cardinality
// assertion is "fixtures cover the cross-product" not "fixtures
// equal the magic number 54".
const TYPES = CHALLENGE_TYPES;
const EFFECTS = CHALLENGE_REQUESTED_EFFECTS;

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(__dirname, '..', '..', 'vectors', 'Challenge', 'v8.6.0');
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
  // iter-3 F-001 mitigation: do NOT swallow filesystem errors. A
  // renamed/missing/unreadable directory must surface as a clear
  // ENOENT/EACCES with the failing path, not as a downstream
  // length-assertion failure that costs an hour of debugging. The
  // S3-SDK precedent of distinguishing NoSuchKey from AccessDenied
  // is the right shape here: failure mode IS the product for
  // test-infrastructure code.
  const dir = join(vectorsRoot(), bucket);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

describe('Challenge vector fixtures (FR-A1 / PR-A3.7)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');

  it('publishes a fixture for every (challenge_type, requested_effect) pairing', () => {
    // Shape contract: every cross-product entry is covered. The exact
    // cardinality is *derived* from the live enum schemas, not pinned to
    // a magic number — strict-additive enum widening self-updates.
    expect(validFixtures.length).toBe(TYPES.length * EFFECTS.length);
    expect(TYPES.length).toBeGreaterThan(0);
    expect(EFFECTS.length).toBeGreaterThan(0);
  });

  it('publishes invalid fixtures across required-field + format-level negatives', () => {
    // 6 missing-required-field + 14 format-level (iter-1 F-003 mitigation
    // covering enum-out-of-vocabulary, ts-non-utc, signature alphabet/length,
    // evidence_hashes shape, additionalProperties, rationale bounds,
    // discriminator literals).
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(20);
  });

  it('valid/ contains every (challenge_type, requested_effect) cross-product entry derived from the live enum schemas', () => {
    const expectedPairs = new Set<string>();
    for (const t of TYPES) {
      for (const e of EFFECTS) {
        expectedPairs.add(`${t}|${e}`);
      }
    }
    const observedPairs = new Set<string>();
    for (const f of validFixtures) {
      const { data } = loadFixture('valid', f);
      const d = data as { challenge_type: string; requested_effect: string };
      observedPairs.add(`${d.challenge_type}|${d.requested_effect}`);
    }
    expect(observedPairs.size).toBe(expectedPairs.size);
    for (const p of expectedPairs) {
      expect(observedPairs.has(p)).toBe(true);
    }
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(ChallengeSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(ChallengeSchema, data)].slice(0, 3);
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — cross-field (validate, acceptDeferred)', () => {
    // Two-layer vector-runner contract per PR-A3.5 iter-5 — every fixture
    // exercised through BOTH Value.Check AND validate() so the
    // protobuf-conformance gap (structural-pass / cross-field-fail) closes.
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(ChallengeSchema, data, {
          acceptDeferred: true,
        });
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid/ — structural rejection', () => {
    for (const f of invalidFixtures) {
      it(`fails Value.Check ${f}`, () => {
        const { data } = loadFixture('invalid', f);
        expect(Value.Check(ChallengeSchema, data)).toBe(false);
      });
    }
  });
});

describe('Challenge validate() obligations surfacing (FR-A1 crypto-bearing)', () => {
  it('default validate() rejects with CRYPTO_DEFERRED (safe-by-default x-crypto-bearing)', () => {
    const { data } = loadFixture(
      'valid',
      'canonical-001-factual-dispute-void.json',
    );
    const result = validate(ChallengeSchema, data);
    expect(result.valid).toBe(false);
    if (result.valid !== false) return;
    expect(result.errors.some((e) => e.includes('CRYPTO_DEFERRED'))).toBe(true);
  });

  it('emits crypto_deferred obligation under acceptDeferred', () => {
    const { data } = loadFixture(
      'valid',
      'canonical-001-factual-dispute-void.json',
    );
    const result = validate(ChallengeSchema, data, { acceptDeferred: true });
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const manifest = result.unverified_obligations;
    expect(
      manifest,
      'manifest must be emitted on the deferred path',
    ).toBeDefined();
    expect(manifest!.unverified_rules.length).toBeGreaterThan(0);
    const reasons = manifest!.unverified_rules.map((r) => r.reason);
    expect(reasons).toContain('crypto_deferred');
  });
});
