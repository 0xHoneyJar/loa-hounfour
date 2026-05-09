import type { ReservationEnforcement } from '../vocabulary/reservation-enforcement.js';
import type { ConformanceLevel } from '../schemas/model/conformance-level.js';
import type { GovernanceConfig } from '../schemas/governance-config.js';
export interface ReservationDecision {
    /** Whether the request should be allowed. */
    allowed: boolean;
    /** Reason for the decision. */
    reason: string;
    /** Whether the reservation floor was breached. */
    floor_breached: boolean;
    /** Whether the floor WOULD be breached by this transaction (advisory allow-through). */
    would_breach_floor?: boolean;
    /** The enforcement action taken (only present when floor is breached). */
    enforcement_action?: 'block' | 'warn' | 'downgrade';
    /** Advisory warning when approaching or breaching floor. */
    warning?: string;
    /** Post-transaction available balance (string-encoded BigInt). */
    post_transaction_available?: string;
}
/**
 * Advisory warning threshold: warn when post-transaction balance is
 * within this percentage of the reservation floor.
 *
 * 20% means: if floor is 500, warn when post-transaction < 600.
 * Calculation: post_transaction < reserved * (100 + threshold) / 100
 *
 * Configurable via GovernanceConfig (FR-6, Sprint 3).
 */
export declare const ADVISORY_WARNING_THRESHOLD_PERCENT = 20;
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
export declare function computeReservedMicro(limitMicro: string, bps: number | undefined): string;
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
 * Accepts optional GovernanceConfig to override default tier minimums.
 *
 * @param conformanceLevel - Agent's earned conformance level
 * @param actualBps - The actual reserved_capacity_bps
 * @param config - Optional governance config overriding default tiers
 * @returns Validation result with minimum requirement
 */
export declare function validateReservationTier(conformanceLevel: ConformanceLevel, actualBps: number, config?: GovernanceConfig): TierValidation;
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
 * @param config - Optional GovernanceConfig to override advisory threshold (v5.3.0)
 * @returns Decision with allowed flag, reason, floor_breached, and optional warning
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
 */
export declare function shouldAllowRequest(availableMicro: string, costMicro: string, reservedMicro: string, enforcement: ReservationEnforcement, config?: GovernanceConfig): ReservationDecision;
//# sourceMappingURL=reservation.d.ts.map