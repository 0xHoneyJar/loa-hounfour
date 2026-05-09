/** String-encoded micro-USD integer (signed). 1 USD = 1,000,000 micro-USD. Allows negative amounts for credits/refunds. */
export declare const MicroUSD: import("@sinclair/typebox").TString;
/** String-encoded unsigned micro-USD integer. Use when negative amounts must be rejected. */
export declare const MicroUSDUnsigned: import("@sinclair/typebox").TString;
/** String-encoded micro-USDC integer. On-chain USDC in micro-units (6 decimal places). Always unsigned. */
export declare const MicroUSDCSchema: import("@sinclair/typebox").TString;
/** Zero in micro-USD. */
export declare const ZERO_MICRO: "0";
/**
 * Add two micro-USD amounts.
 *
 * @param a - First micro-USD amount (string-encoded integer)
 * @param b - Second micro-USD amount (string-encoded integer)
 * @returns Sum as string-encoded integer
 * @throws If either input is not a valid micro-USD string
 */
export declare function addMicro(a: string, b: string): string;
/**
 * Subtract micro-USD amounts with underflow protection.
 *
 * @param a - Minuend (string-encoded integer)
 * @param b - Subtrahend (string-encoded integer)
 * @returns Difference as string-encoded integer
 * @throws If result would be negative (underflow protection)
 * @throws If either input is not a valid micro-USD string
 */
export declare function subtractMicro(a: string, b: string): string;
/**
 * Multiply a micro-USD amount by a basis-point multiplier.
 *
 * Formula: `(amount * bps) / 10000`
 *
 * **Note:** This is a raw arithmetic utility with no business-range constraints.
 * The `BillingEntry.multiplier_bps` schema constrains values to [10000, 100000].
 * Callers using this function outside of billing validation should be aware that
 * `bps=0` will zero the result and very large bps values are unconstrained.
 *
 * @param amount - Micro-USD amount (string-encoded integer)
 * @param bps - Multiplier in basis points (10000 = 1x, 15000 = 1.5x)
 * @returns Result as string-encoded integer (truncated, not rounded)
 * @throws If amount is not a valid micro-USD string or bps is not a safe integer
 */
export declare function multiplyBps(amount: string, bps: number): string;
/**
 * Compare two micro-USD amounts.
 *
 * @param a - First amount (string-encoded integer)
 * @param b - Second amount (string-encoded integer)
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 * @throws If either input is not a valid micro-USD string
 */
export declare function compareMicro(a: string, b: string): -1 | 0 | 1;
/**
 * Signed MicroUSD — the v4.0.0 "signed by default" decision.
 *
 * Financial systems inevitably need negative amounts (credits, refunds, adjustments).
 * Stripe added negative_amount_cents years after launch. We made MicroUSD signed from
 * the start, with MicroUSDUnsigned as the explicit opt-in for non-negative contexts.
 *
 * @see BB-C5-Part5-§3, BB-POST-MERGE-004
 */
/**
 * Alias for MicroUSD — MicroUSD is now signed by default (v4.0.0).
 *
 * @see BB-C5-Part5-§3 — CreditMicro signed amount type
 * @since v3.2.0
 * @deprecated Use MicroUSD directly; it now accepts signed values.
 */
export declare const MicroUSDSigned: import("@sinclair/typebox").TString;
/**
 * Subtract micro-USD amounts allowing negative results (signed arithmetic).
 *
 * Unlike `subtractMicro`, this does NOT throw on negative results.
 * Use for credit/refund flows where negative amounts are expected.
 *
 * @param a - Minuend (string-encoded signed integer)
 * @param b - Subtrahend (string-encoded signed integer)
 * @returns Difference as string-encoded signed integer
 */
export declare function subtractMicroSigned(a: string, b: string): string;
/**
 * Negate a micro-USD amount (flip sign).
 *
 * @param a - Amount to negate (string-encoded signed integer)
 * @returns Negated amount as string-encoded signed integer
 */
export declare function negateMicro(a: string): string;
/**
 * Check whether a micro-USD amount is negative.
 *
 * @param a - Amount to check (string-encoded signed integer)
 * @returns true if the amount is less than zero
 */
export declare function isNegativeMicro(a: string): boolean;
//# sourceMappingURL=currency.d.ts.map