/**
 * Economic Boundary — the membrane between trust and capital.
 *
 * Captures the boundary conditions at the moment an access decision is made:
 * what was the agent's reputation state, what was their remaining budget,
 * and what was the decision? This is the JWT boundary pipeline (Part 1, §VII)
 * made explicit as a first-class schema.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @see FAANG parallel: Google Zanzibar relationship tuples (trust × policy → decision)
 * @since v7.7.0
 */
import { type Static } from '@sinclair/typebox';
export declare const TrustLayerSnapshotSchema: import("@sinclair/typebox").TObject<{
    reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    blended_score: import("@sinclair/typebox").TNumber;
    snapshot_at: import("@sinclair/typebox").TString;
}>;
export type TrustLayerSnapshot = Static<typeof TrustLayerSnapshotSchema>;
export declare const CapitalLayerSnapshotSchema: import("@sinclair/typebox").TObject<{
    budget_remaining: import("@sinclair/typebox").TString;
    billing_tier: import("@sinclair/typebox").TString;
    budget_period_end: import("@sinclair/typebox").TString;
}>;
export type CapitalLayerSnapshot = Static<typeof CapitalLayerSnapshotSchema>;
export declare const AccessDecisionSchema: import("@sinclair/typebox").TObject<{
    granted: import("@sinclair/typebox").TBoolean;
    policy_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    denial_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type AccessDecision = Static<typeof AccessDecisionSchema>;
/**
 * Threshold criteria for evaluating economic boundary access.
 * @since v7.9.0 — FR-1 Decision Engine
 */
export declare const QualificationCriteriaSchema: import("@sinclair/typebox").TObject<{
    min_trust_score: import("@sinclair/typebox").TNumber;
    min_reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    min_available_budget: import("@sinclair/typebox").TString;
}>;
export type QualificationCriteria = Static<typeof QualificationCriteriaSchema>;
export declare const TrustEvaluationSchema: import("@sinclair/typebox").TObject<{
    passed: import("@sinclair/typebox").TBoolean;
    actual_score: import("@sinclair/typebox").TNumber;
    required_score: import("@sinclair/typebox").TNumber;
    actual_state: import("@sinclair/typebox").TString;
    required_state: import("@sinclair/typebox").TString;
}>;
export type TrustEvaluation = Static<typeof TrustEvaluationSchema>;
export declare const CapitalEvaluationSchema: import("@sinclair/typebox").TObject<{
    passed: import("@sinclair/typebox").TBoolean;
    actual_budget: import("@sinclair/typebox").TString;
    required_budget: import("@sinclair/typebox").TString;
}>;
export type CapitalEvaluation = Static<typeof CapitalEvaluationSchema>;
/**
 * Machine-parseable denial codes for programmatic consumers.
 * Complements human-readable denial_reason with structured codes.
 * @since v7.9.1 — F4 deep review improvement
 */
export declare const DenialCodeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"TRUST_SCORE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"TRUST_STATE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"CAPITAL_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"UNKNOWN_REPUTATION_STATE">, import("@sinclair/typebox").TLiteral<"INVALID_BUDGET_FORMAT">, import("@sinclair/typebox").TLiteral<"MISSING_QUALIFICATION_CRITERIA">, import("@sinclair/typebox").TLiteral<"BUDGET_PERIOD_EXPIRED">, import("@sinclair/typebox").TLiteral<"TIER_REPUTATION_MISMATCH">, import("@sinclair/typebox").TLiteral<"BUDGET_SCOPE_MISMATCH">]>;
export type DenialCode = Static<typeof DenialCodeSchema>;
/**
 * Structured gap information for denied evaluations.
 * Actionable feedback: tells the agent exactly how much to improve.
 * @since v7.9.1 — Q4 deep review improvement (denial as feedback, not death)
 */
export declare const EvaluationGapSchema: import("@sinclair/typebox").TObject<{
    trust_score_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    reputation_state_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    budget_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type EvaluationGap = Static<typeof EvaluationGapSchema>;
export declare const EconomicBoundaryEvaluationResultSchema: import("@sinclair/typebox").TObject<{
    access_decision: import("@sinclair/typebox").TObject<{
        granted: import("@sinclair/typebox").TBoolean;
        policy_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        denial_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    trust_evaluation: import("@sinclair/typebox").TObject<{
        passed: import("@sinclair/typebox").TBoolean;
        actual_score: import("@sinclair/typebox").TNumber;
        required_score: import("@sinclair/typebox").TNumber;
        actual_state: import("@sinclair/typebox").TString;
        required_state: import("@sinclair/typebox").TString;
    }>;
    capital_evaluation: import("@sinclair/typebox").TObject<{
        passed: import("@sinclair/typebox").TBoolean;
        actual_budget: import("@sinclair/typebox").TString;
        required_budget: import("@sinclair/typebox").TString;
    }>;
    criteria_used: import("@sinclair/typebox").TObject<{
        min_trust_score: import("@sinclair/typebox").TNumber;
        min_reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        min_available_budget: import("@sinclair/typebox").TString;
    }>;
    evaluated_at: import("@sinclair/typebox").TString;
    boundary_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    denial_codes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"TRUST_SCORE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"TRUST_STATE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"CAPITAL_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"UNKNOWN_REPUTATION_STATE">, import("@sinclair/typebox").TLiteral<"INVALID_BUDGET_FORMAT">, import("@sinclair/typebox").TLiteral<"MISSING_QUALIFICATION_CRITERIA">, import("@sinclair/typebox").TLiteral<"BUDGET_PERIOD_EXPIRED">, import("@sinclair/typebox").TLiteral<"TIER_REPUTATION_MISMATCH">, import("@sinclair/typebox").TLiteral<"BUDGET_SCOPE_MISMATCH">]>>>;
    evaluation_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        trust_score_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        reputation_state_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        budget_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
}>;
export type EconomicBoundaryEvaluationResult = Static<typeof EconomicBoundaryEvaluationResultSchema>;
/**
 * Event recording an economic boundary evaluation for the feedback loop.
 * Consumers can aggregate these events to inform governance decisions
 * about criteria thresholds — the thermostat, not just the thermometer.
 * @since v7.9.1 — Q1 deep review improvement
 */
export declare const EconomicBoundaryEvaluationEventSchema: import("@sinclair/typebox").TObject<{
    event_type: import("@sinclair/typebox").TLiteral<"economic_boundary_evaluation">;
    boundary_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    evaluation_result: import("@sinclair/typebox").TObject<{
        access_decision: import("@sinclair/typebox").TObject<{
            granted: import("@sinclair/typebox").TBoolean;
            policy_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            denial_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>;
        trust_evaluation: import("@sinclair/typebox").TObject<{
            passed: import("@sinclair/typebox").TBoolean;
            actual_score: import("@sinclair/typebox").TNumber;
            required_score: import("@sinclair/typebox").TNumber;
            actual_state: import("@sinclair/typebox").TString;
            required_state: import("@sinclair/typebox").TString;
        }>;
        capital_evaluation: import("@sinclair/typebox").TObject<{
            passed: import("@sinclair/typebox").TBoolean;
            actual_budget: import("@sinclair/typebox").TString;
            required_budget: import("@sinclair/typebox").TString;
        }>;
        criteria_used: import("@sinclair/typebox").TObject<{
            min_trust_score: import("@sinclair/typebox").TNumber;
            min_reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
            min_available_budget: import("@sinclair/typebox").TString;
        }>;
        evaluated_at: import("@sinclair/typebox").TString;
        boundary_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        denial_codes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"TRUST_SCORE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"TRUST_STATE_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"CAPITAL_BELOW_THRESHOLD">, import("@sinclair/typebox").TLiteral<"UNKNOWN_REPUTATION_STATE">, import("@sinclair/typebox").TLiteral<"INVALID_BUDGET_FORMAT">, import("@sinclair/typebox").TLiteral<"MISSING_QUALIFICATION_CRITERIA">, import("@sinclair/typebox").TLiteral<"BUDGET_PERIOD_EXPIRED">, import("@sinclair/typebox").TLiteral<"TIER_REPUTATION_MISMATCH">, import("@sinclair/typebox").TLiteral<"BUDGET_SCOPE_MISMATCH">]>>>;
        evaluation_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            trust_score_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            reputation_state_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            budget_gap: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
    }>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EconomicBoundaryEvaluationEvent = Static<typeof EconomicBoundaryEvaluationEventSchema>;
/**
 * The economic membrane — captures the complete context of an access decision
 * at the boundary between trust and capital layers.
 *
 * @since v7.7.0 — DR-S10
 */
export declare const EconomicBoundarySchema: import("@sinclair/typebox").TObject<{
    boundary_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    trust_layer: import("@sinclair/typebox").TObject<{
        reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        blended_score: import("@sinclair/typebox").TNumber;
        snapshot_at: import("@sinclair/typebox").TString;
    }>;
    capital_layer: import("@sinclair/typebox").TObject<{
        budget_remaining: import("@sinclair/typebox").TString;
        billing_tier: import("@sinclair/typebox").TString;
        budget_period_end: import("@sinclair/typebox").TString;
    }>;
    access_decision: import("@sinclair/typebox").TObject<{
        granted: import("@sinclair/typebox").TBoolean;
        policy_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        denial_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    evaluated_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    qualification_criteria: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        min_trust_score: import("@sinclair/typebox").TNumber;
        min_reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        min_available_budget: import("@sinclair/typebox").TString;
    }>>;
}>;
export type EconomicBoundary = Static<typeof EconomicBoundarySchema>;
//# sourceMappingURL=economic-boundary.d.ts.map