/**
 * Tests for State, Transition, and StateMachineConfig schemas.
 *
 * @see SDD §4.4 — StateMachine (FR-1.4)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  StateSchema,
  TransitionSchema,
  StateMachineConfigSchema,
  type State,
  type Transition,
  type StateMachineConfig,
} from '../../src/commons/state-machine.js';

describe('State', () => {
  describe('valid instances', () => {
    it('accepts a full state with all fields', () => {
      const state: State = {
        name: 'active',
        description: 'Resource is actively being used.',
        entry_conditions: ["balance > 0"],
        exit_conditions: ["balance == 0"],
      };
      expect(Value.Check(StateSchema, state)).toBe(true);
    });

    it('accepts minimal state (name only)', () => {
      expect(Value.Check(StateSchema, { name: 'cold' })).toBe(true);
    });

    it('accepts state with empty condition arrays', () => {
      expect(Value.Check(StateSchema, {
        name: 'idle',
        entry_conditions: [],
        exit_conditions: [],
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects empty name', () => {
      expect(Value.Check(StateSchema, { name: '' })).toBe(false);
    });

    it('rejects name over 100 chars', () => {
      expect(Value.Check(StateSchema, { name: 'x'.repeat(101) })).toBe(false);
    });

    it('rejects description over 500 chars', () => {
      expect(Value.Check(StateSchema, {
        name: 'test',
        description: 'x'.repeat(501),
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(StateSchema, { name: 'test', extra: true })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "State"', () => {
      expect(StateSchema.$id).toBe('State');
    });
  });
});

describe('Transition', () => {
  describe('valid instances', () => {
    it('accepts a full transition', () => {
      const t: Transition = {
        from: 'cold',
        to: 'warming',
        event: 'commons.quality.recorded',
        guard: "sample_count >= 1",
      };
      expect(Value.Check(TransitionSchema, t)).toBe(true);
    });

    it('accepts minimal transition (from + to)', () => {
      expect(Value.Check(TransitionSchema, { from: 'a', to: 'b' })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects empty from', () => {
      expect(Value.Check(TransitionSchema, { from: '', to: 'b' })).toBe(false);
    });

    it('rejects empty to', () => {
      expect(Value.Check(TransitionSchema, { from: 'a', to: '' })).toBe(false);
    });

    it('rejects invalid event pattern', () => {
      expect(Value.Check(TransitionSchema, {
        from: 'a',
        to: 'b',
        event: 'bad event',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(TransitionSchema, { from: 'a', to: 'b', extra: true })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "Transition"', () => {
      expect(TransitionSchema.$id).toBe('Transition');
    });
  });
});

describe('StateMachineConfig', () => {
  const reputationMachine: StateMachineConfig = {
    states: [
      { name: 'cold' },
      { name: 'warming' },
      { name: 'established' },
      { name: 'authoritative' },
    ],
    transitions: [
      { from: 'cold', to: 'warming', event: 'commons.quality.recorded' },
      { from: 'warming', to: 'established', guard: "sample_count >= min_sample_count" },
      { from: 'established', to: 'authoritative', guard: "personal_weight > 0.9" },
    ],
    initial_state: 'cold',
    terminal_states: [],
  };

  describe('valid instances', () => {
    it('accepts a reputation state machine config', () => {
      expect(Value.Check(StateMachineConfigSchema, reputationMachine)).toBe(true);
    });

    it('accepts a minimal one-state machine', () => {
      expect(Value.Check(StateMachineConfigSchema, {
        states: [{ name: 'only' }],
        transitions: [],
        initial_state: 'only',
        terminal_states: ['only'],
      })).toBe(true);
    });

    it('accepts escrow-style machine with terminal states', () => {
      const escrow: StateMachineConfig = {
        states: [
          { name: 'held' },
          { name: 'released' },
          { name: 'disputed' },
          { name: 'refunded' },
          { name: 'expired' },
        ],
        transitions: [
          { from: 'held', to: 'released', event: 'economy.escrow.released' },
          { from: 'held', to: 'disputed', event: 'economy.escrow.disputed' },
          { from: 'held', to: 'expired', event: 'economy.escrow.expired' },
          { from: 'disputed', to: 'released', event: 'economy.escrow.released' },
          { from: 'disputed', to: 'refunded', event: 'economy.escrow.refunded' },
        ],
        initial_state: 'held',
        terminal_states: ['released', 'refunded', 'expired'],
      };
      expect(Value.Check(StateMachineConfigSchema, escrow)).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects empty states array', () => {
      expect(Value.Check(StateMachineConfigSchema, {
        states: [],
        transitions: [],
        initial_state: 'x',
        terminal_states: [],
      })).toBe(false);
    });

    it('rejects missing initial_state', () => {
      expect(Value.Check(StateMachineConfigSchema, {
        states: [{ name: 'a' }],
        transitions: [],
        terminal_states: [],
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(StateMachineConfigSchema, {
        ...reputationMachine,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "StateMachineConfig"', () => {
      expect(StateMachineConfigSchema.$id).toBe('StateMachineConfig');
    });

    it('has additionalProperties false', () => {
      expect(StateMachineConfigSchema.additionalProperties).toBe(false);
    });
  });
});
