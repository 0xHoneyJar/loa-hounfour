import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isValidTransition,
  AGENT_LIFECYCLE_STATES,
  AGENT_LIFECYCLE_TRANSITIONS,
  type AgentLifecycleState,
} from '../../src/schemas/agent-lifecycle.js';
import { createTransitionValidator, DEFAULT_GUARDS } from '../../src/utilities/lifecycle.js';

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

  it('isValid agrees with isValidTransition', () => {
    expect(validator.isValid('DORMANT', 'PROVISIONING')).toBe(true);
    expect(validator.isValid('DORMANT', 'ACTIVE')).toBe(false);
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

describe('Lifecycle Guard Predicates (BB-POST-004)', () => {
  const guarded = createTransitionValidator(AGENT_LIFECYCLE_TRANSITIONS, DEFAULT_GUARDS);

  it('ACTIVE → TRANSFERRED requires transfer_id context', () => {
    expect(guarded.isValid('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-123' })).toBe(true);
  });

  it('ACTIVE → TRANSFERRED rejected without transfer_id', () => {
    expect(guarded.isValid('ACTIVE', 'TRANSFERRED')).toBe(false);
    expect(guarded.isValid('ACTIVE', 'TRANSFERRED', {})).toBe(false);
  });

  it('ACTIVE → ARCHIVED rejected when transfer in progress', () => {
    expect(guarded.isValid('ACTIVE', 'ARCHIVED', { transfer_id: 'tx-active' })).toBe(false);
  });

  it('ACTIVE → ARCHIVED allowed without active transfer', () => {
    expect(guarded.isValid('ACTIVE', 'ARCHIVED')).toBe(true);
    expect(guarded.isValid('ACTIVE', 'ARCHIVED', {})).toBe(true);
  });

  it('SUSPENDED → ACTIVE requires reason_resolved', () => {
    expect(guarded.isValid('SUSPENDED', 'ACTIVE', { reason_resolved: true })).toBe(true);
    expect(guarded.isValid('SUSPENDED', 'ACTIVE')).toBe(false);
    expect(guarded.isValid('SUSPENDED', 'ACTIVE', { reason_resolved: false })).toBe(false);
  });

  it('TRANSFERRED → PROVISIONING requires transfer_completed and new_owner', () => {
    expect(guarded.isValid('TRANSFERRED', 'PROVISIONING', {
      transfer_completed: true,
      new_owner: '0xNewOwner',
    })).toBe(true);
    expect(guarded.isValid('TRANSFERRED', 'PROVISIONING')).toBe(false);
    expect(guarded.isValid('TRANSFERRED', 'PROVISIONING', {
      transfer_completed: true,
    })).toBe(false);
  });

  it('unguarded transitions still work (no guard defined)', () => {
    // DORMANT → PROVISIONING has no guard — should be permissive
    expect(guarded.isValid('DORMANT', 'PROVISIONING')).toBe(true);
  });

  it('structurally invalid transitions are still rejected with guards', () => {
    expect(guarded.isValid('DORMANT', 'ACTIVE')).toBe(false);
    expect(guarded.isValid('ARCHIVED', 'ACTIVE')).toBe(false);
  });

  it('custom guard overrides default behavior', () => {
    const customGuards = {
      'DORMANT\u2192PROVISIONING': () => false, // always reject
    };
    const customValidator = createTransitionValidator(AGENT_LIFECYCLE_TRANSITIONS, customGuards);
    expect(customValidator.isValid('DORMANT', 'PROVISIONING')).toBe(false);
  });
});
