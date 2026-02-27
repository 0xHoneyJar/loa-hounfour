import { Type } from '@sinclair/typebox';
import { EnsembleStrategySchema } from './ensemble-strategy.js';
import { CompletionRequestSchema } from '../completion-request.js';
/**
 * Request schema for ensemble operations
 */
export const EnsembleRequestSchema = Type.Object({
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    models: Type.Array(Type.String(), { minItems: 2 }),
    timeout_ms: Type.Optional(Type.Integer({ minimum: 1 })),
    task_type: Type.Optional(Type.String()),
    request: CompletionRequestSchema,
    consensus_threshold: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    dialogue_config: Type.Optional(Type.Object({
        max_rounds: Type.Integer({ minimum: 1, maximum: 10 }),
        pass_thinking_traces: Type.Boolean(),
        termination: Type.Union([
            Type.Literal('fixed_rounds'),
            Type.Literal('consensus_reached'),
            Type.Literal('no_new_insights'),
        ]),
        seed_prompt: Type.Optional(Type.String()),
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'EnsembleRequest',
    $comment: 'Contains embedded CompletionRequest with MicroUSD financial fields (budget_limit_micro). See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
    'x-cross-field-validated': true,
});
//# sourceMappingURL=ensemble-request.js.map