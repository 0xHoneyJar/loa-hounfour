/**
 * Reservation state vocabulary with valid transition map.
 *
 * Lifecycle: active → expired | revoked
 * An active reservation can expire (temporal) or be revoked (governance action).
 * Terminal states cannot transition further.
 *
 * @see SDD §3.8 — AgentCapacityReservation state field (IMP-004)
 */
import { type Static } from '@sinclair/typebox';
export declare const ReservationStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"expired">, import("@sinclair/typebox").TLiteral<"revoked">]>;
export type ReservationState = Static<typeof ReservationStateSchema>;
export declare const RESERVATION_STATES: readonly ReservationState[];
/**
 * Valid state transitions for reservations.
 * Key = from state, Value = set of allowed target states.
 */
export declare const RESERVATION_STATE_TRANSITIONS: Readonly<Record<ReservationState, readonly ReservationState[]>>;
/**
 * Check whether a state transition is valid.
 */
export declare function isValidReservationTransition(from: ReservationState, to: ReservationState): boolean;
//# sourceMappingURL=reservation-state.d.ts.map