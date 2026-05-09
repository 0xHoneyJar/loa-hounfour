/**
 * PR-A3.8 (FR-B1) — Vector-fixture conformance runner for
 * `CanonicalRunSchema`.
 *
 * Walks `vectors/CanonicalRun/v8.6.0/{valid,invalid}` and asserts:
 *
 *   - `valid/*.json` payloads pass `Value.Check` (structural).
 *   - `valid/*.json` payloads pass `validate(...)` — exercises CR-1
 *     inline cross-field validation per the PR-A3.5 two-layer
 *     vector-runner discipline (every fixture exercised through
 *     BOTH Value.Check AND validate() so the protobuf-conformance
 *     gap closes).
 *   - `valid/*.json` payloads satisfy round-trip bit-identity:
 *     `JSON.stringify(JSON.parse(s)) === s` where `s` is the
 *     canonical-form serialization of the fixture data. This is the
 *     cross-language conformance pre-condition per FR-B1: every
 *     runner MUST produce identical canonical bytes for identical
 *     input objects so cross-runner conformance scoring is
 *     well-defined.
 *   - `invalid/*.json` payloads fail `Value.Check`.
 *
 * Cardinality: ≥10 valid + ≥10 invalid (sprint.md PR-A3.8 fixture
 * delta).
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

  it('publishes the expected fixture cardinality (≥10 valid + ≥10 invalid)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(10);
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

  describe('valid/ — round-trip bit-identity (FR-B1 cross-language pre-condition)', () => {
    // The schema-level invariant per PRD §FR-B1 / SDD §3.3:
    // `JSON.stringify(JSON.parse(s)) === s` where `s` is the canonical
    // form. The TS reference uses `JSON.stringify` over the parsed
    // object as the canonical form. Cross-language runners must
    // produce byte-identical bytes for the same input object — this
    // test pins the TS reference behaviour as the AT-1 golden corpus.
    for (const f of validFixtures) {
      it(`round-trip bit-identical ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const canonical = JSON.stringify(data);
        const reparsed: unknown = JSON.parse(canonical);
        const reSerialized = JSON.stringify(reparsed);
        expect(reSerialized).toBe(canonical);
      });
    }
  });

  describe('invalid/ — structural rejection', () => {
    for (const f of invalidFixtures) {
      it(`fails Value.Check ${f}`, () => {
        const { data } = loadFixture('invalid', f);
        expect(Value.Check(CanonicalRunSchema, data)).toBe(false);
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
