/**
 * PR-A4.1 (FR-G1) — Vector-fixture conformance runner for
 * `ClusterRunSeriesSchema`.
 *
 * Walks `vectors/ClusterRunSeries/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and asserts the two-layer validator topology per the cycle-005
 * vector-runner discipline (PR-A3.5 / PR-A3.8 precedent):
 *
 *   - `valid/*.json` payloads pass `Value.Check` (structural) AND
 *     `validate(...)` (cross-field, including CRS-2 + CRS-4).
 *   - `valid/*.json` payloads satisfy in-runtime canonical-form
 *     idempotency (V8 determinism pin; cross-runtime byte-identity is
 *     the FR-A2 harness's domain).
 *   - `invalid/*.json` payloads fail `Value.Check` — structural-tier
 *     rejection (CRS-1 epic_status enum + repo_slug pattern + ts_started
 *     Z-only second precision + additionalProperties).
 *   - `invalid-cross-field/*.json` payloads PASS `Value.Check`
 *     (structurally well-formed) but FAIL `validate(...)` — cross-field
 *     tier rejection covering CRS-2 + CRS-4.
 *
 * Each fixture may carry an optional `_comment` field which the
 * runner strips before validation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClusterRunSeriesSchema } from '../../src/canonical/cluster-run-series.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(
    __dirname,
    '..',
    '..',
    'vectors',
    'ClusterRunSeries',
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

describe('ClusterRunSeries vector fixtures (FR-G1 / PR-A4.1)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');
  const invalidCrossFieldFixtures = listFixtures('invalid-cross-field');

  it('publishes the expected fixture cardinality (≥10 valid + ≥4 invalid)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(4);
    expect(invalidCrossFieldFixtures.length).toBeGreaterThanOrEqual(3);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(ClusterRunSeriesSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(ClusterRunSeriesSchema, data)].slice(
            0,
            3,
          );
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — cross-field (validate, including CRS-2 + CRS-4)', () => {
    for (const f of validFixtures) {
      it(`validate ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const result = validate(ClusterRunSeriesSchema, data);
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
      'run_id',
      'cluster_id',
      'ts_started',
      'repos',
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
        expect(Value.Check(ClusterRunSeriesSchema, data)).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — CRS-2 / CRS-4 rejection (validate() tier)', () => {
    for (const f of invalidCrossFieldFixtures) {
      it(`Value.Check passes (structural) ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        expect(Value.Check(ClusterRunSeriesSchema, data)).toBe(true);
      });

      it(`validate() rejects with CRS-2 or CRS-4 error ${f}`, () => {
        const { data } = loadFixture('invalid-cross-field', f);
        const result = validate(ClusterRunSeriesSchema, data);
        expect(result.valid).toBe(false);
        if (result.valid) return;
        const hasCrs =
          result.errors.some((e) => e.includes('CRS-2')) ||
          result.errors.some((e) => e.includes('CRS-4'));
        expect(hasCrs).toBe(true);
      });
    }
  });
});

describe('ClusterRunSeries valid-fixture coverage breadth (FR-G1 / PR-A4.1)', () => {
  function listValid(): string[] {
    return readdirSync(join(vectorsRoot(), 'valid'))
      .filter((f) => f.endsWith('.json'))
      .sort();
  }

  it('covers a single-repo minimal envelope', () => {
    const fixtures = listValid().filter((f) => f.includes('single-repo'));
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a multi-repo envelope (≥3 entries)', () => {
    const fixtures = listValid();
    let foundMulti = false;
    for (const f of fixtures) {
      const raw = JSON.parse(
        readFileSync(join(vectorsRoot(), 'valid', f), 'utf8'),
      ) as { repos?: unknown[] };
      if (Array.isArray(raw.repos) && raw.repos.length >= 3) {
        foundMulti = true;
        break;
      }
    }
    expect(foundMulti).toBe(true);
  });

  it('covers an all-failed cluster (CRS-2 saturation)', () => {
    const fixtures = listValid().filter((f) => f.includes('all-failed'));
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers an all-completed cluster (terminal-success)', () => {
    const fixtures = listValid().filter((f) => f.includes('all-completed'));
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  it('covers a failure_mode boundary fixture (max length)', () => {
    const fixtures = listValid().filter((f) =>
      f.includes('failure-mode-max-length'),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });
});
