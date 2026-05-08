/**
 * PanelVerdict — deliberation output.
 *
 * Bucket + per-juror verdicts + Ed25519-signed envelope. The bucket↔verdict
 * pairing, juror-count bounds, and asymmetric-blocker rule live in
 * `constraints/PanelVerdict.constraints.json`. Signature *shape* is declared
 * by the schema; cryptographic verification is consumer-side per NF-1
 * (library/runtime boundary).
 *
 * `signing_context` (audience/scope/contract_version) is bound under the
 * Ed25519 signature so consumers can reject cross-context replay.
 *
 * @see SDD section 3.3.2 — Required fields, inline JurorVerdictSchema, signing_context
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A2)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';
import { DelegationVoteSchema } from './delegation-outcome.js';
import { SigningContextSchema } from './signing-context.js';

/**
 * Inline juror verdict per the OQ2 Option c resolution: reuse the existing
 * `DelegationVoteSchema` for the vote payload, and wrap with deliberation-
 * specific fields (`score`, `voted_at`) here. This keeps existing
 * DelegationVote consumers untouched.
 */
export const JurorVerdictSchema = Type.Object(
  {
    juror: AgentIdentitySchema,
    vote: DelegationVoteSchema,
    score: Type.Integer({
      minimum: 0,
      maximum: 1000,
      description: 'Juror-assigned score on the deliberation rubric (0-1000).',
    }),
    voted_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the juror submitted their verdict.',
    }),
  },
  {
    $id: 'JurorVerdict',
    additionalProperties: false,
    description: 'Per-juror verdict wrapping the reused DelegationVoteSchema with deliberation score and timestamp.',
  },
);
export type JurorVerdict = Static<typeof JurorVerdictSchema>;

/**
 * Two-condition veto signal. The `validated` flag is the resolved
 * outcome; the cross-field rule PV-3 enforces consistency between
 * `validated` and the underlying agreement / reviewer-score thresholds.
 */
export const AsymmetricBlockerSignalSchema = Type.Object(
  {
    cross_validation: Type.Object(
      {
        validated: Type.Boolean({
          description: 'Resolved blocker decision (true = blocker confirmed).',
        }),
        cross_model_agreement: Type.Number({
          minimum: 0,
          maximum: 1,
          description: 'Inter-model agreement score; >= 0.7 satisfies the blocker condition.',
        }),
        same_model_reviewer_score: Type.Integer({
          minimum: 0,
          maximum: 1000,
          description: 'Same-model reviewer score; >= 600 satisfies the blocker condition.',
        }),
      },
      { additionalProperties: false },
    ),
  },
  {
    $id: 'AsymmetricBlockerSignal',
    additionalProperties: false,
    description: 'Two-condition veto: cross-model agreement >= 0.7 OR same-model reviewer score >= 600.',
  },
);
export type AsymmetricBlockerSignal = Static<typeof AsymmetricBlockerSignalSchema>;

export const PanelVerdictSchema = Type.Object(
  {
    verdict_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 identifying this verdict (also serves as protocol-level nonce).',
    }),
    artifact_id: Type.String({
      format: 'uuid',
      description: 'FK to PanelDecisionArtifact.artifact_id (cross-record existence is consumer-enforced per NF-1).',
    }),
    bucket: Type.Union(
      [
        Type.Literal('HIGH_CONSENSUS'),
        Type.Literal('DISPUTED'),
        Type.Literal('LOW_VALUE'),
        Type.Literal('BLOCKER'),
      ],
      { description: 'Outcome bucket; pairs with `verdict` per the bucket↔verdict table (PV-1).' },
    ),
    verdict: Type.Union(
      [
        Type.Literal('proceed'),
        Type.Literal('defer'),
        Type.Literal('reject'),
        Type.Literal('low_value_pass'),
      ],
      { description: 'Resolved verdict; allowed values depend on bucket per PV-1.' },
    ),
    juror_verdicts: Type.Array(JurorVerdictSchema, {
      minItems: 4,
      maxItems: 16,
      description: 'Per-juror verdicts; redundant minItems/maxItems also enforced by PV-2.',
    }),
    asymmetric_blocker_signal: Type.Optional(AsymmetricBlockerSignalSchema),
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
    signing_algorithm: Type.Literal('ed25519', {
      description: 'Pinned to ed25519 for v8.4.0; future versions MAY widen this union additively.',
    }),
    signed_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the verdict was signed.',
    }),
    resolved_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the panel resolved.',
    }),
    signing_context: SigningContextSchema,
  },
  {
    $id: 'PanelVerdict',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Deliberation output: bucket + per-juror verdicts + Ed25519-signed envelope. Cross-field rules in constraints/PanelVerdict.constraints.json.',
  },
);
export type PanelVerdict = Static<typeof PanelVerdictSchema>;
