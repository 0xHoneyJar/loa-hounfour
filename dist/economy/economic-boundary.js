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
import { Type } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';
// ---------------------------------------------------------------------------
// Trust Layer Snapshot
// ---------------------------------------------------------------------------
export const TrustLayerSnapshotSchema = Type.Object({
    reputation_state: ReputationStateSchema,
    blended_score: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Blended reputation score at time of evaluation.',
    }),
    snapshot_at: Type.String({
        format: 'date-time',
        description: 'When the trust layer was evaluated.',
    }),
}, {
    $id: 'TrustLayerSnapshot',
    additionalProperties: false,
    description: 'Point-in-time snapshot of the trust layer for access evaluation.',
});
// ---------------------------------------------------------------------------
// Capital Layer Snapshot
// ---------------------------------------------------------------------------
export const CapitalLayerSnapshotSchema = Type.Object({
    budget_remaining: Type.String({
        pattern: '^[0-9]+$',
        description: 'Remaining budget in micro-USD.',
    }),
    billing_tier: Type.String({
        minLength: 1,
        description: 'Current billing tier of the agent.',
    }),
    budget_period_end: Type.String({
        format: 'date-time',
        description: 'When the current budget period expires.',
    }),
}, {
    $id: 'CapitalLayerSnapshot',
    additionalProperties: false,
    description: 'Point-in-time snapshot of the capital layer for access evaluation.',
});
// ---------------------------------------------------------------------------
// Access Decision
// ---------------------------------------------------------------------------
export const AccessDecisionSchema = Type.Object({
    granted: Type.Boolean({ description: 'Whether access was granted.' }),
    policy_id: Type.Optional(Type.String({
        description: 'Which access policy evaluated the request.',
    })),
    denial_reason: Type.Optional(Type.String({
        description: 'Why access was denied, populated when granted is false.',
    })),
}, {
    $id: 'AccessDecision',
    additionalProperties: false,
    description: 'Result of an access evaluation at the economic boundary.',
});
// ---------------------------------------------------------------------------
// Qualification Criteria — inputs to evaluateEconomicBoundary()
// ---------------------------------------------------------------------------
/**
 * Threshold criteria for evaluating economic boundary access.
 * @since v7.9.0 — FR-1 Decision Engine
 */
export const QualificationCriteriaSchema = Type.Object({
    min_trust_score: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Minimum blended reputation score required for access.',
    }),
    min_reputation_state: ReputationStateSchema,
    min_available_budget: Type.String({
        pattern: '^[0-9]+$',
        description: 'Minimum remaining budget in micro-USD.',
    }),
}, {
    $id: 'QualificationCriteria',
    additionalProperties: false,
    description: 'Threshold criteria for evaluating economic boundary access.',
});
// ---------------------------------------------------------------------------
// Trust Evaluation — sub-result of the trust layer check
// ---------------------------------------------------------------------------
export const TrustEvaluationSchema = Type.Object({
    passed: Type.Boolean({ description: 'Whether the trust layer passed.' }),
    actual_score: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Actual blended score from the trust snapshot.',
    }),
    required_score: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Required minimum score from criteria.',
    }),
    actual_state: Type.String({ description: 'Actual reputation state.' }),
    required_state: Type.String({ description: 'Required minimum reputation state.' }),
}, {
    $id: 'TrustEvaluation',
    additionalProperties: false,
    description: 'Result of trust layer evaluation within the economic boundary.',
});
// ---------------------------------------------------------------------------
// Capital Evaluation — sub-result of the capital layer check
// ---------------------------------------------------------------------------
export const CapitalEvaluationSchema = Type.Object({
    passed: Type.Boolean({ description: 'Whether the capital layer passed.' }),
    actual_budget: Type.String({
        pattern: '^[0-9]+$',
        description: 'Actual remaining budget in micro-USD.',
    }),
    required_budget: Type.String({
        pattern: '^[0-9]+$',
        description: 'Required minimum budget in micro-USD.',
    }),
}, {
    $id: 'CapitalEvaluation',
    additionalProperties: false,
    description: 'Result of capital layer evaluation within the economic boundary.',
});
// ---------------------------------------------------------------------------
// Denial Code — machine-parseable denial codes for agent consumers (v7.9.1, F4)
// ---------------------------------------------------------------------------
/**
 * Machine-parseable denial codes for programmatic consumers.
 * Complements human-readable denial_reason with structured codes.
 * @since v7.9.1 — F4 deep review improvement
 */
export const DenialCodeSchema = Type.Union([
    Type.Literal('TRUST_SCORE_BELOW_THRESHOLD'),
    Type.Literal('TRUST_STATE_BELOW_THRESHOLD'),
    Type.Literal('CAPITAL_BELOW_THRESHOLD'),
    Type.Literal('UNKNOWN_REPUTATION_STATE'),
    Type.Literal('INVALID_BUDGET_FORMAT'),
    Type.Literal('MISSING_QUALIFICATION_CRITERIA'),
], {
    $id: 'DenialCode',
    description: 'Machine-parseable denial codes for agent consumers.',
});
// ---------------------------------------------------------------------------
// Evaluation Gap — structured growth trajectory hints (v7.9.1, Q4)
// ---------------------------------------------------------------------------
/**
 * Structured gap information for denied evaluations.
 * Actionable feedback: tells the agent exactly how much to improve.
 * @since v7.9.1 — Q4 deep review improvement (denial as feedback, not death)
 */
export const EvaluationGapSchema = Type.Object({
    trust_score_gap: Type.Optional(Type.Number({
        minimum: 0,
        description: 'How far below the required trust score (0 if passed).',
    })),
    reputation_state_gap: Type.Optional(Type.Integer({
        minimum: 0,
        description: 'Ordinal states below required (0 if passed).',
    })),
    budget_gap: Type.Optional(Type.String({
        pattern: '^[0-9]+$',
        description: 'Micro-USD shortfall (\"0\" if passed).',
    })),
}, {
    $id: 'EvaluationGap',
    additionalProperties: false,
    description: 'Structured gap information for denied evaluations — actionable feedback for agents.',
});
// ---------------------------------------------------------------------------
// Economic Boundary Evaluation Result — output of evaluateEconomicBoundary()
// ---------------------------------------------------------------------------
export const EconomicBoundaryEvaluationResultSchema = Type.Object({
    access_decision: AccessDecisionSchema,
    trust_evaluation: TrustEvaluationSchema,
    capital_evaluation: CapitalEvaluationSchema,
    criteria_used: QualificationCriteriaSchema,
    evaluated_at: Type.String({
        format: 'date-time',
        description: 'When the evaluation was performed (caller-provided, not wall-clock).',
    }),
    boundary_id: Type.Optional(Type.String({
        format: 'uuid',
        description: 'The boundary_id this evaluation was performed against, for audit correlation.',
    })),
    denial_codes: Type.Optional(Type.Array(DenialCodeSchema, {
        description: 'Machine-parseable denial codes. Present only on denied evaluations.',
    })),
    evaluation_gap: Type.Optional(EvaluationGapSchema),
}, {
    $id: 'EconomicBoundaryEvaluationResult',
    additionalProperties: false,
    description: 'Complete result of evaluating an economic boundary access decision.',
});
// ---------------------------------------------------------------------------
// Economic Boundary Evaluation Event — feedback loop event (v7.9.1, Q1)
// ---------------------------------------------------------------------------
/**
 * Event recording an economic boundary evaluation for the feedback loop.
 * Consumers can aggregate these events to inform governance decisions
 * about criteria thresholds — the thermostat, not just the thermometer.
 * @since v7.9.1 — Q1 deep review improvement
 */
export const EconomicBoundaryEvaluationEventSchema = Type.Object({
    event_type: Type.Literal('economic_boundary_evaluation'),
    boundary_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
        minLength: 1,
        description: 'Agent personality being evaluated.',
    }),
    collection_id: Type.String({
        minLength: 1,
        description: 'Collection context for the evaluation.',
    }),
    evaluation_result: EconomicBoundaryEvaluationResultSchema,
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'EconomicBoundaryEvaluationEvent',
    additionalProperties: false,
    description: 'Event recording an economic boundary evaluation for the feedback loop.',
});
// ---------------------------------------------------------------------------
// Economic Boundary (v7.7.0, extended v7.9.0)
// ---------------------------------------------------------------------------
/**
 * The economic membrane — captures the complete context of an access decision
 * at the boundary between trust and capital layers.
 *
 * @since v7.7.0 — DR-S10
 */
export const EconomicBoundarySchema = Type.Object({
    boundary_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
        minLength: 1,
        description: 'Agent personality being evaluated.',
    }),
    collection_id: Type.String({
        minLength: 1,
        description: 'Collection context for the evaluation.',
    }),
    trust_layer: TrustLayerSnapshotSchema,
    capital_layer: CapitalLayerSnapshotSchema,
    access_decision: AccessDecisionSchema,
    evaluated_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
    qualification_criteria: Type.Optional(QualificationCriteriaSchema),
}, {
    $id: 'EconomicBoundary',
    additionalProperties: false,
    description: 'Economic membrane: trust × capital → access decision.',
});
//# sourceMappingURL=economic-boundary.js.map