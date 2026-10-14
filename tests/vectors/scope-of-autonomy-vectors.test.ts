/**
 * PR-C1 (FR-C1) — Vector-fixture conformance runner for
 * `ScopeOfAutonomySchema`.
 *
 * Three buckets under vectors/ScopeOfAutonomy/v8.8.0/:
 *   - valid/                 pass Value.Check AND validate()
 *   - invalid/               fail Value.Check (structural tier)
 *   - invalid-cross-field/   pass Value.Check, fail validate() with the
 *                            SOA rule id named in the filename prefix
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScopeOfAutonomySchema } from '../../src/governance/scope-of-autonomy.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', 'vectors', 'ScopeOfAutonomy', 'v8.8.0');
const NOW = '2026-10-14T12:00:00.000Z';

function list(bucket: string): string[] {
  return readdirSync(join(ROOT, bucket)).filter((f) => f.endsWith('.json')).sort();
}

function load(bucket: string, name: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(join(ROOT, bucket, name), 'utf8')) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  void _comment;
  return data;
}

describe('ScopeOfAutonomy vector fixtures (FR-C1 / PR-C1)', () => {
  const valid = list('valid');
  const invalid = list('invalid');
  const crossField = list('invalid-cross-field');

  it('publishes at least 4 valid and 6 invalid fixtures', () => {
    expect(valid.length).toBeGreaterThanOrEqual(4);
    expect(invalid.length + crossField.length).toBeGreaterThanOrEqual(6);
    expect(invalid.length).toBeGreaterThanOrEqual(6);
  });

  it('covers every case named in SDD §1', () => {
    const all = [...valid, ...invalid, ...crossField].join('\n');
    for (const slug of [
      'minimal-root',
      'full-root',
      'child-with-parent-ref',
      'stop-work-requested',
      'time-limit-with-latest-time',
      'empty-sub-goals',
      'bad-cost-pattern',
      'time-limit-without-latest-time',
      'expires-before-issued',
      'stop-requested-without-timestamp',
      'additional-property',
      'propagates-false',
    ]) {
      expect(all, slug).toContain(slug);
    }
  });

  describe('valid/ round-trips through validate()', () => {
    for (const f of valid) {
      it(f, () => {
        const data = load('valid', f);
        expect(Value.Check(ScopeOfAutonomySchema, data)).toBe(true);
        const r = validate(ScopeOfAutonomySchema, data, { now: NOW });
        expect(r.valid, JSON.stringify(r)).toBe(true);
        if ('parent_scope_id' in data) {
          // Child scope without parent context: SOA-6 deferred to consumer.
          expect(r.unverified_obligations?.unverified_rules).toEqual([
            expect.objectContaining({
              rule_id: 'SOA-6',
              evaluator: 'consumer',
              reason: 'scope_parent_context_deferred',
            }),
          ]);
        } else {
          expect(r).not.toHaveProperty('unverified_obligations');
        }
      });
    }
  });

  describe('invalid/ fails the structural tier', () => {
    for (const f of invalid) {
      it(f, () => {
        const data = load('invalid', f);
        expect(Value.Check(ScopeOfAutonomySchema, data)).toBe(false);
        expect(validate(ScopeOfAutonomySchema, data).valid).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ passes structure, fails validate() on the named rule', () => {
    for (const f of crossField) {
      it(f, () => {
        const data = load('invalid-cross-field', f);
        expect(Value.Check(ScopeOfAutonomySchema, data)).toBe(true);
        const r = validate(ScopeOfAutonomySchema, data);
        expect(r.valid).toBe(false);
        const rule = /^soa(\d+)-/.exec(f)?.[1];
        expect(rule, 'filename must start with soa<N>-').toBeDefined();
        if (!r.valid) {
          expect(r.errors.some((e) => e.startsWith(`SOA-${rule}:`)), r.errors.join('\n')).toBe(true);
        }
      });
    }

    it('crossField: false skips SOA-1..5 (structural tier only)', () => {
      for (const f of crossField) {
        expect(validate(ScopeOfAutonomySchema, load('invalid-cross-field', f), { crossField: false }).valid).toBe(true);
      }
    });
  });
});
