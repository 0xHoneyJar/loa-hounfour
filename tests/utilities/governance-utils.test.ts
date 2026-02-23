/**
 * Tests for governance utility functions.
 *
 * @see DR-S10 — Governance utilities for consumers
 * @since v7.7.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import {
  isProposalActionable,
  computeVotingResult,
  isConstraintEnactable,
  computeGovernanceWeight,
} from '../../src/utilities/governance-utils.js';
import type { GovernanceProposal, VotingRecord } from '../../src/governance/governance-proposal.js';
import type { ConstraintLifecycleEvent } from '../../src/governance/constraint-lifecycle.js';
import type { ReputationAggregate } from '../../src/governance/reputation-aggregate.js';

// ---------------------------------------------------------------------------
// isProposalActionable
// ---------------------------------------------------------------------------

describe('isProposalActionable', () => {
  const baseProposal = {
    proposal_id: '550e8400-e29b-41d4-a716-446655440000',
    registry_id: '550e8400-e29b-41d4-a716-446655440001',
    proposer_id: 'agent-alpha',
    title: 'Test Proposal',
    description: 'A test governance proposal.',
    changes: [{ change_type: 'parameter_update', target: 'pseudo_count', proposed_value: '5', rationale: 'Test' }],
    voting: {
      quorum_required: 0.5,
      votes_cast: [],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: null,
    },
    contract_version: '7.7.0',
  } as unknown as GovernanceProposal;

  it('returns true for proposed status', () => {
    expect(isProposalActionable({ ...baseProposal, status: 'proposed' } as GovernanceProposal)).toBe(true);
  });

  it('returns true for voting status', () => {
    expect(isProposalActionable({ ...baseProposal, status: 'voting' } as GovernanceProposal)).toBe(true);
  });

  it('returns false for ratified status', () => {
    expect(isProposalActionable({ ...baseProposal, status: 'ratified' } as GovernanceProposal)).toBe(false);
  });

  it('returns false for rejected status', () => {
    expect(isProposalActionable({ ...baseProposal, status: 'rejected' } as GovernanceProposal)).toBe(false);
  });

  it('returns false for withdrawn status', () => {
    expect(isProposalActionable({ ...baseProposal, status: 'withdrawn' } as GovernanceProposal)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeVotingResult
// ---------------------------------------------------------------------------

describe('computeVotingResult', () => {
  it('computes passing result with quorum met', () => {
    const record: VotingRecord = {
      quorum_required: 0.5,
      votes_cast: [
        { voter_id: 'a', vote: 'approve', weight: 0.4 },
        { voter_id: 'b', vote: 'approve', weight: 0.3 },
        { voter_id: 'c', vote: 'reject', weight: 0.2 },
      ],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: '2026-02-20T12:00:00Z',
    } as VotingRecord;

    const result = computeVotingResult(record);
    expect(result.passed).toBe(true);
    expect(result.quorum_met).toBe(true);
    expect(result.weighted_approve).toBeCloseTo(0.7);
    expect(result.weighted_reject).toBeCloseTo(0.2);
  });

  it('computes failing result when reject exceeds approve', () => {
    const record: VotingRecord = {
      quorum_required: 0.5,
      votes_cast: [
        { voter_id: 'a', vote: 'reject', weight: 0.6 },
        { voter_id: 'b', vote: 'approve', weight: 0.3 },
      ],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: '2026-02-20T12:00:00Z',
    } as VotingRecord;

    const result = computeVotingResult(record);
    expect(result.passed).toBe(false);
    expect(result.quorum_met).toBe(true);
    expect(result.weighted_approve).toBeCloseTo(0.3);
    expect(result.weighted_reject).toBeCloseTo(0.6);
  });

  it('fails when quorum not met', () => {
    const record: VotingRecord = {
      quorum_required: 0.8,
      votes_cast: [
        { voter_id: 'a', vote: 'approve', weight: 0.3 },
      ],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: null,
    } as VotingRecord;

    const result = computeVotingResult(record);
    expect(result.passed).toBe(false);
    expect(result.quorum_met).toBe(false);
  });

  it('handles abstain votes (count toward quorum, not approve/reject)', () => {
    const record: VotingRecord = {
      quorum_required: 0.5,
      votes_cast: [
        { voter_id: 'a', vote: 'approve', weight: 0.3 },
        { voter_id: 'b', vote: 'abstain', weight: 0.4 },
      ],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: null,
    } as VotingRecord;

    const result = computeVotingResult(record);
    expect(result.quorum_met).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.weighted_approve).toBeCloseTo(0.3);
    expect(result.weighted_reject).toBeCloseTo(0);
  });

  it('handles empty votes', () => {
    const record: VotingRecord = {
      quorum_required: 0.5,
      votes_cast: [],
      voting_opened_at: '2026-02-20T10:00:00Z',
      voting_closed_at: null,
    } as VotingRecord;

    const result = computeVotingResult(record);
    expect(result.passed).toBe(false);
    expect(result.quorum_met).toBe(false);
    expect(result.weighted_approve).toBe(0);
    expect(result.weighted_reject).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isConstraintEnactable
// ---------------------------------------------------------------------------

describe('isConstraintEnactable', () => {
  const makeEvent = (from: string, to: string) => ({
    event_id: '550e8400-e29b-41d4-a716-446655440010',
    constraint_id: 'test-constraint',
    proposal_id: '550e8400-e29b-41d4-a716-446655440011',
    from_status: from,
    to_status: to,
    occurred_at: '2026-02-20T10:00:00Z',
    contract_version: '7.7.0',
  }) as unknown as ConstraintLifecycleEvent;

  it('allows proposed → under_review', () => {
    expect(isConstraintEnactable(makeEvent('proposed', 'under_review'))).toBe(true);
  });

  it('allows proposed → rejected', () => {
    expect(isConstraintEnactable(makeEvent('proposed', 'rejected'))).toBe(true);
  });

  it('allows under_review → enacted', () => {
    expect(isConstraintEnactable(makeEvent('under_review', 'enacted'))).toBe(true);
  });

  it('allows under_review → rejected', () => {
    expect(isConstraintEnactable(makeEvent('under_review', 'rejected'))).toBe(true);
  });

  it('allows enacted → deprecated', () => {
    expect(isConstraintEnactable(makeEvent('enacted', 'deprecated'))).toBe(true);
  });

  it('rejects backward transition enacted → proposed', () => {
    expect(isConstraintEnactable(makeEvent('enacted', 'proposed'))).toBe(false);
  });

  it('rejects terminal state transitions from rejected', () => {
    expect(isConstraintEnactable(makeEvent('rejected', 'proposed'))).toBe(false);
  });

  it('rejects terminal state transitions from deprecated', () => {
    expect(isConstraintEnactable(makeEvent('deprecated', 'enacted'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeGovernanceWeight
// ---------------------------------------------------------------------------

describe('computeGovernanceWeight', () => {
  const makeAggregate = (state: string, blendedScore: number) => ({
    state,
    blended_score: blendedScore,
  }) as unknown as ReputationAggregate;

  it('authoritative with 0.9 score → 0.9', () => {
    expect(computeGovernanceWeight(makeAggregate('authoritative', 0.9))).toBeCloseTo(0.9);
  });

  it('established with 0.8 score → 0.6', () => {
    expect(computeGovernanceWeight(makeAggregate('established', 0.8))).toBeCloseTo(0.6);
  });

  it('warming with 0.8 score → 0.2', () => {
    expect(computeGovernanceWeight(makeAggregate('warming', 0.8))).toBeCloseTo(0.2);
  });

  it('cold with any score → 0', () => {
    expect(computeGovernanceWeight(makeAggregate('cold', 0.9))).toBe(0);
  });

  it('authoritative with 1.0 score → 1.0', () => {
    expect(computeGovernanceWeight(makeAggregate('authoritative', 1.0))).toBe(1);
  });

  it('clamps to 0 for 0 blended score', () => {
    expect(computeGovernanceWeight(makeAggregate('authoritative', 0))).toBe(0);
  });
});
