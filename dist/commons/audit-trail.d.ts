/**
 * AuditTrail + AuditEntry schemas — append-only hash chain for governed resources.
 *
 * Each entry carries a domain-separated SHA-256 hash linking it to its predecessor,
 * forming a tamper-evident chain. The genesis hash constant anchors new trails.
 *
 * @see SDD §4.3 — AuditTrail (FR-1.3)
 * @see SDD §4.3.1 — Audit Trail Checkpointing (Flatline IMP-003)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * SHA-256 of empty string — genesis sentinel for the first entry in a chain.
 *
 * Matches the SCORING_PATH_GENESIS_HASH pattern in `src/governance/scoring-path-hash.ts`.
 */
export declare const AUDIT_TRAIL_GENESIS_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
/**
 * Single entry in an audit trail hash chain.
 */
export declare const AuditEntrySchema: import("@sinclair/typebox").TObject<{
    entry_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    event_type: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    payload: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
    entry_hash: import("@sinclair/typebox").TString;
    previous_hash: import("@sinclair/typebox").TString;
    hash_domain_tag: import("@sinclair/typebox").TString;
}>;
export type AuditEntry = Static<typeof AuditEntrySchema>;
/**
 * Append-only audit trail with hash chain integrity.
 *
 * Supports optional checkpointing (Flatline IMP-003) to prevent
 * unbounded growth of the entries array.
 */
export declare const AuditTrailSchema: import("@sinclair/typebox").TObject<{
    entries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        entry_id: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TString;
        event_type: import("@sinclair/typebox").TString;
        actor_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        payload: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
        entry_hash: import("@sinclair/typebox").TString;
        previous_hash: import("@sinclair/typebox").TString;
        hash_domain_tag: import("@sinclair/typebox").TString;
    }>>;
    hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256">;
    genesis_hash: import("@sinclair/typebox").TString;
    integrity_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"unverified">, import("@sinclair/typebox").TLiteral<"quarantined">]>;
    checkpoint_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    checkpoint_index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type AuditTrail = Static<typeof AuditTrailSchema>;
//# sourceMappingURL=audit-trail.d.ts.map