/**
 * Tests for GovernanceProposal schema — collective voice for protocol parameter changes.
 *
 * @see SDD §2.6 — GovernanceProposal Schema
 * @since v7.0.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  ProposalStatusSchema,
  PROPOSAL_STATUS_TRANSITIONS,
  ProposedChangeSchema,
  GovernanceVoteSchema,
  VotingRecordSchema,
  GovernanceProposalSchema,
  type ProposalStatus,
} from '../../src/governance/governance-proposal.js';

// ---------------------------------------------------------------------------
// ProposalStatus
// ---------------------------------------------------------------------------

describe('ProposalStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses: ProposalStatus[] = ['proposed', 'voting', 'ratified', 'rejected', 'withdrawn'];
    for (const s of statuses) {
      expect(Value.Check(ProposalStatusSchema, s), `status: ${s}`).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(Value.Check(ProposalStatusSchema, 'unknown')).toBe(false);
    expect(Value.Check(ProposalStatusSchema, 'approved')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PROPOSAL_STATUS_TRANSITIONS
// ---------------------------------------------------------------------------

describe('PROPOSAL_STATUS_TRANSITIONS', () => {
  it('terminal states have no outbound transitions', () => {
    expect(PROPOSAL_STATUS_TRANSITIONS.ratified).toEqual([]);
    expect(PROPOSAL_STATUS_TRANSITIONS.rejected).toEqual([]);
    expect(PROPOSAL_STATUS_TRANSITIONS.withdrawn).toEqual([]);
  });

  it('proposed can transition to voting or withdrawn', () => {
    expect(PROPOSAL_STATUS_TRANSITIONS.proposed).toContain('voting');
    expect(PROPOSAL_STATUS_TRANSITIONS.proposed).toContain('withdrawn');
  });

  it('voting can reach ratified, rejected, or withdrawn', () => {
    expect(PROPOSAL_STATUS_TRANSITIONS.voting).toContain('ratified');
    expect(PROPOSAL_STATUS_TRANSITIONS.voting).toContain('rejected');
    expect(PROPOSAL_STATUS_TRANSITIONS.voting).toContain('withdrawn');
  });

  it('every target state is a valid ProposalStatus', () => {
    const allStatuses = Object.keys(PROPOSAL_STATUS_TRANSITIONS);
    for (const [source, targets] of Object.entries(PROPOSAL_STATUS_TRANSITIONS)) {
      for (const t of targets) {
        expect(allStatuses, `${source} → ${t}`).toContain(t);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// ProposedChange
// ---------------------------------------------------------------------------

describe('ProposedChangeSchema', () => {
  const validChange = {
    change_type: 'parameter_update',
    target: 'MonetaryPolicy.conservation_ceiling',
    current_value: '100000000000',
    proposed_value: '150000000000',
    justification: 'Registry growth requires higher ceiling.',
  };

  it('accepts valid change', () => {
    expect(Value.Check(ProposedChangeSchema, validChange)).toBe(true);
  });

  it('accepts constraint_addition type', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      change_type: 'constraint_addition',
    })).toBe(true);
  });

  it('accepts constraint_removal type', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      change_type: 'constraint_removal',
    })).toBe(true);
  });

  it('accepts policy_change type', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      change_type: 'policy_change',
    })).toBe(true);
  });

  it('rejects invalid change_type', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      change_type: 'unknown',
    })).toBe(false);
  });

  it('rejects empty target', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      target: '',
    })).toBe(false);
  });

  it('rejects empty justification', () => {
    expect(Value.Check(ProposedChangeSchema, {
      ...validChange,
      justification: '',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GovernanceVote
// ---------------------------------------------------------------------------

describe('GovernanceVoteSchema', () => {
  it('accepts valid vote', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent-alpha',
      vote: 'approve',
      weight: 0.5,
    })).toBe(true);
  });

  it('accepts vote with reasoning', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent-beta',
      vote: 'reject',
      weight: 0.3,
      reasoning: 'Risk too high',
    })).toBe(true);
  });

  it('accepts abstain vote', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent-gamma',
      vote: 'abstain',
      weight: 0.2,
    })).toBe(true);
  });

  it('rejects invalid vote choice', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent',
      vote: 'yes',
      weight: 0.5,
    })).toBe(false);
  });

  it('rejects weight > 1', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent',
      vote: 'approve',
      weight: 1.5,
    })).toBe(false);
  });

  it('rejects weight < 0', () => {
    expect(Value.Check(GovernanceVoteSchema, {
      voter_id: 'agent',
      vote: 'approve',
      weight: -0.1,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VotingRecord
// ---------------------------------------------------------------------------

describe('VotingRecordSchema', () => {
  it('accepts valid record with votes', () => {
    expect(Value.Check(VotingRecordSchema, {
      quorum_required: 0.5,
      votes_cast: [{
        voter_id: 'agent-alpha',
        vote: 'approve',
        weight: 0.5,
      }],
      voting_opened_at: '2026-01-10T00:00:00Z',
      voting_closed_at: '2026-01-15T00:00:00Z',
    })).toBe(true);
  });

  it('accepts null voting_closed_at (voting still open)', () => {
    expect(Value.Check(VotingRecordSchema, {
      quorum_required: 0.5,
      votes_cast: [],
      voting_opened_at: '2026-01-10T00:00:00Z',
      voting_closed_at: null,
    })).toBe(true);
  });

  it('rejects quorum_required > 1', () => {
    expect(Value.Check(VotingRecordSchema, {
      quorum_required: 1.5,
      votes_cast: [],
      voting_opened_at: '2026-01-10T00:00:00Z',
      voting_closed_at: null,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GovernanceProposal (full schema)
// ---------------------------------------------------------------------------

describe('GovernanceProposalSchema', () => {
  const validProposal = {
    proposal_id: '00000000-0000-0000-0000-000000000401',
    registry_id: '00000000-0000-0000-0000-000000000020',
    proposer_id: 'agent-alpha',
    title: 'Increase conservation ceiling',
    description: 'Proposal to raise conservation ceiling from 100B to 150B micro-units.',
    changes: [{
      change_type: 'parameter_update',
      target: 'MonetaryPolicy.conservation_ceiling',
      current_value: '100000000000',
      proposed_value: '150000000000',
      justification: 'Registry growth requires higher ceiling.',
    }],
    status: 'ratified',
    voting: {
      quorum_required: 0.5,
      votes_cast: [
        { voter_id: 'agent-alpha', vote: 'approve', weight: 0.3 },
        { voter_id: 'agent-beta', vote: 'approve', weight: 0.4 },
      ],
      voting_opened_at: '2026-01-10T00:00:00Z',
      voting_closed_at: '2026-01-15T00:00:00Z',
    },
    ratified_at: '2026-01-15T00:00:00Z',
    contract_version: '7.0.0',
  };

  it('accepts valid proposal', () => {
    expect(Value.Check(GovernanceProposalSchema, validProposal)).toBe(true);
  });

  it('rejects proposal with empty changes', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      changes: [],
    })).toBe(false);
  });

  it('rejects non-uuid proposal_id', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      proposal_id: 'not-uuid',
    })).toBe(false);
  });

  it('rejects empty proposer_id', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      proposer_id: '',
    })).toBe(false);
  });

  it('rejects empty title', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      title: '',
    })).toBe(false);
  });

  it('accepts proposal without ratified_at (optional)', () => {
    const { ratified_at, ...withoutRatified } = validProposal;
    expect(Value.Check(GovernanceProposalSchema, {
      ...withoutRatified,
      status: 'proposed',
    })).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      status: 'approved',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(GovernanceProposalSchema, {
      ...validProposal,
      extra: true,
    })).toBe(false);
  });
});
