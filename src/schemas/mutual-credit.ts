import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

export const MutualCreditSchema = Type.Object(
  {
    credit_id: Type.String({ minLength: 1 }),
    creditor_id: Type.String({ minLength: 1 }),
    debtor_id: Type.String({ minLength: 1 }),
    amount_micro: MicroUSDUnsigned,
    credit_type: Type.Union([
      Type.Literal('refund'),
      Type.Literal('prepayment'),
      Type.Literal('obligation'),
      Type.Literal('delegation'),
    ]),
    issued_at: Type.String({ format: 'date-time' }),
    settled: Type.Boolean(),
    settled_at: Type.Optional(Type.String({ format: 'date-time' })),
    settlement: Type.Optional(Type.Object({
      settlement_method: Type.Union([
        Type.Literal('direct_payment'),
        Type.Literal('reciprocal_performance'),
        Type.Literal('commons_contribution'),
        Type.Literal('forgiven'),
      ]),
    }, { additionalProperties: false })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'MutualCredit', description: 'Mutual credit line between agents with settlement tracking', additionalProperties: false, 'x-experimental': true },
);

export type MutualCredit = Static<typeof MutualCreditSchema>;
