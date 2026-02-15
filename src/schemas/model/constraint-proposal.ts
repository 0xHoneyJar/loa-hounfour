import { Type, type Static } from '@sinclair/typebox';

/**
 * Schema for agent-authored constraint proposals.
 *
 * Agents propose new constraints as structured data that goes through
 * multi-model adversarial review (Flatline Protocol) before acceptance.
 * The proposal captures the wire format; the review pipeline is a runtime concern.
 */
export const ConstraintProposalSchema = Type.Object(
  {
    proposal_id: Type.String({ format: 'uuid' }),
    agent_id: Type.String({ minLength: 1 }),
    target_schema_id: Type.String({ minLength: 1 }),
    proposed_constraints: Type.Array(
      Type.Object({
        id: Type.String({ minLength: 1, pattern: '^[a-z][a-z0-9-]*$' }),
        expression: Type.String({ minLength: 1 }),
        severity: Type.Union([Type.Literal('error'), Type.Literal('warning')]),
        message: Type.String({ minLength: 1 }),
        fields: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
      }),
      { minItems: 1 }
    ),
    rationale: Type.String({ minLength: 1 }),
    expression_version: Type.String({ pattern: '^\\d+\\.\\d+$' }),
    /** Maximum expression grammar version this constraint is valid for. When the grammar evolves beyond this version, the constraint should be re-evaluated or retired. */
    sunset_version: Type.Optional(Type.String({ pattern: '^\\d+\\.\\d+$' })),
    review_status: Type.Optional(
      Type.Union([
        Type.Literal('proposed'),
        Type.Literal('under_review'),
        Type.Literal('accepted'),
        Type.Literal('rejected'),
      ])
    ),
    review_scores: Type.Optional(
      Type.Array(
        Type.Object({
          reviewer_model: Type.String({ minLength: 1 }),
          score: Type.Integer({ minimum: 0, maximum: 1000 }),
          rationale: Type.Optional(Type.String()),
        })
      )
    ),
    consensus_category: Type.Optional(
      Type.Union([
        Type.Literal('HIGH_CONSENSUS'),
        Type.Literal('DISPUTED'),
        Type.Literal('LOW_VALUE'),
        Type.Literal('BLOCKER'),
      ])
    ),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ConstraintProposal',
    $comment: 'Agent-authored constraint proposals for Flatline Protocol review. See RFC #31: https://github.com/0xHoneyJar/loa-finn/issues/31',
    additionalProperties: false,
    'x-cross-field-validated': true,
  }
);

export type ConstraintProposal = Static<typeof ConstraintProposalSchema>;
