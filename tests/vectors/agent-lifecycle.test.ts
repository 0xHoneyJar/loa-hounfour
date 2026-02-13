import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isValidTransition,
  AGENT_LIFECYCLE_STATES,
  AGENT_LIFECYCLE_TRANSITIONS,
  type AgentLifecycleState,
} from '../../src/schemas/agent-lifecycle.js';
import { createTransitionValidator } from '../../src/utilities/lifecycle.js';

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
