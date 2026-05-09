import { Type } from '@sinclair/typebox';
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
export const CommonsDividendSchema = Type.Object({
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
}, {
    $id: 'CommonsDividend',
    $comment: 'Financial amounts (total_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    description: 'Commons dividend declaration and distribution to eligible recipients',
    additionalProperties: false,
    'x-experimental': true,
    'x-cross-field-validated': true,
});
//# sourceMappingURL=commons-dividend.js.map