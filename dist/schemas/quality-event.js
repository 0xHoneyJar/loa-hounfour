import { Type } from '@sinclair/typebox';
/**
 * Quality event — the input signal that feeds the ReputationAggregate.
 *
 * Each quality event captures 3 dimensions of quality assessment:
 * satisfaction, coherence, and safety, plus a composite score.
 *
 * @see SDD §2.4 — QualityEvent Schema (FR-3 support)
 */
export const QualityEventSchema = Type.Object({
    event_id: Type.String({ minLength: 1 }),
    personality_id: Type.String({ minLength: 1 }),
    collection_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    // Quality dimensions (each 0-1)
    satisfaction: Type.Number({ minimum: 0, maximum: 1 }),
    coherence: Type.Number({ minimum: 0, maximum: 1 }),
    safety: Type.Number({ minimum: 0, maximum: 1 }),
    // Composite score (weighted average of dimensions)
    composite_score: Type.Number({ minimum: 0, maximum: 1 }),
    // Provenance
    evaluator_id: Type.String({ minLength: 1 }),
    model_id: Type.Optional(Type.String({
        minLength: 1,
        description: 'Model alias that produced the evaluated output (e.g., native, reasoning, '
            + 'fast-code). Enables model-aware reputation cohorts in multi-model architectures.',
    })),
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'QualityEvent',
    additionalProperties: false,
});
//# sourceMappingURL=quality-event.js.map