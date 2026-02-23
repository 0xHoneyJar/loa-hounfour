/**
 * Tests for ProposalExecution and ProposalOutcomeEvent schemas (v7.7.0, DR-S9).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  ExecutionStatusSchema,
  EXECUTION_STATUS_TRANSITIONS,
  ChangeApplicationResultSchema,
  ProposalExecutionSchema,
  type ProposalExecution,
  type ExecutionStatus,
} from '../../src/governance/proposal-execution.js';
import {
  ProposalEventTypeSchema,
  ProposalOutcomeEventSchema,
} from '../../src/governance/proposal-outcome-event.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { GovernanceProposalSchema } from '../../src/governance/governance-proposal.js';

// ---------------------------------------------------------------------------
// ExecutionStatus
// ---------------------------------------------------------------------------

describe('ExecutionStatusSchema', () => {
  const statuses: ExecutionStatus[] = ['pending', 'executing', 'completed', 'failed', 'rolled_back'];

  it.each(statuses)('accepts "%s"', (status) => {
    expect(Value.Check(ExecutionStatusSchema, status)).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(Value.Check(ExecutionStatusSchema, 'running')).toBe(false);
  });
});

describe('EXECUTION_STATUS_TRANSITIONS', () => {
  it('pending can transition to executing', () => {
    expect(EXECUTION_STATUS_TRANSITIONS.pending).toContain('executing');
  });

  it('executing can transition to completed or failed', () => {
    expect(EXECUTION_STATUS_TRANSITIONS.executing).toContain('completed');
    expect(EXECUTION_STATUS_TRANSITIONS.executing).toContain('failed');
  });

  it('completed is terminal', () => {
    expect(EXECUTION_STATUS_TRANSITIONS.completed).toHaveLength(0);
  });

  it('failed can transition to rolled_back', () => {
    expect(EXECUTION_STATUS_TRANSITIONS.failed).toContain('rolled_back');
  });

  it('rolled_back is terminal', () => {
    expect(EXECUTION_STATUS_TRANSITIONS.rolled_back).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ChangeApplicationResult
// ---------------------------------------------------------------------------

describe('ChangeApplicationResultSchema', () => {
  it('validates a successful change', () => {
    expect(Value.Check(ChangeApplicationResultSchema, {
      change_index: 0,
      target: 'pseudo_count',
      applied_at: '2026-03-01T00:00:00Z',
      result: 'success',
    })).toBe(true);
  });

  it('validates a failed change with error', () => {
    expect(Value.Check(ChangeApplicationResultSchema, {
      change_index: 1,
      target: 'decay_policy.half_life_days',
      applied_at: '2026-03-01T00:00:01Z',
      result: 'failed',
      error: 'Value out of range',
    })).toBe(true);
  });

  it('validates a skipped change', () => {
    expect(Value.Check(ChangeApplicationResultSchema, {
      change_index: 2,
      target: 'state_thresholds.warming_min_events',
      applied_at: '2026-03-01T00:00:02Z',
      result: 'skipped',
    })).toBe(true);
  });

  it('rejects negative change_index', () => {
    expect(Value.Check(ChangeApplicationResultSchema, {
      change_index: -1,
      target: 'pseudo_count',
      applied_at: '2026-03-01T00:00:00Z',
      result: 'success',
    })).toBe(false);
  });

  it('rejects unknown result', () => {
    expect(Value.Check(ChangeApplicationResultSchema, {
      change_index: 0,
      target: 'pseudo_count',
      applied_at: '2026-03-01T00:00:00Z',
      result: 'partial',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProposalExecution
// ---------------------------------------------------------------------------

const validExecution: ProposalExecution = {
  execution_id: '550e8400-e29b-41d4-a716-446655440080',
  proposal_id: '550e8400-e29b-41d4-a716-446655440081',
  status: 'completed',
  changes_applied: [
    {
      change_index: 0,
      target: 'pseudo_count',
      applied_at: '2026-03-01T00:00:00Z',
      result: 'success',
    },
  ],
  started_at: '2026-03-01T00:00:00Z',
  completed_at: '2026-03-01T00:01:00Z',
  executed_by: 'governance-executor-agent',
  contract_version: '7.7.0',
};

describe('ProposalExecutionSchema', () => {
  it('validates a complete execution', () => {
    expect(Value.Check(ProposalExecutionSchema, validExecution)).toBe(true);
  });

  it('validates a failed execution without completed_at', () => {
    const failedExec = {
      ...validExecution,
      status: 'failed',
      completed_at: undefined,
      changes_applied: [
        {
          change_index: 0,
          target: 'pseudo_count',
          applied_at: '2026-03-01T00:00:00Z',
          result: 'failed',
          error: 'Validation error',
        },
      ],
    };
    delete (failedExec as Record<string, unknown>).completed_at;
    expect(Value.Check(ProposalExecutionSchema, failedExec)).toBe(true);
  });

  it('validates execution with constraint lifecycle events', () => {
    const withEvents = {
      ...validExecution,
      constraint_lifecycle_events: [
        '550e8400-e29b-41d4-a716-446655440090',
        '550e8400-e29b-41d4-a716-446655440091',
      ],
    };
    expect(Value.Check(ProposalExecutionSchema, withEvents)).toBe(true);
  });

  it('rejects empty changes_applied', () => {
    const noChanges = { ...validExecution, changes_applied: [] };
    expect(Value.Check(ProposalExecutionSchema, noChanges)).toBe(false);
  });

  it('rejects missing execution_id', () => {
    const { execution_id: _, ...noId } = validExecution;
    expect(Value.Check(ProposalExecutionSchema, noId)).toBe(false);
  });

  it('rejects additional properties', () => {
    const extra = { ...validExecution, extra_field: 'nope' };
    expect(Value.Check(ProposalExecutionSchema, extra)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProposalOutcomeEvent
// ---------------------------------------------------------------------------

describe('ProposalOutcomeEventSchema', () => {
  it('validates a proposed event', () => {
    expect(Value.Check(ProposalOutcomeEventSchema, {
      event_id: '550e8400-e29b-41d4-a716-446655440092',
      proposal_id: '550e8400-e29b-41d4-a716-446655440081',
      event_type: 'proposed',
      actor_id: 'agent-alice',
      occurred_at: '2026-03-01T00:00:00Z',
      contract_version: '7.7.0',
    })).toBe(true);
  });

  it('validates a vote_cast event with details', () => {
    expect(Value.Check(ProposalOutcomeEventSchema, {
      event_id: '550e8400-e29b-41d4-a716-446655440093',
      proposal_id: '550e8400-e29b-41d4-a716-446655440081',
      event_type: 'vote_cast',
      actor_id: 'agent-bob',
      details: { vote: 'approve', weight: 0.75 },
      occurred_at: '2026-03-01T00:01:00Z',
      contract_version: '7.7.0',
    })).toBe(true);
  });

  it('validates an execution_completed event', () => {
    expect(Value.Check(ProposalOutcomeEventSchema, {
      event_id: '550e8400-e29b-41d4-a716-446655440094',
      proposal_id: '550e8400-e29b-41d4-a716-446655440081',
      event_type: 'execution_completed',
      actor_id: 'governance-executor-agent',
      occurred_at: '2026-03-01T00:02:00Z',
      contract_version: '7.7.0',
    })).toBe(true);
  });

  const eventTypes = [
    'proposed', 'voting_opened', 'vote_cast', 'ratified',
    'rejected', 'withdrawn', 'execution_started', 'execution_completed', 'execution_failed',
  ];

  it.each(eventTypes)('accepts event_type "%s"', (eventType) => {
    expect(Value.Check(ProposalEventTypeSchema, eventType)).toBe(true);
  });

  it('rejects invalid event_type', () => {
    expect(Value.Check(ProposalEventTypeSchema, 'approved')).toBe(false);
  });

  it('rejects empty actor_id', () => {
    expect(Value.Check(ProposalOutcomeEventSchema, {
      event_id: '550e8400-e29b-41d4-a716-446655440095',
      proposal_id: '550e8400-e29b-41d4-a716-446655440081',
      event_type: 'proposed',
      actor_id: '',
      occurred_at: '2026-03-01T00:00:00Z',
      contract_version: '7.7.0',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ProposalOutcomeEventSchema, {
      event_id: '550e8400-e29b-41d4-a716-446655440095',
      proposal_id: '550e8400-e29b-41d4-a716-446655440081',
      event_type: 'proposed',
      actor_id: 'agent-alice',
      occurred_at: '2026-03-01T00:00:00Z',
      contract_version: '7.7.0',
      extra: true,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GovernanceProposal optional fields
// ---------------------------------------------------------------------------

describe('GovernanceProposal optional execution fields', () => {
  // The GovernanceProposalSchema is tested elsewhere;
  // here we just verify the new optional fields work.

  const baseProposal = {
    proposal_id: '550e8400-e29b-41d4-a716-446655440081',
    registry_id: '550e8400-e29b-41d4-a716-446655440099',
    proposer_id: 'agent-alice',
    title: 'Increase pseudo_count to 5',
    description: 'Proposal to increase conservatism parameter.',
    changes: [{
      change_type: 'parameter_update',
      target: 'pseudo_count',
      current_value: 3,
      proposed_value: 5,
      justification: 'Community vote for more conservative trust.',
    }],
    status: 'proposed',
    voting: {
      quorum_required: 0.5,
      votes_cast: [],
      voting_opened_at: '2026-03-01T00:00:00Z',
      voting_closed_at: null,
    },
    contract_version: '7.7.0',
  };

  it('accepts proposal without execution_id', () => {
    expect(Value.Check(GovernanceProposalSchema, baseProposal)).toBe(true);
  });

  it('accepts proposal with execution_id', () => {
    const withExec = {
      ...baseProposal,
      execution_id: '550e8400-e29b-41d4-a716-446655440080',
    };
    expect(Value.Check(GovernanceProposalSchema, withExec)).toBe(true);
  });

  it('accepts proposal with collection_id', () => {
    const withCollection = {
      ...baseProposal,
      collection_id: 'community-alpha',
    };
    expect(Value.Check(GovernanceProposalSchema, withCollection)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// proposal_execution_valid evaluator builtin
// ---------------------------------------------------------------------------

describe('proposal_execution_valid evaluator builtin', () => {
  it('returns true for completed execution with all successes', () => {
    const data = {
      execution: {
        status: 'completed',
        changes_applied: [
          { result: 'success' },
          { result: 'success' },
        ],
      },
    };
    expect(evaluateConstraint(data, 'proposal_execution_valid(execution)')).toBe(true);
  });

  it('returns false for failed execution', () => {
    const data = {
      execution: {
        status: 'failed',
        changes_applied: [
          { result: 'success' },
          { result: 'failed' },
        ],
      },
    };
    expect(evaluateConstraint(data, 'proposal_execution_valid(execution)')).toBe(false);
  });

  it('returns false when any change is not success', () => {
    const data = {
      execution: {
        status: 'completed',
        changes_applied: [
          { result: 'success' },
          { result: 'skipped' },
        ],
      },
    };
    expect(evaluateConstraint(data, 'proposal_execution_valid(execution)')).toBe(false);
  });

  it('returns false for empty changes_applied', () => {
    const data = {
      execution: {
        status: 'completed',
        changes_applied: [],
      },
    };
    expect(evaluateConstraint(data, 'proposal_execution_valid(execution)')).toBe(false);
  });

  it('returns false for pending status', () => {
    const data = {
      execution: {
        status: 'pending',
        changes_applied: [{ result: 'success' }],
      },
    };
    expect(evaluateConstraint(data, 'proposal_execution_valid(execution)')).toBe(false);
  });
});
