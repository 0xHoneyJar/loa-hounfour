/**
 * Delegation Quality Event — outcome-to-reputation feedback loop.
 *
 * Maps delegation outcomes (unanimous, majority, deadlock, escalation) to
 * quality signals that feed back into the reputation system. This closes
 * the loop between delegation results and personality reputation scores.
 *
 * @see DR-S3 — Deep Bridgebuilder Review SPECULATION finding
 * @since v7.5.0
 */
import { type Static } from '@sinclair/typebox';
export declare const QualitySignalLevelSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
export type QualitySignalLevel = Static<typeof QualitySignalLevelSchema>;
export declare const OutcomeQualityMappingSchema: import("@sinclair/typebox").TObject<{
    unanimous: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
    majority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
    deadlock: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
    escalation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
}>;
export type OutcomeQualityMapping = Static<typeof OutcomeQualityMappingSchema>;
/**
 * Default mapping from outcome types to quality signals.
 * Collections may override these defaults via governance proposals.
 */
export declare const DEFAULT_OUTCOME_QUALITY_MAPPING: OutcomeQualityMapping;
/**
 * Numeric scores for each quality signal level.
 * Used as the baseline quality_score in DelegationQualityEvent.
 */
export declare const QUALITY_SIGNAL_SCORES: Record<QualitySignalLevel, number>;
export declare const DelegationQualityEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    outcome_id: import("@sinclair/typebox").TString;
    tree_node_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    outcome_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"majority">, import("@sinclair/typebox").TLiteral<"deadlock">, import("@sinclair/typebox").TLiteral<"escalation">]>;
    quality_signal: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
    quality_score: import("@sinclair/typebox").TNumber;
    mapping_used: import("@sinclair/typebox").TObject<{
        unanimous: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
        majority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
        deadlock: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
        escalation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"moderate">, import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"negative">]>;
    }>;
    model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DelegationQualityEvent = Static<typeof DelegationQualityEventSchema>;
//# sourceMappingURL=delegation-quality.d.ts.map