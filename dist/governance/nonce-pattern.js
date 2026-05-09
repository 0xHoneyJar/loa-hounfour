/**
 * Base64url nonce pattern: exactly 22 unpadded base64url characters.
 *
 * 16-byte (128-bit) nonces encode to exactly 22 unpadded base64url
 * characters per RFC 4648 §5 (`ceil(16 * 8 / 6) = 22`, with the final
 * 2 bits of the last char being the nonce's residual; padded forms
 * with `==` are NOT accepted — producers MUST emit unpadded base64url).
 *
 * Used by the FR-B2 `PhaseCompletionEnvelopeTier1Schema` (and any
 * future schema with a per-record uniqueness nonce). The replay-
 * detection FR-C1 builtin (`nonce_unique_per_signer_window`) operates
 * on this string surface; cross-runner authors implementing the
 * FR-A2 conformance vectors must use the same encoding.
 *
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
export const BASE64URL_NONCE_PATTERN = '^[A-Za-z0-9_-]{22}$';
//# sourceMappingURL=nonce-pattern.js.map