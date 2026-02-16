/**
 * Reservation tier vocabulary — maps ConformanceLevel to reserved capacity basis points.
 *
 * Higher trust level → more capacity reserved. This implements the principle
 * that agents who have earned trust through conformance verification deserve
 * guaranteed access to compute resources.
 *
 * @see SDD §3.8 — ReservationTier mapping
 */
import { Type, type Static } from '@sinclair/typebox';
import type { ConformanceLevel } from '../schemas/model/conformance-level.js';

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

export type ReservationTier = Static<typeof ReservationTierSchema>;

/**
 * Default reservation tiers per conformance level.
 *
 * - self_declared: 3% (300 bps) — minimal guarantee
 * - community_verified: 5% (500 bps) — moderate trust
 * - protocol_certified: 10% (1000 bps) — highest guarantee
 */
export const RESERVATION_TIER_MAP: Readonly<Record<ConformanceLevel, ReservationTier>> = {
  self_declared: 300,
  community_verified: 500,
  protocol_certified: 1000,
} as const;
