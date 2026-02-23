/**
 * Governance Proposal — collective voice for protocol parameter changes.
 *
 * Implements the formal proposal lifecycle: propose -> vote -> ratify/reject.
 * Ensures every protocol parameter change has an audit trail with votes.
 *
 * @see SDD §2.6 — GovernanceProposal Schema
 * @since v7.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ProposalStatus vocabulary
export const ProposalStatusSchema = Type.Union(
  [
    Type.Literal('proposed'),
    Type.Literal('voting'),
    Type.Literal('ratified'),
    Type.Literal('rejected'),
    Type.Literal('withdrawn'),
  ],
  {
    $id: 'ProposalStatus',
    description: 'Lifecycle status of a governance proposal.',
  },
);
export type ProposalStatus = Static<typeof ProposalStatusSchema>;

export const PROPOSAL_STATUS_TRANSITIONS: Record<ProposalStatus, readonly ProposalStatus[]> = {
  proposed: ['voting', 'withdrawn'],
  voting: ['ratified', 'rejected', 'withdrawn'],
  ratified: [],
  rejected: [],
  withdrawn: [],
} as const;

// ProposedChange
export const ProposedChangeSchema = Type.Object(
  {
    change_type: Type.Union([
      Type.Literal('parameter_update'),
      Type.Literal('constraint_addition'),
      Type.Literal('constraint_removal'),
      Type.Literal('policy_change'),
    ], { description: 'Category of proposed change.' }),
    target: Type.String({ minLength: 1, description: 'What is being changed (field path or constraint ID).' }),
    current_value: Type.Unknown({ description: 'Current value of the target.' }),
    proposed_value: Type.Unknown({ description: 'Proposed new value.' }),
    justification: Type.String({ minLength: 1, description: 'Rationale for this change.' }),
  },
  {
    $id: 'ProposedChange',
    additionalProperties: false,
    description: 'A single proposed change within a governance proposal.',
  },
);
export type ProposedChange = Static<typeof ProposedChangeSchema>;

// GovernanceVote
export const GovernanceVoteSchema = Type.Object(
  {
    voter_id: Type.String({ minLength: 1, description: 'Agent casting the vote.' }),
    vote: Type.Union([
      Type.Literal('approve'),
      Type.Literal('reject'),
      Type.Literal('abstain'),
    ], { description: 'The vote choice.' }),
    weight: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Voting weight (governance_weight of the agent).',
    }),
    reasoning: Type.Optional(Type.String({ description: 'Explanation for the vote.' })),
  },
  {
    $id: 'GovernanceVote',
    additionalProperties: false,
    description: 'A vote cast on a governance proposal.',
  },
);
export type GovernanceVote = Static<typeof GovernanceVoteSchema>;

// VotingRecord
export const VotingRecordSchema = Type.Object(
  {
    quorum_required: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Minimum weighted participation required for valid vote.',
    }),
    votes_cast: Type.Array(GovernanceVoteSchema, {
      description: 'Votes cast so far.',
    }),
    voting_opened_at: Type.String({ format: 'date-time' }),
    voting_closed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
      description: 'When voting closed, or null if still open.',
    }),
  },
  {
    $id: 'VotingRecord',
    additionalProperties: false,
    description: 'Record of voting on a governance proposal.',
  },
);
export type VotingRecord = Static<typeof VotingRecordSchema>;

// GovernanceProposal
export const GovernanceProposalSchema = Type.Object(
  {
    proposal_id: Type.String({ format: 'uuid' }),
    registry_id: Type.String({ format: 'uuid' }),
    proposer_id: Type.String({ minLength: 1, description: 'Agent who created the proposal.' }),
    title: Type.String({ minLength: 1, description: 'Short title for the proposal.' }),
    description: Type.String({ minLength: 1, description: 'Detailed description of the proposal.' }),
    changes: Type.Array(ProposedChangeSchema, {
      minItems: 1,
      description: 'Proposed changes (at least one required).',
    }),
    status: ProposalStatusSchema,
    voting: VotingRecordSchema,
    ratified_at: Type.Optional(Type.String({ format: 'date-time' })),
    execution_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'Reference to ProposalExecution, set after ratification.',
    })),
    collection_id: Type.Optional(Type.String({
      minLength: 1,
      description: 'Collection this proposal targets.',
    })),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'GovernanceProposal',
    additionalProperties: false,
    description: 'A formal governance proposal with voting lifecycle.',
  },
);
export type GovernanceProposal = Static<typeof GovernanceProposalSchema>;
