import { type Static } from '@sinclair/typebox';
/**
 * DisputeRecord schema — governance dispute filing with evidence and resolution tracking.
 *
 * `dispute_id` uses `minLength: 1` (consumer-provided opaque identifier).
 * Consumers may use any format (ULID, nanoid, UUID, etc.) — the protocol
 * does not enforce a specific ID shape. Compare with `escrow_id` / `stake_id`
 * which use `UUID_V4_PATTERN` because they are protocol-generated.
 */
export declare const DisputeRecordSchema: import("@sinclair/typebox").TObject<{
    dispute_id: import("@sinclair/typebox").TString;
    filed_by: import("@sinclair/typebox").TString;
    filed_against: import("@sinclair/typebox").TString;
    dispute_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"quality">, import("@sinclair/typebox").TLiteral<"safety">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"ownership">, import("@sinclair/typebox").TLiteral<"behavioral">]>;
    evidence: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        event_id: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
    }>>;
    filed_at: import("@sinclair/typebox").TString;
    resolution: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"upheld">, import("@sinclair/typebox").TLiteral<"dismissed">, import("@sinclair/typebox").TLiteral<"compromised">]>;
        resolved_at: import("@sinclair/typebox").TString;
        sanction_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        credit_note_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DisputeRecord = Static<typeof DisputeRecordSchema>;
//# sourceMappingURL=dispute-record.d.ts.map