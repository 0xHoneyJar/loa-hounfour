/**
 * SHA-256 hex digest pattern with `sha256:` prefix.
 *
 * 32-byte SHA-256 digests encode to exactly 64 hexadecimal characters.
 * This pattern wraps the hex form with the literal prefix `sha256:` so
 * the algorithm is self-describing on the wire — distinguishing the
 * 64-hex form from a 32-byte BLAKE3 hex (also 64 hex but semantically
 * different) or the 40-hex git commit SHA-1 form (FR-B6 uses a
 * separate pattern).
 *
 * Case: `[A-Fa-f0-9]` admits both upper- and lower-case; the canonical
 * form is lowercase per existing v8.5.0 convention
 * (`signed_payload_hash` in `SignatureEnvelope` uses the same
 * tightening on `[0-9a-f]`). Future schemas SHOULD prefer lowercase
 * but the wider class is accepted to ease consumer migration.
 *
 * Used by:
 *   - FR-B2 `PhaseCompletionEnvelopeSchema.prev_envelope_hash`
 *   - FR-B4 `wal_checksum`
 *   - FR-B5 `attached_evidence_hashes[*]`
 *   - FR-B8 `input_hash`
 *   - FR-B9 `plan_content_hash`, `prev_envelope_hash`, `parent_signoff_hash`
 *   - FR-B10 `parent_plan_hash`, `prev_envelope_hash`
 *   - FR-E2 Merkle proof entries
 *
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
export const SHA256_HEX_PATTERN = '^sha256:[A-Fa-f0-9]{64}$';
/**
 * Bare SHA-256 hex pattern (no prefix), 64 lowercase / mixed-case hex
 * characters. Used by the FR-B2 `signer_key_id` field which is the
 * derivation hash output without the `sha256:` algorithm prefix
 * (the prefix is implicit from the field type per SDD §3.4).
 *
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
export const SHA256_HEX_BARE_PATTERN = '^[A-Fa-f0-9]{64}$';
//# sourceMappingURL=sha256-pattern.js.map