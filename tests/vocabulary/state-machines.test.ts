/**
 * STATE_MACHINES structural invariant tests and utility function tests.
 *
 * Validates that the unified state machine vocabulary is internally consistent
 * and that utility functions correctly query the machine definitions.
 *
 * @see S1-T1, S1-T5 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  STATE_MACHINES,
  getValidTransitions,
  isTerminalState,
  isValidTransition,
  type StateMachineDefinition,
} from '../../src/vocabulary/state-machines.js';
import { ESCROW_TRANSITIONS, isValidEscrowTransition } from '../../src/schemas/escrow-entry.js';
import { EVENT_TYPES } from '../../src/vocabulary/event-types.js';

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

describe('STATE_MACHINES structural invariants', () => {
  const machineIds = Object.keys(STATE_MACHINES);

  it('has exactly 3 machine definitions (escrow, stake, credit)', () => {
    expect(machineIds).toHaveLength(3);
    expect(machineIds).toContain('escrow');
    expect(machineIds).toContain('stake');
    expect(machineIds).toContain('credit');
  });

  for (const id of machineIds) {
    describe(`machine: ${id}`, () => {
      const machine: StateMachineDefinition = STATE_MACHINES[id];

      it('id field matches record key', () => {
        expect(machine.id).toBe(id);
      });

      it('initial state is a member of states', () => {
        expect(machine.states).toContain(machine.initial);
      });

      it('all terminal states are members of states', () => {
        for (const terminal of machine.terminal) {
          expect(machine.states, `terminal "${terminal}" not in states`).toContain(terminal);
        }
      });

      it('initial state is NOT a terminal state', () => {
        expect(machine.terminal).not.toContain(machine.initial);
      });

      it('all transition "from" states are members of states', () => {
        for (const t of machine.transitions) {
          expect(machine.states, `from "${t.from}" not in states`).toContain(t.from);
        }
      });

      it('all transition "to" states are members of states', () => {
        for (const t of machine.transitions) {
          expect(machine.states, `to "${t.to}" not in states`).toContain(t.to);
        }
      });

      it('terminal states have no outgoing transitions', () => {
        for (const terminal of machine.terminal) {
          const outgoing = machine.transitions.filter(t => t.from === terminal);
          expect(outgoing, `terminal "${terminal}" has outgoing transitions`).toHaveLength(0);
        }
      });

      it('no duplicate transitions (same from->to pair)', () => {
        const pairs = new Set<string>();
        for (const t of machine.transitions) {
          const key = `${t.from}->${t.to}`;
          expect(pairs.has(key), `duplicate transition: ${key}`).toBe(false);
          pairs.add(key);
        }
      });

      it('has at least one transition', () => {
        expect(machine.transitions.length).toBeGreaterThan(0);
      });

      it('has at least one terminal state', () => {
        expect(machine.terminal.length).toBeGreaterThan(0);
      });

      it('every non-terminal state has at least one outgoing transition', () => {
        for (const state of machine.states) {
          if (machine.terminal.includes(state)) continue;
          const outgoing = machine.transitions.filter(t => t.from === state);
          expect(outgoing.length, `non-terminal "${state}" has no outgoing transitions`).toBeGreaterThan(0);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Event type consistency
// ---------------------------------------------------------------------------

describe('STATE_MACHINES event type consistency', () => {
  it('all transition event references are valid EventType keys', () => {
    const knownEventTypes = new Set(Object.keys(EVENT_TYPES));
    for (const id of Object.keys(STATE_MACHINES)) {
      for (const t of STATE_MACHINES[id].transitions) {
        if (t.event !== undefined) {
          expect(
            knownEventTypes.has(t.event),
            `machine "${id}" transition ${t.from}->${t.to} references unknown event "${t.event}"`,
          ).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Escrow machine specifics
// ---------------------------------------------------------------------------

describe('STATE_MACHINES.escrow specifics', () => {
  it('initial state is "held"', () => {
    expect(STATE_MACHINES.escrow.initial).toBe('held');
  });

  it('terminal states are released, refunded, expired', () => {
    expect([...STATE_MACHINES.escrow.terminal].sort()).toEqual(['expired', 'refunded', 'released']);
  });

  it('states include "disputed"', () => {
    expect(STATE_MACHINES.escrow.states).toContain('disputed');
  });
});

// ---------------------------------------------------------------------------
// Stake machine specifics
// ---------------------------------------------------------------------------

describe('STATE_MACHINES.stake specifics', () => {
  it('initial state is "active"', () => {
    expect(STATE_MACHINES.stake.initial).toBe('active');
  });

  it('terminal states are slashed, withdrawn', () => {
    expect([...STATE_MACHINES.stake.terminal].sort()).toEqual(['slashed', 'withdrawn']);
  });

  it('vested can transition to withdrawn', () => {
    expect(isValidTransition('stake', 'vested', 'withdrawn')).toBe(true);
  });

  it('vested cannot transition to slashed', () => {
    expect(isValidTransition('stake', 'vested', 'slashed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Credit machine specifics
// ---------------------------------------------------------------------------

describe('STATE_MACHINES.credit specifics', () => {
  it('initial state is "extended"', () => {
    expect(STATE_MACHINES.credit.initial).toBe('extended');
  });

  it('has exactly one transition (extended -> settled)', () => {
    expect(STATE_MACHINES.credit.transitions).toHaveLength(1);
    expect(STATE_MACHINES.credit.transitions[0].from).toBe('extended');
    expect(STATE_MACHINES.credit.transitions[0].to).toBe('settled');
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe('getValidTransitions()', () => {
  it('returns valid targets from escrow "held"', () => {
    const targets = getValidTransitions('escrow', 'held');
    expect(targets).toContain('held');
    expect(targets).toContain('released');
    expect(targets).toContain('disputed');
    expect(targets).toContain('expired');
    expect(targets).toHaveLength(4);
  });

  it('returns empty array for terminal states', () => {
    expect(getValidTransitions('escrow', 'released')).toEqual([]);
    expect(getValidTransitions('escrow', 'refunded')).toEqual([]);
    expect(getValidTransitions('escrow', 'expired')).toEqual([]);
    expect(getValidTransitions('stake', 'slashed')).toEqual([]);
    expect(getValidTransitions('stake', 'withdrawn')).toEqual([]);
    expect(getValidTransitions('credit', 'settled')).toEqual([]);
  });

  it('returns empty array for unknown machine', () => {
    expect(getValidTransitions('nonexistent', 'any')).toEqual([]);
  });

  it('returns empty array for unknown state', () => {
    expect(getValidTransitions('escrow', 'nonexistent')).toEqual([]);
  });
});

describe('isTerminalState()', () => {
  it('identifies terminal states correctly', () => {
    expect(isTerminalState('escrow', 'released')).toBe(true);
    expect(isTerminalState('escrow', 'refunded')).toBe(true);
    expect(isTerminalState('escrow', 'expired')).toBe(true);
    expect(isTerminalState('stake', 'slashed')).toBe(true);
    expect(isTerminalState('stake', 'withdrawn')).toBe(true);
    expect(isTerminalState('credit', 'settled')).toBe(true);
  });

  it('identifies non-terminal states correctly', () => {
    expect(isTerminalState('escrow', 'held')).toBe(false);
    expect(isTerminalState('escrow', 'disputed')).toBe(false);
    expect(isTerminalState('stake', 'active')).toBe(false);
    expect(isTerminalState('stake', 'vested')).toBe(false);
    expect(isTerminalState('credit', 'extended')).toBe(false);
  });

  it('returns false for unknown machine', () => {
    expect(isTerminalState('nonexistent', 'any')).toBe(false);
  });
});

describe('isValidTransition()', () => {
  it('validates known valid transitions', () => {
    expect(isValidTransition('escrow', 'held', 'held')).toBe(true);
    expect(isValidTransition('escrow', 'held', 'released')).toBe(true);
    expect(isValidTransition('escrow', 'held', 'disputed')).toBe(true);
    expect(isValidTransition('escrow', 'held', 'expired')).toBe(true);
    expect(isValidTransition('escrow', 'disputed', 'released')).toBe(true);
    expect(isValidTransition('escrow', 'disputed', 'refunded')).toBe(true);
    expect(isValidTransition('stake', 'active', 'vested')).toBe(true);
    expect(isValidTransition('stake', 'active', 'slashed')).toBe(true);
    expect(isValidTransition('stake', 'active', 'withdrawn')).toBe(true);
    expect(isValidTransition('stake', 'vested', 'withdrawn')).toBe(true);
    expect(isValidTransition('credit', 'extended', 'settled')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidTransition('escrow', 'released', 'held')).toBe(false);
    expect(isValidTransition('escrow', 'held', 'refunded')).toBe(false);
    expect(isValidTransition('stake', 'vested', 'slashed')).toBe(false);
    expect(isValidTransition('stake', 'slashed', 'withdrawn')).toBe(false);
    expect(isValidTransition('credit', 'settled', 'extended')).toBe(false);
  });

  it('returns false for unknown machine', () => {
    expect(isValidTransition('nonexistent', 'a', 'b')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ESCROW_TRANSITIONS derivation equivalence (S1-T2)
// ---------------------------------------------------------------------------

describe('ESCROW_TRANSITIONS derived from STATE_MACHINES (S1-T2)', () => {
  it('held has exactly [held, released, disputed, expired] targets', () => {
    expect([...ESCROW_TRANSITIONS.held].sort()).toEqual(['disputed', 'expired', 'held', 'released']);
  });

  it('released is terminal (empty array)', () => {
    expect(ESCROW_TRANSITIONS.released).toEqual([]);
  });

  it('disputed has [released, refunded] targets', () => {
    expect([...ESCROW_TRANSITIONS.disputed].sort()).toEqual(['refunded', 'released']);
  });

  it('refunded is terminal (empty array)', () => {
    expect(ESCROW_TRANSITIONS.refunded).toEqual([]);
  });

  it('expired is terminal (empty array)', () => {
    expect(ESCROW_TRANSITIONS.expired).toEqual([]);
  });

  it('isValidEscrowTransition delegates to STATE_MACHINES', () => {
    expect(isValidEscrowTransition('held', 'held')).toBe(true);
    expect(isValidEscrowTransition('held', 'released')).toBe(true);
    expect(isValidEscrowTransition('held', 'disputed')).toBe(true);
    expect(isValidEscrowTransition('held', 'expired')).toBe(true);
    expect(isValidEscrowTransition('disputed', 'released')).toBe(true);
    expect(isValidEscrowTransition('disputed', 'refunded')).toBe(true);
    expect(isValidEscrowTransition('released', 'held')).toBe(false);
    expect(isValidEscrowTransition('held', 'refunded')).toBe(false);
  });

  it('covers all escrow states as keys', () => {
    const keys = Object.keys(ESCROW_TRANSITIONS).sort();
    expect(keys).toEqual(['disputed', 'expired', 'held', 'refunded', 'released']);
  });
});
