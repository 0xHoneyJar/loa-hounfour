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
 * if (r.valid && r.unverified_obligations.every(verifyDownstream)) { authorize(); }
 * ```
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
import { type Static } from '@sinclair/typebox';
export declare const SignatureEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_id: import("@sinclair/typebox").TString;
    signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
    key_ref: import("@sinclair/typebox").TString;
    signed_payload_hash: import("@sinclair/typebox").TString;
    signature_value: import("@sinclair/typebox").TString;
    signed_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type SignatureEnvelope = Static<typeof SignatureEnvelopeSchema>;
//# sourceMappingURL=signature-envelope.d.ts.map