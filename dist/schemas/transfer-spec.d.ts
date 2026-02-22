import { type Static } from '@sinclair/typebox';
/** Transfer scenario categorization. */
export declare const TransferScenarioSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"sale">, import("@sinclair/typebox").TLiteral<"gift">, import("@sinclair/typebox").TLiteral<"admin_recovery">, import("@sinclair/typebox").TLiteral<"custody_change">]>;
export type TransferScenario = Static<typeof TransferScenarioSchema>;
/** Transfer outcome status. */
export declare const TransferResultSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"rolled_back">]>;
export type TransferResult = Static<typeof TransferResultSchema>;
/**
 * Transfer specification — initiates an NFT ownership transfer.
 * Captures who, what, why, and the sealing policy for conversation data.
 */
export declare const TransferSpecSchema: import("@sinclair/typebox").TObject<{
    transfer_id: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TString;
    from_owner: import("@sinclair/typebox").TString;
    to_owner: import("@sinclair/typebox").TString;
    scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"sale">, import("@sinclair/typebox").TLiteral<"gift">, import("@sinclair/typebox").TLiteral<"admin_recovery">, import("@sinclair/typebox").TLiteral<"custody_change">]>;
    sealing_policy: import("@sinclair/typebox").TObject<{
        encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        access_audit: import("@sinclair/typebox").TBoolean;
        access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
            duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
            audit_required: import("@sinclair/typebox").TBoolean;
            revocable: import("@sinclair/typebox").TBoolean;
        }>>;
    }>;
    initiated_at: import("@sinclair/typebox").TString;
    initiated_by: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type TransferSpec = Static<typeof TransferSpecSchema>;
/**
 * Transfer event record — outcome of a completed or failed transfer.
 *
 * Named TransferEventRecord (not TransferEvent) to avoid collision with
 * the DomainEvent typed wrapper TransferEvent in domain-event.ts.
 */
export declare const TransferEventSchema: import("@sinclair/typebox").TObject<{
    transfer_id: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TString;
    from_owner: import("@sinclair/typebox").TString;
    to_owner: import("@sinclair/typebox").TString;
    scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"sale">, import("@sinclair/typebox").TLiteral<"gift">, import("@sinclair/typebox").TLiteral<"admin_recovery">, import("@sinclair/typebox").TLiteral<"custody_change">]>;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"rolled_back">]>;
    sealing_policy: import("@sinclair/typebox").TObject<{
        encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        access_audit: import("@sinclair/typebox").TBoolean;
        access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
            duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
            audit_required: import("@sinclair/typebox").TBoolean;
            revocable: import("@sinclair/typebox").TBoolean;
        }>>;
    }>;
    conversations_sealed: import("@sinclair/typebox").TInteger;
    conversations_migrated: import("@sinclair/typebox").TInteger;
    initiated_at: import("@sinclair/typebox").TString;
    completed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type TransferEventRecord = Static<typeof TransferEventSchema>;
//# sourceMappingURL=transfer-spec.d.ts.map