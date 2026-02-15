import { Type, type Static } from '@sinclair/typebox';
import { EnsembleStrategySchema } from './ensemble-strategy.js';
import { CompletionResultSchema } from '../completion-result.js';
import { MicroUSDUnsigned } from '../../../vocabulary/currency.js';

/**
 * Result schema for ensemble operations
 */
export const EnsembleResultSchema = Type.Object(
  {
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    selected: CompletionResultSchema,
    candidates: Type.Array(CompletionResultSchema),
    consensus_score: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    total_cost_micro: MicroUSDUnsigned,
    total_latency_ms: Type.Integer({ minimum: 0 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'EnsembleResult',
    additionalProperties: false,
    'x-cross-field-validated': true,
  }
);

export type EnsembleResult = Static<typeof EnsembleResultSchema>;
