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
import { Type } from '@sinclair/typebox';
import { OutcomeTypeSchema } from './delegation-outcome.js';
// ---------------------------------------------------------------------------
// Quality Signal Level
// ---------------------------------------------------------------------------
export const QualitySignalLevelSchema = Type.Union([
    Type.Literal('high'),
    Type.Literal('moderate'),
    Type.Literal('low'),
    Type.Literal('negative'),
], {
    $id: 'QualitySignalLevel',
    description: 'Quality signal derived from a delegation outcome. Maps to a numeric score range.',
});
// ---------------------------------------------------------------------------
// Outcome Quality Mapping
// ---------------------------------------------------------------------------
export const OutcomeQualityMappingSchema = Type.Object({
    unanimous: QualitySignalLevelSchema,
    majority: QualitySignalLevelSchema,
    deadlock: QualitySignalLevelSchema,
    escalation: QualitySignalLevelSchema,
}, {
    $id: 'OutcomeQualityMapping',
    additionalProperties: false,
    description: 'Maps each OutcomeType to a QualitySignalLevel. Collections may override defaults.',
});
// ---------------------------------------------------------------------------
// Default Mapping + Score Constants
// ---------------------------------------------------------------------------
/**
 * Default mapping from outcome types to quality signals.
 * Collections may override these defaults via governance proposals.
 */
export const DEFAULT_OUTCOME_QUALITY_MAPPING = {
    unanimous: 'high',
    majority: 'moderate',
    deadlock: 'low',
    escalation: 'negative',
};
/**
 * Numeric scores for each quality signal level.
 * Used as the baseline quality_score in DelegationQualityEvent.
 */
export const QUALITY_SIGNAL_SCORES = {
    high: 0.95,
    moderate: 0.70,
    low: 0.35,
    negative: 0.10,
};
// ---------------------------------------------------------------------------
// Delegation Quality Event
// ---------------------------------------------------------------------------
export const DelegationQualityEventSchema = Type.Object({
    event_id: Type.String({ format: 'uuid' }),
    outcome_id: Type.String({
        format: 'uuid',
        description: 'The DelegationOutcome that triggered this quality event.',
    }),
    tree_node_id: Type.String({
        minLength: 1,
        description: 'Node in the delegation tree where the outcome occurred.',
    }),
    personality_id: Type.String({
        minLength: 1,
        description: 'The personality whose reputation is being updated.',
    }),
    collection_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    outcome_type: OutcomeTypeSchema,
    quality_signal: QualitySignalLevelSchema,
    quality_score: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Numeric quality score in [0,1] derived from the quality signal.',
    }),
    mapping_used: OutcomeQualityMappingSchema,
    model_id: Type.Optional(Type.String({
        minLength: 1,
        description: 'Model that produced this outcome, if applicable.',
    })),
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'DelegationQualityEvent',
    additionalProperties: false,
    description: 'Event recording a quality signal derived from a delegation outcome, feeding into reputation.',
});
//# sourceMappingURL=delegation-quality.js.map