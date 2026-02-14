export interface EconomicScenarioChoreography {
  forward: readonly string[];
  compensation: readonly string[];
  invariants: readonly { description: string; enforceable: boolean }[];
}

export const ECONOMIC_CHOREOGRAPHY = {
  stake: {
    forward: ['stake.offered', 'stake.accepted'] as const,
    compensation: ['stake.returned'] as const,
    invariants: [
      { description: 'stake.amount_micro > 0', enforceable: true },
      { description: 'vested_micro + remaining_micro == amount_micro', enforceable: true },
    ] as const,
  },
  escrow: {
    forward: ['escrow.held', 'escrow.released'] as const,
    compensation: ['escrow.disputed', 'escrow.refunded', 'escrow.expired'] as const,
    invariants: [
      { description: 'escrow.amount_micro > 0', enforceable: true },
      { description: 'released + refunded <= held (conservation)', enforceable: true },
      { description: 'terminal states have no outbound transitions', enforceable: true },
    ] as const,
  },
  mutual_credit: {
    forward: ['credit.issued', 'credit.acknowledged', 'credit.settled'] as const,
    compensation: ['credit.forgiven'] as const,
    invariants: [
      { description: 'credit.amount_micro > 0', enforceable: true },
      { description: 'settled amount <= issued amount', enforceable: true },
    ] as const,
  },
} as const satisfies Record<string, EconomicScenarioChoreography>;

export type EconomicChoreography = typeof ECONOMIC_CHOREOGRAPHY;
