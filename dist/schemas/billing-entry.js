import { Type } from '@sinclair/typebox';
import { UsageSchema } from './invoke-response.js';
import { MicroUSD } from '../vocabulary/currency.js';
import { NftIdSchema } from '../utilities/nft-id.js';
export const CostTypeSchema = Type.Union([
    Type.Literal('model_inference'),
    Type.Literal('tool_call'),
    Type.Literal('platform_fee'),
    Type.Literal('byok_subscription'),
    Type.Literal('agent_setup'),
], { $id: 'CostType', description: 'Billing cost category' });
export const BillingRecipientSchema = Type.Object({
    address: Type.String({ minLength: 1, description: 'Wallet or account address' }),
    role: Type.Union([
        Type.Literal('provider'),
        Type.Literal('platform'),
        Type.Literal('producer'),
        Type.Literal('agent_tba'),
    ]),
    share_bps: Type.Integer({
        minimum: 0,
        maximum: 10000,
        description: 'Basis points share (0-10000)',
    }),
    amount_micro: MicroUSD,
}, { $id: 'BillingRecipient', additionalProperties: false });
export const BillingEntrySchema = Type.Object({
    id: Type.String({ minLength: 1, description: 'ULID — canonical billing entry identifier' }),
    trace_id: Type.String({ minLength: 1, description: 'Distributed tracing correlation ID' }),
    tenant_id: Type.String({ minLength: 1 }),
    nft_id: Type.Optional(NftIdSchema),
    cost_type: CostTypeSchema,
    provider: Type.String({ minLength: 1 }),
    model: Type.Optional(Type.String({ description: 'Model ID (model_inference only)' })),
    pool_id: Type.Optional(Type.String({ description: 'Pool ID (model_inference only)' })),
    tool_id: Type.Optional(Type.String({ description: 'Tool ID (tool_call only)' })),
    currency: Type.Literal('USD', { description: 'ISO 4217 currency code' }),
    precision: Type.Literal(6, { description: 'Micro-USD = 6 decimal places' }),
    raw_cost_micro: MicroUSD,
    // multiplier_bps bounded [10000, 100000]: 10000 = 1.0x (cost pass-through), 100000 = 10.0x
    // (maximum markup). Business constraint from pricing model — no sub-cost pricing allowed
    // (providers would lose money), no >10x markup (consumer protection / regulatory).
    multiplier_bps: Type.Integer({
        minimum: 10000,
        maximum: 100000,
        description: 'Total multiplier in basis points (10000 = 1.0x, 30000 = 3.0x)',
    }),
    total_cost_micro: MicroUSD,
    rounding_policy: Type.Literal('largest_remainder', {
        description: 'Deterministic allocation algorithm',
    }),
    recipients: Type.Array(BillingRecipientSchema, {
        minItems: 1,
        description: 'Multi-party cost attribution',
    }),
    idempotency_key: Type.String({ minLength: 1 }),
    timestamp: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    usage: Type.Optional(UsageSchema),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: 'Consumer-extensible metadata. Namespace conventions: '
            + 'loa.* reserved for protocol-level metadata, '
            + 'trace.* for OpenTelemetry-compatible observability, '
            + 'x-* for consumer-defined extensions. '
            + 'Not validated by protocol contract.',
    })),
}, {
    $id: 'BillingEntry',
    additionalProperties: false,
    description: 'Multi-party billing entry replacing CostBreakdown',
});
/**
 * Billing reversal/refund referencing an original BillingEntry.
 *
 * **Service-layer invariants** (not enforceable at schema level):
 *
 * 1. `amount_micro` must not exceed the referenced `BillingEntry.total_cost_micro`.
 * 2. `references_billing_entry` must reference a valid, existing `BillingEntry.id`.
 * 3. Multiple CreditNotes can reference the same BillingEntry (partial refunds).
 * 4. The sum of all `CreditNote.amount_micro` for a single entry must not exceed
 *    that entry's `total_cost_micro` (no over-refunding).
 */
export const CreditNoteSchema = Type.Object({
    id: Type.String({ minLength: 1, description: 'ULID' }),
    references_billing_entry: Type.String({
        minLength: 1,
        description: 'BillingEntry.id this note references (must exist in billing store)',
    }),
    reason: Type.Union([
        Type.Literal('refund'),
        Type.Literal('dispute'),
        Type.Literal('partial_failure'),
        Type.Literal('adjustment'),
    ]),
    amount_micro: Type.Intersect([MicroUSD, Type.String({
            description: 'Credit amount in micro-USD (must not exceed referenced entry total)',
        })]),
    recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
    issued_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'CreditNote',
    additionalProperties: false,
    description: 'Billing reversal/refund referencing an original BillingEntry',
    $comment: 'Invariants (service-layer, not schema-enforced): '
        + '(1) amount_micro <= referenced BillingEntry.total_cost_micro (no over-credit). '
        + '(2) references_billing_entry must reference a valid, existing BillingEntry.id. '
        + '(3) Sum of all CreditNote.amount_micro for a single entry <= that entry total_cost_micro. '
        + '(4) At most one void-type CreditNote per BillingEntry (reason=refund with full amount).',
});
//# sourceMappingURL=billing-entry.js.map