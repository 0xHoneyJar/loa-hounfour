import { type EventType } from './event-types.js';
export interface EconomicScenarioChoreography {
    forward: readonly EventType[];
    compensation: readonly EventType[];
    invariants: readonly {
        description: string;
        enforceable: boolean;
    }[];
    saga?: {
        compensation_trigger: string;
        idempotency: string;
    };
}
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
export declare const ECONOMIC_CHOREOGRAPHY: Record<string, EconomicScenarioChoreography>;
export type EconomicChoreography = typeof ECONOMIC_CHOREOGRAPHY;
//# sourceMappingURL=economic-choreography.d.ts.map