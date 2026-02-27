/**
 * HashChainDiscontinuity — event schema for hash chain breaks.
 *
 * Emitted when verifyAuditTrailIntegrity() detects a content or chain
 * hash mismatch. Triggers the halt-and-reconcile protocol defined in ADR-006.
 *
 * @see SDD §4.8.1 — HashChainDiscontinuity Event (FR-3.1)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Event recording a detected hash chain discontinuity.
 */
export declare const HashChainDiscontinuitySchema: import("@sinclair/typebox").TObject<{
    discontinuity_id: import("@sinclair/typebox").TString;
    resource_type: import("@sinclair/typebox").TString;
    resource_id: import("@sinclair/typebox").TString;
    detected_at: import("@sinclair/typebox").TString;
    entry_index: import("@sinclair/typebox").TInteger;
    expected_hash: import("@sinclair/typebox").TString;
    actual_hash: import("@sinclair/typebox").TString;
    last_known_good_index: import("@sinclair/typebox").TInteger;
    affected_entries: import("@sinclair/typebox").TInteger;
    detector: import("@sinclair/typebox").TString;
    failure_phase: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"content">, import("@sinclair/typebox").TLiteral<"chain">]>;
}>;
export type HashChainDiscontinuity = Static<typeof HashChainDiscontinuitySchema>;
//# sourceMappingURL=hash-chain-discontinuity.d.ts.map