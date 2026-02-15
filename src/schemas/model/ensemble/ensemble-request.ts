import { Type, type Static } from '@sinclair/typebox';
import { EnsembleStrategySchema } from './ensemble-strategy.js';
import { CompletionRequestSchema } from '../completion-request.js';

/**
 * Request schema for ensemble operations
 */
export const EnsembleRequestSchema = Type.Object(
  {
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    models: Type.Array(Type.String(), { minItems: 2 }),
    timeout_ms: Type.Optional(Type.Integer({ minimum: 1 })),
    task_type: Type.Optional(Type.String()),
    request: CompletionRequestSchema,
    consensus_threshold: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'EnsembleRequest',
    additionalProperties: false,
    'x-cross-field-validated': true,
  }
);

export type EnsembleRequest = Static<typeof EnsembleRequestSchema>;
