/**
 * Economic choreography — forward/compensation pattern for value-economy flows.
 *
 * Inspired by transfer-choreography.ts (v2.3.0) and Ostrom's design principles
 * for commons governance. Each scenario defines a happy path (forward) and
 * failure recovery (compensation), with enforceable invariants.
 *
 * Step names use canonical EVENT_TYPES keys for cross-system consistency.
 *
 * @see BB-POST-MERGE-002 — Choreography naming alignment
 */
export const ECONOMIC_CHOREOGRAPHY = {
    stake: {
        forward: ['economy.stake.created', 'economy.stake.vested'],
        compensation: ['economy.stake.withdrawn', 'economy.stake.slashed'],
        invariants: [
            { description: 'stake.amount_micro > 0', enforceable: true },
            { description: 'vested_micro + remaining_micro == amount_micro', enforceable: true },
        ],
        saga: {
            compensation_trigger: 'Slashing dispute or vesting invalidation',
            idempotency: 'Stake state machine prevents double-slash',
        },
    },
    escrow: {
        forward: ['economy.escrow.created', 'economy.escrow.released'],
        compensation: ['economy.escrow.refunded', 'economy.escrow.expired'],
        invariants: [
            { description: 'escrow.amount_micro > 0', enforceable: true },
            { description: 'released + refunded <= held (conservation)', enforceable: true },
            { description: 'terminal states have no outbound transitions', enforceable: true },
        ],
        saga: {
            compensation_trigger: 'Release fails or bilateral disagreement',
            idempotency: 'Escrow state is terminal — re-release is no-op',
        },
    },
    mutual_credit: {
        forward: ['economy.credit.extended', 'economy.credit.settled'],
        compensation: ['economy.credit.settled'],
        invariants: [
            { description: 'credit.amount_micro > 0', enforceable: true },
            { description: 'settled amount <= issued amount', enforceable: true },
        ],
        saga: {
            compensation_trigger: 'Settlement failure or credit default',
            idempotency: 'Settled flag is idempotent boolean transition',
        },
    },
};
//# sourceMappingURL=economic-choreography.js.map