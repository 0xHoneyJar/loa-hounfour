/**
 * Validate that billing recipients satisfy invariants:
 * - share_bps must sum to 10000
 * - amount_micro must sum to totalCostMicro
 */
export function validateBillingRecipients(recipients, totalCostMicro) {
    const errors = [];
    const bpsSum = recipients.reduce((acc, r) => acc + r.share_bps, 0);
    if (bpsSum !== 10000) {
        errors.push(`share_bps sum ${bpsSum} !== 10000`);
    }
    const amountSum = recipients.reduce((acc, r) => acc + BigInt(r.amount_micro), 0n);
    if (amountSum !== BigInt(totalCostMicro)) {
        errors.push(`amount_micro sum ${amountSum} !== ${totalCostMicro}`);
    }
    return { valid: errors.length === 0, errors };
}
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
export function validateBillingEntry(entry) {
    // Check multiplier invariant: total = raw * multiplier / 10000
    const raw = BigInt(entry.raw_cost_micro);
    const multiplier = BigInt(entry.multiplier_bps);
    const expectedTotal = (raw * multiplier) / 10000n;
    const actualTotal = BigInt(entry.total_cost_micro);
    if (actualTotal !== expectedTotal) {
        return {
            valid: false,
            reason: `total_cost_micro (${entry.total_cost_micro}) !== raw_cost_micro (${entry.raw_cost_micro}) * multiplier_bps (${entry.multiplier_bps}) / 10000 (expected ${String(expectedTotal)})`,
        };
    }
    // Delegate recipient validation
    const recipientResult = validateBillingRecipients(entry.recipients, entry.total_cost_micro);
    if (!recipientResult.valid) {
        return { valid: false, reason: recipientResult.errors[0] };
    }
    return { valid: true };
}
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
export function allocateRecipients(recipients, totalCostMicro) {
    if (recipients.length === 0) {
        throw new Error('recipients must not be empty');
    }
    const bpsSum = recipients.reduce((acc, r) => acc + r.share_bps, 0);
    if (bpsSum !== 10000) {
        throw new Error(`share_bps must sum to 10000, got ${bpsSum}`);
    }
    const total = BigInt(totalCostMicro);
    if (total < 0n) {
        throw new Error('totalCostMicro must be non-negative');
    }
    // Step 1: Compute truncated shares and track remainders
    const allocated = recipients.map((r, index) => {
        const product = total * BigInt(r.share_bps);
        const truncated = product / 10000n;
        const remainder = Number(product % 10000n);
        return {
            address: r.address,
            role: r.role,
            share_bps: r.share_bps,
            amount_micro: truncated,
            remainder,
            index,
        };
    });
    // Step 2: Distribute remainder to largest remainders (stable sort by index for ties)
    const currentSum = allocated.reduce((acc, r) => acc + r.amount_micro, 0n);
    let remaining = total - currentSum;
    const sorted = [...allocated].sort((a, b) => b.remainder !== a.remainder ? b.remainder - a.remainder : a.index - b.index);
    for (const r of sorted) {
        if (remaining <= 0n)
            break;
        r.amount_micro += 1n;
        remaining -= 1n;
    }
    return allocated.map(({ amount_micro, address, role, share_bps }) => ({
        address,
        role,
        share_bps,
        amount_micro: String(amount_micro),
    }));
}
//# sourceMappingURL=billing.js.map