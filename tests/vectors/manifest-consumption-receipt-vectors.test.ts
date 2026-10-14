/**
 * v8.8.0 (SDD §3, FR-C4) — vector conformance for ManifestConsumptionReceipt.
 *
 * valid/                — structural pass AND validate() pass
 * invalid/              — structural fail (Value.Check) AND validate() fail
 * invalid-cross-field/  — structural pass, validate() fails on MCR-1
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../src/validators/index.js';
import { ManifestConsumptionReceiptSchema } from '../../src/constraints/manifest-consumption-receipt.js';
import { UNVERIFIED_OBLIGATION_REASONS } from '../../src/constraints/unverified-obligations.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', 'vectors', 'ManifestConsumptionReceipt', 'v8.8.0');
const CONSTRAINTS = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'constraints', 'ManifestConsumptionReceipt.constraints.json'), 'utf8'),
) as { constraints: Array<{ id: string; expression: string }> };
const MCR1 = CONSTRAINTS.constraints.find((c) => c.id === 'MCR-1')!.expression;

function list(bucket: string): string[] {
  return readdirSync(join(ROOT, bucket)).filter((f) => f.endsWith('.json')).sort();
}
function load(bucket: string, f: string): unknown {
  const raw = JSON.parse(readFileSync(join(ROOT, bucket, f), 'utf8')) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  void _comment;
  return data;
}

describe('ManifestConsumptionReceipt vectors (SDD §3)', () => {
  it('publishes >= 4 valid, >= 6 invalid, >= 2 invalid-cross-field fixtures', () => {
    expect(list('valid').length).toBeGreaterThanOrEqual(4);
    expect(list('invalid').length).toBeGreaterThanOrEqual(6);
    expect(list('invalid-cross-field').length).toBeGreaterThanOrEqual(2);
  });

  describe('valid/', () => {
    for (const f of list('valid')) {
      it(`passes Value.Check, validate() and MCR-1 DSL: ${f}`, () => {
        const data = load('valid', f);
        expect(Value.Check(ManifestConsumptionReceiptSchema, data)).toBe(true);
        const result = validate(ManifestConsumptionReceiptSchema, data);
        expect(result.valid, JSON.stringify(result)).toBe(true);
        expect(evaluateConstraint(data as Record<string, unknown>, MCR1)).toBe(true);
      });
    }
  });

  describe('invalid/', () => {
    for (const f of list('invalid')) {
      it(`fails Value.Check and validate(): ${f}`, () => {
        const data = load('invalid', f);
        expect(Value.Check(ManifestConsumptionReceiptSchema, data)).toBe(false);
        expect(validate(ManifestConsumptionReceiptSchema, data).valid).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/', () => {
    for (const f of list('invalid-cross-field')) {
      it(`passes Value.Check, fails validate() with MCR-1 and the MCR-1 DSL: ${f}`, () => {
        const data = load('invalid-cross-field', f);
        expect(Value.Check(ManifestConsumptionReceiptSchema, data)).toBe(true);
        const result = validate(ManifestConsumptionReceiptSchema, data);
        expect(result.valid).toBe(false);
        if (result.valid) return;
        expect(result.errors.some((e) => e.startsWith('MCR-1:'))).toBe(true);
        expect(evaluateConstraint(data as Record<string, unknown>, MCR1)).toBe(false);
      });
    }
  });

  it('the reason pattern admits every UnverifiedObligationReason', () => {
    const base = load('valid', list('valid')[0]) as { decisions: Array<Record<string, unknown>> };
    for (const reason of UNVERIFIED_OBLIGATION_REASONS) {
      const data = { ...base, decisions: [{ ...base.decisions[0], reason }] };
      expect(Value.Check(ManifestConsumptionReceiptSchema, data), reason).toBe(true);
    }
  });

  it('schema carries $id, additionalProperties:false, description and the cross-field marker', () => {
    const s = ManifestConsumptionReceiptSchema as unknown as Record<string, unknown>;
    expect(s.$id).toBe('ManifestConsumptionReceipt');
    expect(s.additionalProperties).toBe(false);
    expect(typeof s.description).toBe('string');
    expect(s['x-cross-field-validated']).toBe(true);
  });
});
