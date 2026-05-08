/**
 * PR-A3.5 (FR-B3..B8) — Vector-fixture conformance runner for the
 * Oracle envelope cluster.
 *
 * Walks `vectors/<Schema>/v8.6.0/{valid,invalid}` for each of the six
 * cycle-005 operations schemas:
 *   - OracleDigest (FR-B3)
 *   - OracleHealthEnvelope (FR-B4)
 *   - EscalationEnvelope (FR-B5)
 *   - RollbackPlan (FR-B6)
 *   - LatencyHistogramEnvelope (FR-B7)
 *   - EpicCheckpoint (FR-B8)
 *
 * **Two-layer assertion contract** (PR-A3.5 iter-5 F-001) —
 * each fixture is exercised through BOTH `Value.Check` (structural)
 * AND `validate()` (cross-field). For schemas without cross-field
 * invariants the two layers agree; for OracleDigest (OD-2 byte cap)
 * and LatencyHistogramEnvelope (LHE-1 percentile monotonicity), an
 * `invalid/` fixture may pass the structural layer and fail only at
 * the cross-field layer (or vice versa) — the runner accepts either
 * failure mode. This matches the protobuf-conformance pattern: every
 * test exercises every layer, never just the cheap one.
 *
 * @see docs/architecture/canonicalization-spec-v8.6.md §11.1 — pattern
 *      reuse precedent.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OracleDigestSchema } from '../../src/operations/oracle-digest.js';
import { OracleHealthEnvelopeSchema } from '../../src/operations/oracle-health-envelope.js';
import { EscalationEnvelopeSchema } from '../../src/operations/escalation-envelope.js';
import { RollbackPlanSchema } from '../../src/operations/rollback-plan.js';
import { LatencyHistogramEnvelopeSchema } from '../../src/operations/latency-histogram-envelope.js';
import { EpicCheckpointSchema } from '../../src/operations/epic-checkpoint.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_ROOT = join(__dirname, '..', '..', 'vectors');

const SCHEMAS = {
  OracleDigest: OracleDigestSchema,
  OracleHealthEnvelope: OracleHealthEnvelopeSchema,
  EscalationEnvelope: EscalationEnvelopeSchema,
  RollbackPlan: RollbackPlanSchema,
  LatencyHistogramEnvelope: LatencyHistogramEnvelopeSchema,
  EpicCheckpoint: EpicCheckpointSchema,
} as const;

function loadFixtures(schemaDir: string, kind: 'valid' | 'invalid'): { name: string; data: unknown }[] {
  const dir = join(VECTORS_ROOT, schemaDir, 'v8.6.0', kind);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return files.map((f) => ({
    name: f,
    data: JSON.parse(readFileSync(join(dir, f), 'utf8')),
  }));
}

describe.each(Object.entries(SCHEMAS))('PR-A3.5 vectors: %s', (schemaName, schema) => {
  const validFixtures = loadFixtures(schemaName, 'valid');
  const invalidFixtures = loadFixtures(schemaName, 'invalid');

  it(`publishes at least 10 valid fixtures`, () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(10);
  });

  it(`publishes at least 10 invalid fixtures`, () => {
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(10);
  });

  describe('valid/', () => {
    for (const fx of validFixtures) {
      it(`validates ${fx.name} (Value.Check + validate())`, () => {
        // Layer 1: structural check.
        const structurallyValid = Value.Check(schema, fx.data);
        if (!structurallyValid) {
          const errs = [...Value.Errors(schema, fx.data)].slice(0, 3);
          throw new Error(
            `Value.Check failed; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
        // Layer 2: cross-field check (catches OD-2 byte cap, LHE-1
        // percentile monotonicity, etc., for schemas with cross-field
        // invariants; agrees with Layer 1 for the rest).
        const result = validate(schema, fx.data);
        if (!result.valid) {
          throw new Error(
            `validate() failed; errors: ${JSON.stringify(result.errors)}`,
          );
        }
      });
    }
  });

  describe('invalid/', () => {
    for (const fx of invalidFixtures) {
      it(`fails ${fx.name} (Value.Check OR validate())`, () => {
        // PR-A3.5 iter-5 F-001: an invalid fixture must fail SOMEWHERE
        // in the validation pipeline. For schemas without cross-field
        // invariants this collapses to Value.Check failing. For
        // OracleDigest (OD-2 byte cap) and LatencyHistogramEnvelope
        // (LHE-1 percentile monotonicity), a fixture may fail only at
        // the cross-field layer — the test accepts either failure
        // mode rather than forcing fixtures into a single bucket.
        const structurallyValid = Value.Check(schema, fx.data);
        const validateResult = validate(schema, fx.data);
        const someLayerFailed = !structurallyValid || !validateResult.valid;
        expect(someLayerFailed).toBe(true);
      });
    }
  });
});
