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
 * Each schema's `valid/` fixtures MUST pass `Value.Check`, and each
 * `invalid/` fixture MUST fail. The runner is structurally identical
 * to `tests/vectors/v840-governance-vectors.test.ts` from cycle-004
 * — the convention is established and reused for parity.
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
      it(`validates ${fx.name}`, () => {
        const ok = Value.Check(schema, fx.data);
        if (!ok) {
          const errs = [...Value.Errors(schema, fx.data)].slice(0, 3);
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
    for (const fx of invalidFixtures) {
      it(`fails schema check ${fx.name}`, () => {
        expect(Value.Check(schema, fx.data)).toBe(false);
      });
    }
  });
});
