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
import { Type, type Static } from '@sinclair/typebox';

export const SignatureTypeSchema = Type.Union(
  [
    Type.Literal('attestation', {
      description: 'Signer is asserting a fact they observed or vouch for.',
    }),
    Type.Literal('authorization', {
      description: 'Signer is granting permission for a downstream action.',
    }),
    Type.Literal('commitment', {
      description: 'Signer is binding themselves to a future action or state.',
    }),
    Type.Literal('dev_signature', {
      description:
        'Dev-only marker. NOT a cryptographic guarantee — consumers MUST reject in production.',
    }),
  ],
  {
    $id: 'SignatureType',
    description:
      'Semantic kind of a signature: what the signer is asserting by signing. Orthogonal to the crypto algorithm.',
  },
);

export type SignatureType = Static<typeof SignatureTypeSchema>;
