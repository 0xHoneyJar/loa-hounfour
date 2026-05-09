import { Type } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
/**
 * MutualCredit schema — bilateral credit line between agents with settlement tracking.
 *
 * `credit_id` uses `minLength: 1` (consumer-provided opaque identifier).
 * Consumers may use any format (ULID, nanoid, UUID, etc.) — the protocol
 * does not enforce a specific ID shape. Compare with `escrow_id` / `stake_id`
 * which use `UUID_V4_PATTERN` because they are protocol-generated.
 */
export const MutualCreditSchema = Type.Object({
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
}, {
    $id: 'MutualCredit',
    $comment: 'Financial amounts (amount_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    description: 'Mutual credit line between agents with settlement tracking',
    additionalProperties: false,
    'x-experimental': true,
    'x-cross-field-validated': true,
});
//# sourceMappingURL=mutual-credit.js.map