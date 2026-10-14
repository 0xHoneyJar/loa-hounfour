/**
 * PR-C1 (FR-C1) — `evaluateScopeInheritance` / `evaluateScopeActivity`.
 *
 * 1. Walks vectors/conformance/scope-inheritance/*.json.
 * 2. Branch tests for every violation code and every activity reason.
 * 3. fast-check properties: reflexivity, narrowing soundness, parent
 *    widening monotonicity, transitivity, and widening-a-child detection.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateScopeInheritance,
  evaluateScopeActivity,
  type ScopeInheritanceViolationCode,
} from '../../src/governance/scope-of-autonomy-eval.js';
import { ScopeOfAutonomySchema, type ScopeOfAutonomy, type DataAccessMode } from '../../src/governance/scope-of-autonomy.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFORMANCE = join(__dirname, '..', '..', 'vectors', 'conformance', 'scope-inheritance');

const PARENT_ID = '3f1c2a64-8d4e-4b7a-9c3e-1a2b3c4d5e01';
const CHILD_ID = '7a9b0c1d-2e3f-4a5b-8c6d-7e8f9a0b1c02';
const GRANDCHILD_ID = 'c4d5e6f7-a8b9-4c0d-8e1f-a2b3c4d5e604';

function scope(overrides: Partial<ScopeOfAutonomy> = {}): ScopeOfAutonomy {
  return {
    scope_id: PARENT_ID,
    principal_id: 'org-a',
    agent_id: 'agent-a',
    permitted_sub_goals: ['g1', 'g2'],
    side_effect_budget: {
      max_cost_micro: '1000',
      max_wall_clock_ms: 60000,
      data_access: [{ resource: 'r1', mode: 'read_write' }, { resource: 'r2', mode: 'read' }],
    },
    allowed_tools: ['t1', 't2'],
    clarification_triggers: [],
    ending_condition: { kind: 'time_limit', latest_time: '2026-10-14T12:00:00Z' },
    stop_work: { requested: false, propagates_to_children: true },
    issued_at: '2026-10-14T09:00:00Z',
    expires_at: '2026-10-14T18:00:00Z',
    contract_version: '8.8.0',
    ...overrides,
  };
}

function childOf(parent: ScopeOfAutonomy, overrides: Partial<ScopeOfAutonomy> = {}): ScopeOfAutonomy {
  return scope({ ...structuredClone(parent), scope_id: CHILD_ID, parent_scope_id: parent.scope_id, ...overrides });
}

function codes(child: ScopeOfAutonomy, parent: ScopeOfAutonomy): ScopeInheritanceViolationCode[] {
  return evaluateScopeInheritance(child, parent).violations.map((v) => v.code);
}

// ---------------------------------------------------------------------------
// 1. Conformance corpus
// ---------------------------------------------------------------------------

describe('scope-inheritance conformance vectors', () => {
  const files = readdirSync(CONFORMANCE).filter((f) => f.endsWith('.json')).sort();

  it('has at least one case per violation code plus a passing case', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    const seen = new Set<string>();
    let passes = 0;
    for (const f of files) {
      const v = JSON.parse(readFileSync(join(CONFORMANCE, f), 'utf8'));
      if (v.expected_output.within_parent) passes += 1;
      for (const c of v.expected_output.violation_codes) seen.add(c);
    }
    expect(passes).toBeGreaterThanOrEqual(1);
    expect([...seen].sort()).toEqual([
      'COST_EXCEEDS_PARENT',
      'DATA_ACCESS_EXCEEDS_PARENT',
      'EXPIRES_AFTER_PARENT',
      'LATEST_TIME_AFTER_PARENT',
      'PARENT_ID_MISMATCH',
      'STOP_WORK_NOT_INHERITED',
      'SUB_GOAL_NOT_IN_PARENT',
      'TOOL_NOT_IN_PARENT',
      'WALL_CLOCK_EXCEEDS_PARENT',
    ]);
  });

  for (const f of files) {
    it(f, () => {
      const v = JSON.parse(readFileSync(join(CONFORMANCE, f), 'utf8'));
      const { child, parent } = v.input as { child: ScopeOfAutonomy; parent: ScopeOfAutonomy };
      // Inputs are schema-valid scopes (the evaluator's precondition).
      expect(validate(ScopeOfAutonomySchema, parent).valid).toBe(true);
      expect(validate(ScopeOfAutonomySchema, child, { crossField: true }).valid).toBe(true);
      const r = evaluateScopeInheritance(child, parent);
      expect(r.within_parent).toBe(v.expected_output.within_parent);
      expect(v.expected_valid).toBe(v.expected_output.within_parent);
      expect([...new Set(r.violations.map((x) => x.code))].sort()).toEqual(v.expected_output.violation_codes);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Branch tests
// ---------------------------------------------------------------------------

describe('evaluateScopeInheritance branches', () => {
  const P = scope();

  it('identical narrowing passes with no violations', () => {
    expect(evaluateScopeInheritance(childOf(P), P)).toEqual({ within_parent: true, violations: [] });
  });

  it('PARENT_ID_MISMATCH for a different parent id and for a root child', () => {
    expect(codes(childOf(P, { parent_scope_id: GRANDCHILD_ID }), P)).toEqual(['PARENT_ID_MISMATCH']);
    const root = childOf(P);
    delete root.parent_scope_id;
    const r = evaluateScopeInheritance(root, P);
    expect(r.violations[0]).toMatchObject({ code: 'PARENT_ID_MISMATCH', field: 'parent_scope_id', parent_value: PARENT_ID });
    expect(r.violations[0].message).toMatch(/root scope/);
  });

  it('SUB_GOAL_NOT_IN_PARENT reports each offending index; matching is exact-string', () => {
    const r = evaluateScopeInheritance(childOf(P, { permitted_sub_goals: ['g1', 'G2', 'g3'] }), P);
    expect(r.violations.map((v) => v.field)).toEqual(['permitted_sub_goals[1]', 'permitted_sub_goals[2]']);
  });

  it('COST_EXCEEDS_PARENT: above, absent under bounded, equal passes, unbounded parent passes', () => {
    const budget = (c?: string) => ({ ...P.side_effect_budget, max_cost_micro: c });
    expect(codes(childOf(P, { side_effect_budget: budget('1001') }), P)).toEqual(['COST_EXCEEDS_PARENT']);
    const absent = childOf(P);
    delete absent.side_effect_budget.max_cost_micro;
    expect(codes(absent, P)).toEqual(['COST_EXCEEDS_PARENT']);
    expect(codes(childOf(P, { side_effect_budget: budget('1000') }), P)).toEqual([]);
    const unbounded = scope({ side_effect_budget: { ...P.side_effect_budget, max_cost_micro: undefined } });
    delete unbounded.side_effect_budget.max_cost_micro;
    expect(codes(childOf(unbounded, { side_effect_budget: budget('99999999999999999999999') }), unbounded)).toEqual([]);
  });

  it('COST_EXCEEDS_PARENT compares beyond Number precision', () => {
    const big = scope({ side_effect_budget: { ...P.side_effect_budget, max_cost_micro: '9007199254740993' } });
    const child = childOf(big, { side_effect_budget: { ...big.side_effect_budget, max_cost_micro: '9007199254740994' } });
    expect(codes(child, big)).toEqual(['COST_EXCEEDS_PARENT']);
  });

  it('WALL_CLOCK_EXCEEDS_PARENT: above and absent under bounded', () => {
    expect(codes(childOf(P, { side_effect_budget: { ...P.side_effect_budget, max_wall_clock_ms: 60001 } }), P)).toEqual(['WALL_CLOCK_EXCEEDS_PARENT']);
    const absent = childOf(P);
    delete absent.side_effect_budget.max_wall_clock_ms;
    expect(codes(absent, P)).toEqual(['WALL_CLOCK_EXCEEDS_PARENT']);
  });

  it('DATA_ACCESS_EXCEEDS_PARENT: mode coverage table', () => {
    const access = (resource: string, mode: DataAccessMode) =>
      childOf(P, { side_effect_budget: { ...P.side_effect_budget, data_access: [{ resource, mode }] } });
    // r1 is read_write in the parent: covers everything.
    for (const m of ['read', 'write', 'read_write'] as const) expect(codes(access('r1', m), P)).toEqual([]);
    // r2 is read in the parent.
    expect(codes(access('r2', 'read'), P)).toEqual([]);
    expect(codes(access('r2', 'write'), P)).toEqual(['DATA_ACCESS_EXCEEDS_PARENT']);
    expect(codes(access('r2', 'read_write'), P)).toEqual(['DATA_ACCESS_EXCEEDS_PARENT']);
    // Unknown resource.
    expect(codes(access('r9', 'read'), P)).toEqual(['DATA_ACCESS_EXCEEDS_PARENT']);
  });

  it('DATA_ACCESS: union of parent read + write covers child read_write; write alone does not', () => {
    const split = scope({ side_effect_budget: { ...P.side_effect_budget, data_access: [{ resource: 'r', mode: 'read' }, { resource: 'r', mode: 'write' }] } });
    const rw = childOf(split, { side_effect_budget: { ...split.side_effect_budget, data_access: [{ resource: 'r', mode: 'read_write' }] } });
    expect(codes(rw, split)).toEqual([]);
    const writeOnly = scope({ side_effect_budget: { ...P.side_effect_budget, data_access: [{ resource: 'r', mode: 'write' }] } });
    const rw2 = childOf(writeOnly, { side_effect_budget: { ...writeOnly.side_effect_budget, data_access: [{ resource: 'r', mode: 'read_write' }] } });
    expect(codes(rw2, writeOnly)).toEqual(['DATA_ACCESS_EXCEEDS_PARENT']);
  });

  it('TOOL_NOT_IN_PARENT: extra tool, absent under restricted; unrestricted parent passes', () => {
    expect(codes(childOf(P, { allowed_tools: ['t1', 't9'] }), P)).toEqual(['TOOL_NOT_IN_PARENT']);
    const absent = childOf(P);
    delete absent.allowed_tools;
    const r = evaluateScopeInheritance(absent, P);
    expect(r.violations).toEqual([expect.objectContaining({ code: 'TOOL_NOT_IN_PARENT', field: 'allowed_tools' })]);
    const open = scope();
    delete open.allowed_tools;
    expect(codes(childOf(open, { allowed_tools: ['anything'] }), open)).toEqual([]);
    const openChild = childOf(open);
    delete openChild.allowed_tools;
    expect(codes(openChild, open)).toEqual([]);
  });

  it('LATEST_TIME_AFTER_PARENT: later, absent under bounded, equal passes', () => {
    expect(codes(childOf(P, { ending_condition: { kind: 'time_limit', latest_time: '2026-10-14T12:00:01Z' } }), P)).toEqual(['LATEST_TIME_AFTER_PARENT']);
    expect(codes(childOf(P, { ending_condition: { kind: 'goal_satisfied' } }), P)).toEqual(['LATEST_TIME_AFTER_PARENT']);
    expect(codes(childOf(P, { ending_condition: { kind: 'time_limit', latest_time: '2026-10-14T12:00:00Z' } }), P)).toEqual([]);
  });

  it('EXPIRES_AFTER_PARENT: later and absent under bounded', () => {
    expect(codes(childOf(P, { expires_at: '2026-10-14T18:00:00.001Z' }), P)).toEqual(['EXPIRES_AFTER_PARENT']);
    const absent = childOf(P);
    delete absent.expires_at;
    expect(codes(absent, P)).toEqual(['EXPIRES_AFTER_PARENT']);
  });

  it('unparseable instants fail closed', () => {
    expect(codes(childOf(P, { expires_at: 'not-a-time' }), P)).toEqual(['EXPIRES_AFTER_PARENT']);
  });

  it('STOP_WORK_NOT_INHERITED only when the parent stop is requested', () => {
    const stopped = scope({ stop_work: { requested: true, requested_at: '2026-10-14T10:00:00Z', propagates_to_children: true } });
    expect(codes(childOf(stopped, { stop_work: { requested: false, propagates_to_children: true } }), stopped)).toEqual(['STOP_WORK_NOT_INHERITED']);
    expect(codes(childOf(stopped), stopped)).toEqual([]);
    // A child may stop on its own while the parent continues.
    expect(codes(childOf(P, { stop_work: { requested: true, requested_at: '2026-10-14T10:00:00Z', propagates_to_children: true } }), P)).toEqual([]);
  });

  it('reports violations in rule-table order', () => {
    const child = childOf(P, {
      parent_scope_id: GRANDCHILD_ID,
      permitted_sub_goals: ['zz'],
      allowed_tools: ['t9'],
      expires_at: '2026-10-15T00:00:00Z',
    });
    expect(codes(child, P)).toEqual(['PARENT_ID_MISMATCH', 'SUB_GOAL_NOT_IN_PARENT', 'TOOL_NOT_IN_PARENT', 'EXPIRES_AFTER_PARENT']);
  });

  it('does not mutate its inputs', () => {
    const parent = scope();
    const child = childOf(parent, { permitted_sub_goals: ['zz'] });
    const before = JSON.stringify([child, parent]);
    evaluateScopeInheritance(child, parent);
    expect(JSON.stringify([child, parent])).toBe(before);
  });
});

describe('evaluateScopeActivity', () => {
  const S = scope();
  const at = (iso: string) => evaluateScopeActivity(S, new Date(iso));

  it('active between issued_at and the earliest end bound', () => {
    expect(at('2026-10-14T09:00:00Z')).toEqual({ active: true, reason: 'active' });
    expect(at('2026-10-14T11:59:59.999Z')).toEqual({ active: true, reason: 'active' });
  });

  it('not_yet_issued before issued_at', () => {
    expect(at('2026-10-14T08:59:59.999Z')).toEqual({ active: false, reason: 'not_yet_issued' });
  });

  it('latest_time_passed at and after latest_time (exclusive bound)', () => {
    expect(at('2026-10-14T12:00:00Z')).toEqual({ active: false, reason: 'latest_time_passed' });
  });

  it('expired at and after expires_at, taking precedence over latest_time', () => {
    expect(at('2026-10-14T18:00:00Z')).toEqual({ active: false, reason: 'expired' });
  });

  it('stop_work_requested dominates every other state', () => {
    const stopped = scope({ stop_work: { requested: true, requested_at: '2026-10-14T10:00:00Z', propagates_to_children: true } });
    for (const iso of ['2026-10-14T08:00:00Z', '2026-10-14T10:00:00Z', '2026-10-20T00:00:00Z']) {
      expect(evaluateScopeActivity(stopped, new Date(iso))).toEqual({ active: false, reason: 'stop_work_requested' });
    }
  });

  it('a scope with no end bounds stays active indefinitely', () => {
    const open = scope({ ending_condition: { kind: 'goal_satisfied' } });
    delete open.expires_at;
    expect(evaluateScopeActivity(open, new Date('2099-01-01T00:00:00Z'))).toEqual({ active: true, reason: 'active' });
  });

  it('throws RangeError on an invalid clock', () => {
    expect(() => evaluateScopeActivity(S, new Date('nope'))).toThrow(RangeError);
    expect(() => evaluateScopeActivity(S, 'now' as unknown as Date)).toThrow(RangeError);
  });

  it('is monotone: once inactive (not because of not_yet_issued) it stays inactive', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 48 * 60 }), fc.integer({ min: 0, max: 48 * 60 }), (a, b) => {
        const [t1, t2] = a <= b ? [a, b] : [b, a];
        const base = Date.UTC(2026, 9, 14, 0, 0, 0);
        const r1 = evaluateScopeActivity(S, new Date(base + t1 * 60000));
        const r2 = evaluateScopeActivity(S, new Date(base + t2 * 60000));
        if (!r1.active && r1.reason !== 'not_yet_issued') expect(r2.active).toBe(false);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Properties
// ---------------------------------------------------------------------------

const GOALS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
const RESOURCES = ['r1', 'r2', 'r3', 'r4'];
const TOOLS = ['t1', 't2', 't3', 't4', 't5'];
const MODES: DataAccessMode[] = ['read', 'write', 'read_write'];
const BASE_MS = Date.UTC(2026, 9, 14, 0, 0, 0);
const iso = (h: number) => new Date(BASE_MS + h * 3600000).toISOString();

interface ScopeParams {
  goals: string[];
  cost: bigint | undefined;
  wall: number | undefined;
  access: Array<{ resource: string; mode: DataAccessMode }>;
  tools: string[] | undefined;
  latest: number | undefined;
  expires: number | undefined;
  stop: boolean;
}

const scopeArb: fc.Arbitrary<ScopeParams> = fc.record({
  goals: fc.uniqueArray(fc.constantFrom(...GOALS), { minLength: 1 }),
  cost: fc.option(fc.bigInt({ min: 0n, max: 10n ** 15n }), { nil: undefined }),
  wall: fc.option(fc.integer({ min: 0, max: 1_000_000_000 }), { nil: undefined }),
  access: fc.array(fc.record({ resource: fc.constantFrom(...RESOURCES), mode: fc.constantFrom(...MODES) }), { maxLength: 6 }),
  tools: fc.option(fc.uniqueArray(fc.constantFrom(...TOOLS)), { nil: undefined }),
  latest: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  expires: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  stop: fc.boolean(),
});

/** Value-independent narrowing choices; applied to a parent deterministically. */
interface NarrowParams {
  keep: boolean[];
  costCap: bigint;
  wallCap: number;
  narrowMode: boolean[];
  timeCap: number;
  setUnboundedLimits: boolean;
  stop: boolean;
}

const narrowArb: fc.Arbitrary<NarrowParams> = fc.record({
  keep: fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
  costCap: fc.bigInt({ min: 0n, max: 10n ** 15n }),
  wallCap: fc.integer({ min: 0, max: 1_000_000_000 }),
  narrowMode: fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
  timeCap: fc.integer({ min: 1, max: 1000 }),
  setUnboundedLimits: fc.boolean(),
  stop: fc.boolean(),
});

function toScope(p: ScopeParams, id = PARENT_ID, parentId?: string): ScopeOfAutonomy {
  const s: ScopeOfAutonomy = {
    scope_id: id,
    principal_id: 'org-a',
    agent_id: 'agent-a',
    permitted_sub_goals: [...p.goals],
    side_effect_budget: { data_access: p.access.map((a) => ({ ...a })) },
    clarification_triggers: [],
    ending_condition: p.latest === undefined ? { kind: 'goal_satisfied' } : { kind: 'time_limit', latest_time: iso(p.latest) },
    stop_work: p.stop
      ? { requested: true, requested_at: iso(0), propagates_to_children: true }
      : { requested: false, propagates_to_children: true },
    issued_at: iso(0),
    contract_version: '8.8.0',
  };
  if (parentId !== undefined) s.parent_scope_id = parentId;
  if (p.cost !== undefined) s.side_effect_budget.max_cost_micro = p.cost.toString();
  if (p.wall !== undefined) s.side_effect_budget.max_wall_clock_ms = p.wall;
  if (p.tools !== undefined) s.allowed_tools = [...p.tools];
  if (p.expires !== undefined) s.expires_at = iso(p.expires);
  return s;
}

function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/** Derive a child that is within `parent` by construction. */
function narrow(parent: ScopeParams, n: NarrowParams): ScopeParams {
  const goals = parent.goals.filter((_, i) => n.keep[i % n.keep.length]);
  const access = parent.access
    .filter((_, i) => n.keep[(i + 3) % n.keep.length])
    .map((a, i) => ({
      resource: a.resource,
      mode: a.mode === 'read_write' && n.narrowMode[i % n.narrowMode.length] ? ('read' as const) : a.mode,
    }));
  const optionalLimit = <T>(p: T | undefined, cap: T, min: (a: T, b: T) => T): T | undefined =>
    p !== undefined ? min(p, cap) : n.setUnboundedLimits ? cap : undefined;
  return {
    goals: goals.length > 0 ? goals : [parent.goals[0]],
    cost: optionalLimit(parent.cost, n.costCap, minBig),
    wall: optionalLimit(parent.wall, n.wallCap, Math.min),
    access,
    tools: parent.tools !== undefined ? parent.tools.filter((_, i) => n.keep[(i + 5) % n.keep.length]) : n.setUnboundedLimits ? ['any-tool'] : undefined,
    latest: optionalLimit(parent.latest, n.timeCap, Math.min),
    expires: optionalLimit(parent.expires, n.timeCap, Math.min),
    stop: parent.stop || n.stop,
  };
}

/** Widen a parent: every bound becomes looser or disappears. */
function widen(p: ScopeParams, n: NarrowParams): ScopeParams {
  return {
    goals: [...new Set([...p.goals, ...GOALS.filter((_, i) => n.keep[i])])],
    cost: p.cost === undefined || n.setUnboundedLimits ? undefined : p.cost + n.costCap,
    wall: p.wall === undefined || n.setUnboundedLimits ? undefined : p.wall + n.wallCap,
    access: [...p.access, ...RESOURCES.map((resource) => ({ resource, mode: 'read' as const })), ...p.access.map((a) => ({ resource: a.resource, mode: 'read_write' as const }))],
    tools: p.tools === undefined || n.setUnboundedLimits ? undefined : [...new Set([...p.tools, ...TOOLS])],
    latest: p.latest === undefined || n.setUnboundedLimits ? undefined : p.latest + n.timeCap,
    expires: p.expires === undefined || n.setUnboundedLimits ? undefined : p.expires + n.timeCap,
    stop: false,
  };
}

describe('evaluateScopeInheritance properties (fast-check)', () => {
  it('reflexive: a scope is within itself', () => {
    fc.assert(
      fc.property(scopeArb, (p) => {
        const s = toScope(p, PARENT_ID, PARENT_ID);
        expect(evaluateScopeInheritance(s, s).violations).toEqual([]);
      }),
    );
  });

  it('sound: a child narrowed from its parent is within it', () => {
    fc.assert(
      fc.property(scopeArb, narrowArb, (p, n) => {
        const parent = toScope(p);
        const child = toScope(narrow(p, n), CHILD_ID, PARENT_ID);
        expect(evaluateScopeInheritance(child, parent).violations).toEqual([]);
      }),
    );
  });

  it('monotone in the parent: widening the parent keeps a within-child within', () => {
    fc.assert(
      fc.property(scopeArb, narrowArb, narrowArb, (p, n, w) => {
        const childParams = narrow(p, n);
        const child = toScope({ ...childParams, stop: false }, CHILD_ID, PARENT_ID);
        const wide = toScope(widen(p, w));
        expect(evaluateScopeInheritance(child, wide).within_parent).toBe(true);
      }),
    );
  });

  it('transitive: grandchild within child within parent implies grandchild within parent', () => {
    fc.assert(
      fc.property(scopeArb, narrowArb, narrowArb, (p, n1, n2) => {
        const cp = narrow(p, n1);
        const gp = narrow(cp, n2);
        const parent = toScope(p);
        const child = toScope(cp, CHILD_ID, PARENT_ID);
        const grandchild = toScope(gp, GRANDCHILD_ID, CHILD_ID);
        expect(evaluateScopeInheritance(child, parent).within_parent).toBe(true);
        expect(evaluateScopeInheritance(grandchild, child).within_parent).toBe(true);
        const regrafted = { ...grandchild, parent_scope_id: PARENT_ID };
        expect(evaluateScopeInheritance(regrafted, parent).within_parent).toBe(true);
      }),
    );
  });

  it('detects widening: adding a sub-goal the parent lacks always yields SUB_GOAL_NOT_IN_PARENT', () => {
    fc.assert(
      fc.property(scopeArb, narrowArb, (p, n) => {
        const child = toScope({ ...narrow(p, n), goals: [...narrow(p, n).goals, 'not-in-parent'] }, CHILD_ID, PARENT_ID);
        expect(codes(child, toScope(p))).toContain('SUB_GOAL_NOT_IN_PARENT');
      }),
    );
  });

  it('detects widening: raising cost above a bounded parent always yields COST_EXCEEDS_PARENT', () => {
    fc.assert(
      fc.property(scopeArb, narrowArb, fc.bigInt({ min: 1n, max: 10n ** 6n }), (p, n, extra) => {
        fc.pre(p.cost !== undefined);
        const c = narrow(p, n);
        const child = toScope({ ...c, cost: (p.cost as bigint) + extra }, CHILD_ID, PARENT_ID);
        expect(codes(child, toScope(p))).toEqual(['COST_EXCEEDS_PARENT']);
      }),
    );
  });
});
