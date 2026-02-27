/**
 * Reputation Economic Impact — the feedback loop from trust to capital.
 *
 * When an agent's reputation changes, economic consequences follow:
 * tier upgrades, access revocations, budget adjustments, routing changes.
 * This schema records those consequences, completing the Conway Automaton
 * survival chain: existence → compute → money → value creation → write access.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @see loa-finn #80 — Conway Automaton survival chain comparison
 * @since v7.7.0
 */
import { type Static } from '@sinclair/typebox';
export declare const EconomicImpactTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tier_upgrade">, import("@sinclair/typebox").TLiteral<"tier_downgrade">, import("@sinclair/typebox").TLiteral<"access_granted">, import("@sinclair/typebox").TLiteral<"access_revoked">, import("@sinclair/typebox").TLiteral<"budget_adjusted">, import("@sinclair/typebox").TLiteral<"routing_changed">]>;
export type EconomicImpactType = Static<typeof EconomicImpactTypeSchema>;
export declare const ReputationTriggerEventSchema: import("@sinclair/typebox").TObject<{
    event_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"state_transition">, import("@sinclair/typebox").TLiteral<"score_change">, import("@sinclair/typebox").TLiteral<"demotion">, import("@sinclair/typebox").TLiteral<"decay">]>;
    from_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
    to_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
    score_delta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export type ReputationTriggerEvent = Static<typeof ReputationTriggerEventSchema>;
export declare const EconomicImpactEntrySchema: import("@sinclair/typebox").TObject<{
    impact_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tier_upgrade">, import("@sinclair/typebox").TLiteral<"tier_downgrade">, import("@sinclair/typebox").TLiteral<"access_granted">, import("@sinclair/typebox").TLiteral<"access_revoked">, import("@sinclair/typebox").TLiteral<"budget_adjusted">, import("@sinclair/typebox").TLiteral<"routing_changed">]>;
    description: import("@sinclair/typebox").TString;
    policy_version_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type EconomicImpactEntry = Static<typeof EconomicImpactEntrySchema>;
/**
 * Records the economic consequences of a reputation change.
 *
 * @since v7.7.0 — DR-S10
 */
export declare const ReputationEconomicImpactSchema: import("@sinclair/typebox").TObject<{
    impact_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    trigger_event: import("@sinclair/typebox").TObject<{
        event_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"state_transition">, import("@sinclair/typebox").TLiteral<"score_change">, import("@sinclair/typebox").TLiteral<"demotion">, import("@sinclair/typebox").TLiteral<"decay">]>;
        from_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
        to_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
        score_delta: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>;
    impacts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        impact_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tier_upgrade">, import("@sinclair/typebox").TLiteral<"tier_downgrade">, import("@sinclair/typebox").TLiteral<"access_granted">, import("@sinclair/typebox").TLiteral<"access_revoked">, import("@sinclair/typebox").TLiteral<"budget_adjusted">, import("@sinclair/typebox").TLiteral<"routing_changed">]>;
        description: import("@sinclair/typebox").TString;
        policy_version_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationEconomicImpact = Static<typeof ReputationEconomicImpactSchema>;
//# sourceMappingURL=reputation-economic-impact.d.ts.map