/**
 * Cryptographic-material entry inside a `Keyring`.
 *
 * Each `SignerEntry` binds a `signer_id` and `key_ref` to a public
 * key plus the trust profile that constrains how matching rules
 * accept signatures from this signer. Status is orthogonal to the
 * agent's lifecycle — a key can be revoked while the agent stays
 * active.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { Type } from '@sinclair/typebox';
import { CapabilityScopedTrustSchema } from '../schemas/agent-identity.js';
import { SignatureTypeSchema } from './signature-type.js';
import { SignerStatusSchema } from './signer-status.js';
export const SignerEntrySchema = Type.Object({
    signer_id: Type.String({
        pattern: '^[a-z][a-z0-9_-]{2,63}$',
        description: 'Stable opaque identifier for the signer within its keyring. Lowercase, hyphens / underscores; 3-64 chars.',
    }),
    key_ref: Type.String({
        minLength: 1,
        description: 'Consumer-side reference for the underlying secret material (HSM slot, KMS handle, file path, etc.). Hounfour never sees the secret.',
    }),
    public_key: Type.String({
        pattern: '^ed25519-pub:[A-Za-z0-9_-]{43}$',
        description: 'Ed25519 public key, unpadded base64url-encoded (RFC 4648 §5), prefixed with "ed25519-pub:". A 32-byte Ed25519 key encodes to exactly 43 unpadded characters; padded forms with "=" are NOT accepted (the character class excludes padding) — producers MUST emit unpadded base64url.',
    }),
    signature_type: SignatureTypeSchema,
    scoped_trust: CapabilityScopedTrustSchema,
    signer_status: SignerStatusSchema,
}, {
    $id: 'SignerEntry',
    additionalProperties: false,
    description: 'Cryptographic-material entry inside a Keyring. Binds signer_id + key_ref to a public key, signature kind, scoped trust profile, and lifecycle status.',
});
//# sourceMappingURL=signer-entry.js.map