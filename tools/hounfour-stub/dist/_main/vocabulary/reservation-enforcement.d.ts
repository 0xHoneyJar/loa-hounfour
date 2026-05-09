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
import { type Static } from '@sinclair/typebox';
export declare const ReservationEnforcementSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"unsupported">]>;
export type ReservationEnforcement = Static<typeof ReservationEnforcementSchema>;
export declare const RESERVATION_ENFORCEMENT_MODES: readonly ReservationEnforcement[];
//# sourceMappingURL=reservation-enforcement.d.ts.map