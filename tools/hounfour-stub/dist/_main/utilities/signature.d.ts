/**
 * JWS signature utilities for ModelProviderSpec verification.
 *
 * Implements SDD §3.5 — JWS compact serialization with RFC 8785 JCS
 * canonicalization for deterministic signing of provider spec documents.
 *
 * Security notes:
 * - Algorithm restricted to ES256 and EdDSA — RS256 and HS256 explicitly rejected.
 * - Default keyResolver is null (safe by default — no remote key fetch).
 * - jku SSRF protection is caller responsibility (URL allowlist, HTTPS-only, timeout).
 * - Clock skew tolerance: 5 minutes on `iat`.
 *
 * @see SDD §10.1 — JWS Security
 */
import * as jose from 'jose';
/**
 * Discriminated union for signature verification results.
 *
 * Instance of the Epistemic Tristate pattern (docs/patterns/epistemic-tristate.md):
 * - `verified: true` — known good (signature valid, includes algorithm and key_id)
 * - `verified: false` — known bad (signature invalid or verification failed)
 * - `verified: 'unverifiable'` — unknown (cannot verify: missing signature, no key resolver)
 *
 * @see docs/patterns/epistemic-tristate.md — Pattern documentation
 */
export type SignatureVerificationResult = {
    verified: true;
    algorithm: string;
    key_id?: string;
} | {
    verified: false;
    reason: string;
} | {
    verified: 'unverifiable';
    reason: string;
};
/**
 * Callback for resolving public keys by key ID.
 * Returns a JWK or KeyLike object for verification.
 */
export type KeyResolver = (keyId: string, algorithm: string) => Promise<jose.CryptoKey | jose.KeyObject | Uint8Array>;
/**
 * Canonicalize a ModelProviderSpec for signing.
 *
 * Removes the `signature` field and applies RFC 8785 JCS canonicalization
 * to produce a deterministic byte representation.
 *
 * @param spec - The ModelProviderSpec object (or any object with optional `signature` field)
 * @returns Canonical JSON string per RFC 8785
 */
export declare function canonicalizeProviderSpec(spec: Record<string, unknown>): string;
/**
 * Verify a JWS compact serialization signature on a ModelProviderSpec.
 *
 * Never throws — returns a discriminated union result. Missing signatures
 * return `{ verified: 'unverifiable' }`.
 *
 * @param spec - The full spec object including the `signature` field
 * @param keyResolver - Callback to resolve public keys (null = no verification possible)
 * @returns Discriminated union result
 */
export declare function verifyProviderSignature(spec: Record<string, unknown>, keyResolver?: KeyResolver | null): Promise<SignatureVerificationResult>;
//# sourceMappingURL=signature.d.ts.map