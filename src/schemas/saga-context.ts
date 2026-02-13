/**
 * Saga execution context for multi-step distributed operations.
 *
 * Distinguishes forward-path events from compensation (rollback) events
 * in transfer sagas. Consumers use `direction` to determine whether a batch
 * progresses or compensates the saga.
 *
 * @see BB-V3-012 — Transfer saga compensation protocol
 */
import { Type, type Static } from '@sinclair/typebox';

export const SagaContextSchema = Type.Object({
  saga_id: Type.String({ minLength: 1, description: 'Saga/workflow execution ID' }),
  step: Type.Integer({ minimum: 1, description: 'Step number within the saga' }),
  total_steps: Type.Optional(Type.Integer({ minimum: 1, description: 'Total expected steps (if known)' })),
  direction: Type.Union([
    Type.Literal('forward'),
    Type.Literal('compensation'),
  ], { description: 'Whether this batch progresses or compensates the saga' }),
}, {
  $id: 'SagaContext',
  additionalProperties: false,
  description: 'Saga execution context for multi-step distributed operations',
});

export type SagaContext = Static<typeof SagaContextSchema>;
