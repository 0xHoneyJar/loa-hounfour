import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { BillingRecipientSchema } from './billing-entry.js';

/**
 * CommonsDividend schema — commons pool dividend declaration and distribution.
 *
 * `dividend_id` uses `minLength: 1` (consumer-provided opaque identifier).
 * Consumers may use any format (ULID, nanoid, UUID, etc.) — the protocol
 * does not enforce a specific ID shape. Compare with `escrow_id` / `stake_id`
 * which use `UUID_V4_PATTERN` because they are protocol-generated.
 */
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
    source_performance_ids: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
    distribution: Type.Optional(Type.Object({
      recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
    }, { additionalProperties: false })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'CommonsDividend', description: 'Commons dividend declaration and distribution to eligible recipients', additionalProperties: false, 'x-experimental': true, 'x-cross-field-validated': true },
);

export type CommonsDividend = Static<typeof CommonsDividendSchema>;
