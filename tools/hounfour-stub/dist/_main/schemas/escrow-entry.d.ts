import { type Static } from '@sinclair/typebox';
/**
 * Escrow entry — a bilateral financial holding with state machine lifecycle.
 *
 * Design: Escrow is a separate entity from BillingEntry because escrows can
 * outlive conversations and a single escrow can produce multiple billing entries.
 *
 * @see BB-V4-DEEP-002 — Escrow timeout mechanism (expires_at)
 */
export declare const EscrowEntrySchema: import("@sinclair/typebox").TObject<{
    escrow_id: import("@sinclair/typebox").TString;
    payer_id: import("@sinclair/typebox").TString;
    payee_id: import("@sinclair/typebox").TString;
    amount_micro: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"held">, import("@sinclair/typebox").TLiteral<"released">, import("@sinclair/typebox").TLiteral<"disputed">, import("@sinclair/typebox").TLiteral<"refunded">, import("@sinclair/typebox").TLiteral<"expired">]>;
    held_at: import("@sinclair/typebox").TString;
    released_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    dispute_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EscrowEntry = Static<typeof EscrowEntrySchema>;
export declare const ESCROW_TRANSITIONS: Record<string, readonly string[]>;
export declare function isValidEscrowTransition(from: string, to: string): boolean;
//# sourceMappingURL=escrow-entry.d.ts.map