/**
 * Outcome record produced by evaluating a signer's competence against
 * an action and a `SignerCompetenceRule`.
 *
 * Hounfour ships the *shape* of the result; the consumer's policy
 * engine fills it in. `outcome` is a `PolicyDecisionOutcome` so the
 * result aligns with the broader `AccessDecision` vocabulary that the
 * v8.5.0 EXTEND threads through the economic boundary.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { Type, type Static } from '@sinclair/typebox';
import { PolicyDecisionOutcomeSchema } from './policy-decision-outcome.js';

export const SignerCompetenceResultSchema = Type.Object(
  {
    result_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this result (UUID v4).',
    }),
    signer_id: Type.String({
      pattern: '^[a-z][a-z0-9_-]{2,63}$',
      description: 'Foreign key to SignerEntry.signer_id within the relevant Keyring.',
    }),
    rule_id_matched: Type.Optional(
      Type.String({
        format: 'uuid',
        description:
          'Foreign key to SignerCompetenceRule.rule_id when a rule matched. Absent for outcomes that did not engage the rule set (e.g., dev_signature short-circuit).',
      }),
    ),
    outcome: PolicyDecisionOutcomeSchema,
    evaluated_at: Type.String({
      format: 'date-time',
      description: 'When the competence evaluation completed.',
    }),
  },
  {
    $id: 'SignerCompetenceResult',
    additionalProperties: false,
    description:
      'Outcome record from evaluating a SignerEntry against an action via SignerCompetenceRule. Threaded into AccessDecision.signer_competence_result via the v8.5.0 EXTEND.',
  },
);

export type SignerCompetenceResult = Static<typeof SignerCompetenceResultSchema>;
