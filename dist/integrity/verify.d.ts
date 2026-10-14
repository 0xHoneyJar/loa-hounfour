import { type RevocationList } from '../canonical/revocation-list.js';
/**
 * Result of `verifyEnvelopeSignatureEd25519`.
 *
 * - `verified: true`: the signature verifies over the canonical signing
 *   input under the supplied public key.
 * - `verified: false`: the input is malformed or the signature does not
 *   verify. `reason` is one of the stable codes listed on the function.
 * - `verified: 'unverifiable'`: the check could not be performed (no
 *   signature present, or the runtime lacks WebCrypto Ed25519). This is
 *   NOT a pass; callers that need a signature treat it as a failure.
 */
export type Ed25519VerifyResult = {
    verified: true;
} | {
    verified: false;
    reason: string;
} | {
    verified: 'unverifiable';
    reason: string;
};
/** Options accepted by `verifyEnvelopeSignatureEd25519`. */
export interface Ed25519VerifyOptions {
    /** Name of the field carrying the `ed25519:<86 base64url>` signature. Default `'signature'`. */
    signatureField?: string;
    /**
     * Fields removed from the envelope before canonicalisation. Default
     * `[signatureField, 'quorum_signatures']`. The signature field is
     * always removed even when this list omits it, because a signature
     * cannot sign itself (decision recorded for SDD §5).
     */
    omitFields?: string[];
}
/**
 * Verify an Ed25519 signature carried inside an envelope.
 *
 * Steps (in this order; the first failing step decides the result):
 *
 *   1. `envelope` must be a plain object, else `false / envelope_not_object`.
 *      Invalid options give `false / options_invalid`.
 *   2. The signature field must be present and not null, else
 *      `'unverifiable' / signature_missing`.
 *   3. Its value must be `ed25519:` + 86 canonical base64url chars
 *      decoding to 64 bytes, else `false / signature_malformed`.
 *   4. The public key must be 32 raw bytes or `ed25519-pub:` + 43
 *      canonical base64url chars, else `false / public_key_malformed`.
 *   5. Canonical signing input = UTF-8 of `safeCanonicalize(envelope
 *      minus omitted fields)`. Any string or key holding an unpaired
 *      surrogate is rejected first as `canonical_nfc_failed`. Failures map to
 *      `canonical_size_cap_exceeded`, `canonical_key_collision`,
 *      `canonical_nfc_failed` or `canonicalization_failed` (all `false`).
 *   6. WebCrypto Ed25519 must be available, else
 *      `'unverifiable' / webcrypto_ed25519_unavailable`.
 *   7. Verify; a bad signature gives `false / signature_mismatch`.
 *
 * Never throws. The reason vocabulary is stable and shared with the Go
 * reference implementation so conformance results diff byte for byte.
 */
export declare function verifyEnvelopeSignatureEd25519(envelope: Record<string, unknown>, publicKey: Uint8Array | string, options?: Ed25519VerifyOptions): Promise<Ed25519VerifyResult>;
/**
 * Result of `lookupRevocation`.
 *
 * - `revoked`: true when an applicable list carries an entry for the key
 *   with `revoked_at` at or before `at`.
 * - `revoked_at` / `reason`: copied from that entry when `revoked`.
 * - `list_id`: when `revoked`, the most recent (by `issued_at`) applicable
 *   list carrying the revoking entry; otherwise the most recent applicable
 *   list, or absent when no list is applicable.
 * - `list_valid`: false when at least one supplied list failed structural
 *   shape validation; such lists are ignored and named in
 *   `list_validity_reason`.
 * - `error`: `'at_invalid'` when `at` is not a valid instant. No lookup
 *   was performed; the result then carries `revoked: false`,
 *   `list_valid: false` and `list_validity_reason: 'at_invalid'`.
 *   Callers MUST check `error` before reading `revoked`.
 */
export interface RevocationLookupResult {
    revoked: boolean;
    revoked_at?: string;
    list_id?: string;
    reason?: string;
    list_valid: boolean;
    list_validity_reason?: string;
    error?: 'at_invalid';
}
/**
 * Look up whether `signerKeyId` is revoked at instant `at`.
 *
 * Semantics (SDD §5):
 *   - A list is applicable when `valid_from <= at` and
 *     (`valid_until` is null or `at < valid_until`).
 *   - The key is revoked when any applicable list has an entry with
 *     `key_id === signerKeyId` and `revoked_at <= at`.
 *   - Applicable lists are ranked by `issued_at` descending; ties keep
 *     input order (decision: deterministic, mirrored by the Go port).
 *   - Lists failing `RevocationListSchema` shape validation are ignored
 *     and reported as `list_valid: false` with
 *     `list_validity_reason: "shape_invalid: lists[i], ..."`.
 *
 * `at` is a `Date` (millisecond resolution) or a string in the strict
 * ISO 8601 UTC form `YYYY-MM-DDTHH:MM:SS(.f{1,9})?Z` (nanosecond
 * resolution). Timestamps compare at nanosecond resolution on their
 * textual value. An invalid `Date`, a Date outside years 0001..9999, or
 * a string that is not a real calendar instant (see `normalizeUtc`)
 * yields the `at_invalid` result; it never throws for `at`. A list whose
 * `valid_from`, `valid_until`, `issued_at` or any `revoked_at` is not a
 * real instant is shape-invalid, because the schema pattern does not
 * range-check fields.
 *
 * Pure. Throws `TypeError` only when `lists` is not an array.
 *
 * Non-constraints: list signatures, cross-field invariants (RL-1..RL-12),
 * chain linkage and freshness are NOT checked here (ADR-010; see the
 * module JSDoc).
 */
export declare function lookupRevocation(lists: RevocationList[], signerKeyId: string, at: string | Date): RevocationLookupResult;
//# sourceMappingURL=verify.d.ts.map