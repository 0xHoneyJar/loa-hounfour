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
import type { ScopeOfAutonomy } from './scope-of-autonomy.js';
export type ScopeInheritanceViolationCode = 'SUB_GOAL_NOT_IN_PARENT' | 'COST_EXCEEDS_PARENT' | 'WALL_CLOCK_EXCEEDS_PARENT' | 'DATA_ACCESS_EXCEEDS_PARENT' | 'TOOL_NOT_IN_PARENT' | 'LATEST_TIME_AFTER_PARENT' | 'EXPIRES_AFTER_PARENT' | 'STOP_WORK_NOT_INHERITED' | 'PARENT_ID_MISMATCH';
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
/**
 * SOA-6 — is `child` within `parent`?
 *
 * Pure and total over schema-valid inputs: never reads a clock, never
 * throws. See the module JSDoc for the rule table.
 */
export declare function evaluateScopeInheritance(child: ScopeOfAutonomy, parent: ScopeOfAutonomy): ScopeInheritanceResult;
/**
 * Is `scope` active at `now`? The only clock is the injected `now`.
 *
 * @throws RangeError when `now` is not a valid Date (an invalid clock
 *   cannot answer the question; failing loudly beats reporting `active`).
 */
export declare function evaluateScopeActivity(scope: ScopeOfAutonomy, now: Date): ScopeActivityResult;
//# sourceMappingURL=scope-of-autonomy-eval.d.ts.map