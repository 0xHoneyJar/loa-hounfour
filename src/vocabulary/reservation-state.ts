/**
 * Reservation state vocabulary with valid transition map.
 *
 * Lifecycle: active → expired | revoked
 * An active reservation can expire (temporal) or be revoked (governance action).
 * Terminal states cannot transition further.
 *
 * @see SDD §3.8 — AgentCapacityReservation state field (IMP-004)
 */
import { Type, type Static } from '@sinclair/typebox';

export const ReservationStateSchema = Type.Union(
  [
    Type.Literal('active'),
    Type.Literal('expired'),
    Type.Literal('revoked'),
  ],
  {
    $id: 'ReservationState',
    description: 'Current lifecycle state of a capacity reservation.',
  },
);

export type ReservationState = Static<typeof ReservationStateSchema>;

export const RESERVATION_STATES: readonly ReservationState[] = [
  'active',
  'expired',
  'revoked',
] as const;

/**
 * Valid state transitions for reservations.
 * Key = from state, Value = set of allowed target states.
 */
export const RESERVATION_STATE_TRANSITIONS: Readonly<Record<ReservationState, readonly ReservationState[]>> = {
  active: ['expired', 'revoked'],
  expired: [],
  revoked: [],
} as const;

/**
 * Check whether a state transition is valid.
 */
export function isValidReservationTransition(from: ReservationState, to: ReservationState): boolean {
  return RESERVATION_STATE_TRANSITIONS[from].includes(to);
}
