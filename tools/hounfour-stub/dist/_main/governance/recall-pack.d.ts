/**
 * `RecallPack` — output container for the recall machinery.
 *
 * Carries the assembled bundle (items + redaction summary +
 * exclusion summary) plus a content-addressed `pack_hash`. The
 * sub-component shapes (items, redactions, exclusions) are inlined
 * as anonymous `Type.Object` per the locked W4 de-scope decision —
 * promoting them to standalone `$id`-bearing schemas can land
 * strict-additively in v8.5.x or v8.6.0 if a consumer surfaces a
 * concrete need.
 *
 * **Hash domain**: `pack_hash` is the SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON of the pack contents *minus* the
 * `pack_hash` field itself. Computed via `safeCanonicalize` so the
 * 100KB normative payload cap (per the v8.5.0 hashing-spec freeze)
 * applies; consumers using the helper get correct behavior. Hounfour
 * does NOT verify the hash — `validate(RecallPackSchema, payload)`
 * accepts any well-formed `^sha256:[0-9a-f]{64}$` literal and
 * surfaces the obligation in the unverified-obligations manifest.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const RecallPackSchema: import("@sinclair/typebox").TObject<{
    pack_id: import("@sinclair/typebox").TString;
    recall_request_ref: import("@sinclair/typebox").TString;
    items: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        item_id: import("@sinclair/typebox").TString;
        item_type: import("@sinclair/typebox").TString;
        payload_ref: import("@sinclair/typebox").TString;
        recorded_at: import("@sinclair/typebox").TString;
    }>>;
    redactions: import("@sinclair/typebox").TObject<{
        total_redacted: import("@sinclair/typebox").TInteger;
        redaction_categories: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    exclusions: import("@sinclair/typebox").TObject<{
        total_excluded: import("@sinclair/typebox").TInteger;
        exclusion_categories: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    pack_hash: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RecallPack = Static<typeof RecallPackSchema>;
//# sourceMappingURL=recall-pack.d.ts.map