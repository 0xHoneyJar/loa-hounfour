import { type Static } from '@sinclair/typebox';
/**
 * MutualCredit schema — bilateral credit line between agents with settlement tracking.
 *
 * `credit_id` uses `minLength: 1` (consumer-provided opaque identifier).
 * Consumers may use any format (ULID, nanoid, UUID, etc.) — the protocol
 * does not enforce a specific ID shape. Compare with `escrow_id` / `stake_id`
 * which use `UUID_V4_PATTERN` because they are protocol-generated.
 */
export declare const MutualCreditSchema: import("@sinclair/typebox").TObject<{
    credit_id: import("@sinclair/typebox").TString;
    creditor_id: import("@sinclair/typebox").TString;
    debtor_id: import("@sinclair/typebox").TString;
    amount_micro: import("@sinclair/typebox").TString;
    credit_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"refund">, import("@sinclair/typebox").TLiteral<"prepayment">, import("@sinclair/typebox").TLiteral<"obligation">, import("@sinclair/typebox").TLiteral<"delegation">]>;
    issued_at: import("@sinclair/typebox").TString;
    settled: import("@sinclair/typebox").TBoolean;
    settled_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    settlement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        settlement_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"direct_payment">, import("@sinclair/typebox").TLiteral<"reciprocal_performance">, import("@sinclair/typebox").TLiteral<"commons_contribution">, import("@sinclair/typebox").TLiteral<"forgiven">]>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type MutualCredit = Static<typeof MutualCreditSchema>;
//# sourceMappingURL=mutual-credit.d.ts.map