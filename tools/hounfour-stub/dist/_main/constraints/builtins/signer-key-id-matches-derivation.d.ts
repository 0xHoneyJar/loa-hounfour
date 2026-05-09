export type SignerKeyIdErrorCode = 'SIGNER_KEY_ID_MISMATCH' | 'SIGNER_KEY_ID_INVALID_INPUT';
export interface SignerKeyIdDiagnostic {
    code: SignerKeyIdErrorCode;
    message: string;
    signer_cluster_id?: string;
    signer_key_version?: string;
    /** The signer_key_id as it appeared on the record. */
    asserted_key_id?: string;
    /** The signer_key_id the derivation rule computes. */
    derived_key_id?: string;
}
export interface EvaluateSignerKeyIdMatchesDerivationResult {
    valid: boolean;
    diagnostic?: SignerKeyIdDiagnostic;
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
export declare function deriveSignerKeyId(signerClusterId: string, signerKeyVersion: string): string;
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseSignerKeyIdMatchesDerivation()`
 * returns a boolean; direct callers wanting the structured diagnostic
 * should use this entry point.
 *
 * Argument shape (DSL surface):
 *   `signer_key_id_matches_derivation(record, cluster_id_field, key_version_field, key_id_field)`
 */
export declare function evaluateSignerKeyIdMatchesDerivation(record: unknown, clusterIdField: string, keyVersionField: string, keyIdField: string): EvaluateSignerKeyIdMatchesDerivationResult;
//# sourceMappingURL=signer-key-id-matches-derivation.d.ts.map