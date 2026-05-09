/**
 * x402 Payment Schemas — HTTP payment flow types for AI agent economy.
 *
 * Defines schemas for the x402 payment protocol: quotes, payment proofs,
 * settlements, and error codes. All financial values use string-encoded
 * MicroUSD (^[0-9]+$) — no floating point.
 *
 * @see PRD FR-1 — x402 Payment Schemas
 * @see SDD §6.1 — x402 Payment Schemas
 * @since v8.3.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * x402 Quote — pricing offer from a model provider.
 */
export declare const X402QuoteSchema: import("@sinclair/typebox").TObject<{
    quote_id: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TString;
    max_cost_micro: import("@sinclair/typebox").TString;
    payment_address: import("@sinclair/typebox").TString;
    chain_id: import("@sinclair/typebox").TInteger;
    token_address: import("@sinclair/typebox").TString;
    valid_until: import("@sinclair/typebox").TString;
    cost_per_input_token_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    cost_per_output_token_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type X402Quote = Static<typeof X402QuoteSchema>;
/**
 * x402 Payment Proof — evidence of payment submitted with request.
 */
export declare const X402PaymentProofSchema: import("@sinclair/typebox").TObject<{
    payment_header: import("@sinclair/typebox").TString;
    quote_id: import("@sinclair/typebox").TString;
    tx_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type X402PaymentProof = Static<typeof X402PaymentProofSchema>;
/**
 * x402 Settlement Status — lifecycle state of a payment settlement.
 */
export declare const X402SettlementStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"confirmed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"refunded">]>;
export type X402SettlementStatus = Static<typeof X402SettlementStatusSchema>;
/**
 * x402 Settlement — final settlement record after payment processing.
 */
export declare const X402SettlementSchema: import("@sinclair/typebox").TObject<{
    payment_id: import("@sinclair/typebox").TString;
    quote_id: import("@sinclair/typebox").TString;
    actual_cost_micro: import("@sinclair/typebox").TString;
    settlement_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"confirmed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"refunded">]>;
    settled_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    chain_id: import("@sinclair/typebox").TInteger;
    token_address: import("@sinclair/typebox").TString;
}>;
export type X402Settlement = Static<typeof X402SettlementSchema>;
/**
 * x402 Error Code — machine-parseable error codes for payment failures.
 */
export declare const X402ErrorCodeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"PAYMENT_REQUIRED">, import("@sinclair/typebox").TLiteral<"NOT_ALLOWLISTED">, import("@sinclair/typebox").TLiteral<"INFERENCE_FAILED">, import("@sinclair/typebox").TLiteral<"FEATURE_DISABLED">, import("@sinclair/typebox").TLiteral<"QUOTE_EXPIRED">, import("@sinclair/typebox").TLiteral<"INSUFFICIENT_FUNDS">]>;
export type X402ErrorCode = Static<typeof X402ErrorCodeSchema>;
//# sourceMappingURL=x402-payment.d.ts.map