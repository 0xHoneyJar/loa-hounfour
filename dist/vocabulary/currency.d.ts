/** String-encoded micro-USD integer. 1 USD = 1,000,000 micro-USD. */
export declare const MicroUSD: import("@sinclair/typebox").TString;
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
//# sourceMappingURL=currency.d.ts.map