import type { BillingEntry, BillingRecipient } from '../schemas/billing-entry.js';
/**
 * Validate that billing recipients satisfy invariants:
 * - share_bps must sum to 10000
 * - amount_micro must sum to totalCostMicro
 */
export declare function validateBillingRecipients(recipients: BillingRecipient[], totalCostMicro: string): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate all cross-field invariants of a BillingEntry:
 *
 * 1. `total_cost_micro === raw_cost_micro * multiplier_bps / 10000` (BigInt arithmetic)
 * 2. Recipients `share_bps` sums to 10000 (delegates to `validateBillingRecipients`)
 * 3. Recipients `amount_micro` sums to `total_cost_micro`
 *
 * This completes the defense-in-depth picture alongside `validateBillingRecipients()`
 * and `validateSealingPolicy()`.
 *
 * @see BB-POST-001 — Billing multiplier cross-field gap
 */
export declare function validateBillingEntry(entry: BillingEntry): {
    valid: true;
} | {
    valid: false;
    reason: string;
};
/**
 * Deterministic largest-remainder allocation.
 *
 * Input convention: callers provide share_bps only. This function computes
 * amount_micro such that the sum equals totalCostMicro exactly (zero dust).
 *
 * Tie-breaking: when two recipients have equal remainders, the one appearing
 * first in the input array receives the extra micro-unit.
 *
 * @param recipients - Array of { address, role, share_bps }
 * @param totalCostMicro - String-encoded total cost in micro-USD
 * @returns Fully populated BillingRecipient[] with computed amount_micro
 */
export declare function allocateRecipients(recipients: ReadonlyArray<{
    address: string;
    role: string;
    share_bps: number;
}>, totalCostMicro: string): BillingRecipient[];
//# sourceMappingURL=billing.d.ts.map