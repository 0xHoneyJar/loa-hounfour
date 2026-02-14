import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

export const PerformanceOutcomeSchema = Type.Object(
  {
    user_rating: Type.Optional(Type.Number({ minimum: 0, maximum: 5 })),
    resolution_signal: Type.Optional(Type.Boolean()),
    amplification_count: Type.Optional(Type.Integer({ minimum: 0 })),
    outcome_validated: Type.Optional(Type.Boolean()),
    validated_by: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { $id: 'PerformanceOutcome', additionalProperties: false },
);

export type PerformanceOutcome = Static<typeof PerformanceOutcomeSchema>;

export const PerformanceRecordSchema = Type.Object(
  {
    record_id: Type.String({ minLength: 1 }),
    agent_id: Type.String({ minLength: 1 }),
    billing_entry_id: Type.String({ minLength: 1 }),
    occurred_at: Type.String({ format: 'date-time' }),
    output: Type.Object({
      tokens_consumed: Type.Integer({ minimum: 0 }),
      model_used: Type.String({ minLength: 1 }),
    }),
    outcome: Type.Optional(PerformanceOutcomeSchema),
    dividend_target: Type.Optional(
      Type.Union([
        Type.Literal('private'),
        Type.Literal('commons'),
        Type.Literal('mixed'),
      ]),
    ),
    dividend_split_bps: Type.Optional(
      Type.Integer({ minimum: 0, maximum: 10000 }),
    ),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'PerformanceRecord',
    additionalProperties: false,
  },
);

export type PerformanceRecord = Static<typeof PerformanceRecordSchema>;
