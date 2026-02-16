/**
 * Reservation arithmetic utilities for agent capacity guarantees.
 *
 * Implements SDD §3.1–§3.2 — computeReservedMicro, validateReservationTier,
 * and shouldAllowRequest with post-transaction floor check (HIGH-V52-001 fix)
 * and advisory graduated warnings.
 *
 * All arithmetic uses BigInt via parseMicroUSD (IMP-002). Never raw BigInt().
 *
 * **SKP-003 + ROUNDING_BIAS:** The floor breach condition is `available <= reserved`
 * (not `<`). Combined with ceiling division in computeReservedMicro, this ensures
 * the protocol systematically favors the rights-holder at boundaries.
 *
 * @see SDD §3.1 — Post-Transaction Floor Enforcement
 * @see SDD §3.2 — Advisory Graduated Warnings
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
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
  /** Advisory warning when approaching or breaching floor. */
  warning?: string;
  /** Post-transaction available balance (string-encoded BigInt). */
  post_transaction_available?: string;
}

// ---------------------------------------------------------------------------
// computeReservedMicro — Ceil-division reservation computation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Advisory Warning Threshold
// ---------------------------------------------------------------------------

/**
 * Advisory warning threshold: warn when post-transaction balance is
 * within this percentage of the reservation floor.
 *
 * 20% means: if floor is 500, warn when post-transaction < 600.
 * Calculation: post_transaction < reserved * (100 + threshold) / 100
 *
 * Configurable via GovernanceConfig (FR-6, Sprint 3).
 */
export const ADVISORY_WARNING_THRESHOLD_PERCENT = 20;

// ---------------------------------------------------------------------------
// computeReservedMicro — Ceil-division reservation computation
// ---------------------------------------------------------------------------

/**
 * Compute the reserved micro-USD amount for a given budget limit and basis points.
 *
 * Uses ceil division: `(limit * bps + 9999) / 10000` to ensure the reserved
 * amount is never understated. This implements the protocol's ROUNDING_BIAS
 * toward the rights-holder: when rounding creates ambiguity, the agent gets
 * the benefit.
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
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
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
// Advisory Warning Helper
// ---------------------------------------------------------------------------

/**
 * Check if post-transaction balance is within the advisory warning zone.
 *
 * Warning zone: post_transaction_available < reserved * (100 + threshold) / 100
 * Uses BigInt arithmetic to match protocol rounding conventions.
 *
 * @returns Warning message if in warning zone, null otherwise.
 */
function checkAdvisoryWarning(
  postTransaction: bigint,
  reserved: bigint,
  thresholdPercent: number = ADVISORY_WARNING_THRESHOLD_PERCENT,
): string | null {
  if (reserved <= 0n) return null;

  // Warning threshold: reserved * (100 + threshold) / 100
  // E.g., reserved=500, threshold=20 → threshold_value = 500 * 120 / 100 = 600
  const warningThreshold = (reserved * BigInt(100 + thresholdPercent)) / 100n;

  if (postTransaction < warningThreshold) {
    return `Post-transaction balance (${postTransaction.toString()}) is within ${thresholdPercent}% of reservation floor (${reserved.toString()})`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Floor Breach Handler
// ---------------------------------------------------------------------------

/**
 * Handle the case where a request would breach the reservation floor.
 *
 * Enforcement semantics (SDD §3.1.3):
 * - strict: BLOCK — the floor is inviolable
 * - advisory: ALLOW with warning — soft enforcement, caller decides (FL-PRD-001)
 * - unsupported: BLOCK — no enforcement mechanism, conservative default
 */
function handleFloorBreach(
  enforcement: ReservationEnforcement,
  postTransaction: bigint,
  reserved: bigint,
): ReservationDecision {
  const postTxStr = postTransaction.toString();

  if (enforcement === 'advisory') {
    // Advisory ALLOWS but warns (FL-PRD-001 decision)
    return {
      allowed: true,
      reason: 'Sufficient budget available (advisory: floor would be breached)',
      floor_breached: false, // Not yet breached — would be breached after spending
      warning: `Post-transaction balance (${postTxStr}) would breach reservation floor (${reserved.toString()})`,
      post_transaction_available: postTxStr,
    };
  }

  // strict and unsupported: BLOCK
  return {
    allowed: false,
    reason: `Request would breach reservation floor (post-transaction balance: ${postTxStr}, floor: ${reserved.toString()})`,
    floor_breached: true,
    enforcement_action: 'block',
    post_transaction_available: postTxStr,
  };
}

// ---------------------------------------------------------------------------
// At-Floor Handler (Case 2 — Preserves SKP-003)
// ---------------------------------------------------------------------------

function handleAtFloor(
  enforcement: ReservationEnforcement,
  available: bigint,
  reserved: bigint,
): ReservationDecision {
  if (enforcement === 'unsupported') {
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

  // strict
  return {
    allowed: false,
    reason: 'Budget at or below reservation floor (strict enforcement)',
    floor_breached: true,
    enforcement_action: 'block',
  };
}

// ---------------------------------------------------------------------------
// shouldAllowRequest — Post-transaction floor-aware budget gating
// ---------------------------------------------------------------------------

/**
 * Determine whether a request should be allowed given available budget,
 * request cost, and reservation floor.
 *
 * **v5.3.0 (HIGH-V52-001 fix):** Case 1 now checks post-transaction balance
 * against the reservation floor. Previously, `available >= cost` was sufficient
 * to allow; now `available - cost >= reserved` must also hold for strict mode.
 *
 * **SKP-003 Fix:** The floor breach condition is `available <= reserved`
 * (not `available < reserved`). When available equals reserved exactly,
 * spending the request would breach the floor.
 *
 * **Enforcement semantics (SDD §3.2.3):**
 * - strict: blocks on floor breach; no warnings
 * - advisory: allows through floor breach with warning; warns near floor
 * - unsupported: blocks on floor breach; no warnings (conservative default)
 *
 * Algorithm:
 * 1. If available >= cost → check post-transaction floor:
 *    a. If postTransaction < reserved → handleFloorBreach (enforcement-dependent)
 *    b. If advisory && near-floor → allow + warning
 *    c. Otherwise → allow
 * 2. If available <= reserved → floor breach (budget at or below floor)
 * 3. Otherwise → normal budget shortfall (above floor but insufficient)
 *
 * @param availableMicro - Available budget in micro-USD (string-encoded BigInt)
 * @param costMicro - Request cost in micro-USD (string-encoded BigInt)
 * @param reservedMicro - Reserved floor in micro-USD (string-encoded BigInt)
 * @param enforcement - How to enforce the reservation ('strict' | 'advisory' | 'unsupported')
 * @returns Decision with allowed flag, reason, floor_breached, and optional warning
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
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
  const postTransaction = available - cost;

  // Case 1: Sufficient budget — but check post-transaction floor
  if (available >= cost) {
    // NEW (v5.3.0): Post-transaction floor check (HIGH-V52-001 fix)
    if (postTransaction < reserved) {
      return handleFloorBreach(enforcement, postTransaction, reserved);
    }

    // Check advisory near-floor warning (FR-2)
    if (enforcement === 'advisory') {
      const warningResult = checkAdvisoryWarning(postTransaction, reserved);
      if (warningResult) {
        return {
          allowed: true,
          reason: 'Sufficient budget available',
          floor_breached: false,
          warning: warningResult,
          post_transaction_available: postTransaction.toString(),
        };
      }
    }

    return {
      allowed: true,
      reason: 'Sufficient budget available',
      floor_breached: false,
      post_transaction_available: postTransaction.toString(),
    };
  }

  // Case 2: Floor breach — available is at or below the reserved floor (SKP-003)
  if (available <= reserved) {
    return handleAtFloor(enforcement, available, reserved);
  }

  // Case 3: Above floor but insufficient — normal budget shortfall
  return {
    allowed: false,
    reason: 'Insufficient budget (above reservation floor)',
    floor_breached: false,
    enforcement_action: enforcement === 'strict' ? 'block' : enforcement === 'advisory' ? 'warn' : 'block',
  };
}
