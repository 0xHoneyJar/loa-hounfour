import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

export const ValidatedOutcomeSchema = Type.Object(
  {
    validation_id: Type.String({ minLength: 1 }),
    performance_record_id: Type.String({ minLength: 1 }),
    validator_agent_id: Type.String({ minLength: 1 }),
    validator_stake_micro: MicroUSD,
    rating: Type.Number({ minimum: 0, maximum: 5 }),
    validated_at: Type.String({ format: 'date-time' }),
    dispute_outcome: Type.Optional(
      Type.Union([
        Type.Literal('upheld'),
        Type.Literal('overturned'),
        Type.Literal('split'),
      ]),
    ),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ValidatedOutcome',
    additionalProperties: false,
  },
);

export type ValidatedOutcome = Static<typeof ValidatedOutcomeSchema>;
