/**
 * Reservation arithmetic utilities for agent capacity guarantees.
 *
 * Implements SDD §3.9 — computeReservedMicro, validateReservationTier,
 * and shouldAllowRequest with SKP-003 floor-breach fix.
 *
 * All arithmetic uses BigInt via parseMicroUSD (IMP-002). Never raw BigInt().
 *
 * @see SDD §3.9 — Reservation Utilities
 * @see Issue #9 — Enshrined agent-owned inference capacity
 */
import { parseMicroUSD } from './pricing.js';
import { RESERVATION_TIER_MAP, type ReservationTier } from '../vocabulary/reservation-tier.js';
import type { ReservationEnforcement } from '../vocabulary/reservation-enforcement.js';
import type { ConformanceLevel } from '../schemas/model/conformance-level.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReservationDecision {
  /** Whether the request should be allowed. */
  allowed: boolean;
  /** Reason for the decision. */
  reason: string;
  /** Whether the reservation floor was breached. */
  floor_breached: boolean;
  /** The enforcement action taken (only present when floor is breached). */
  enforcement_action?: 'block' | 'warn' | 'downgrade';
}

// ---------------------------------------------------------------------------
// computeReservedMicro — Ceil-division reservation computation
// ---------------------------------------------------------------------------

/**
 * Compute the reserved micro-USD amount for a given budget limit and basis points.
 *
 * Uses ceil division: `(limit * bps + 9999) / 10000` to ensure the reserved
 * amount is never understated. This is the same bias-toward-the-agent principle
 * that AWS uses for reserved capacity billing.
 *
 * When `bps` is 0, returns '0' without performing BigInt arithmetic.
 * When `bps` is undefined (no reservation), returns '0' — this distinction
 * is semantic: 0 means "explicitly no reservation", undefined means
 * "reservation not configured". Both yield zero reserved capacity.
 *
 * @param limitMicro - Budget limit in micro-USD (string-encoded BigInt)
 * @param bps - Reserved capacity in basis points (0-10000). 10000 = 100%.
 * @returns Reserved micro-USD amount (string-encoded BigInt), ceil-rounded
 * @throws {TypeError} If limitMicro is not a valid MicroUSD string
 * @throws {RangeError} If bps is outside [0, 10000] or not an integer
 */
export function computeReservedMicro(limitMicro: string, bps: number | undefined): string {
  if (bps === undefined || bps === 0) return '0';

  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) {
    throw new RangeError(`bps must be an integer in [0, 10000], got ${bps}`);
  }

  const limit = parseMicroUSD(limitMicro);
  if (limit <= 0n) return '0';

  const bpsBig = BigInt(bps);

  // Ceil division: (limit * bps + 9999) / 10000
  const reserved = (limit * bpsBig + 9999n) / 10000n;

  return reserved.toString();
}

// ---------------------------------------------------------------------------
// validateReservationTier — Check bps against conformance level minimum
// ---------------------------------------------------------------------------

export interface TierValidation {
  valid: boolean;
  minimum_bps: number;
  actual_bps: number;
  reason?: string;
}

/**
 * Validate that a reservation's basis points meet the minimum for the
 * agent's conformance level.
 *
 * @param conformanceLevel - Agent's earned conformance level
 * @param actualBps - The actual reserved_capacity_bps
 * @returns Validation result with minimum requirement
 */
export function validateReservationTier(
  conformanceLevel: ConformanceLevel,
  actualBps: number,
): TierValidation {
  const minimumBps = RESERVATION_TIER_MAP[conformanceLevel];

  if (actualBps >= minimumBps) {
    return { valid: true, minimum_bps: minimumBps, actual_bps: actualBps };
  }

  return {
    valid: false,
    minimum_bps: minimumBps,
    actual_bps: actualBps,
    reason: `Reservation ${actualBps} bps is below minimum ${minimumBps} bps for ${conformanceLevel}`,
  };
}

// ---------------------------------------------------------------------------
// shouldAllowRequest — Floor-aware budget gating (SKP-003 fix)
// ---------------------------------------------------------------------------

/**
 * Determine whether a request should be allowed given available budget,
 * request cost, and reservation floor.
 *
 * **SKP-003 Fix:** The floor breach condition is `available <= reserved`
 * (not `available < reserved`). When available equals reserved exactly,
 * spending the request would breach the floor — so this IS a floor breach.
 * The off-by-one in the original design would have allowed one request
 * to silently consume the last unit of reserved capacity.
 *
 * Algorithm:
 * 1. If available >= cost → ALLOW (sufficient budget, no floor concern)
 * 2. If available <= reserved → floor breach (budget at or below floor)
 * 3. Otherwise → normal budget shortfall (above floor but insufficient)
 *
 * @param availableMicro - Available budget in micro-USD (string-encoded BigInt)
 * @param costMicro - Request cost in micro-USD (string-encoded BigInt)
 * @param reservedMicro - Reserved floor in micro-USD (string-encoded BigInt)
 * @param enforcement - How to enforce the reservation ('strict' | 'advisory' | 'unsupported')
 * @returns Decision with allowed flag, reason, and floor_breached indicator
 */
export function shouldAllowRequest(
  availableMicro: string,
  costMicro: string,
  reservedMicro: string,
  enforcement: ReservationEnforcement,
): ReservationDecision {
  const available = parseMicroUSD(availableMicro);
  const cost = parseMicroUSD(costMicro);
  const reserved = parseMicroUSD(reservedMicro);

  // Case 1: Sufficient budget — always allow
  if (available >= cost) {
    return {
      allowed: true,
      reason: 'Sufficient budget available',
      floor_breached: false,
    };
  }

  // Case 2: Floor breach — available is at or below the reserved floor (SKP-003)
  if (available <= reserved) {
    if (enforcement === 'unsupported') {
      // Provider doesn't enforce reservations — treat as normal shortfall
      return {
        allowed: false,
        reason: 'Insufficient budget (reservation enforcement unsupported)',
        floor_breached: true,
        enforcement_action: 'block',
      };
    }

    if (enforcement === 'advisory') {
      return {
        allowed: false,
        reason: 'Budget at or below reservation floor (advisory)',
        floor_breached: true,
        enforcement_action: 'warn',
      };
    }

    // strict enforcement
    return {
      allowed: false,
      reason: 'Budget at or below reservation floor (strict enforcement)',
      floor_breached: true,
      enforcement_action: 'block',
    };
  }

  // Case 3: Above floor but insufficient — normal budget shortfall
  return {
    allowed: false,
    reason: 'Insufficient budget (above reservation floor)',
    floor_breached: false,
    enforcement_action: enforcement === 'strict' ? 'block' : enforcement === 'advisory' ? 'warn' : 'block',
  };
}
