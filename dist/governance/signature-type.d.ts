/**
 * Semantic kind of a signature — what the signer is asserting by signing.
 *
 * Orthogonal to the underlying cryptographic algorithm (which is fixed
 * to Ed25519 for v8.5.0 by the `signature_value` pattern on
 * `SignatureEnvelope`). `SignatureType` carries the *intent* of the
 * signature so consumers can route by purpose without re-deriving it
 * from context.
 *
 * 4 members. `'dev_signature'` is the documented dev-only marker —
 * payloads carrying it MUST NOT be treated as cryptographically
 * authoritative; consumers verifying signatures should reject
 * `dev_signature` envelopes by default in production environments.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const SignatureTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
export type SignatureType = Static<typeof SignatureTypeSchema>;
//# sourceMappingURL=signature-type.d.ts.map