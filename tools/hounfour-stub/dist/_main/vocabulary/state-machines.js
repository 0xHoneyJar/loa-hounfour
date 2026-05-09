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
};
/** Helper to safely look up a machine by string key. */
function getMachine(machineId) {
    return STATE_MACHINES[machineId];
}
export function getValidTransitions(machineId, fromState) {
    const machine = getMachine(machineId);
    if (!machine)
        return [];
    return machine.transitions.filter(t => t.from === fromState).map(t => t.to);
}
export function isTerminalState(machineId, state) {
    const machine = getMachine(machineId);
    if (!machine)
        return false;
    return machine.terminal.includes(state);
}
export function isValidTransition(machineId, from, to) {
    const machine = getMachine(machineId);
    if (!machine)
        return false;
    return machine.transitions.some(t => t.from === from && t.to === to);
}
//# sourceMappingURL=state-machines.js.map