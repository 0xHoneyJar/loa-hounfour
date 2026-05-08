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

export type SignerKeyIdErrorCode =
  | 'SIGNER_KEY_ID_MISMATCH'
  | 'SIGNER_KEY_ID_INVALID_INPUT';

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
 * Format: `sha256(signer_cluster_id || ':' || signer_key_version)`,
 * encoded as 64-char lowercase hex (no `sha256:` prefix per the
 * FR-B2 schema's bare-hex pattern). The colon delimiter is part of
 * the canonical form; cross-runner authors implementing the
 * FR-A2 conformance vectors must use the same delimiter byte.
 *
 * NOTE: The colon delimiter is byte-stable across UTF-8 runners
 * (ASCII 0x3A); no Unicode normalization concern. The cluster_id and
 * key_version inputs are NOT NFC-normalized at the derivation surface
 * — consumers MUST author cluster_ids in NFC form to avoid silent
 * derivation drift (the derivation rule is a thin wrapper, not a
 * canonicalization layer).
 */
export function deriveSignerKeyId(
  signerClusterId: string,
  signerKeyVersion: string,
): string {
  const hash = createHash('sha256');
  hash.update(signerClusterId, 'utf8');
  hash.update(':', 'utf8');
  hash.update(signerKeyVersion, 'utf8');
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
export function evaluateSignerKeyIdMatchesDerivation(
  record: unknown,
  clusterIdField: string,
  keyVersionField: string,
  keyIdField: string,
): EvaluateSignerKeyIdMatchesDerivationResult {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return {
      valid: false,
      diagnostic: {
        code: 'SIGNER_KEY_ID_INVALID_INPUT',
        message:
          'signer_key_id_matches_derivation: record argument must be a ' +
          'non-array object',
      },
    };
  }
  const rec = record as Record<string, unknown>;
  const clusterId = rec[clusterIdField];
  const keyVersion = rec[keyVersionField];
  const keyId = rec[keyIdField];

  if (
    typeof clusterId !== 'string' ||
    typeof keyVersion !== 'string' ||
    typeof keyId !== 'string'
  ) {
    return {
      valid: false,
      diagnostic: {
        code: 'SIGNER_KEY_ID_INVALID_INPUT',
        message:
          `signer_key_id_matches_derivation: ` +
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
    return {
      valid: false,
      diagnostic: {
        code: 'SIGNER_KEY_ID_MISMATCH',
        message:
          `signer_key_id_matches_derivation: asserted key_id ` +
          `"${keyId}" does not match the derivation ` +
          `sha256("${clusterId}" || ":" || "${keyVersion}") = "${derived}". ` +
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
