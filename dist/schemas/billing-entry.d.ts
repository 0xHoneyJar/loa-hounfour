import { type Static } from '@sinclair/typebox';
export declare const CostTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model_inference">, import("@sinclair/typebox").TLiteral<"tool_call">, import("@sinclair/typebox").TLiteral<"platform_fee">, import("@sinclair/typebox").TLiteral<"byok_subscription">, import("@sinclair/typebox").TLiteral<"agent_setup">]>;
export type CostType = Static<typeof CostTypeSchema>;
export declare const BillingRecipientSchema: import("@sinclair/typebox").TObject<{
    address: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">]>;
    share_bps: import("@sinclair/typebox").TInteger;
    amount_micro: import("@sinclair/typebox").TString;
}>;
export type BillingRecipient = Static<typeof BillingRecipientSchema>;
export declare const BillingEntrySchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    trace_id: import("@sinclair/typebox").TString;
    tenant_id: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    cost_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model_inference">, import("@sinclair/typebox").TLiteral<"tool_call">, import("@sinclair/typebox").TLiteral<"platform_fee">, import("@sinclair/typebox").TLiteral<"byok_subscription">, import("@sinclair/typebox").TLiteral<"agent_setup">]>;
    provider: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    pool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    currency: import("@sinclair/typebox").TLiteral<"USD">;
    precision: import("@sinclair/typebox").TLiteral<6>;
    raw_cost_micro: import("@sinclair/typebox").TString;
    multiplier_bps: import("@sinclair/typebox").TInteger;
    total_cost_micro: import("@sinclair/typebox").TString;
    rounding_policy: import("@sinclair/typebox").TLiteral<"largest_remainder">;
    recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        address: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">]>;
        share_bps: import("@sinclair/typebox").TInteger;
        amount_micro: import("@sinclair/typebox").TString;
    }>>;
    idempotency_key: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    usage: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        prompt_tokens: import("@sinclair/typebox").TInteger;
        completion_tokens: import("@sinclair/typebox").TInteger;
        reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type BillingEntry = Static<typeof BillingEntrySchema>;
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
export declare const CreditNoteSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    references_billing_entry: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"refund">, import("@sinclair/typebox").TLiteral<"dispute">, import("@sinclair/typebox").TLiteral<"partial_failure">, import("@sinclair/typebox").TLiteral<"adjustment">]>;
    amount_micro: import("@sinclair/typebox").TIntersect<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TString]>;
    recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        address: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">]>;
        share_bps: import("@sinclair/typebox").TInteger;
        amount_micro: import("@sinclair/typebox").TString;
    }>>;
    issued_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type CreditNote = Static<typeof CreditNoteSchema>;
//# sourceMappingURL=billing-entry.d.ts.map