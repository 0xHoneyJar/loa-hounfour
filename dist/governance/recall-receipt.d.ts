/**
 * `RecallReceipt` — signed acknowledgment for a `RecallPack`.
 *
 * **Crypto-bearing**: `validate(RecallReceiptSchema, payload)` defaults
 * to `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` per the
 * safe-by-default G1 policy. Consumers MUST opt in via
 * `{ acceptDeferred: true }` to acknowledge that the library has NOT
 * verified the wrapped `signature_envelope` and that downstream
 * verification is required.
 *
 * **Hash domain**: `receipt_hash` is the SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON of the receipt minus the `receipt_hash`
 * field itself. The `pack_hash` is carried by reference (NOT recursed
 * into when computing `receipt_hash`) — the receipt commits to the
 * pack via the hash, not via the pack's full body.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @see SignatureEnvelopeSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const RecallReceiptSchema: import("@sinclair/typebox").TObject<{
    receipt_id: import("@sinclair/typebox").TString;
    pack_hash: import("@sinclair/typebox").TString;
    detail_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minimal">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"debug">]>;
    signature_envelope: import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    receipt_hash: import("@sinclair/typebox").TString;
    signed_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RecallReceipt = Static<typeof RecallReceiptSchema>;
//# sourceMappingURL=recall-receipt.d.ts.map