/**
 * CrossScoreReport — signed pairwise cross-scoring attestation.
 *
 * Each pairwise entry carries three score dimensions (`output_score`,
 * `reasoning_score`, `grounding_score`), each on the canonical 0–1000
 * scale. The single cross-field rule (CSR-1, no-self-scoring) is in
 * `constraints/CrossScoreReport.constraints.json`. Signature shape is
 * declared by the schema; cryptographic verification is consumer-side
 * per NF-1.
 *
 * @see SDD section 3.3.4 — Required fields and constraint
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A4, cut-line-eligible to v8.5.0)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';
import { SigningContextSchema } from './signing-context.js';

const SCORE_FIELD = Type.Integer({
  minimum: 0,
  maximum: 1000,
  description: 'Score on the canonical 0-1000 deliberation scale.',
});

export const PairwiseScoreSchema = Type.Object(
  {
    scorer: AgentIdentitySchema,
    scored: AgentIdentitySchema,
    output_score: SCORE_FIELD,
    reasoning_score: SCORE_FIELD,
    grounding_score: SCORE_FIELD,
  },
  {
    $id: 'PairwiseScore',
    additionalProperties: false,
    description: 'A single scorer/scored pair with three dimensional scores. Self-scoring rejected by CSR-1.',
  },
);
export type PairwiseScore = Static<typeof PairwiseScoreSchema>;

export const CrossScoreReportSchema = Type.Object(
  {
    report_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 identifying this report (also serves as protocol-level nonce).',
    }),
    pairwise_scores: Type.Array(PairwiseScoreSchema, {
      description: 'Per-pair score entries; cross-field no-self-scoring rule in constraint file.',
    }),
    mode: Type.Union(
      [
        Type.Literal('shadow'),
        Type.Literal('enforced'),
      ],
      { description: 'Whether scores influence routing (enforced) or are recorded only (shadow).' },
    ),
    signature: Type.String({
      pattern: '^ed25519:[A-Za-z0-9_-]{86}$',
      description:
        'Ed25519 signature over the canonical JSON. '
        + 'Unpadded base64url (RFC 4648 §5): exactly 86 characters, no `=` padding. '
        + 'FR-A5 (v8.6.0) tightened from `{86,88}` after consumer-corpus audit '
        + 'returned zero hits for padded forms; uniform with v8.5.0 SignatureEnvelope. '
        + 'Verification is consumer-side per NF-1.',
    }),
    signed_by: Type.String({
      pattern: '^ed25519-pub:[A-Za-z0-9_-]{43,44}$',
      description: 'Ed25519 public key identifier of the signer.',
    }),
    signing_key_id: Type.String({
      minLength: 1,
      description: 'Stable key identifier for rotation tracking on the consumer side.',
    }),
    signing_algorithm: Type.Literal('ed25519'),
    signed_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the report was signed.',
    }),
    signing_context: SigningContextSchema,
    resolved_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the cross-scoring resolved.',
    }),
  },
  {
    $id: 'CrossScoreReport',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Signed pairwise cross-scoring attestation. Cross-field rule (no-self-scoring) in constraints/CrossScoreReport.constraints.json.',
  },
);
export type CrossScoreReport = Static<typeof CrossScoreReportSchema>;
