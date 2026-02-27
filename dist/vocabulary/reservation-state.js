/**
 * Reservation state vocabulary with valid transition map.
 *
 * Lifecycle: active → expired | revoked
 * An active reservation can expire (temporal) or be revoked (governance action).
 * Terminal states cannot transition further.
 *
 * @see SDD §3.8 — AgentCapacityReservation state field (IMP-004)
 */
import { Type } from '@sinclair/typebox';
export const ReservationStateSchema = Type.Union([
    Type.Literal('active'),
    Type.Literal('expired'),
    Type.Literal('revoked'),
], {
    $id: 'ReservationState',
    description: 'Current lifecycle state of a capacity reservation.',
});
export const RESERVATION_STATES = [
    'active',
    'expired',
    'revoked',
];
/**
 * Valid state transitions for reservations.
 * Key = from state, Value = set of allowed target states.
 */
export const RESERVATION_STATE_TRANSITIONS = {
    active: ['expired', 'revoked'],
    expired: [],
    revoked: [],
};
/**
 * Check whether a state transition is valid.
 */
export function isValidReservationTransition(from, to) {
    return RESERVATION_STATE_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=reservation-state.js.map