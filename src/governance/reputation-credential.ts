/**
 * Portable reputation credential for cross-collection trust.
 *
 * Issued by a source collection's governance, attesting to a personality's
 * reputation at a point in time. Destination collections can accept or
 * reject credentials — if accepted, the credential contributes to the
 * Bayesian prior (informed start instead of cold start).
 *
 * Architectural parallel: TLS Certificate Authority trust model.
 * A CA with strong reputation issues more trustworthy credentials.
 *
 * @see Bridgebuilder C1 — cross-collection reputation portability
 * @see Bridgebuilder Spec IV — the reputation portable credential
 * @see W3C Verifiable Credentials — standard for signed portable claims
 * @since v7.3.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from './reputation-aggregate.js';

export const ReputationCredentialSchema = Type.Object({
  credential_id: Type.String({ minLength: 1 }),
  personality_id: Type.String({ minLength: 1 }),

  // Source provenance
  source_collection_id: Type.String({ minLength: 1 }),
  source_pool_id: Type.String({ minLength: 1 }),
  source_state: ReputationStateSchema,
  source_blended_score: Type.Number({ minimum: 0, maximum: 1 }),
  source_sample_count: Type.Integer({ minimum: 0 }),
  source_collection_score: Type.Number({
    minimum: 0, maximum: 1,
    description: 'Collection score of the issuing collection at issuance time. '
      + 'Higher source collection scores indicate more trustworthy credentials '
      + '— analogous to CA reputation in the TLS trust model.',
  }),

  // Issuance metadata
  issued_at: Type.String({ format: 'date-time' }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' })),
  attestation_hash: Type.Optional(Type.String({
    pattern: '^[a-f0-9]{64}$',
    description: 'SHA-256 hash of the underlying AggregateSnapshot. '
      + 'Enables verification without the full snapshot.',
  })),

  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ReputationCredential',
  additionalProperties: false,
});

export type ReputationCredential = Static<typeof ReputationCredentialSchema>;
