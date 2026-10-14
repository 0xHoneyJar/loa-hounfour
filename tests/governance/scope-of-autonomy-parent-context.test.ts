/**
 * PR-C1 (FR-C1) — SOA-6 nested parent validation: caller-option
 * forwarding and the non-recursion guard.
 *
 * evaluateScopeInheritance is wrapped in a call-counting spy that
 * delegates to the real implementation, so the tests can assert exactly
 * one SOA-6 evaluation per validate() call.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('../../src/governance/scope-of-autonomy-eval.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/governance/scope-of-autonomy-eval.js')>();
  return { ...real, evaluateScopeInheritance: vi.fn(real.evaluateScopeInheritance) };
});

import { validate, registerCrossFieldValidator } from '../../src/validators/index.js';
import { evaluateScopeInheritance } from '../../src/governance/scope-of-autonomy-eval.js';
import {
  ScopeOfAutonomySchema,
  validateScopeOfAutonomy,
  type ScopeOfAutonomy,
} from '../../src/governance/scope-of-autonomy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALID = join(__dirname, '..', '..', 'vectors', 'ScopeOfAutonomy', 'v8.8.0', 'valid');

function load(name: string): ScopeOfAutonomy {
  const { _comment, ...data } = JSON.parse(readFileSync(join(VALID, name), 'utf8')) as Record<string, unknown>;
  void _comment;
  return data as unknown as ScopeOfAutonomy;
}

const ROOT = load('soa-002-full-root.json');
const CHILD = load('soa-003-child-with-parent-ref.json'); // parent_scope_id = ROOT.scope_id
const GRANDCHILD: ScopeOfAutonomy = {
  ...structuredClone(CHILD),
  scope_id: 'c4d5e6f7-a8b9-4c0d-8e1f-a2b3c4d5e604',
  parent_scope_id: CHILD.scope_id,
};
const NOW = '2026-10-14T12:00:00.000Z';
const spy = vi.mocked(evaluateScopeInheritance);

beforeEach(() => {
  spy.mockClear();
});

describe('SOA-6 non-recursion guard', () => {
  it('a parent that itself has a parent is evaluated once, one link only', () => {
    const r = validate(ScopeOfAutonomySchema, GRANDCHILD, { now: NOW, scopeContext: { parent_scope: CHILD } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(GRANDCHILD, CHILD);
    // The parent's own deferred SOA-6 (CHILD → ROOT) does not leak in.
    expect(r).toEqual({ valid: true });
  });

  it('a parent that is outside its own (unsupplied) parent is not re-checked', () => {
    // CHILD widened so it would violate ROOT — irrelevant to this link.
    const wideParent = { ...CHILD, permitted_sub_goals: ['deploy to production'] };
    const child = { ...GRANDCHILD, permitted_sub_goals: ['deploy to production'] };
    const r = validate(ScopeOfAutonomySchema, child, { scopeContext: { parent_scope: wideParent } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r.valid).toBe(true);
  });

  it('a violating link still reports exactly one evaluation', () => {
    const child = { ...GRANDCHILD, permitted_sub_goals: ['not in parent'] };
    const r = validate(ScopeOfAutonomySchema, child, { scopeContext: { parent_scope: CHILD } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r.valid).toBe(false);
    expect(r.unverified_obligations?.unverified_rules.map((e) => e.reason)).toEqual(['scope_inheritance_violation']);
  });

  it('the guard resets after a nested parent validation throws', () => {
    // Force the nested cross-field validator to throw once.
    registerCrossFieldValidator(
      'ScopeOfAutonomy',
      () => {
        throw new Error('boom');
      },
      { override: true },
    );
    try {
      expect(() => validate(ScopeOfAutonomySchema, GRANDCHILD, { scopeContext: { parent_scope: CHILD } })).toThrow('boom');
    } finally {
      registerCrossFieldValidator('ScopeOfAutonomy', validateScopeOfAutonomy, { override: true });
    }
    // Depth back at zero: a plain child validation still emits its deferred SOA-6.
    const r = validate(ScopeOfAutonomySchema, CHILD, { now: NOW });
    expect(r.unverified_obligations?.unverified_rules[0].reason).toBe('scope_parent_context_deferred');
  });
});

describe('SOA-6 parent option profile', () => {
  afterAll(() => {
    registerCrossFieldValidator('ScopeOfAutonomy', validateScopeOfAutonomy, { override: true });
  });

  const profiles: Array<Record<string, unknown>> = [
    {},
    { now: NOW },
    { strictWarnings: true },
    { crossField: false },
    { acceptDeferred: true },
    { failClosed: true },
  ];
  const parents: Array<[string, unknown]> = [
    ['valid parent', ROOT],
    ['cross-field-invalid parent (SOA-4)', { ...ROOT, stop_work: { requested: true, propagates_to_children: true } }],
    ['structurally invalid parent', { scope_id: ROOT.scope_id }],
  ];

  for (const [label, parent] of parents) {
    for (const profile of profiles) {
      it(`${label} under ${JSON.stringify(profile)}: nested outcome equals direct validation with crossField pinned true`, () => {
        const direct = validate(ScopeOfAutonomySchema, parent, { ...profile, crossField: true });
        const nested = validate(ScopeOfAutonomySchema, CHILD, { ...profile, scopeContext: { parent_scope: parent } });
        if (direct.valid) {
          expect(nested.valid).toBe(true);
        } else {
          expect(nested.valid).toBe(false);
          if (!nested.valid) {
            expect(nested.errors).toEqual(
              direct.errors.map((e) => `SCOPE_PARENT_CONTEXT_INVALID: scopeContext.parent_scope is not a valid ScopeOfAutonomy: ${e}`),
            );
          }
        }
      });
    }
  }

  it('strictWarnings is forwarded: a warned parent is rejected only under strictWarnings', () => {
    registerCrossFieldValidator(
      'ScopeOfAutonomy',
      (data) => {
        const base = validateScopeOfAutonomy(data);
        const warn = (data as { additional_details?: string }).additional_details === 'WARN';
        return warn
          ? { ...base, warnings: ['parent warning'], warning_details: [{ code: 'TEST_PARENT_WARNING', message: 'parent warning' }] }
          : base;
      },
      { override: true },
    );
    const warnedParent = { ...ROOT, additional_details: 'WARN' };
    expect(validate(ScopeOfAutonomySchema, CHILD, { scopeContext: { parent_scope: warnedParent } }).valid).toBe(true);
    const strict = validate(ScopeOfAutonomySchema, CHILD, { strictWarnings: true, scopeContext: { parent_scope: warnedParent } });
    expect(strict.valid).toBe(false);
    if (!strict.valid) {
      expect(strict.errors).toEqual([
        'SCOPE_PARENT_CONTEXT_INVALID: scopeContext.parent_scope is not a valid ScopeOfAutonomy: TEST_PARENT_WARNING: parent warning',
      ]);
    }
  });

  it('crossField: false on the caller does not relax parent validation', () => {
    const badParent = { ...ROOT, stop_work: { requested: true, propagates_to_children: true } };
    const r = validate(ScopeOfAutonomySchema, CHILD, { crossField: false, scopeContext: { parent_scope: badParent } });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0]).toMatch(/^SCOPE_PARENT_CONTEXT_INVALID: .*SOA-4:/);
  });
});
