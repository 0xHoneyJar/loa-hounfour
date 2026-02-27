/**
 * Monetary Policy — coupling token creation to conservation invariants.
 *
 * Defines the policy regime for minting within a registry, including
 * collateral ratios, conservation ceilings, and review triggers.
 *
 * @see SDD §2.4 — MonetaryPolicy Schema
 * @since v7.0.0
 */
import { type Static } from '@sinclair/typebox';
export declare const ReviewTriggerSchema: import("@sinclair/typebox").TObject<{
    trigger_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"epoch_boundary">, import("@sinclair/typebox").TLiteral<"supply_threshold">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
    threshold_pct: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    epoch_interval: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ReviewTrigger = Static<typeof ReviewTriggerSchema>;
export declare const MonetaryPolicySchema: import("@sinclair/typebox").TObject<{
    policy_id: import("@sinclair/typebox").TString;
    registry_id: import("@sinclair/typebox").TString;
    minting_policy_id: import("@sinclair/typebox").TString;
    conservation_ceiling: import("@sinclair/typebox").TString;
    coupling_invariant: import("@sinclair/typebox").TString;
    collateral_ratio_bps: import("@sinclair/typebox").TInteger;
    review_trigger: import("@sinclair/typebox").TObject<{
        trigger_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"epoch_boundary">, import("@sinclair/typebox").TLiteral<"supply_threshold">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
        threshold_pct: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        epoch_interval: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    last_reviewed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type MonetaryPolicy = Static<typeof MonetaryPolicySchema>;
//# sourceMappingURL=monetary-policy.d.ts.map