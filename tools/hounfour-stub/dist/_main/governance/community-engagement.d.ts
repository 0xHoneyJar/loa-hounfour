/**
 * Community Engagement Signal — the social fabric of protocol governance.
 *
 * Captures participation, endorsement, contribution, and cultural resonance
 * signals that feed into reputation and governance weighting. These signals
 * represent the qualitative dimension that pure economic metrics miss —
 * the difference between an agent that processes transactions and one that
 * strengthens the community.
 *
 * @see DR-S10 — Community engagement primitives
 * @see Ostrom Principle 3: Collective-choice arrangements (participation matters)
 * @since v7.7.0
 */
import { type Static } from '@sinclair/typebox';
/** @governance registry-extensible */
export declare const EngagementSignalTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"participation">, import("@sinclair/typebox").TLiteral<"endorsement">, import("@sinclair/typebox").TLiteral<"contribution">, import("@sinclair/typebox").TLiteral<"cultural_resonance">]>;
export type EngagementSignalType = Static<typeof EngagementSignalTypeSchema>;
/**
 * A signal of community engagement from an agent personality.
 *
 * @since v7.7.0 — DR-S10
 */
export declare const CommunityEngagementSignalSchema: import("@sinclair/typebox").TObject<{
    signal_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    signal_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"participation">, import("@sinclair/typebox").TLiteral<"endorsement">, import("@sinclair/typebox").TLiteral<"contribution">, import("@sinclair/typebox").TLiteral<"cultural_resonance">]>;
    weight: import("@sinclair/typebox").TNumber;
    context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    source_event_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    recorded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type CommunityEngagementSignal = Static<typeof CommunityEngagementSignalSchema>;
//# sourceMappingURL=community-engagement.d.ts.map