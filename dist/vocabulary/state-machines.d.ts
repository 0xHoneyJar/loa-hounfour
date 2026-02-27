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
export declare const STATE_MACHINES: {
    readonly escrow: {
        readonly id: "escrow";
        readonly initial: "held";
        readonly terminal: readonly ["released", "refunded", "expired"];
        readonly states: readonly ["held", "released", "disputed", "refunded", "expired"];
        readonly transitions: readonly [{
            readonly from: "held";
            readonly to: "held";
            readonly event: "economy.escrow.funded";
        }, {
            readonly from: "held";
            readonly to: "released";
            readonly event: "economy.escrow.released";
        }, {
            readonly from: "held";
            readonly to: "disputed";
            readonly event: "economy.escrow.disputed";
        }, {
            readonly from: "held";
            readonly to: "expired";
            readonly event: "economy.escrow.expired";
        }, {
            readonly from: "disputed";
            readonly to: "released";
            readonly event: "economy.escrow.released";
        }, {
            readonly from: "disputed";
            readonly to: "refunded";
            readonly event: "economy.escrow.refunded";
        }];
    };
    readonly stake: {
        readonly id: "stake";
        readonly initial: "active";
        readonly terminal: readonly ["slashed", "withdrawn"];
        readonly states: readonly ["active", "vested", "slashed", "withdrawn"];
        readonly transitions: readonly [{
            readonly from: "active";
            readonly to: "vested";
            readonly event: "economy.stake.vested";
        }, {
            readonly from: "active";
            readonly to: "slashed";
            readonly event: "economy.stake.slashed";
        }, {
            readonly from: "active";
            readonly to: "withdrawn";
            readonly event: "economy.stake.withdrawn";
        }, {
            readonly from: "vested";
            readonly to: "withdrawn";
            readonly event: "economy.stake.withdrawn";
        }];
    };
    readonly credit: {
        readonly id: "credit";
        readonly initial: "extended";
        readonly terminal: readonly ["settled"];
        readonly states: readonly ["extended", "settled"];
        readonly transitions: readonly [{
            readonly from: "extended";
            readonly to: "settled";
            readonly event: "economy.credit.settled";
        }];
    };
};
export declare function getValidTransitions(machineId: string, fromState: string): string[];
export declare function isTerminalState(machineId: string, state: string): boolean;
export declare function isValidTransition(machineId: string, from: string, to: string): boolean;
//# sourceMappingURL=state-machines.d.ts.map