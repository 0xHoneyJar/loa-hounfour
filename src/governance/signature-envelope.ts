/**
 * Crypto-bearing envelope wrapping a signed payload hash.
 *
 * `SignatureEnvelope` is **crypto-bearing**: the `x-crypto-bearing: true`
 * flag in TypeBox metadata flows to the generated JSON Schema, the
 * `validate()` runtime, and the structural lint. By default
 * `validate(SignatureEnvelopeSchema, payload)` returns
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` — consumers
 * MUST opt in via `{ acceptDeferred: true }` to acknowledge that the
 * library has NOT verified the signature and that downstream
 * consumer-side verification is required.
 *
 * **Wrong vs right:**
 *
 * ```ts
 * // CORRECT BY DEFAULT — naive call fails closed; cannot accidentally authorize
 * const r = validate(SignatureEnvelopeSchema, payload);
 * if (r.valid) { authorize(); }  // r.valid is false; authorize never fires.
 *
 * // EXPLICIT OPT-IN — consumer acknowledges deferred verification + checks obligations
 * const r = validate(SignatureEnvelopeSchema, payload, { acceptDeferred: true });
 * if (
 *   r.valid &&
 *   r.unverified_obligations?.unverified_rules.every(verifyDownstream)
 * ) { authorize(); }
 * ```
 *
 * The manifest shape is `{ schema_id, contract_version, manifest_emitted_at,
 * unverified_rules: [{ rule_id, rule, evaluator, evaluation_note,
 * consumer_acknowledgment_required }, ...] }` — iterate over
 * `unverified_rules` (NOT the manifest object itself). The optional chain on
 * `unverified_obligations?.unverified_rules` covers the path where the
 * payload was crypto-bearing-shape-OK but the manifest entry is omitted by
 * a future runtime configuration.
 *
 * The `signed_payload_hash` is a SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON form of the payload being signed (per the
 * v8.5.0 hashing-spec freeze). Consumers compute the expected hash
 * via `safeCanonicalize` and compare against `signed_payload_hash`
 * before treating the signature as authoritative.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { Type, type Static } from '@sinclair/typebox';
import { SignatureTypeSchema } from './signature-type.js';

/**
 * Ed25519 signature value pattern: `ed25519:` prefix + exactly 86
 * unpadded base64url characters.
 *
 * 64-byte Ed25519 signatures encode to exactly 86 unpadded base64url
 * characters per RFC 4648 §5 (`ceil(64 * 8 / 6) = 86`, no remainder, no
 * `=` padding); the `{87,88}` padded forms a v8.4.0 schema accepted are
 * mathematically unreachable for spec-conformant signers — see the
 * FR-A5 audit at `docs/audits/fr-a5-ed25519-corpus-2026-05.md` and the
 * `PSEUDO-MAJOR-EQUIVALENT-NULL` policy in MIGRATION.md for the
 * narrowing trail.
 *
 * Single source of truth: imported by every schema with an
 * `ed25519:` signature field (FR-B2 PhaseCompletionEnvelope,
 * FR-B9 PlanSignoffEnvelope, FR-E3 ClusterSignoffEnvelope, etc.).
 *
 * @since v8.6.0 — PR-A3.4 introduced the shared constant; PR-A3.1
 *   tightened the pattern itself in the schemas that consume it.
 */
export const ED25519_SIGNATURE_PATTERN = '^ed25519:[A-Za-z0-9_-]{86}$';

export const SignatureEnvelopeSchema = Type.Object(
  {
    envelope_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this envelope instance (UUID v4).',
    }),
    signature_type: SignatureTypeSchema,
    key_ref: Type.String({
      minLength: 1,
      description:
        'Consumer-side reference to the SignerEntry.key_ref that produced this signature. Hounfour does not dereference; the consumer resolves it against its own Keyring.',
    }),
    signed_payload_hash: Type.String({
      pattern: '^sha256:[0-9a-f]{64}$',
      description:
        'SHA-256 hex digest (lowercase) of safeCanonicalize(payload) where payload is the wire artifact being signed minus its own signatures[] and minus any field literally named signed_payload_hash. NFC + RFC 8785 + 100KB cap per the hashing-spec freeze.',
    }),
    signature_value: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'Ed25519 signature value, unpadded base64url-encoded (RFC 4648 §5), prefixed with "ed25519:". A 64-byte Ed25519 signature encodes to exactly 86 unpadded characters; padded forms with "==" are NOT accepted (the character class excludes padding) — producers MUST emit unpadded base64url. Hounfour does NOT verify the signature; consumer-side verification is required (see CRYPTO_DEFERRED manifest entry).',
    }),
    signed_at: Type.String({
      format: 'date-time',
      description: 'When the signer produced this signature.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this envelope instance was authored against.',
    }),
  },
  {
    $id: 'SignatureEnvelope',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'Crypto-bearing envelope wrapping a signed payload hash. validate() defaults to { valid: false, errors: [{ code: CRYPTO_DEFERRED }] } unless { acceptDeferred: true } is passed; that opt-in is the safety mechanism preventing "shape valid means trusted" by accident.',
  },
);

export type SignatureEnvelope = Static<typeof SignatureEnvelopeSchema>;
