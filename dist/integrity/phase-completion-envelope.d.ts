/**
 * `PhaseCompletionEnvelopeSchema` — Tier-2 cluster-wrapped envelope
 * (FR-B2, v8.6.0).
 *
 * The Tier-2 envelope wraps a Tier-1 agent emission inside
 * `ingested_emission` and adds cluster-side metadata: signer cluster
 * identity, signer key version, derived signer key id (sha256 of
 * cluster_id + key_version), the cluster's signature over the canonical
 * JSON, the chained-hash reference (`prev_envelope_hash`), and the
 * cluster ingestion timestamp.
 *
 * **Schema-level invariants**:
 *   - `signer_key_id` MUST equal `sha256(signer_cluster_id || ':' ||
 *     signer_key_version)` — verified by the LOCAL builtin
 *     `signer_key_id_matches_derivation` from constraint file.
 *   - Canonical-JSON form MUST NOT exceed 4096 bytes (NFR-4) —
 *     verified by the LOCAL builtin `canonical_size_cap` from
 *     constraint file. The `'x-canonical-size-cap-bytes': 4096`
 *     metadata flag is the schema-level declaration; the builtin
 *     does the actual byte count.
 *   - `sequence` monotonically increases per `signer_cluster_id`
 *     (FR-C2 `sequence_monotonic_per_cluster`).
 *   - `nonce` uniqueness per signer within sliding window (FR-C1
 *     `nonce_unique_per_signer_window`).
 *   - `prev_envelope_hash` chain validity (FR-C3
 *     `chain_validator_prev_hash`).
 *
 * **Two metadata flags**:
 *   - `'x-crypto-bearing': true` — both Tier-1 and Tier-2 carry
 *     ed25519 signatures; the safe-by-default crypto-bearing pattern
 *     applies to both layers.
 *   - `'x-chain-bearing': true` — Tier-2 carries a chained
 *     `prev_envelope_hash`, opting into the FR-A4 fail-closed contract
 *     (consumer can pass `{ failClosed: true }` to validate() to
 *     reject envelopes lacking chain context).
 *   - `'x-canonical-size-cap-bytes': 4096` — declarative metadata
 *     read by the LOCAL `canonical_size_cap` builtin to cap the
 *     canonical-JSON wire form at 4 KB (NFR-4).
 *
 * @see SDD §3.4 — FR-B2 schema spec
 * @see SDD §3.13 — NFR-4 4 KB cap refinement
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
import { type Static } from '@sinclair/typebox';
export declare const PhaseCompletionEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"phase_completion">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    signer_cluster_id: import("@sinclair/typebox").TString;
    signer_key_version: import("@sinclair/typebox").TString;
    signer_key_id: import("@sinclair/typebox").TString;
    cluster_signature: import("@sinclair/typebox").TString;
    ingested_emission: import("@sinclair/typebox").TObject<{
        envelope_kind: import("@sinclair/typebox").TLiteral<"phase_completion_tier1">;
        contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
        agent_id: import("@sinclair/typebox").TString;
        agent_signature: import("@sinclair/typebox").TString;
        agent_key_pubkey: import("@sinclair/typebox").TString;
        payload: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
        nonce: import("@sinclair/typebox").TString;
        sequence: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TString;
    }>;
    prev_envelope_hash: import("@sinclair/typebox").TString;
    ingest_timestamp: import("@sinclair/typebox").TString;
}>;
export type PhaseCompletionEnvelope = Static<typeof PhaseCompletionEnvelopeSchema>;
//# sourceMappingURL=phase-completion-envelope.d.ts.map