/**
 * PR-C1 (FR-C1) — `constraints/ScopeOfAutonomy.constraints.json`.
 *
 * Every constraint id is checked for its evaluator tag. The library rules
 * (SOA-1..5) are DSL expressions: each holds on every valid fixture, only
 * the named rule fails on each invalid-cross-field fixture, and the DSL
 * agrees with the registered cross-field validator. SOA-6/7 are
 * runtime-deferred and surface through the manifest builder; the reasons
 * validate() emits for SOA-6 are covered in
 * tests/governance/scope-of-autonomy-validate.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { buildUnverifiedObligationsManifest } from '../../src/constraints/unverified-obligations.js';
import type { ConstraintFile } from '../../src/constraints/types.js';
import { validateScopeOfAutonomy } from '../../src/governance/scope-of-autonomy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const FILE = JSON.parse(
  readFileSync(join(REPO, 'constraints', 'ScopeOfAutonomy.constraints.json'), 'utf8'),
) as ConstraintFile;
const VECTORS = join(REPO, 'vectors', 'ScopeOfAutonomy', 'v8.8.0');

function rule(id: string) {
  const c = FILE.constraints.find((x) => x.id === id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
}

function fixtures(): Array<{ name: string; data: Record<string, unknown> }> {
  const out: Array<{ name: string; data: Record<string, unknown> }> = [];
  for (const bucket of ['valid', 'invalid-cross-field']) {
    for (const f of readdirSync(join(VECTORS, bucket)).filter((x) => x.endsWith('.json')).sort()) {
      const { _comment, ...data } = JSON.parse(readFileSync(join(VECTORS, bucket, f), 'utf8')) as Record<string, unknown>;
      void _comment;
      out.push({ name: `${bucket}/${f}`, data });
    }
  }
  return out;
}

const BASE = {
  scope_id: '3f1c2a64-8d4e-4b7a-9c3e-1a2b3c4d5e01',
  principal_id: 'org-a',
  agent_id: 'agent-a',
  permitted_sub_goals: ['g1'],
  side_effect_budget: { data_access: [] },
  clarification_triggers: [],
  ending_condition: { kind: 'goal_satisfied' },
  stop_work: { requested: false, propagates_to_children: true },
  issued_at: '2026-10-14T09:00:00Z',
  contract_version: '8.8.0',
};

describe('ScopeOfAutonomy constraint file', () => {
  it('has the expected header', () => {
    expect(FILE.schema_id).toBe('ScopeOfAutonomy');
    expect(FILE.contract_version).toBe('8.8.0');
  });

  it('declares SOA-1..SOA-7 with the SDD §1 evaluator split', () => {
    expect(FILE.constraints.map((c) => c.id)).toEqual(['SOA-1', 'SOA-2', 'SOA-3', 'SOA-4', 'SOA-5', 'SOA-6', 'SOA-7']);
    for (const id of ['SOA-1', 'SOA-2', 'SOA-3', 'SOA-4', 'SOA-5']) expect(rule(id).evaluator).toBe('library');
    for (const id of ['SOA-6', 'SOA-7']) {
      expect(rule(id).evaluator).toBe('runtime-deferred');
      expect(rule(id).evaluation_note?.length).toBeGreaterThan(0);
    }
    expect(rule('SOA-6').evaluation_note).toContain('scope_parent_context_deferred');
    expect(rule('SOA-6').evaluation_note).toContain('evaluateScopeInheritance');
  });

  describe('DSL rules agree with the cross-field validator on every fixture', () => {
    for (const { name, data } of fixtures()) {
      it(name, () => {
        const xf = validateScopeOfAutonomy(data);
        for (const id of ['SOA-1', 'SOA-2', 'SOA-3', 'SOA-4', 'SOA-5']) {
          const dsl = evaluateConstraint(data, rule(id).expression);
          const validatorFlags = xf.errors.some((e) => e.startsWith(`${id}:`));
          expect(dsl, `${id} DSL vs validator`).toBe(!validatorFlags);
        }
      });
    }
  });

  describe('library rules are evaluable DSL', () => {
    const LIBRARY = ['SOA-1', 'SOA-2', 'SOA-3', 'SOA-4', 'SOA-5'];
    const all = fixtures();

    for (const { name, data } of all.filter((f) => f.name.startsWith('valid/'))) {
      it(`every library rule holds on ${name}`, () => {
        for (const id of LIBRARY) expect(evaluateConstraint(data, rule(id).expression), id).toBe(true);
      });
    }

    for (const { name, data } of all.filter((f) => f.name.startsWith('invalid-cross-field/'))) {
      it(`only the named rule fails on ${name}`, () => {
        const named = `SOA-${/soa(\d+)-/.exec(name)?.[1]}`;
        for (const id of LIBRARY) {
          expect(evaluateConstraint(data, rule(id).expression), id).toBe(id !== named);
        }
      });
    }

    it('SOA-1 uses the one-argument unique_values form', () => {
      expect(rule('SOA-1').expression).toBe('unique_values(permitted_sub_goals)');
    });
  });

  describe('unique_values one-argument form', () => {
    const ev = (data: Record<string, unknown>) => evaluateConstraint(data, 'unique_values(xs)');
    it('distinct primitives pass, duplicates fail', () => {
      expect(ev({ xs: ['a', 'b', 'c'] })).toBe(true);
      expect(ev({ xs: ['a', 'b', 'a'] })).toBe(false);
      expect(ev({ xs: [1, 2, 1] })).toBe(false);
    });
    it('compares by strict equality', () => {
      expect(ev({ xs: ['1', 1] })).toBe(true);
    });
    it('empty, non-array and object elements are vacuously true', () => {
      expect(ev({ xs: [] })).toBe(true);
      expect(ev({ xs: 'aa' })).toBe(true);
      expect(ev({})).toBe(true);
      expect(ev({ xs: [{ a: 1 }, { a: 1 }] })).toBe(true);
    });
    it('the two-argument form is unchanged', () => {
      expect(evaluateConstraint({ xs: [{ id: 'a' }, { id: 'a' }] }, "unique_values(xs, 'id')")).toBe(false);
      expect(evaluateConstraint({ xs: ['a', 'a'] }, "unique_values(xs, 'id')")).toBe(true);
    });
  });

  describe('per-rule positive and negative cases', () => {
    it('SOA-1 DSL and validator both reject duplicate sub-goals', () => {
      expect(evaluateConstraint({ ...BASE, permitted_sub_goals: ['a', 'b'] }, rule('SOA-1').expression)).toBe(true);
      expect(evaluateConstraint({ ...BASE, permitted_sub_goals: ['a', 'b', 'a'] }, rule('SOA-1').expression)).toBe(false);
    });

    it('SOA-1 rejects duplicate sub-goals and accepts distinct ones', () => {
      expect(validateScopeOfAutonomy({ ...BASE, permitted_sub_goals: ['a', 'b'] }).valid).toBe(true);
      const r = validateScopeOfAutonomy({ ...BASE, permitted_sub_goals: ['a', 'b', 'a'] });
      expect(r.valid).toBe(false);
      expect(r.errors).toEqual([expect.stringMatching(/^SOA-1: permitted_sub_goals\[2\] duplicates permitted_sub_goals\[0\]/)]);
    });

    it('SOA-2 time_limit needs latest_time; other kinds do not', () => {
      expect(evaluateConstraint({ ...BASE, ending_condition: { kind: 'time_limit' } }, rule('SOA-2').expression)).toBe(false);
      expect(evaluateConstraint({ ...BASE, ending_condition: { kind: 'time_limit', latest_time: '2026-10-14T10:00:00Z' } }, rule('SOA-2').expression)).toBe(true);
      expect(evaluateConstraint({ ...BASE, ending_condition: { kind: 'composite' } }, rule('SOA-2').expression)).toBe(true);
    });

    it('SOA-3 expires_at strictly after issued_at; absent passes', () => {
      expect(evaluateConstraint(BASE, rule('SOA-3').expression)).toBe(true);
      expect(evaluateConstraint({ ...BASE, expires_at: '2026-10-14T09:00:00Z' }, rule('SOA-3').expression)).toBe(false);
      expect(evaluateConstraint({ ...BASE, expires_at: '2026-10-14T09:00:01Z' }, rule('SOA-3').expression)).toBe(true);
      expect(validateScopeOfAutonomy({ ...BASE, expires_at: '2026-10-14T09:00:00Z' }).errors[0]).toMatch(/^SOA-3:/);
    });

    it('SOA-4 requested stop needs requested_at', () => {
      const stop = { requested: true, propagates_to_children: true };
      expect(evaluateConstraint({ ...BASE, stop_work: stop }, rule('SOA-4').expression)).toBe(false);
      expect(evaluateConstraint({ ...BASE, stop_work: { ...stop, requested_at: '2026-10-14T10:00:00Z' } }, rule('SOA-4').expression)).toBe(true);
    });

    it('SOA-5 latest_time not after expires_at; equal passes; either absent passes', () => {
      const ec = (t: string) => ({ kind: 'time_limit', latest_time: t });
      expect(evaluateConstraint({ ...BASE, ending_condition: ec('2026-10-15T00:00:00Z'), expires_at: '2026-10-15T00:00:00Z' }, rule('SOA-5').expression)).toBe(true);
      expect(evaluateConstraint({ ...BASE, ending_condition: ec('2026-10-15T00:00:01Z'), expires_at: '2026-10-15T00:00:00Z' }, rule('SOA-5').expression)).toBe(false);
      expect(evaluateConstraint({ ...BASE, ending_condition: ec('2026-10-15T00:00:01Z') }, rule('SOA-5').expression)).toBe(true);
      expect(evaluateConstraint({ ...BASE, expires_at: '2026-10-15T00:00:00Z' }, rule('SOA-5').expression)).toBe(true);
    });

    it('cross-field validator never throws on non-object input', () => {
      for (const bad of [null, 1, 'x', [], undefined]) {
        const r = validateScopeOfAutonomy(bad);
        expect(r.valid).toBe(false);
        expect(r.errors[0]).toMatch(/^SOA: structural shape precondition failed/);
      }
    });
  });

  it('SOA-6 and SOA-7 surface through buildUnverifiedObligationsManifest', () => {
    const m = buildUnverifiedObligationsManifest(FILE, '2026-10-14T00:00:00.000Z');
    expect(m?.schema_id).toBe('ScopeOfAutonomy');
    expect(m?.unverified_rules.map((r) => r.rule_id)).toEqual(['SOA-6', 'SOA-7']);
  });
});
