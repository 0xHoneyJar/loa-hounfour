/**
 * Vector-fixture conformance runner for the Legba substrate schemas
 * (SpanMove, GateToken, RunReceipt — loa-freeside legba-substrate cycle 1).
 *
 * STRUCTURAL TIER ONLY. This runner exercises `Value.Check` (the structural
 * layer) against the three bucket contract:
 *
 *   - `valid/*.json`            → PASS Value.Check (well-formed instances).
 *   - `invalid/*.json`          → FAIL Value.Check (structural rejection:
 *                                 missing discriminator, bad pattern, bad enum,
 *                                 additionalProperties, non-literal genesis).
 *   - `invalid-cross-field/*.json` → PASS Value.Check (structurally well-formed)
 *                                 but carry a CONSTRAINT violation (seq gap,
 *                                 record_hash drift, mutated key_set, predictable
 *                                 seed, replayed run_id). The hand-written
 *                                 cross-field validators that REJECT these at
 *                                 validate() time are a post-ratification
 *                                 follow-up; the corpus is staged here now so the
 *                                 validator work has its fixtures ready. Until
 *                                 then this runner asserts only that they are
 *                                 structurally well-formed — the meaningful
 *                                 partial guarantee (a cross-field fixture that
 *                                 fails Value.Check is mis-bucketed).
 *
 * Each fixture may carry an optional `_comment` field, stripped before checking.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpanMoveSchema } from '../../src/integrity/legba-span-move.js';
import { GateTokenSchema } from '../../src/integrity/legba-gate-token.js';
import { RunReceiptSchema } from '../../src/integrity/legba-run-receipt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function bucketRoot(schema: string, bucket: string): string {
  return join(__dirname, '..', '..', 'vectors', schema, 'v8.8.0', bucket);
}

function load(schema: string, bucket: string, name: string): unknown {
  const raw = JSON.parse(
    readFileSync(join(bucketRoot(schema, bucket), name), 'utf8'),
  ) as Record<string, unknown>;
  const { _comment: _drop, ...data } = raw;
  return data;
}

function names(schema: string, bucket: string): string[] {
  const dir = bucketRoot(schema, bucket);
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
}

const cases = [
  { schema: 'SpanMove', tb: SpanMoveSchema },
  { schema: 'GateToken', tb: GateTokenSchema },
  { schema: 'RunReceipt', tb: RunReceiptSchema },
] as const;

for (const { schema, tb } of cases) {
  describe(`${schema} vectors (structural tier)`, () => {
    it('has at least one valid + one invalid + one invalid-cross-field fixture', () => {
      expect(names(schema, 'valid').length).toBeGreaterThan(0);
      expect(names(schema, 'invalid').length).toBeGreaterThan(0);
      expect(names(schema, 'invalid-cross-field').length).toBeGreaterThan(0);
    });

    for (const name of names(schema, 'valid')) {
      it(`valid/${name} passes Value.Check`, () => {
        expect(Value.Check(tb, load(schema, 'valid', name))).toBe(true);
      });
    }

    for (const name of names(schema, 'invalid')) {
      it(`invalid/${name} fails Value.Check (structural)`, () => {
        expect(Value.Check(tb, load(schema, 'invalid', name))).toBe(false);
      });
    }

    for (const name of names(schema, 'invalid-cross-field')) {
      it(`invalid-cross-field/${name} passes Value.Check (well-formed; cross-field reject pending validator)`, () => {
        expect(Value.Check(tb, load(schema, 'invalid-cross-field', name))).toBe(true);
      });
    }
  });
}
