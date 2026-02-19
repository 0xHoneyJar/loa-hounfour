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
// canonicalize is CJS (module.exports = fn) with a .d.ts that declares
// `export default`. Under moduleResolution: "NodeNext", the namespace
// wrapper makes the direct call fail typecheck. Cast once here.
import _canonicalize from 'canonicalize';
const canonicalize = _canonicalize as unknown as (input: unknown) => string | undefined;

/** Algorithms allowed for JWS verification. */
const ALLOWED_ALGORITHMS = new Set(['ES256', 'EdDSA']);

/** Maximum clock skew tolerance for `iat` claim (5 minutes). */
const CLOCK_SKEW_SECONDS = 300;

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
export type SignatureVerificationResult =
  | { verified: true; algorithm: string; key_id?: string }
  | { verified: false; reason: string }
  | { verified: 'unverifiable'; reason: string };

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
export function canonicalizeProviderSpec(spec: Record<string, unknown>): string {
  const { signature: _removed, ...rest } = spec;
  const result = canonicalize(rest);
  if (result === undefined) {
    throw new Error('JCS canonicalization failed: input produced undefined');
  }
  return result;
}

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
export async function verifyProviderSignature(
  spec: Record<string, unknown>,
  keyResolver: KeyResolver | null = null,
): Promise<SignatureVerificationResult> {
  const jws = spec.signature;

  if (typeof jws !== 'string' || jws.length === 0) {
    return { verified: 'unverifiable', reason: 'Missing or empty signature field' };
  }

  // Validate JWS compact format (3 dot-separated segments)
  const segments = jws.split('.');
  if (segments.length !== 3 || segments.some(s => s.length === 0)) {
    return { verified: false, reason: 'Malformed JWS compact serialization: expected 3 non-empty dot-separated segments' };
  }

  if (!keyResolver) {
    return { verified: 'unverifiable', reason: 'No key resolver provided — cannot fetch verification key' };
  }

  // Decode protected header to check algorithm
  let header: jose.JWSHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(jws);
  } catch {
    return { verified: false, reason: 'Failed to decode JWS protected header' };
  }

  // Reject alg: 'none'
  if (!header.alg || header.alg === 'none') {
    return { verified: false, reason: 'Algorithm "none" is explicitly rejected' };
  }

  // Restrict to allowed algorithms
  if (!ALLOWED_ALGORITHMS.has(header.alg)) {
    return { verified: false, reason: `Algorithm "${header.alg}" is not allowed — only ES256 and EdDSA are permitted` };
  }

  // Resolve key
  const kid = header.kid ?? 'default';
  let key: jose.CryptoKey | jose.KeyObject | Uint8Array;
  try {
    key = await keyResolver(kid, header.alg);
  } catch (err) {
    return { verified: false, reason: `Key resolution failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Verify signature
  try {
    const { payload } = await jose.compactVerify(jws, key);

    // Verify payload matches canonical form of spec
    const canonical = canonicalizeProviderSpec(spec);
    const payloadStr = new TextDecoder().decode(payload);
    if (payloadStr !== canonical) {
      return { verified: false, reason: 'Payload does not match canonical form of the spec' };
    }

    // Check iat clock skew if present in header claims
    // JWS compact doesn't have standard claims, but we check if the decoded payload has iat
    try {
      const payloadObj = JSON.parse(payloadStr);
      if (typeof payloadObj.iat === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (payloadObj.iat > now + CLOCK_SKEW_SECONDS) {
          return { verified: false, reason: `iat is ${payloadObj.iat - now}s in the future (max skew: ${CLOCK_SKEW_SECONDS}s)` };
        }
      }
    } catch {
      // Non-JSON payload or no iat — acceptable for spec canonicalization
    }

    return {
      verified: true,
      algorithm: header.alg,
      ...(header.kid ? { key_id: header.kid } : {}),
    };
  } catch (err) {
    return { verified: false, reason: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
