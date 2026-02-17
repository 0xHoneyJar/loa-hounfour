/**
 * Tests for BridgeTransferSaga schema and saga state machine.
 *
 * @see SDD §2.2 — BridgeTransferSaga Schema
 * @since v7.0.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  SagaStatusSchema,
  SAGA_TRANSITIONS,
  StepTypeSchema,
  StepStatusSchema,
  BridgeTransferStepSchema,
  ParticipantRoleSchema,
  SagaParticipantSchema,
  SagaErrorSchema,
  BridgeTransferSagaSchema,
  type SagaStatus,
} from '../../src/economy/bridge-transfer-saga.js';

// ---------------------------------------------------------------------------
// SagaStatus
// ---------------------------------------------------------------------------

describe('SagaStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses: SagaStatus[] = [
      'initiated', 'reserving', 'transferring', 'settling',
      'settled', 'compensating', 'reversed', 'failed',
    ];
    for (const s of statuses) {
      expect(Value.Check(SagaStatusSchema, s), `status: ${s}`).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(Value.Check(SagaStatusSchema, 'unknown')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SAGA_TRANSITIONS state machine
// ---------------------------------------------------------------------------

describe('SAGA_TRANSITIONS', () => {
  it('terminal states have no outbound transitions', () => {
    expect(SAGA_TRANSITIONS.settled).toEqual([]);
    expect(SAGA_TRANSITIONS.reversed).toEqual([]);
    expect(SAGA_TRANSITIONS.failed).toEqual([]);
  });

  it('initiated can transition to reserving or failed', () => {
    expect(SAGA_TRANSITIONS.initiated).toContain('reserving');
    expect(SAGA_TRANSITIONS.initiated).toContain('failed');
  });

  it('compensating leads to reversed or failed', () => {
    expect(SAGA_TRANSITIONS.compensating).toContain('reversed');
    expect(SAGA_TRANSITIONS.compensating).toContain('failed');
  });

  it('all non-terminal states can reach failed', () => {
    const nonTerminal: SagaStatus[] = ['initiated', 'reserving', 'transferring', 'settling', 'compensating'];
    for (const state of nonTerminal) {
      expect(SAGA_TRANSITIONS[state], `${state} → failed`).toContain('failed');
    }
  });

  it('every target state is a valid SagaStatus', () => {
    const allStatuses = Object.keys(SAGA_TRANSITIONS);
    for (const [source, targets] of Object.entries(SAGA_TRANSITIONS)) {
      for (const t of targets) {
        expect(allStatuses, `${source} → ${t}`).toContain(t);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// StepType and StepStatus
// ---------------------------------------------------------------------------

describe('StepTypeSchema', () => {
  it('accepts valid step types', () => {
    for (const t of ['reserve', 'validate', 'transfer', 'confirm', 'settle']) {
      expect(Value.Check(StepTypeSchema, t)).toBe(true);
    }
  });
});

describe('StepStatusSchema', () => {
  it('accepts valid step statuses', () => {
    for (const s of ['pending', 'in_progress', 'completed', 'failed', 'compensated']) {
      expect(Value.Check(StepStatusSchema, s)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// BridgeTransferStep
// ---------------------------------------------------------------------------

describe('BridgeTransferStepSchema', () => {
  const validStep = {
    step_id: 'step-001',
    step_type: 'transfer',
    participant: 'agent-A',
    status: 'pending',
    amount_micro: '1000000',
    started_at: null,
    completed_at: null,
  };

  it('accepts valid step', () => {
    expect(Value.Check(BridgeTransferStepSchema, validStep)).toBe(true);
  });

  it('rejects non-numeric amount_micro', () => {
    expect(Value.Check(BridgeTransferStepSchema, { ...validStep, amount_micro: 'abc' })).toBe(false);
  });

  it('rejects empty step_id', () => {
    expect(Value.Check(BridgeTransferStepSchema, { ...validStep, step_id: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ParticipantRole and SagaParticipant
// ---------------------------------------------------------------------------

describe('ParticipantRoleSchema', () => {
  it('accepts all valid roles', () => {
    for (const r of ['initiator', 'counterparty', 'observer', 'arbiter']) {
      expect(Value.Check(ParticipantRoleSchema, r)).toBe(true);
    }
  });
});

describe('SagaParticipantSchema', () => {
  it('accepts valid participant', () => {
    const participant = {
      agent_id: 'agent-1',
      role: 'initiator',
      registry_id: '550e8400-e29b-41d4-a716-446655440000',
      trust_scopes: {
        scopes: { billing: 'verified' },
        default_level: 'basic',
      },
    };
    expect(Value.Check(SagaParticipantSchema, participant)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SagaError
// ---------------------------------------------------------------------------

describe('SagaErrorSchema', () => {
  it('accepts valid error', () => {
    const error = {
      error_code: 'TIMEOUT',
      message: 'Step exceeded maximum duration',
      recoverable: true,
    };
    expect(Value.Check(SagaErrorSchema, error)).toBe(true);
  });

  it('accepts error with failed_step_id', () => {
    const error = {
      error_code: 'TRANSFER_FAILED',
      message: 'Insufficient funds',
      failed_step_id: 'step-003',
      recoverable: false,
    };
    expect(Value.Check(SagaErrorSchema, error)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BridgeTransferSaga (full schema)
// ---------------------------------------------------------------------------

describe('BridgeTransferSagaSchema', () => {
  const validSaga = {
    saga_id: '550e8400-e29b-41d4-a716-446655440000',
    bridge_id: '550e8400-e29b-41d4-a716-446655440001',
    source_registry: '550e8400-e29b-41d4-a716-446655440002',
    target_registry: '550e8400-e29b-41d4-a716-446655440003',
    saga_type: 'atomic',
    status: 'initiated',
    steps: [{
      step_id: 'step-001',
      step_type: 'reserve',
      participant: 'agent-A',
      status: 'pending',
      amount_micro: '5000000',
      started_at: null,
      completed_at: null,
    }],
    compensation_steps: [],
    timeout: { total_seconds: 300, per_step_seconds: 60 },
    participants: [{
      agent_id: 'agent-A',
      role: 'initiator',
      registry_id: '550e8400-e29b-41d4-a716-446655440002',
      trust_scopes: {
        scopes: { billing: 'trusted' },
        default_level: 'verified',
      },
    }],
    initiated_at: '2026-01-15T10:00:00Z',
    settled_at: null,
    contract_version: '7.0.0',
  };

  it('accepts valid saga', () => {
    expect(Value.Check(BridgeTransferSagaSchema, validSaga)).toBe(true);
  });

  it('rejects saga without steps', () => {
    expect(Value.Check(BridgeTransferSagaSchema, { ...validSaga, steps: [] })).toBe(false);
  });

  it('rejects saga without participants', () => {
    expect(Value.Check(BridgeTransferSagaSchema, { ...validSaga, participants: [] })).toBe(false);
  });

  it('rejects invalid saga_type', () => {
    expect(Value.Check(BridgeTransferSagaSchema, { ...validSaga, saga_type: 'unknown' })).toBe(false);
  });

  it('rejects non-uuid saga_id', () => {
    expect(Value.Check(BridgeTransferSagaSchema, { ...validSaga, saga_id: 'not-a-uuid' })).toBe(false);
  });

  it('rejects negative timeout', () => {
    expect(Value.Check(BridgeTransferSagaSchema, {
      ...validSaga,
      timeout: { total_seconds: 0, per_step_seconds: 60 },
    })).toBe(false);
  });

  it('accepts choreography saga_type', () => {
    expect(Value.Check(BridgeTransferSagaSchema, { ...validSaga, saga_type: 'choreography' })).toBe(true);
  });
});
