/**
 * Reservation tier vocabulary — maps ConformanceLevel to reserved capacity basis points.
 *
 * Higher trust level → more capacity reserved. This implements the principle
 * that agents who have earned trust through conformance verification deserve
 * guaranteed access to compute resources.
 *
 * @see SDD §3.8 — ReservationTier mapping
 */
import { Type } from '@sinclair/typebox';
/**
 * Schema for reservation tier values (basis points, 0-10000).
 * 10000 bps = 100%.
 */
export const ReservationTierSchema = Type.Integer({
    $id: 'ReservationTier',
    minimum: 0,
    maximum: 10000,
    description: 'Reserved capacity in basis points (0-10000). 10000 = 100%.',
});
/**
 * Default reservation tiers per conformance level.
 *
 * - self_declared: 3% (300 bps) — minimal guarantee
 * - community_verified: 5% (500 bps) — moderate trust
 * - protocol_certified: 10% (1000 bps) — highest guarantee
 */
export const RESERVATION_TIER_MAP = {
    self_declared: 300,
    community_verified: 500,
    protocol_certified: 1000,
};
/**
 * Protocol rounding bias policy.
 *
 * When arithmetic rounding creates ambiguity (e.g., ceil vs floor division),
 * the protocol biases toward the rights-holder (the agent). This ensures:
 * - computeReservedMicro uses ceiling division: (limit * bps + 9999) / 10000
 * - shouldAllowRequest uses SKP-003: available <= reserved (not <)
 *
 * Combined effect: the agent always gets the benefit of sub-micro fractions.
 * This is a deliberate policy choice, not an implementation detail.
 *
 * Basel III parallel: regulatory capital ratios round toward the safety margin.
 *
 * @see computeReservedMicro — ceiling division
 * @see shouldAllowRequest — SKP-003 floor enforcement
 * @see constraints/ReservationArithmetic.constraints.json
 */
export const ROUNDING_BIAS = 'rights_holder';
//# sourceMappingURL=reservation-tier.js.map