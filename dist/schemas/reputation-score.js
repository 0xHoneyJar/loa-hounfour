import { Type } from '@sinclair/typebox';
export const ReputationScoreSchema = Type.Object({
    agent_id: Type.String({ minLength: 1 }),
    score: Type.Number({ minimum: 0, maximum: 1 }),
    components: Type.Object({
        outcome_quality: Type.Number({ minimum: 0, maximum: 1 }),
        performance_consistency: Type.Number({ minimum: 0, maximum: 1 }),
        dispute_ratio: Type.Number({ minimum: 0, maximum: 1 }),
        community_standing: Type.Number({ minimum: 0, maximum: 1 }),
    }),
    sample_size: Type.Integer({ minimum: 0 }),
    last_updated: Type.String({ format: 'date-time' }),
    decay_applied: Type.Boolean(),
    identity_anchor: Type.Optional(Type.Object({
        provider: Type.String({ minLength: 1 }),
        verified_at: Type.String({ format: 'date-time' }),
    }, { additionalProperties: false })),
    min_unique_validators: Type.Optional(Type.Integer({ minimum: 0 })),
    validation_graph_hash: Type.Optional(Type.String({ minLength: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, { $id: 'ReputationScore', description: 'Composite reputation score for an agent with weighted component sub-scores', additionalProperties: false, 'x-cross-field-validated': true });
//# sourceMappingURL=reputation-score.js.map