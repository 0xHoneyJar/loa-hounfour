import { type EventType } from './event-types.js';

export interface EconomicScenarioChoreography {
  forward: readonly EventType[];
  compensation: readonly EventType[];
  invariants: readonly { description: string; enforceable: boolean }[];
}

export const ECONOMIC_CHOREOGRAPHY = {
  stake: {
    forward: ['economy.stake.created', 'economy.stake.vested'] as const,
    compensation: ['economy.stake.withdrawn', 'economy.stake.slashed'] as const,
    invariants: [
      { description: 'stake.amount_micro > 0', enforceable: true },
      { description: 'vested_micro + remaining_micro == amount_micro', enforceable: true },
    ] as const,
  },
  escrow: {
    forward: ['economy.escrow.created', 'economy.escrow.released'] as const,
    compensation: ['economy.escrow.refunded', 'economy.escrow.expired'] as const,
    invariants: [
      { description: 'escrow.amount_micro > 0', enforceable: true },
      { description: 'released + refunded <= held (conservation)', enforceable: true },
      { description: 'terminal states have no outbound transitions', enforceable: true },
    ] as const,
  },
  mutual_credit: {
    forward: ['economy.credit.extended', 'economy.credit.settled'] as const,
    compensation: ['economy.credit.settled'] as const,
    invariants: [
      { description: 'credit.amount_micro > 0', enforceable: true },
      { description: 'settled amount <= issued amount', enforceable: true },
    ] as const,
  },
} as const satisfies Record<string, EconomicScenarioChoreography>;

export type EconomicChoreography = typeof ECONOMIC_CHOREOGRAPHY;
