/**
 * Pricing computation utilities for the Protocol Constitution.
 *
 * Implements SDD §4.1 (computeCostMicro) and §4.2 (conservation invariant).
 *
 * All arithmetic uses BigInt to prevent floating-point precision loss.
 * Ceil rounding via `(a + b - 1n) / b` — same as AWS/Stripe metered billing.
 */
export interface PricingInput {
    input_per_million_micro: string;
    output_per_million_micro: string;
    thinking_per_million_micro?: string;
}
export interface UsageInput {
    prompt_tokens: number;
    completion_tokens: number;
    reasoning_tokens?: number;
}
export interface ConservationResult {
    /** Backward-compatible boolean: true when delta === 0 and snapshot present. */
    conserved: boolean;
    /** Tristate status: 'conserved' | 'violated' | 'unverifiable'. */
    status: import('../vocabulary/conservation-status.js').ConservationStatus;
    delta: string;
    computed: string;
    /** Human-readable reason when status is 'violated' or 'unverifiable'. */
    reason?: string;
}
/**
 * Compute the total cost in micro-USD given pricing rates and token usage.
 *
 * Uses BigInt-only arithmetic with ceil rounding. No intermediate rounding —
 * sum computed before single division to prevent error accumulation.
 *
 * @throws {TypeError} Invalid pricing string, negative/NaN/non-integer tokens,
 *   or tokens exceeding MAX_SAFE_INTEGER.
 */
export declare function computeCostMicro(pricing: PricingInput, usage: UsageInput): string;
/**
 * Safe variant of computeCostMicro — returns discriminated union instead of throwing.
 *
 * Use at untrusted boundaries (API handlers, user input).
 */
export declare function computeCostMicroSafe(pricing: PricingInput, usage: UsageInput): {
    ok: true;
    cost: string;
} | {
    ok: false;
    error: string;
};
/**
 * Verify that a billing entry's cost matches the computed cost from pricing and usage.
 *
 * Conservation holds when `reconciliation_mode === 'protocol_authoritative'`.
 * For `provider_invoice_authoritative`, delta captures the discrepancy.
 */
export declare function verifyPricingConservation(billing: {
    cost_micro: string;
    pricing_snapshot?: PricingInput;
}, usage: UsageInput): ConservationResult;
export declare function parseMicroUSD(value: string): bigint;
//# sourceMappingURL=pricing.d.ts.map