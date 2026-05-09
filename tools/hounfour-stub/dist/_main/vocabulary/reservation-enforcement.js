/**
 * Reservation enforcement mode vocabulary.
 *
 * Defines how reservation guarantees are enforced by a provider:
 * - strict: Requests below the floor are blocked.
 * - advisory: Requests below the floor emit warnings but proceed.
 * - unsupported: Provider does not support reservation enforcement.
 *
 * @see SDD §3.12 — ReservationPolicy
 */
import { Type } from '@sinclair/typebox';
export const ReservationEnforcementSchema = Type.Union([
    Type.Literal('strict'),
    Type.Literal('advisory'),
    Type.Literal('unsupported'),
], {
    $id: 'ReservationEnforcement',
    description: 'How reservation guarantees are enforced by the provider.',
});
export const RESERVATION_ENFORCEMENT_MODES = [
    'strict',
    'advisory',
    'unsupported',
];
//# sourceMappingURL=reservation-enforcement.js.map