import { type Static } from '@sinclair/typebox';
/**
 * Preference signal sub-schema for auction-like resource allocation.
 *
 * v5.4.0 — FR-4: Expresses routing preference without implementing auction mechanics.
 * @see "Virtual Agent Economies" (arXiv:2509.10147) — auction mechanisms
 */
export declare const PreferenceSignalSchema: import("@sinclair/typebox").TObject<{
    bid_priority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"critical">]>;
    preferred_pools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    cost_sensitivity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"medium">, import("@sinclair/typebox").TLiteral<"high">]>;
}>;
export type PreferenceSignal = Static<typeof PreferenceSignalSchema>;
/**
 * Budget scope schema for cost control in routing decisions.
 * Tracks spending limits and actions when limits are exceeded.
 *
 * Note: Marked with x-cross-field-validated for spent vs limit checks.
 */
export declare const BudgetScopeSchema: import("@sinclair/typebox").TObject<{
    scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"project">, import("@sinclair/typebox").TLiteral<"sprint">, import("@sinclair/typebox").TLiteral<"phase">, import("@sinclair/typebox").TLiteral<"conversation">]>;
    scope_id: import("@sinclair/typebox").TString;
    limit_micro: import("@sinclair/typebox").TString;
    spent_micro: import("@sinclair/typebox").TString;
    action_on_exceed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"block">, import("@sinclair/typebox").TLiteral<"warn">, import("@sinclair/typebox").TLiteral<"downgrade">]>;
    contract_version: import("@sinclair/typebox").TString;
    /** Reserved capacity in basis points (0-10000). Optional — absent means no reservation. */
    reserved_capacity_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    /** Linked reservation ID. Present when budget scope has an active reservation. */
    reservation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    /** v5.4.0 — Preference signal for auction-like resource allocation. */
    preference_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        bid_priority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"critical">]>;
        preferred_pools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        cost_sensitivity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"medium">, import("@sinclair/typebox").TLiteral<"high">]>;
    }>>;
}>;
export type BudgetScope = Static<typeof BudgetScopeSchema>;
//# sourceMappingURL=budget-scope.d.ts.map