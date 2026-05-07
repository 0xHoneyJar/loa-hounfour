/**
 * `CommitmentRoot` — content-addressed onchain anchor primitive.
 *
 * **Crypto-bearing**: `subject_hash` is content-addressed and any
 * consumer that downstream-treats `validate(CommitmentRootSchema,
 * payload).valid === true` as integrity-verified would silently
 * trust an unverified commitment. Hounfour therefore defaults to
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` per the
 * G1 safe-by-default policy. Consumers MUST opt in via
 * `{ acceptDeferred: true }` to acknowledge that the library has
 * NOT recomputed the `subject_hash` and that downstream
 * reconciliation is required.
 *
 * **Hash domain**: `subject_hash` is the SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON of the committed artifact (e.g., the
 * RecallReceipt body for a `recall_receipt` commitment). Computed
 * via `safeCanonicalize` so the 100KB normative payload cap (per
 * the v8.5.0 hashing-spec freeze) applies.
 *
 * **Boundary discipline (ADR-010)**: Hounfour ships *shape*. The
 * `computeCommitmentRoot` helper that produces the hash and the
 * on-chain adapters that anchor the record stay consumer-side
 * (Issue #70:143-145; permanent out-of-scope per Phase 6 lock).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @see CommitmentTypeSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const CommitmentRootSchema: import("@sinclair/typebox").TObject<{
    commitment_id: import("@sinclair/typebox").TString;
    commitment_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"estate_checkpoint">, import("@sinclair/typebox").TLiteral<"recall_receipt">, import("@sinclair/typebox").TLiteral<"transition_bundle">, import("@sinclair/typebox").TLiteral<"revocation_checkpoint">]>;
    subject_hash: import("@sinclair/typebox").TString;
    anchor_chain_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    anchor_tx_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type CommitmentRoot = Static<typeof CommitmentRootSchema>;
//# sourceMappingURL=commitment-root.d.ts.map