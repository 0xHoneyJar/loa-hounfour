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
import { Type } from '@sinclair/typebox';
import { ED25519_SIGNATURE_PATTERN } from '../governance/signature-envelope.js';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN, SHA256_HEX_BARE_PATTERN } from './sha256-pattern.js';
import { PhaseCompletionEnvelopeTier1Schema } from './phase-completion-envelope-tier1.js';
export const PhaseCompletionEnvelopeSchema = Type.Object({
    envelope_kind: Type.Literal('phase_completion', {
        description: 'Discriminator literal pinning the Tier-2 cluster-wrapped shape. ' +
            'The inner Tier-1 carries `phase_completion_tier1` for its own ' +
            'discriminator.',
    }),
    contract_version: Type.Literal('8.6.0', {
        description: 'Hounfour contract version. Pinned to "8.6.0" for the ' +
            'cycle-005 ship line.',
    }),
    signer_cluster_id: Type.String({
        minLength: 1,
        description: 'Stable cluster identifier (consumer-shaped — hounfour does not ' +
            'freeze the namespace). The CT-08 invariant uses this field to ' +
            'gate cross-cluster state lookups.',
    }),
    signer_key_version: Type.String({
        pattern: '^[1-9][0-9]*$',
        description: 'String-encoded ≥1 integer (CT-03; consumer parses to BigInt ' +
            'post-validation). Monotonic per cluster per FR-C2 ' +
            '`KEY_VERSION_REGRESSION` semantics. Leading zero rejected; ' +
            '"0" rejected (key versions are 1-indexed by convention).',
    }),
    signer_key_id: Type.String({
        pattern: SHA256_HEX_BARE_PATTERN,
        description: 'Derived sha256 hex (bare 64-char form — no `sha256:` prefix; ' +
            'the algorithm is implicit from the field type) of ' +
            '`signer_cluster_id || ":" || signer_key_version`. ' +
            'Verification is the LOCAL builtin ' +
            '`signer_key_id_matches_derivation` per constraint file ' +
            '`constraints/PhaseCompletionEnvelope.constraints.json`.',
    }),
    cluster_signature: Type.String({
        pattern: ED25519_SIGNATURE_PATTERN,
        description: 'Ed25519 signature value (unpadded base64url, 86 chars after ' +
            'the "ed25519:" prefix) over the RFC 8785 canonical-JSON of ' +
            'all-other-fields including `ingested_emission`. Hounfour ' +
            'does NOT verify; consumer-side verification per NF-1.',
    }),
    ingested_emission: PhaseCompletionEnvelopeTier1Schema,
    prev_envelope_hash: Type.String({
        pattern: SHA256_HEX_PATTERN,
        description: 'sha256:<64-hex> hash of the previous envelope\'s canonical-JSON ' +
            'form. The genesis-position envelope uses ' +
            '"sha256:0000000000000000000000000000000000000000000000000000000000000000" ' +
            'as the chain anchor. FR-C3 `chain_validator_prev_hash` ' +
            'verifies the chain-link integrity.',
    }),
    ingest_timestamp: Type.String({
        pattern: ISO8601_UTC_PATTERN,
        description: 'ISO 8601 UTC timestamp at cluster ingestion (Z suffix). ' +
            'Distinct from the inner `ingested_emission.timestamp` (the ' +
            'agent\'s emission time).',
    }),
}, {
    $id: 'PhaseCompletionEnvelope',
    additionalProperties: false,
    'x-cross-field-validated': true,
    'x-crypto-bearing': true,
    'x-chain-bearing': true,
    'x-canonical-size-cap-bytes': 4096,
    description: 'Cluster-wrapped Tier-2 phase-completion envelope. Wraps Tier-1 ' +
        '(PhaseCompletionEnvelopeTier1Schema) for cluster-side ingestion ' +
        'with cluster_signature + signer_key_id (sha256-derived) + ' +
        'prev_envelope_hash chain link. Crypto-bearing + chain-bearing + ' +
        'canonical-size-capped at 4 KB (NFR-4).',
});
//# sourceMappingURL=phase-completion-envelope.js.map