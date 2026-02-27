/**
 * Collection Governance Configuration — per-community Bayesian parameters.
 *
 * Makes the reputation system's conservatism parameter (pseudo_count k),
 * state transition thresholds, and temporal decay policy configurable
 * per collection, governable via GovernanceProposal.
 *
 * In the Web4 framing, pseudo_count is the community's "interest rate for trust":
 * high k = conservative (new members must prove themselves extensively),
 * low k = permissive (quick trust establishment).
 *
 * @see DR-S5 — Governable pseudo_count as community risk appetite
 * @see DR-S6 — Temporal state demotion (the missing clock)
 * @since v7.6.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * A single demotion rule for temporal state decay.
 *
 * Defines when a reputation state should be demoted due to inactivity.
 * Only backward transitions are valid (authoritative→established,
 * established→warming, warming→cold).
 *
 * @since v7.6.0 — DR-S6
 */
export declare const DemotionRuleSchema: import("@sinclair/typebox").TObject<{
    from_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    to_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    inactivity_days: import("@sinclair/typebox").TInteger;
    require_decayed_below: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export type DemotionRule = Static<typeof DemotionRuleSchema>;
/**
 * Temporal decay policy for reputation within a collection.
 *
 * Controls how reputation decays over time when agents are inactive.
 * The half_life_days parameter feeds into computeDecayedSampleCount().
 * Demotion rules add clock-based state transitions on top of statistical decay.
 *
 * @since v7.6.0 — DR-S6
 */
export declare const ReputationDecayPolicySchema: import("@sinclair/typebox").TObject<{
    half_life_days: import("@sinclair/typebox").TInteger;
    demotion_rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        from_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        to_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        inactivity_days: import("@sinclair/typebox").TInteger;
        require_decayed_below: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>>;
    enable_auto_demotion: import("@sinclair/typebox").TBoolean;
}>;
export type ReputationDecayPolicy = Static<typeof ReputationDecayPolicySchema>;
/**
 * Per-collection governance configuration.
 *
 * Captures the governable parameters that control the Bayesian reputation
 * system for a specific collection. Each field can be updated via
 * GovernanceProposal with change_type 'parameter_update'.
 *
 * @see FAANG parallel: Airbnb's trust system evolved from global to market-specific thresholds
 * @since v7.6.0 — DR-S5
 */
export declare const CollectionGovernanceConfigSchema: import("@sinclair/typebox").TObject<{
    config_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pseudo_count: import("@sinclair/typebox").TInteger;
    state_thresholds: import("@sinclair/typebox").TObject<{
        warming_min_events: import("@sinclair/typebox").TInteger;
        established_min_samples: import("@sinclair/typebox").TInteger;
        authoritative_min_weight: import("@sinclair/typebox").TNumber;
    }>;
    decay_policy: import("@sinclair/typebox").TObject<{
        half_life_days: import("@sinclair/typebox").TInteger;
        demotion_rules: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            from_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
            to_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
            inactivity_days: import("@sinclair/typebox").TInteger;
            require_decayed_below: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        }>>;
        enable_auto_demotion: import("@sinclair/typebox").TBoolean;
    }>;
    updated_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type CollectionGovernanceConfig = Static<typeof CollectionGovernanceConfigSchema>;
/**
 * Sensible defaults matching current hardcoded behavior.
 *
 * Provides backward compatibility: if no CollectionGovernanceConfig exists,
 * the system behaves exactly as before v7.6.0.
 */
export declare const DEFAULT_DEMOTION_RULES: readonly DemotionRule[];
//# sourceMappingURL=collection-governance-config.d.ts.map