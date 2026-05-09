/**
 * `signer_key_id_matches_derivation` LOCAL constraint builtin
 * (FR-B2 schema-side reinforcement, v8.6.0).
 *
 * Pure-shape derivation check: asserts that
 *   `signer_key_id === sha256_hex(signer_cluster_id || ':' || signer_key_version)`
 *
 * **LOCAL** because the derivation is computable from the record alone
 * — no consumer-supplied state is needed. Matches the
 * `canonical_size_cap` LOCAL pattern (no `*_CONTEXT_DEFERRED` reason —
 * the check either passes or fails on the record's own fields).
 *
 * The FR-B2 schema (`PhaseCompletionEnvelopeSchema`) declares
 * `signer_key_id` as a 64-char hex string at the structural layer; this
 * builtin closes the derivation gap so a consumer cannot supply a
 * shape-valid but cryptographically-meaningless `signer_key_id` (e.g.,
 * a hash of unrelated content) and have the envelope accepted.
 *
 * **No try/catch in the hot path.** `node:crypto`'s `createHash` API is
 * synchronous and does not throw for valid string inputs; the only
 * failure mode is structural-input rejection, which the type-narrowing
 * checks at the top of `evaluateSignerKeyIdMatchesDerivation` cover.
 *
 * @see SDD §3.4 — FR-B2 schema spec (signer_key_id derivation rule)
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
import { createHash } from 'node:crypto';
/**
 * Truncate an untrusted string + strip ASCII control characters before
 * embedding in a diagnostic message. Caps at 64 chars; replaces
 * non-printable bytes (C0 control + DEL) with `?`. Iter-1 F6 mitigation:
 * defends against log-injection via embedded ANSI escapes / control
 * bytes. Structured diagnostic fields carry the untruncated full
 * values for programmatic consumers.
 */
function truncateAndScrub(s) {
    const scrubbed = s.replace(/[\x00-\x1F\x7F]/g, '?');
    return scrubbed.length > 64 ? `${scrubbed.slice(0, 61)}...` : scrubbed;
}
/**
 * Compute the canonical signer_key_id from cluster_id + key_version.
 *
 * Format: `sha256(NFC(signer_cluster_id) || ':' || NFC(signer_key_version))`,
 * encoded as 64-char lowercase hex (no `sha256:` prefix per the
 * FR-B2 schema's bare-hex pattern). The colon delimiter is part of
 * the canonical form; cross-runner authors implementing the FR-A2
 * conformance vectors must use the same delimiter byte.
 *
 * **NFC normalization at the derivation layer (iter-1 e0c46b14
 * mitigation).** Both `signer_cluster_id` and `signer_key_version`
 * are NFC-normalized via `String.prototype.normalize('NFC')` BEFORE
 * the sha256 hash. This closes the homograph-attack class where two
 * visually-identical Unicode forms (e.g. `admin` with combining-
 * mark variants) would derive different `signer_key_id` hashes —
 * GitHub's 2017 username-homograph incident is the canonical
 * precedent for this bug class. Cross-runner reproducibility: the
 * other-language runners (Go, Python, Rust) MUST also NFC-normalize
 * before the equivalent sha256 update calls. The colon delimiter
 * (ASCII 0x3A) needs no normalization.
 */
export function deriveSignerKeyId(signerClusterId, signerKeyVersion) {
    // NFC-normalize before hashing so visually-identical inputs derive
    // identical key_ids. The normalize() call is a no-op for ASCII
    // strings (the common path for cluster_ids); the marginal cost
    // applies only to inputs that genuinely contain combining marks.
    const cidNFC = signerClusterId.normalize('NFC');
    const kvNFC = signerKeyVersion.normalize('NFC');
    const hash = createHash('sha256');
    hash.update(cidNFC, 'utf8');
    hash.update(':', 'utf8');
    hash.update(kvNFC, 'utf8');
    return hash.digest('hex');
}
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseSignerKeyIdMatchesDerivation()`
 * returns a boolean; direct callers wanting the structured diagnostic
 * should use this entry point.
 *
 * Argument shape (DSL surface):
 *   `signer_key_id_matches_derivation(record, cluster_id_field, key_version_field, key_id_field)`
 */
export function evaluateSignerKeyIdMatchesDerivation(record, clusterIdField, keyVersionField, keyIdField) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return {
            valid: false,
            diagnostic: {
                code: 'SIGNER_KEY_ID_INVALID_INPUT',
                message: 'signer_key_id_matches_derivation: record argument must be a ' +
                    'non-array object',
            },
        };
    }
    const rec = record;
    const clusterId = rec[clusterIdField];
    const keyVersion = rec[keyVersionField];
    const keyId = rec[keyIdField];
    if (typeof clusterId !== 'string' ||
        typeof keyVersion !== 'string' ||
        typeof keyId !== 'string') {
        return {
            valid: false,
            diagnostic: {
                code: 'SIGNER_KEY_ID_INVALID_INPUT',
                message: `signer_key_id_matches_derivation: ` +
                    `${clusterIdField}, ${keyVersionField}, and ${keyIdField} ` +
                    `must all resolve to string values on the record.`,
            },
        };
    }
    const derived = deriveSignerKeyId(clusterId, keyVersion);
    // Case-insensitive comparison: the schema allows mixed-case hex but
    // sha256 hex output is lowercase. Consumers emitting uppercase hex
    // pass structurally; the derivation check normalizes the comparison.
    if (derived !== keyId.toLowerCase()) {
        // Iter-1 LOW F6 mitigation: truncate interpolated values + strip
        // non-printables in the message string to defend against
        // log-injection. Structured diagnostic fields (signer_cluster_id,
        // signer_key_version, etc.) carry the full untruncated values for
        // programmatic consumers.
        const tCid = truncateAndScrub(clusterId);
        const tKv = truncateAndScrub(keyVersion);
        const tKid = truncateAndScrub(keyId);
        return {
            valid: false,
            diagnostic: {
                code: 'SIGNER_KEY_ID_MISMATCH',
                message: `signer_key_id_matches_derivation: asserted key_id ` +
                    `"${tKid}" does not match the derivation ` +
                    `sha256(NFC("${tCid}") || ":" || NFC("${tKv}")) = "${derived}". ` +
                    `The wire field MUST equal the derivation; the consumer's ` +
                    `key-derivation pipeline is misconfigured or the wire payload ` +
                    `was tampered.`,
                signer_cluster_id: clusterId,
                signer_key_version: keyVersion,
                asserted_key_id: keyId,
                derived_key_id: derived,
            },
        };
    }
    return { valid: true };
}
//# sourceMappingURL=signer-key-id-matches-derivation.js.map