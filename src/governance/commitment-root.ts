/**
 * `CommitmentRoot` — content-addressed onchain anchor primitive.
 *
 * **Crypto-bearing**: `subject_hash` is content-addressed and any
 * consumer that downstream-treats `validate(CommitmentRootSchema,
 * payload).valid === true` as integrity-verified would silently
 * trust an unverified commitment. Hounfour therefore defaults to
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` per the
 * G1 safe-by-default policy. Consumers MUST opt in via
 * `{ acceptDeferred: true }` to acknowledge that the library has
 * NOT recomputed the `subject_hash` and that downstream
 * reconciliation is required.
 *
 * **Hash domain**: `subject_hash` is the SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON of the committed artifact (e.g., the
 * RecallReceipt body for a `recall_receipt` commitment). Computed
 * via `safeCanonicalize` so the 100KB normative payload cap (per
 * the v8.5.0 hashing-spec freeze) applies.
 *
 * **Boundary discipline (ADR-010)**: Hounfour ships *shape*. The
 * `computeCommitmentRoot` helper that produces the hash and the
 * on-chain adapters that anchor the record stay consumer-side
 * (Issue #70:143-145; permanent out-of-scope per Phase 6 lock).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @see CommitmentTypeSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';
import { CommitmentTypeSchema } from './commitment-type.js';

export const CommitmentRootSchema = Type.Object(
  {
    commitment_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this commitment (UUID v4).',
    }),
    commitment_type: CommitmentTypeSchema,
    subject_hash: Type.String({
      pattern: '^sha256:[0-9a-f]{64}$',
      description:
        'SHA-256 hex digest (lowercase) of safeCanonicalize(committed-artifact). NFC + RFC 8785 + 100KB cap per the hashing-spec freeze. Library does NOT verify; consumer-side reconciliation is required.',
    }),
    anchor_chain_id: Type.Optional(
      Type.String({
        minLength: 1,
        description:
          'Optional onchain identifier for the chain where the commitment was anchored (e.g., a CAIP-2 chain id). Hounfour does not parse the value.',
      }),
    ),
    anchor_tx_hash: Type.Optional(
      Type.String({
        minLength: 1,
        description:
          'Optional onchain transaction hash for the anchor. Hounfour does not parse the value.',
      }),
    ),
    created_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the commitment was minted.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this commitment was authored against.',
    }),
  },
  {
    $id: 'CommitmentRoot',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'Content-addressed onchain anchor primitive. Crypto-bearing — validate() defaults to { valid: false, errors: [CRYPTO_DEFERRED] } unless { acceptDeferred: true } is passed. Per ADR-010 hounfour ships shape; computeCommitmentRoot + onchain anchor adapters stay consumer-side.',
  },
);

export type CommitmentRoot = Static<typeof CommitmentRootSchema>;
