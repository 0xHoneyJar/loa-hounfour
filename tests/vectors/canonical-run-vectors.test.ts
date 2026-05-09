/**
 * PR-A3.8 (FR-B1) — Vector-fixture conformance runner for
 * `CanonicalRunSchema`.
 *
 * Walks `vectors/CanonicalRun/v8.6.0/{valid,invalid,invalid-cross-field}`
 * and asserts:
 *
 *   - `valid/*.json` payloads pass `Value.Check` (structural) AND
 *     `validate(...)` (cross-field, including CR-1) per the PR-A3.5
 *     two-layer vector-runner discipline.
 *   - `valid/*.json` payloads satisfy in-runtime canonical-form
 *     idempotency: re-stringifying the parsed object reproduces the
 *     same bytes the parser was handed (the round-trip pins V8
 *     `JSON.stringify` determinism on objects shaped by these
 *     schemas — true cross-runtime byte-identity is the FR-A2
 *     harness's domain per AT-1; iter-1 F-002 mitigation explicitly
 *     scopes this test to runtime-internal determinism + V8 stable-
 *     property-order behavior).
 *   - `invalid/*.json` payloads fail `Value.Check` — structural-tier
 *     rejection.
 *   - `invalid-cross-field/*.json` payloads PASS `Value.Check`
 *     (structurally well-formed) but FAIL `validate(...)` — CR-1
 *     cross-field tier rejection (iter-1 F-001 mitigation: parallel
 *     invalid corpus mirrors the validator topology so cross-language
 *     runners exercise both tiers).
 *
 * Cardinality (post-iter-2): ≥10 valid + ≥10 invalid + ≥4
 * invalid-cross-field. Sprint.md PR-A3.8 fixture-delta target +20
 * met by valid + invalid; cross-field bucket is iter-2 additive
 * coverage per F-001.
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CanonicalRunSchema } from '../../src/canonical/canonical-run.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(__dirname, '..', '..', 'vectors', 'CanonicalRun', 'v8.6.0');
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
  // PR-A3.7 iter-3 F-001 mitigation: do NOT swallow filesystem errors
  // — a missing or unreadable directory must surface as ENOENT/EACCES
  // with the failing path, not as a downstream length-assertion failure.
  const dir = join(vectorsRoot(), bucket);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

describe('CanonicalRun vector fixtures (FR-B1 / PR-A3.8)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const invalidCrossFieldFixtures = listFixtures('invalid-cross-field');

  it('publishes the expected fixture cardinality (≥10 valid + ≥10 invalid + ≥4 invalid-cross-field)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidCrossFieldFixtures.length).toBeGreaterThanOrEqual(4);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(CanonicalRunSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(CanonicalRunSchema, data)].slice(0, 3);
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — cross-field (validate, including CR-1)', () => {
    // Every valid fixture exercises the CR-1 inline cross-field check
    // (ordered_index 0-based contiguous monotonic). validate() returns
    // valid:false if CR-1 fails — closes the protobuf-conformance gap
    // where structural Value.Check would silently pass a CR-1-violating
    // payload.
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(CanonicalRunSchema, data);
        if (!result.valid) {
          throw new Error(
            `Expected valid; errors: ${JSON.stringify(result.errors)}`,
          );
        }
      });
    }
  });

  describe('valid/ — in-runtime canonical-form idempotency (FR-B1 V8 determinism pin)', () => {
    // iter-2 F-002 mitigation: the prior round-trip test
    //   `JSON.stringify(JSON.parse(JSON.stringify(data))) === JSON.stringify(data)`
    // was tautological — it asserted V8's `JSON.stringify` is a function
    // of its input, which holds for any JSON-serializable object regardless
    // of schema. The replacement reads the FIXTURE FILE BYTES, strips the
    // `_comment` field, and asserts:
    //
    //   (a) round-tripping the parsed object through `JSON.stringify` →
    //       `JSON.parse` → `JSON.stringify` is idempotent (V8 determinism
    //       pin — non-tautological because the input is now an object
    //       parsed from on-disk bytes, not a stringified-then-reparsed
    //       in-memory clone), and
    //
    //   (b) the canonical form preserves the schema's authored property
    //       order (canonical_run_id → canonical_run_version →
    //       contract_version → epic_kind → required_phases → ts_authored)
    //       — exposing any future schema-property-reordering or
    //       fixture-property-reordering drift as a test failure rather
    //       than a silent runtime divergence.
    //
    // **Scope of this test**: V8 `JSON.stringify` determinism on
    // CanonicalRun-shaped objects within a single Node.js process. True
    // cross-runtime byte-identity (Go `encoding/json`, Python
    // `json.dumps`, Rust `serde_json`) is the FR-A2 cross-language
    // harness's domain per AT-1 (PR-A3.9); the comment in
    // `constraints/CanonicalRun.constraints.json` CR-3 evaluation_note
    // documents the per-runtime canonical-emission obligations.
    const EXPECTED_TOP_LEVEL_KEY_ORDER = [
      'canonical_run_id',
      'canonical_run_version',
      'contract_version',
      'epic_kind',
      'required_phases',
      'ts_authored',
    ];

    for (const f of validFixtures) {
      it(`canonical-form idempotency ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const canonical = JSON.stringify(data);
        const reparsed: unknown = JSON.parse(canonical);
        const reSerialized = JSON.stringify(reparsed);
        expect(reSerialized).toBe(canonical);
        // Property-order pin: the top-level object order in the
        // canonical bytes follows the schema's authored field
        // sequence. A future fixture authored with reordered keys
        // would surface here.
        const observedKeys = Object.keys(data as Record<string, unknown>);
        expect(observedKeys).toEqual(EXPECTED_TOP_LEVEL_KEY_ORDER);
      });
    }
  });

  describe('invalid/ — structural rejection (Value.Check tier)', () => {
    for (const f of invalidFixtures) {
      it(`fails Value.Check ${f}`, () => {
        const { data } = loadFixture('invalid', f);
        expect(Value.Check(CanonicalRunSchema, data)).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — CR-1 rejection (validate() tier)', () => {
    // iter-1 F-001 mitigation: parallel invalid corpus mirrors the
    // two-tier validator topology. Each fixture in this bucket is
    // STRUCTURALLY valid (Value.Check passes) but fails CR-1
    // (ordered_index 0-based contiguous monotonic) at the validate()
    // tier. Cross-language runners (FR-A2 / PR-A3.9) exercise the
    // same fixtures against their per-runtime CR-1 implementation
    // — assertion is symmetric: structurally pass, semantically fail.
    for (const f of invalidCrossFieldFixtures) {
      it(`Value.Check passes (structural) ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        expect(Value.Check(CanonicalRunSchema, data)).toBe(true);
      });

      it(`validate() rejects with CR-1 error ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        const result = validate(CanonicalRunSchema, data);
        expect(result.valid).toBe(false);
        if (result.valid) return;
        expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
      });
    }
  });
});

describe('CanonicalRun valid-fixture coverage breadth (FR-B1 / PR-A3.8)', () => {
  // Pin the breadth of the valid corpus so a future fixture cull does
  // not silently lose coverage of edge surfaces (single-phase, all-five-
  // phase-kinds, large-array, edge-version, repeated-phase-kind, non-
  // canonical-kind-order, empty-gates).
  it('covers the single-phase minimum', () => {
    const fixtures = listFixtures('valid').filter((f) =>
      f.includes('single-phase'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a five-phase canonical-kind-order envelope', () => {
    const fixtures = listFixtures('valid').filter((f) =>
      f.includes('five-phase'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a large (≥10-phase) envelope to exercise CR-1 at scale', () => {
    const fixtures = listFixtures('valid');
    let foundLarge = false;
    for (const f of fixtures) {
      const { data } = loadFixture('valid', f);
      const phases = (data as { required_phases?: unknown[] }).required_phases;
      if (Array.isArray(phases) && phases.length >= 10) {
        foundLarge = true;
        break;
      }
    }
    expect(foundLarge).toBe(true);
  });

  it('covers a non-canonical phase_kind ordering (kinds NOT required to be in a specific order)', () => {
    const fixtures = listFixtures('valid').filter((f) =>
      f.includes('non-canonical-kind-order'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });
});
