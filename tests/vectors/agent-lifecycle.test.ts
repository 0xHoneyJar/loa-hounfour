import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isValidTransition,
  AGENT_LIFECYCLE_STATES,
  AGENT_LIFECYCLE_TRANSITIONS,
  type AgentLifecycleState,
} from '../../src/schemas/agent-lifecycle.js';
import {
  createTransitionValidator,
  DEFAULT_GUARDS,
  guardKey,
  isValidGuardResult,
  requiresTransferId,
  requiresNoActiveTransfer,
  requiresReasonResolved,
  requiresTransferCompleted,
  type GuardResult,
} from '../../src/utilities/lifecycle.js';

const VECTORS_DIR = join(__dirname, '../../vectors/agent');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Agent Lifecycle Golden Vectors', () => {
  const data = loadVectors('lifecycle-transitions.json');

  describe('valid transitions', () => {
    for (const v of data.valid_transitions as Array<{
      id: string; from: string; to: string; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        expect(isValidTransition(
          v.from as AgentLifecycleState,
          v.to as AgentLifecycleState,
        )).toBe(true);
      });
    }
  });

  describe('invalid transitions', () => {
    for (const v of data.invalid_transitions as Array<{
      id: string; from: string; to: string; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        expect(isValidTransition(
          v.from as AgentLifecycleState,
          v.to as AgentLifecycleState,
        )).toBe(false);
      });
    }
  });

  it('has exactly 6 lifecycle states', () => {
    expect(AGENT_LIFECYCLE_STATES).toHaveLength(6);
  });
});

describe('createTransitionValidator', () => {
  const validator = createTransitionValidator(AGENT_LIFECYCLE_TRANSITIONS);

  it('isValid returns GuardResult for valid transitions', () => {
    const result = validator.isValid('DORMANT', 'PROVISIONING');
    expect(result.valid).toBe(true);
  });

  it('isValid returns GuardResult for invalid transitions', () => {
    const result = validator.isValid('DORMANT', 'ACTIVE');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('DORMANT→ACTIVE');
      expect(result.guard).toBe('transition_map');
    }
  });

  it('getValidTargets returns correct targets', () => {
    const targets = validator.getValidTargets('ACTIVE');
    expect(targets).toContain('SUSPENDED');
    expect(targets).toContain('TRANSFERRED');
    expect(targets).toContain('ARCHIVED');
    expect(targets).not.toContain('DORMANT');
  });

  it('getValidTargets returns empty for terminal state', () => {
    expect(validator.getValidTargets('ARCHIVED')).toHaveLength(0);
  });
});

describe('Structured Guard Results (BB-C4-ADV-001)', () => {
  const guarded = createTransitionValidator(AGENT_LIFECYCLE_TRANSITIONS, DEFAULT_GUARDS);

  it('ACTIVE → TRANSFERRED returns { valid: true } with transfer_id', () => {
    const result = guarded.isValid('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-123' });
    expect(result).toEqual({ valid: true });
    expect(isValidGuardResult(result)).toBe(true);
  });

  it('ACTIVE → TRANSFERRED returns structured rejection without transfer_id', () => {
    const result = guarded.isValid('ACTIVE', 'TRANSFERRED');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('transfer_id');
      expect(result.guard).toBe('ACTIVE→TRANSFERRED');
    }
  });

  it('ACTIVE → TRANSFERRED returns structured rejection with empty context', () => {
    const result = guarded.isValid('ACTIVE', 'TRANSFERRED', {});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.guard).toBe('ACTIVE→TRANSFERRED');
    }
  });

  it('ACTIVE → ARCHIVED returns structured rejection when transfer in progress', () => {
    const result = guarded.isValid('ACTIVE', 'ARCHIVED', { transfer_id: 'tx-active' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('no active transfer_id');
      expect(result.guard).toBe('ACTIVE→ARCHIVED');
    }
  });

  it('ACTIVE → ARCHIVED returns { valid: true } without active transfer', () => {
    expect(guarded.isValid('ACTIVE', 'ARCHIVED').valid).toBe(true);
    expect(guarded.isValid('ACTIVE', 'ARCHIVED', {}).valid).toBe(true);
  });

  it('SUSPENDED → ACTIVE returns { valid: true } with reason_resolved', () => {
    const result = guarded.isValid('SUSPENDED', 'ACTIVE', { reason_resolved: true });
    expect(result.valid).toBe(true);
  });

  it('SUSPENDED → ACTIVE returns structured rejection without reason', () => {
    const noCtx = guarded.isValid('SUSPENDED', 'ACTIVE');
    expect(noCtx.valid).toBe(false);
    if (!noCtx.valid) {
      expect(noCtx.reason).toContain('reason_resolved');
      expect(noCtx.guard).toBe('SUSPENDED→ACTIVE');
    }

    const falsyCtx = guarded.isValid('SUSPENDED', 'ACTIVE', { reason_resolved: false });
    expect(falsyCtx.valid).toBe(false);
  });

  it('TRANSFERRED → PROVISIONING returns { valid: true } with transfer_completed and new_owner', () => {
    const result = guarded.isValid('TRANSFERRED', 'PROVISIONING', {
      transfer_completed: true,
      new_owner: '0xNewOwner',
    });
    expect(result.valid).toBe(true);
  });

  it('TRANSFERRED → PROVISIONING returns structured rejection without context', () => {
    const noCtx = guarded.isValid('TRANSFERRED', 'PROVISIONING');
    expect(noCtx.valid).toBe(false);
    if (!noCtx.valid) {
      expect(noCtx.reason).toContain('transfer_completed');
      expect(noCtx.guard).toBe('TRANSFERRED→PROVISIONING');
    }
  });

  it('TRANSFERRED → PROVISIONING requires both fields', () => {
    const noOwner = guarded.isValid('TRANSFERRED', 'PROVISIONING', { transfer_completed: true });
    expect(noOwner.valid).toBe(false);
  });

  it('unguarded transitions return { valid: true }', () => {
    // DORMANT → PROVISIONING has no guard — should be permissive
    expect(guarded.isValid('DORMANT', 'PROVISIONING').valid).toBe(true);
  });

  it('structurally invalid transitions return structured rejection', () => {
    const r1 = guarded.isValid('DORMANT', 'ACTIVE');
    expect(r1.valid).toBe(false);
    if (!r1.valid) {
      expect(r1.guard).toBe('transition_map');
    }

    const r2 = guarded.isValid('ARCHIVED', 'ACTIVE');
    expect(r2.valid).toBe(false);
  });

  it('custom guard overrides default behavior', () => {
    const customGuards = {
      [guardKey('DORMANT', 'PROVISIONING')]: (): GuardResult => ({
        valid: false,
        reason: 'custom rejection',
        guard: 'DORMANT→PROVISIONING',
      }),
    };
    const customValidator = createTransitionValidator(AGENT_LIFECYCLE_TRANSITIONS, customGuards);
    const result = customValidator.isValid('DORMANT', 'PROVISIONING');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('custom rejection');
    }
  });
});

describe('Named Guard Functions (BB-C4-ADV-005)', () => {
  it('requiresTransferId returns { valid: true } with transfer_id', () => {
    const result = requiresTransferId('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-1' });
    expect(result.valid).toBe(true);
  });

  it('requiresTransferId returns rejection without transfer_id', () => {
    const result = requiresTransferId('ACTIVE', 'TRANSFERRED');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('transfer_id');
      expect(result.guard).toBe('ACTIVE→TRANSFERRED');
    }
  });

  it('requiresNoActiveTransfer returns { valid: true } with no context', () => {
    expect(requiresNoActiveTransfer('ACTIVE', 'ARCHIVED').valid).toBe(true);
    expect(requiresNoActiveTransfer('ACTIVE', 'ARCHIVED', {}).valid).toBe(true);
  });

  it('requiresNoActiveTransfer returns rejection with transfer_id', () => {
    const result = requiresNoActiveTransfer('ACTIVE', 'ARCHIVED', { transfer_id: 'tx-1' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.guard).toBe('ACTIVE→ARCHIVED');
    }
  });

  it('requiresReasonResolved returns { valid: true } when resolved', () => {
    expect(requiresReasonResolved('SUSPENDED', 'ACTIVE', { reason_resolved: true }).valid).toBe(true);
  });

  it('requiresReasonResolved returns rejection when not resolved', () => {
    expect(requiresReasonResolved('SUSPENDED', 'ACTIVE').valid).toBe(false);
    expect(requiresReasonResolved('SUSPENDED', 'ACTIVE', { reason_resolved: false }).valid).toBe(false);
  });

  it('requiresTransferCompleted returns { valid: true } with all fields', () => {
    const result = requiresTransferCompleted('TRANSFERRED', 'PROVISIONING', {
      transfer_completed: true,
      new_owner: '0xOwner',
    });
    expect(result.valid).toBe(true);
  });

  it('requiresTransferCompleted returns rejection when incomplete', () => {
    expect(requiresTransferCompleted('TRANSFERRED', 'PROVISIONING').valid).toBe(false);
    expect(requiresTransferCompleted('TRANSFERRED', 'PROVISIONING', {
      transfer_completed: true,
    }).valid).toBe(false);
    expect(requiresTransferCompleted('TRANSFERRED', 'PROVISIONING', {
      new_owner: '0xOwner',
    }).valid).toBe(false);
  });
});

describe('isValidGuardResult narrowing', () => {
  it('narrows valid result', () => {
    const result: GuardResult = { valid: true };
    expect(isValidGuardResult(result)).toBe(true);
  });

  it('narrows invalid result', () => {
    const result: GuardResult = { valid: false, reason: 'test', guard: 'test' };
    expect(isValidGuardResult(result)).toBe(false);
  });
});
