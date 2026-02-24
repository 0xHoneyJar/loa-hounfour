/**
 * Delegation Outcome — results of delegated governance decisions.
 *
 * Captures the outcome of a delegation tree node's decision process,
 * including votes, consensus measurement, dissent records, and escalation.
 *
 * @see SDD §2.3 — DelegationOutcome Schema
 * @since v7.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Outcome Type
// ---------------------------------------------------------------------------

/** @governance protocol-fixed */
export const OutcomeTypeSchema = Type.Union(
  [
    Type.Literal('unanimous'),
    Type.Literal('majority'),
    Type.Literal('deadlock'),
    Type.Literal('escalation'),
  ],
  {
    $id: 'OutcomeType',
    description: 'Classification of a delegation outcome.',
  },
);
export type OutcomeType = Static<typeof OutcomeTypeSchema>;

// ---------------------------------------------------------------------------
// Vote Choice
// ---------------------------------------------------------------------------

/** @governance protocol-fixed */
export const VoteChoiceSchema = Type.Union(
  [
    Type.Literal('agree'),
    Type.Literal('disagree'),
    Type.Literal('abstain'),
  ],
  {
    $id: 'VoteChoice',
    description: 'A voter\'s choice in a delegation decision.',
  },
);
export type VoteChoice = Static<typeof VoteChoiceSchema>;

// ---------------------------------------------------------------------------
// Delegation Vote
// ---------------------------------------------------------------------------

export const DelegationVoteSchema = Type.Object(
  {
    voter_id: Type.String({
      minLength: 1,
      description: 'Unique identifier of the voting agent.',
    }),
    vote: VoteChoiceSchema,
    result: Type.Unknown({
      description: 'The result or proposal this vote pertains to.',
    }),
    confidence: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Confidence level of the vote (0 = no confidence, 1 = full confidence).',
    }),
    reasoning: Type.Optional(Type.String({
      description: 'Optional explanation of the vote rationale.',
    })),
  },
  {
    $id: 'DelegationVote',
    additionalProperties: false,
    description: 'A single vote cast in a delegation decision process.',
  },
);
export type DelegationVote = Static<typeof DelegationVoteSchema>;

// ---------------------------------------------------------------------------
// Dissent Type & Severity
// ---------------------------------------------------------------------------

export const DissentTypeSchema = Type.Union(
  [
    Type.Literal('minority_report'),
    Type.Literal('abstention'),
    Type.Literal('timeout'),
  ],
  {
    $id: 'DissentType',
    description: 'Classification of dissent in a delegation outcome.',
  },
);
export type DissentType = Static<typeof DissentTypeSchema>;

export const DissentSeveritySchema = Type.Union(
  [
    Type.Literal('informational'),
    Type.Literal('warning'),
    Type.Literal('blocking'),
  ],
  {
    $id: 'DissentSeverity',
    description: 'Severity level of a dissent record.',
  },
);
export type DissentSeverity = Static<typeof DissentSeveritySchema>;

// ---------------------------------------------------------------------------
// Dissent Record
// ---------------------------------------------------------------------------

export const DissentRecordSchema = Type.Object(
  {
    dissenter_id: Type.String({
      minLength: 1,
      description: 'Unique identifier of the dissenting agent.',
    }),
    dissent_type: DissentTypeSchema,
    proposed_alternative: Type.Unknown({
      description: 'Alternative result proposed by the dissenter.',
    }),
    reasoning: Type.String({
      minLength: 1,
      description: 'Non-empty explanation of the dissent rationale.',
    }),
    severity: DissentSeveritySchema,
    acknowledged: Type.Boolean({
      description: 'Whether the dissent has been acknowledged by the decision maker.',
    }),
    acknowledged_at: Type.Optional(Type.String({
      format: 'date-time',
      description: 'When the dissent was acknowledged.',
    })),
    acknowledged_by: Type.Optional(Type.String({
      minLength: 1,
      description: 'ID of the agent who acknowledged the dissent.',
    })),
    acknowledgment_response: Type.Optional(Type.String({
      minLength: 1,
      description: 'Response or explanation provided when acknowledging the dissent.',
    })),
  },
  {
    $id: 'DissentRecord',
    additionalProperties: false,
    description: 'A record of dissent in a delegation outcome.',
  },
);
export type DissentRecord = Static<typeof DissentRecordSchema>;

// ---------------------------------------------------------------------------
// Delegation Outcome
// ---------------------------------------------------------------------------

export const DelegationOutcomeSchema = Type.Object(
  {
    outcome_id: Type.String({ format: 'uuid' }),
    tree_node_id: Type.String({
      minLength: 1,
      description: 'ID of the delegation tree node this outcome applies to.',
    }),
    outcome_type: OutcomeTypeSchema,
    result: Type.Union([Type.Unknown(), Type.Null()], {
      description: 'The decided result, or null if deadlocked.',
    }),
    votes: Type.Array(DelegationVoteSchema, {
      minItems: 1,
      description: 'Votes cast in this decision (at least one required).',
    }),
    consensus_achieved: Type.Boolean({
      description: 'Whether the consensus threshold was met.',
    }),
    consensus_threshold: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Required proportion for consensus (0-1).',
    }),
    dissent_records: Type.Array(DissentRecordSchema, {
      description: 'Records of dissent from the decision.',
    }),
    escalated_to: Type.Optional(Type.String({
      description: 'ID of the agent or node the decision was escalated to.',
    })),
    escalation_reason: Type.Optional(Type.String({
      description: 'Reason for escalation.',
    })),
    resolved_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'DelegationOutcome',
    additionalProperties: false,
    description: 'The outcome of a delegated governance decision with vote and dissent tracking.',
  },
);
export type DelegationOutcome = Static<typeof DelegationOutcomeSchema>;
