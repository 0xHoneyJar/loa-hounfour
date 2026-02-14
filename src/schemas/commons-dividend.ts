import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { BillingRecipientSchema } from './billing-entry.js';

export const CommonsDividendSchema = Type.Object(
  {
    dividend_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    total_micro: MicroUSDUnsigned,
    governance: Type.Union([
      Type.Literal('mod_discretion'),
      Type.Literal('member_vote'),
      Type.Literal('algorithmic'),
      Type.Literal('stake_weighted'),
    ]),
    period_start: Type.String({ format: 'date-time' }),
    period_end: Type.String({ format: 'date-time' }),
    distribution: Type.Optional(Type.Object({
      recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'CommonsDividend', additionalProperties: false, 'x-experimental': true },
);

export type CommonsDividend = Static<typeof CommonsDividendSchema>;
