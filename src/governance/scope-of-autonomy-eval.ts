/**
 * Pure evaluators for `ScopeOfAutonomy` (SDD §1, FR-C1).
 *
 * - `evaluateScopeInheritance(child, parent)` — SOA-6: is the child scope
 *   within its parent? Pure; no clock, no I/O.
 * - `evaluateScopeActivity(scope, now)` — is the scope active at `now`?
 *   The clock is injected so callers stay deterministic (SOA-N2).
 *
 * Both functions assume their inputs already passed
 * `validate(ScopeOfAutonomySchema, x)`. They report facts about the shapes;
 * they do not authorize anything. Whether an action falls inside a scope,
 * and whether a principal may grant a scope at all (SOA-7), is consumer
 * policy (ADR-010, ADR-008 pure-evaluator pattern).
 *
 * ## Inheritance rules (child must be within parent)
 *
 * | Code | Rule |
 * |------|------|
 * | PARENT_ID_MISMATCH | `child.parent_scope_id` equals `parent.scope_id` |
 * | SUB_GOAL_NOT_IN_PARENT | every child sub-goal is a parent sub-goal (exact string) |
 * | COST_EXCEEDS_PARENT | parent sets `max_cost_micro` ⇒ child sets it and it is ≤ parent's (BigInt) |
 * | WALL_CLOCK_EXCEEDS_PARENT | parent sets `max_wall_clock_ms` ⇒ child sets it and it is ≤ parent's |
 * | DATA_ACCESS_EXCEEDS_PARENT | every child (resource, mode) is covered by the parent's modes on the same resource |
 * | TOOL_NOT_IN_PARENT | parent sets `allowed_tools` ⇒ child sets it and it is a subset |
 * | LATEST_TIME_AFTER_PARENT | parent sets `ending_condition.latest_time` ⇒ child sets it and it is not later |
 * | EXPIRES_AFTER_PARENT | parent sets `expires_at` ⇒ child sets it and it is not later |
 * | STOP_WORK_NOT_INHERITED | parent stop requested ⇒ child stop requested |
 *
 * An absent parent limit is unbounded. An absent child limit under a
 * bounded parent is a violation: the child would otherwise claim more than
 * the parent granted.
 *
 * ## Decisions (SDD §1 left these open)
 *
 * - Data-access coverage takes the union of the parent's modes on a
 *   resource. A parent granting `read` and `write` on the same resource in
 *   two entries covers a child's `read_write`. Exact-string resource match;
 *   no prefix or glob semantics.
 * - Violations are reported in the table order above, one per offending
 *   element, so diagnostics are deterministic.
 * - Activity precedence: `stop_work_requested`, then `not_yet_issued`,
 *   then `expired`, then `latest_time_passed`. `expires_at` and
 *   `latest_time` are exclusive bounds: at that instant the scope is no
 *   longer active.
 *
 * @see src/governance/scope-of-autonomy.ts — schema + SOA rule ids
 * @see docs/architecture/scope-of-autonomy.md
 * @since v8.8.0 (PR-C1, FR-C1)
 */
import type { ScopeOfAutonomy, DataAccessMode } from './scope-of-autonomy.js';
import { parseIsoDateTimeStrict } from '../validators/formats.js';

export type ScopeInheritanceViolationCode =
  | 'SUB_GOAL_NOT_IN_PARENT'
  | 'COST_EXCEEDS_PARENT'
  | 'WALL_CLOCK_EXCEEDS_PARENT'
  | 'DATA_ACCESS_EXCEEDS_PARENT'
  | 'TOOL_NOT_IN_PARENT'
  | 'LATEST_TIME_AFTER_PARENT'
  | 'EXPIRES_AFTER_PARENT'
  | 'STOP_WORK_NOT_INHERITED'
  | 'PARENT_ID_MISMATCH';

export interface ScopeInheritanceViolation {
  code: ScopeInheritanceViolationCode;
  message: string;
  /** Dotted path into the child scope that carries the violation. */
  field: string;
  child_value?: unknown;
  parent_value?: unknown;
}

export interface ScopeInheritanceResult {
  within_parent: boolean;
  violations: ScopeInheritanceViolation[];
}

export interface ScopeActivityResult {
  active: boolean;
  reason: 'active' | 'not_yet_issued' | 'expired' | 'latest_time_passed' | 'stop_work_requested';
}

function covers(parentModes: ReadonlySet<DataAccessMode>, childMode: DataAccessMode): boolean {
  if (parentModes.has('read_write')) return true;
  if (childMode === 'read_write') return parentModes.has('read') && parentModes.has('write');
  return parentModes.has(childMode);
}

function instantMs(value: string): number {
  const parsed = parseIsoDateTimeStrict(value);
  return parsed === null ? Number.NaN : parsed.getTime();
}

/**
 * Compare an optional child bound against an optional parent bound.
 * Returns true when the child is within the parent. `lessOrEqual` receives
 * both values only when both are present.
 */
function withinBound<T>(
  child: T | undefined,
  parent: T | undefined,
  lessOrEqual: (c: T, p: T) => boolean,
): boolean {
  if (parent === undefined) return true;
  if (child === undefined) return false;
  return lessOrEqual(child, parent);
}

function bigintLe(c: string, p: string): boolean {
  try {
    return BigInt(c) <= BigInt(p);
  } catch {
    return false;
  }
}

function instantLe(c: string, p: string): boolean {
  const cm = instantMs(c);
  const pm = instantMs(p);
  // Unparseable instants compare as "not within" (fail closed).
  return !Number.isNaN(cm) && !Number.isNaN(pm) && cm <= pm;
}

/**
 * SOA-6 — is `child` within `parent`?
 *
 * Pure and total over schema-valid inputs: never reads a clock, never
 * throws. See the module JSDoc for the rule table.
 */
export function evaluateScopeInheritance(
  child: ScopeOfAutonomy,
  parent: ScopeOfAutonomy,
): ScopeInheritanceResult {
  const violations: ScopeInheritanceViolation[] = [];

  if (child.parent_scope_id !== parent.scope_id) {
    violations.push({
      code: 'PARENT_ID_MISMATCH',
      message:
        child.parent_scope_id === undefined
          ? `child scope is a root scope (no parent_scope_id) but was evaluated against parent ${parent.scope_id}.`
          : `child.parent_scope_id ${child.parent_scope_id} does not reference parent.scope_id ${parent.scope_id}.`,
      field: 'parent_scope_id',
      child_value: child.parent_scope_id,
      parent_value: parent.scope_id,
    });
  }

  const parentGoals = new Set(parent.permitted_sub_goals);
  child.permitted_sub_goals.forEach((goal, i) => {
    if (!parentGoals.has(goal)) {
      violations.push({
        code: 'SUB_GOAL_NOT_IN_PARENT',
        message: `sub-goal ${JSON.stringify(goal)} is not permitted by the parent scope.`,
        field: `permitted_sub_goals[${i}]`,
        child_value: goal,
      });
    }
  });

  const cb = child.side_effect_budget;
  const pb = parent.side_effect_budget;
  if (!withinBound(cb.max_cost_micro, pb.max_cost_micro, bigintLe)) {
    violations.push({
      code: 'COST_EXCEEDS_PARENT',
      message:
        cb.max_cost_micro === undefined
          ? `parent limits cost to ${pb.max_cost_micro} micro-USD but child sets no cost limit.`
          : `child cost limit ${cb.max_cost_micro} exceeds parent limit ${pb.max_cost_micro} micro-USD.`,
      field: 'side_effect_budget.max_cost_micro',
      child_value: cb.max_cost_micro,
      parent_value: pb.max_cost_micro,
    });
  }
  if (!withinBound(cb.max_wall_clock_ms, pb.max_wall_clock_ms, (c, p) => c <= p)) {
    violations.push({
      code: 'WALL_CLOCK_EXCEEDS_PARENT',
      message:
        cb.max_wall_clock_ms === undefined
          ? `parent limits wall clock to ${pb.max_wall_clock_ms} ms but child sets no wall-clock limit.`
          : `child wall-clock limit ${cb.max_wall_clock_ms} ms exceeds parent limit ${pb.max_wall_clock_ms} ms.`,
      field: 'side_effect_budget.max_wall_clock_ms',
      child_value: cb.max_wall_clock_ms,
      parent_value: pb.max_wall_clock_ms,
    });
  }

  const parentModes = new Map<string, Set<DataAccessMode>>();
  for (const grant of pb.data_access) {
    let modes = parentModes.get(grant.resource);
    if (!modes) {
      modes = new Set();
      parentModes.set(grant.resource, modes);
    }
    modes.add(grant.mode);
  }
  cb.data_access.forEach((grant, i) => {
    const modes = parentModes.get(grant.resource);
    if (!modes || !covers(modes, grant.mode)) {
      violations.push({
        code: 'DATA_ACCESS_EXCEEDS_PARENT',
        message: `child requests ${grant.mode} on ${JSON.stringify(grant.resource)}, which the parent does not grant.`,
        field: `side_effect_budget.data_access[${i}]`,
        child_value: grant,
        parent_value: modes ? [...modes].sort() : undefined,
      });
    }
  });

  if (parent.allowed_tools !== undefined) {
    if (child.allowed_tools === undefined) {
      violations.push({
        code: 'TOOL_NOT_IN_PARENT',
        message: 'parent restricts allowed_tools but child does not, so the child would permit any tool.',
        field: 'allowed_tools',
        parent_value: parent.allowed_tools,
      });
    } else {
      const parentTools = new Set(parent.allowed_tools);
      child.allowed_tools.forEach((tool, i) => {
        if (!parentTools.has(tool)) {
          violations.push({
            code: 'TOOL_NOT_IN_PARENT',
            message: `tool ${JSON.stringify(tool)} is not allowed by the parent scope.`,
            field: `allowed_tools[${i}]`,
            child_value: tool,
          });
        }
      });
    }
  }

  const cl = child.ending_condition.latest_time;
  const pl = parent.ending_condition.latest_time;
  if (!withinBound(cl, pl, instantLe)) {
    violations.push({
      code: 'LATEST_TIME_AFTER_PARENT',
      message:
        cl === undefined
          ? `parent ends no later than ${pl} but child sets no latest_time.`
          : `child latest_time ${cl} is after parent latest_time ${pl}.`,
      field: 'ending_condition.latest_time',
      child_value: cl,
      parent_value: pl,
    });
  }

  if (!withinBound(child.expires_at, parent.expires_at, instantLe)) {
    violations.push({
      code: 'EXPIRES_AFTER_PARENT',
      message:
        child.expires_at === undefined
          ? `parent expires at ${parent.expires_at} but child sets no expires_at.`
          : `child expires_at ${child.expires_at} is after parent expires_at ${parent.expires_at}.`,
      field: 'expires_at',
      child_value: child.expires_at,
      parent_value: parent.expires_at,
    });
  }

  if (parent.stop_work.requested && !child.stop_work.requested) {
    violations.push({
      code: 'STOP_WORK_NOT_INHERITED',
      message: 'parent scope has a stop-work request that the child scope does not carry.',
      field: 'stop_work.requested',
      child_value: child.stop_work.requested,
      parent_value: parent.stop_work.requested,
    });
  }

  return { within_parent: violations.length === 0, violations };
}

/**
 * Is `scope` active at `now`? The only clock is the injected `now`.
 *
 * @throws RangeError when `now` is not a valid Date (an invalid clock
 *   cannot answer the question; failing loudly beats reporting `active`).
 */
export function evaluateScopeActivity(scope: ScopeOfAutonomy, now: Date): ScopeActivityResult {
  const t = now instanceof Date ? now.getTime() : Number.NaN;
  if (Number.isNaN(t)) {
    throw new RangeError('evaluateScopeActivity: now must be a valid Date.');
  }
  if (scope.stop_work.requested) return { active: false, reason: 'stop_work_requested' };

  const issued = instantMs(scope.issued_at);
  if (Number.isNaN(issued) || t < issued) return { active: false, reason: 'not_yet_issued' };

  if (scope.expires_at !== undefined) {
    const expires = instantMs(scope.expires_at);
    if (Number.isNaN(expires) || t >= expires) return { active: false, reason: 'expired' };
  }

  const latest = scope.ending_condition.latest_time;
  if (latest !== undefined) {
    const latestMs = instantMs(latest);
    if (Number.isNaN(latestMs) || t >= latestMs) return { active: false, reason: 'latest_time_passed' };
  }

  return { active: true, reason: 'active' };
}
