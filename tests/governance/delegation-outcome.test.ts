/**
 * Tests for DelegationOutcome schema and its sub-types.
 *
 * @see SDD §2.3 — DelegationOutcome Schema
 * @since v7.0.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  OutcomeTypeSchema,
  VoteChoiceSchema,
  DelegationVoteSchema,
  DissentTypeSchema,
  DissentSeveritySchema,
  DissentRecordSchema,
  DelegationOutcomeSchema,
} from '../../src/governance/delegation-outcome.js';

// ---------------------------------------------------------------------------
// OutcomeType
// ---------------------------------------------------------------------------

describe('OutcomeTypeSchema', () => {
  it('accepts all valid outcome types', () => {
    for (const t of ['unanimous', 'majority', 'deadlock', 'escalation']) {
      expect(Value.Check(OutcomeTypeSchema, t), `type: ${t}`).toBe(true);
    }
  });

  it('rejects invalid outcome type', () => {
    expect(Value.Check(OutcomeTypeSchema, 'plurality')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VoteChoice
// ---------------------------------------------------------------------------

describe('VoteChoiceSchema', () => {
  it('accepts all valid vote choices', () => {
    for (const c of ['agree', 'disagree', 'abstain']) {
      expect(Value.Check(VoteChoiceSchema, c)).toBe(true);
    }
  });

  it('rejects invalid vote choice', () => {
    expect(Value.Check(VoteChoiceSchema, 'veto')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DelegationVote
// ---------------------------------------------------------------------------

describe('DelegationVoteSchema', () => {
  const validVote = {
    voter_id: 'agent-001',
    vote: 'agree',
    result: { proposal: 'increase-budget' },
    confidence: 0.85,
  };

  it('accepts valid vote', () => {
    expect(Value.Check(DelegationVoteSchema, validVote)).toBe(true);
  });

  it('accepts vote with reasoning', () => {
    expect(Value.Check(DelegationVoteSchema, { ...validVote, reasoning: 'Strong evidence supports this.' })).toBe(true);
  });

  it('rejects confidence out of range', () => {
    expect(Value.Check(DelegationVoteSchema, { ...validVote, confidence: 1.5 })).toBe(false);
    expect(Value.Check(DelegationVoteSchema, { ...validVote, confidence: -0.1 })).toBe(false);
  });

  it('rejects empty voter_id', () => {
    expect(Value.Check(DelegationVoteSchema, { ...validVote, voter_id: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DissentType and DissentSeverity
// ---------------------------------------------------------------------------

describe('DissentTypeSchema', () => {
  it('accepts all valid dissent types', () => {
    for (const t of ['minority_report', 'abstention', 'timeout']) {
      expect(Value.Check(DissentTypeSchema, t)).toBe(true);
    }
  });
});

describe('DissentSeveritySchema', () => {
  it('accepts all valid severities', () => {
    for (const s of ['informational', 'warning', 'blocking']) {
      expect(Value.Check(DissentSeveritySchema, s)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// DissentRecord
// ---------------------------------------------------------------------------

describe('DissentRecordSchema', () => {
  const validDissent = {
    dissenter_id: 'agent-002',
    dissent_type: 'minority_report',
    proposed_alternative: { proposal: 'reduce-budget' },
    reasoning: 'Budget increase lacks supporting data.',
    severity: 'warning',
    acknowledged: false,
  };

  it('accepts valid dissent record', () => {
    expect(Value.Check(DissentRecordSchema, validDissent)).toBe(true);
  });

  it('rejects empty reasoning', () => {
    expect(Value.Check(DissentRecordSchema, { ...validDissent, reasoning: '' })).toBe(false);
  });

  it('rejects empty dissenter_id', () => {
    expect(Value.Check(DissentRecordSchema, { ...validDissent, dissenter_id: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DelegationOutcome (full schema)
// ---------------------------------------------------------------------------

describe('DelegationOutcomeSchema', () => {
  const validOutcome = {
    outcome_id: '550e8400-e29b-41d4-a716-446655440000',
    tree_node_id: 'node-001',
    outcome_type: 'unanimous',
    result: { decision: 'approved' },
    votes: [{
      voter_id: 'agent-001',
      vote: 'agree',
      result: { decision: 'approved' },
      confidence: 0.95,
    }],
    consensus_achieved: true,
    consensus_threshold: 1.0,
    dissent_records: [],
    resolved_at: '2026-01-15T12:00:00Z',
    contract_version: '7.0.0',
  };

  it('accepts valid outcome', () => {
    expect(Value.Check(DelegationOutcomeSchema, validOutcome)).toBe(true);
  });

  it('rejects outcome without votes', () => {
    expect(Value.Check(DelegationOutcomeSchema, { ...validOutcome, votes: [] })).toBe(false);
  });

  it('rejects non-uuid outcome_id', () => {
    expect(Value.Check(DelegationOutcomeSchema, { ...validOutcome, outcome_id: 'abc' })).toBe(false);
  });

  it('accepts outcome with escalation', () => {
    const escalated = {
      ...validOutcome,
      outcome_type: 'escalation',
      escalated_to: 'admin-agent',
      escalation_reason: 'Deadlock could not be resolved at this level.',
    };
    expect(Value.Check(DelegationOutcomeSchema, escalated)).toBe(true);
  });

  it('accepts deadlock with null result', () => {
    const deadlock = {
      ...validOutcome,
      outcome_type: 'deadlock',
      result: null,
      consensus_achieved: false,
    };
    expect(Value.Check(DelegationOutcomeSchema, deadlock)).toBe(true);
  });

  it('rejects consensus_threshold out of range', () => {
    expect(Value.Check(DelegationOutcomeSchema, { ...validOutcome, consensus_threshold: 1.5 })).toBe(false);
    expect(Value.Check(DelegationOutcomeSchema, { ...validOutcome, consensus_threshold: -0.1 })).toBe(false);
  });

  it('accepts outcome with dissent records', () => {
    const withDissent = {
      ...validOutcome,
      outcome_type: 'majority',
      dissent_records: [{
        dissenter_id: 'agent-002',
        dissent_type: 'minority_report',
        proposed_alternative: { decision: 'rejected' },
        reasoning: 'Insufficient evidence for approval.',
        severity: 'warning',
        acknowledged: true,
      }],
    };
    expect(Value.Check(DelegationOutcomeSchema, withDissent)).toBe(true);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(DelegationOutcomeSchema, { ...validOutcome, contract_version: 'v7' })).toBe(false);
  });
});
