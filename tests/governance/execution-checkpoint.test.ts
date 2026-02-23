/**
 * Tests for ExecutionCheckpoint, RollbackScope, and ExecutionStrategy (v7.8.0, DR-F5).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  CheckpointHealthSchema,
  ProceedDecisionSchema,
  ExecutionCheckpointSchema,
} from '../../src/governance/execution-checkpoint.js';
import {
  RollbackScopeSchema,
} from '../../src/governance/rollback-scope.js';
import {
  ExecutionStrategySchema,
  ProposalExecutionSchema,
} from '../../src/governance/proposal-execution.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// CheckpointHealth
// ---------------------------------------------------------------------------

describe('CheckpointHealthSchema', () => {
  it.each(['healthy', 'degraded', 'failing'])('accepts "%s"', (status) => {
    expect(Value.Check(CheckpointHealthSchema, status)).toBe(true);
  });

  it('rejects invalid health status', () => {
    expect(Value.Check(CheckpointHealthSchema, 'unknown')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProceedDecision
// ---------------------------------------------------------------------------

describe('ProceedDecisionSchema', () => {
  it.each(['continue', 'pause', 'rollback'])('accepts "%s"', (decision) => {
    expect(Value.Check(ProceedDecisionSchema, decision)).toBe(true);
  });

  it('rejects invalid decision', () => {
    expect(Value.Check(ProceedDecisionSchema, 'abort')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ExecutionStrategy
// ---------------------------------------------------------------------------

describe('ExecutionStrategySchema', () => {
  it.each(['atomic', 'progressive', 'canary'])('accepts "%s"', (strategy) => {
    expect(Value.Check(ExecutionStrategySchema, strategy)).toBe(true);
  });

  it('rejects invalid strategy', () => {
    expect(Value.Check(ExecutionStrategySchema, 'rolling')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ExecutionCheckpoint
// ---------------------------------------------------------------------------

const validCheckpoint = {
  checkpoint_id: '550e8400-e29b-41d4-a716-446655440200',
  execution_id: '550e8400-e29b-41d4-a716-446655440201',
  checkpoint_index: 0,
  changes_applied_count: 3,
  changes_remaining_count: 5,
  health_status: 'healthy',
  proceed_decision: 'continue',
  checkpoint_at: '2026-03-15T12:00:00Z',
  contract_version: '7.8.0',
};

describe('ExecutionCheckpointSchema', () => {
  it('validates a healthy checkpoint', () => {
    expect(Value.Check(ExecutionCheckpointSchema, validCheckpoint)).toBe(true);
  });

  it('validates a checkpoint with health_details', () => {
    const withDetails = { ...validCheckpoint, health_details: 'All metrics nominal.' };
    expect(Value.Check(ExecutionCheckpointSchema, withDetails)).toBe(true);
  });

  it('validates a failing checkpoint with rollback', () => {
    const failing = {
      ...validCheckpoint,
      health_status: 'failing',
      proceed_decision: 'rollback',
      checkpoint_index: 2,
    };
    expect(Value.Check(ExecutionCheckpointSchema, failing)).toBe(true);
  });

  it('validates a degraded checkpoint with pause', () => {
    const degraded = {
      ...validCheckpoint,
      health_status: 'degraded',
      proceed_decision: 'pause',
    };
    expect(Value.Check(ExecutionCheckpointSchema, degraded)).toBe(true);
  });

  it('rejects negative checkpoint_index', () => {
    const bad = { ...validCheckpoint, checkpoint_index: -1 };
    expect(Value.Check(ExecutionCheckpointSchema, bad)).toBe(false);
  });

  it('rejects additional properties', () => {
    const extra = { ...validCheckpoint, extra_field: true };
    expect(Value.Check(ExecutionCheckpointSchema, extra)).toBe(false);
  });

  it('rejects missing checkpoint_id', () => {
    const { checkpoint_id: _, ...noId } = validCheckpoint;
    expect(Value.Check(ExecutionCheckpointSchema, noId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RollbackScope
// ---------------------------------------------------------------------------

const validRollback = {
  scope_id: '550e8400-e29b-41d4-a716-446655440300',
  execution_id: '550e8400-e29b-41d4-a716-446655440301',
  changes_to_rollback: [0, 1, 2],
  reason: 'Canary checkpoint detected elevated error rate.',
  initiated_at: '2026-03-15T12:10:00Z',
  contract_version: '7.8.0',
};

describe('RollbackScopeSchema', () => {
  it('validates a complete rollback scope', () => {
    expect(Value.Check(RollbackScopeSchema, validRollback)).toBe(true);
  });

  it('validates rollback with checkpoint reference', () => {
    const withCheckpoint = {
      ...validRollback,
      triggered_by_checkpoint_id: '550e8400-e29b-41d4-a716-446655440200',
    };
    expect(Value.Check(RollbackScopeSchema, withCheckpoint)).toBe(true);
  });

  it('validates rollback with completed_at', () => {
    const completed = {
      ...validRollback,
      completed_at: '2026-03-15T12:15:00Z',
    };
    expect(Value.Check(RollbackScopeSchema, completed)).toBe(true);
  });

  it('rejects empty changes_to_rollback', () => {
    const empty = { ...validRollback, changes_to_rollback: [] };
    expect(Value.Check(RollbackScopeSchema, empty)).toBe(false);
  });

  it('rejects empty reason', () => {
    const noReason = { ...validRollback, reason: '' };
    expect(Value.Check(RollbackScopeSchema, noReason)).toBe(false);
  });

  it('rejects additional properties', () => {
    const extra = { ...validRollback, extra: true };
    expect(Value.Check(RollbackScopeSchema, extra)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProposalExecution — progressive execution fields
// ---------------------------------------------------------------------------

describe('ProposalExecution progressive execution fields', () => {
  const baseExecution = {
    execution_id: '550e8400-e29b-41d4-a716-446655440080',
    proposal_id: '550e8400-e29b-41d4-a716-446655440081',
    status: 'completed',
    changes_applied: [{
      change_index: 0,
      target: 'pseudo_count',
      applied_at: '2026-03-01T00:00:00Z',
      result: 'success',
    }],
    started_at: '2026-03-01T00:00:00Z',
    completed_at: '2026-03-01T00:01:00Z',
    executed_by: 'governance-executor',
    contract_version: '7.8.0',
  };

  it('accepts execution without strategy (implicit atomic)', () => {
    expect(Value.Check(ProposalExecutionSchema, baseExecution)).toBe(true);
  });

  it('accepts execution with atomic strategy', () => {
    const atomic = { ...baseExecution, execution_strategy: 'atomic' };
    expect(Value.Check(ProposalExecutionSchema, atomic)).toBe(true);
  });

  it('accepts execution with progressive strategy and checkpoints', () => {
    const progressive = {
      ...baseExecution,
      execution_strategy: 'progressive',
      checkpoints: ['550e8400-e29b-41d4-a716-446655440200'],
    };
    expect(Value.Check(ProposalExecutionSchema, progressive)).toBe(true);
  });

  it('accepts execution with canary strategy and rollback', () => {
    const canary = {
      ...baseExecution,
      status: 'failed',
      execution_strategy: 'canary',
      checkpoints: ['550e8400-e29b-41d4-a716-446655440200'],
      rollback_scope_id: '550e8400-e29b-41d4-a716-446655440300',
    };
    expect(Value.Check(ProposalExecutionSchema, canary)).toBe(true);
  });

  it('rejects invalid execution_strategy', () => {
    const bad = { ...baseExecution, execution_strategy: 'rolling' };
    expect(Value.Check(ProposalExecutionSchema, bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// execution_checkpoint_valid evaluator builtin
// ---------------------------------------------------------------------------

describe('execution_checkpoint_valid evaluator builtin', () => {
  it('healthy + continue → true', () => {
    const data = { cp: { health_status: 'healthy', proceed_decision: 'continue' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(true);
  });

  it('healthy + pause → false', () => {
    const data = { cp: { health_status: 'healthy', proceed_decision: 'pause' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('healthy + rollback → false', () => {
    const data = { cp: { health_status: 'healthy', proceed_decision: 'rollback' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('degraded + continue → true', () => {
    const data = { cp: { health_status: 'degraded', proceed_decision: 'continue' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(true);
  });

  it('degraded + pause → true', () => {
    const data = { cp: { health_status: 'degraded', proceed_decision: 'pause' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(true);
  });

  it('degraded + rollback → false', () => {
    const data = { cp: { health_status: 'degraded', proceed_decision: 'rollback' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('failing + rollback → true', () => {
    const data = { cp: { health_status: 'failing', proceed_decision: 'rollback' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(true);
  });

  it('failing + continue → false', () => {
    const data = { cp: { health_status: 'failing', proceed_decision: 'continue' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('failing + pause → false', () => {
    const data = { cp: { health_status: 'failing', proceed_decision: 'pause' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('null checkpoint → false', () => {
    expect(evaluateConstraint({ cp: null }, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('missing health_status → false', () => {
    const data = { cp: { proceed_decision: 'continue' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });

  it('unknown health_status → false', () => {
    const data = { cp: { health_status: 'critical', proceed_decision: 'rollback' } };
    expect(evaluateConstraint(data, 'execution_checkpoint_valid(cp)')).toBe(false);
  });
});
