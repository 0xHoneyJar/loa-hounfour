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
import { Type, type Static } from '@sinclair/typebox';
import { ReceiptDetailLevelSchema } from './receipt-detail-level.js';
import { SignatureEnvelopeSchema } from './signature-envelope.js';

export const RecallReceiptSchema = Type.Object(
  {
    receipt_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this receipt (UUID v4).',
    }),
    pack_hash: Type.String({
      pattern: '^sha256:[0-9a-f]{64}$',
      description:
        'Reference-by-value to RecallPack.pack_hash. Recursive content NOT included in receipt_hash — the receipt commits to the pack via this hash literal.',
    }),
    detail_level: ReceiptDetailLevelSchema,
    signature_envelope: SignatureEnvelopeSchema,
    receipt_hash: Type.String({
      pattern: '^sha256:[0-9a-f]{64}$',
      description:
        'SHA-256 hex digest (lowercase) of safeCanonicalize(receipt-minus-receipt_hash). NFC + RFC 8785 + 100KB cap per the hashing-spec freeze.',
    }),
    signed_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the receipt was signed.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this receipt was authored against.',
    }),
  },
  {
    $id: 'RecallReceipt',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'Crypto-bearing signed acknowledgment for a RecallPack. validate() defaults to { valid: false, errors: [CRYPTO_DEFERRED] } unless { acceptDeferred: true } is passed; consumer must verify the wrapped signature_envelope and reconcile pack_hash + receipt_hash before treating the receipt as authoritative.',
  },
);

export type RecallReceipt = Static<typeof RecallReceiptSchema>;
