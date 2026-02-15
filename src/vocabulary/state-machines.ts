/**
 * Unified state machine vocabulary for economy aggregates.
 *
 * Declares escrow, stake, and credit state machines with their states,
 * transitions, and terminal conditions. Utility functions provide
 * data-driven transition validation without hardcoded logic.
 *
 * @see S1-T1 — v4.6.0 Formalization Release
 */
import { type EventType } from './event-types.js';

export interface StateMachineTransition {
  from: string;
  to: string;
  event?: EventType;
}

export interface StateMachineDefinition {
  id: string;
  initial: string;
  terminal: readonly string[];
  states: readonly string[];
  transitions: readonly StateMachineTransition[];
}

export const STATE_MACHINES = {
  escrow: {
    id: 'escrow',
    initial: 'held',
    terminal: ['released', 'refunded', 'expired'],
    states: ['held', 'released', 'disputed', 'refunded', 'expired'],
    transitions: [
      { from: 'held', to: 'held', event: 'economy.escrow.funded' },
      { from: 'held', to: 'released', event: 'economy.escrow.released' },
      { from: 'held', to: 'disputed', event: 'economy.escrow.disputed' },
      { from: 'held', to: 'expired', event: 'economy.escrow.expired' },
      { from: 'disputed', to: 'released', event: 'economy.escrow.released' },
      { from: 'disputed', to: 'refunded', event: 'economy.escrow.refunded' },
    ],
  },
  stake: {
    id: 'stake',
    initial: 'active',
    terminal: ['slashed', 'withdrawn'],
    states: ['active', 'vested', 'slashed', 'withdrawn'],
    transitions: [
      { from: 'active', to: 'vested', event: 'economy.stake.vested' },
      { from: 'active', to: 'slashed', event: 'economy.stake.slashed' },
      { from: 'active', to: 'withdrawn', event: 'economy.stake.withdrawn' },
      { from: 'vested', to: 'withdrawn', event: 'economy.stake.withdrawn' },
    ],
  },
  credit: {
    id: 'credit',
    initial: 'extended',
    terminal: ['settled'],
    states: ['extended', 'settled'],
    transitions: [
      { from: 'extended', to: 'settled', event: 'economy.credit.settled' },
    ],
  },
} as const satisfies Record<string, StateMachineDefinition>;

/** Helper to safely look up a machine by string key. */
function getMachine(machineId: string): StateMachineDefinition | undefined {
  return (STATE_MACHINES as Record<string, StateMachineDefinition>)[machineId];
}

export function getValidTransitions(machineId: string, fromState: string): string[] {
  const machine = getMachine(machineId);
  if (!machine) return [];
  return machine.transitions.filter(t => t.from === fromState).map(t => t.to);
}

export function isTerminalState(machineId: string, state: string): boolean {
  const machine = getMachine(machineId);
  if (!machine) return false;
  return machine.terminal.includes(state);
}

export function isValidTransition(machineId: string, from: string, to: string): boolean {
  const machine = getMachine(machineId);
  if (!machine) return false;
  return machine.transitions.some(t => t.from === from && t.to === to);
}
