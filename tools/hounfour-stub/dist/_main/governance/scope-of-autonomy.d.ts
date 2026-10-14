/**
 * `ScopeOfAutonomy` — structured record of the autonomy a principal grants
 * to an agent: which sub-goals it may pursue, what side effects it may cause,
 * which tools it may call, when it must stop and ask, and when the grant
 * ends. Scopes form an inheritance tree via `parent_scope_id`; a child scope
 * MUST stay within its parent (SOA-6, evaluated by
 * `evaluateScopeInheritance()` in `./scope-of-autonomy-eval.ts`).
 *
 * The record is aligned to the structured scope-of-autonomy record described
 * in public model behaviour policies (sub-goals, side-effect budget,
 * clarification triggers, ending condition, stop-work). Hounfour ships the
 * shape; the consumer runtime decides what an action means against it
 * (ADR-010: shape, not authority).
 *
 * ## Library-evaluated constraints (enforced by `validate()`)
 *
 * Registered as a cross-field validator (`validateScopeOfAutonomy`), so
 * `validate(ScopeOfAutonomySchema, x)` rejects violations:
 *
 * - **SOA-1** `permitted_sub_goals` values are distinct.
 * - **SOA-2** `ending_condition.kind == 'time_limit'` implies
 *   `ending_condition.latest_time` is present.
 * - **SOA-3** `expires_at` is absent or strictly after `issued_at`.
 * - **SOA-4** `stop_work.requested == true` implies `stop_work.requested_at`
 *   is present.
 * - **SOA-5** when both `ending_condition.latest_time` and `expires_at` are
 *   present, `latest_time` is not after `expires_at`.
 *
 * ## Consumer-evaluated constraints
 *
 * - **SOA-6** a child scope is within its parent. `validate()` evaluates it
 *   when the consumer supplies the resolved parent via
 *   `{ scopeContext: { parent_scope } }`; otherwise it surfaces an
 *   unverified-obligations entry with `reason: 'scope_parent_context_deferred'`.
 * - **SOA-7** `principal_id` is authorized to grant this scope to `agent_id`.
 *   Pure consumer authority (ADR-010); never evaluated by the library.
 *
 * ## Explicit non-constraints
 *
 * - **SOA-N1** The library does NOT decide whether a sub-goal string matches
 *   an action. `permitted_sub_goals` entries are opaque strings; semantic
 *   matching ("does 'refactor the parser' cover editing tokenizer.ts?") is
 *   consumer policy. Inheritance compares sub-goals by exact string only.
 * - **SOA-N2** The library does NOT enforce wall-clock expiry at
 *   `validate()` time. `validate()` has no clock; a scope whose `expires_at`
 *   is in the past is still structurally valid. Consumers call
 *   `evaluateScopeActivity(scope, now)` with an injected `now`.
 * - **SOA-N3** `allowed_tools` is NOT cross-checked against any tool
 *   registry. Tool names are opaque strings; absent `allowed_tools` means the
 *   scope does not restrict tools (the consumer's own defaults apply).
 * - `principal_id` and `agent_id` are NOT resolved against `AgentIdentity` /
 *   `OrgIdentity` records. They are opaque identifiers; resolution is
 *   consumer state.
 * - `clarification_triggers` are NOT interpreted. They are display text the
 *   consumer runtime evaluates; the library only bounds their size.
 * - `side_effect_budget.max_cost_micro` is NOT reconciled against spend.
 *   Metering is consumer state; the library compares limits only between a
 *   child and its parent (SOA-6).
 *
 * ## Decisions (SDD §1 left these open)
 *
 * - SOA-1 is enforced by the cross-field validator rather than by a DSL
 *   `unique_values` expression: the DSL builtin only compares a named field
 *   of object elements, and `permitted_sub_goals` is an array of strings.
 * - The cross-field validator enforces all five library rules (SOA-1..5),
 *   not only SOA-2/3/4, so `validate()` and the constraint file agree.
 * - `stop_work.propagates_to_children` is pinned to `true`: a stop request
 *   on a parent always binds its children (see STOP_WORK_NOT_INHERITED in
 *   the inheritance evaluator).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/scope-of-autonomy.md
 * @since v8.8.0 (PR-C1, FR-C1)
 */
import { type Static } from '@sinclair/typebox';
/** Access mode for a data resource named in a side-effect budget. */
export declare const DataAccessModeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"read_write">]>;
export type DataAccessMode = Static<typeof DataAccessModeSchema>;
/** One (resource, mode) grant inside a side-effect budget. */
export declare const DataAccessGrantSchema: import("@sinclair/typebox").TObject<{
    resource: import("@sinclair/typebox").TString;
    mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"read_write">]>;
}>;
export type DataAccessGrant = Static<typeof DataAccessGrantSchema>;
/** Bounds on the side effects an agent may cause while acting in a scope. */
export declare const SideEffectBudgetSchema: import("@sinclair/typebox").TObject<{
    max_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    max_wall_clock_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    data_access: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        resource: import("@sinclair/typebox").TString;
        mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"read_write">]>;
    }>>;
}>;
export type SideEffectBudget = Static<typeof SideEffectBudgetSchema>;
/** Kind of condition that ends a scope. */
export declare const EndingConditionKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"time_limit">, import("@sinclair/typebox").TLiteral<"goal_satisfied">, import("@sinclair/typebox").TLiteral<"budget_exhausted">, import("@sinclair/typebox").TLiteral<"explicit_stop">, import("@sinclair/typebox").TLiteral<"composite">]>;
export type EndingConditionKind = Static<typeof EndingConditionKindSchema>;
/** When the scope ends. */
export declare const EndingConditionSchema: import("@sinclair/typebox").TObject<{
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"time_limit">, import("@sinclair/typebox").TLiteral<"goal_satisfied">, import("@sinclair/typebox").TLiteral<"budget_exhausted">, import("@sinclair/typebox").TLiteral<"explicit_stop">, import("@sinclair/typebox").TLiteral<"composite">]>;
    latest_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type EndingCondition = Static<typeof EndingConditionSchema>;
/** Stop-work state of a scope. */
export declare const StopWorkSchema: import("@sinclair/typebox").TObject<{
    requested: import("@sinclair/typebox").TBoolean;
    requested_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    requested_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    propagates_to_children: import("@sinclair/typebox").TLiteral<true>;
}>;
export type StopWork = Static<typeof StopWorkSchema>;
export declare const ScopeOfAutonomySchema: import("@sinclair/typebox").TObject<{
    scope_id: import("@sinclair/typebox").TString;
    principal_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    parent_scope_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    permitted_sub_goals: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    side_effect_budget: import("@sinclair/typebox").TObject<{
        max_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        max_wall_clock_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        data_access: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            resource: import("@sinclair/typebox").TString;
            mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"read">, import("@sinclair/typebox").TLiteral<"write">, import("@sinclair/typebox").TLiteral<"read_write">]>;
        }>>;
    }>;
    allowed_tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    clarification_triggers: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    ending_condition: import("@sinclair/typebox").TObject<{
        kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"time_limit">, import("@sinclair/typebox").TLiteral<"goal_satisfied">, import("@sinclair/typebox").TLiteral<"budget_exhausted">, import("@sinclair/typebox").TLiteral<"explicit_stop">, import("@sinclair/typebox").TLiteral<"composite">]>;
        latest_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    stop_work: import("@sinclair/typebox").TObject<{
        requested: import("@sinclair/typebox").TBoolean;
        requested_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        requested_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        propagates_to_children: import("@sinclair/typebox").TLiteral<true>;
    }>;
    issued_at: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    additional_details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ScopeOfAutonomy = Static<typeof ScopeOfAutonomySchema>;
/**
 * Cross-field validator for `ScopeOfAutonomy` (SOA-1..SOA-5). Runs after
 * the structural tier has passed; defensive against non-object input so it
 * never throws. Error strings are prefixed with the rule id.
 */
export declare function validateScopeOfAutonomy(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=scope-of-autonomy.d.ts.map