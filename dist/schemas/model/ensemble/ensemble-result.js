import { Type } from '@sinclair/typebox';
import { EnsembleStrategySchema } from './ensemble-strategy.js';
import { CompletionResultSchema } from '../completion-result.js';
import { MicroUSDUnsigned } from '../../../vocabulary/currency.js';
/**
 * Result schema for ensemble operations
 */
export const EnsembleResultSchema = Type.Object({
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    selected: CompletionResultSchema,
    candidates: Type.Array(CompletionResultSchema),
    consensus_score: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    rounds: Type.Optional(Type.Array(Type.Object({
        round: Type.Integer({ minimum: 1 }),
        model: Type.String({ minLength: 1 }),
        response: CompletionResultSchema,
        thinking_trace: Type.Optional(Type.String()),
    }))),
    termination_reason: Type.Optional(Type.Union([
        Type.Literal('fixed_rounds'),
        Type.Literal('consensus_reached'),
        Type.Literal('no_new_insights'),
        Type.Literal('timeout'),
        Type.Literal('budget_exhausted'),
    ])),
    /** Number of dialogue rounds completed. When present with rounds array, must equal rounds.length. */
    rounds_completed: Type.Optional(Type.Integer({ minimum: 0 })),
    /** Number of dialogue rounds originally requested (from dialogue_config.max_rounds). */
    rounds_requested: Type.Optional(Type.Integer({ minimum: 1 })),
    /** How consensus was determined when termination_reason is 'consensus_reached'. */
    consensus_method: Type.Optional(Type.Union([
        Type.Literal('majority_vote'),
        Type.Literal('unanimous'),
        Type.Literal('arbiter_decision'),
        Type.Literal('score_threshold'),
    ])),
    /** Audit trail of model position changes during dialogue rounds. */
    position_changes: Type.Optional(Type.Array(Type.Object({
        round: Type.Integer({ minimum: 1 }),
        model: Type.String({ minLength: 1 }),
        from_position: Type.String({ minLength: 1 }),
        to_position: Type.String({ minLength: 1 }),
        reason: Type.Optional(Type.String()),
    }))),
    total_cost_micro: MicroUSDUnsigned,
    total_latency_ms: Type.Integer({ minimum: 0 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'EnsembleResult',
    $comment: 'Financial amounts (total_cost_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
    'x-cross-field-validated': true,
});
//# sourceMappingURL=ensemble-result.js.map