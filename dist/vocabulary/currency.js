import { Type } from '@sinclair/typebox';
/** String-encoded micro-USD integer. 1 USD = 1,000,000 micro-USD. */
export const MicroUSD = Type.String({
    pattern: '^[0-9]+$',
    description: 'Micro-USD amount as string (1 USD = 1,000,000 micro-USD)',
});
// ---------------------------------------------------------------------------
// Centralized MicroUSD Arithmetic (v2.4.0, BB-C4-ADV-006)
//
// All financial arithmetic MUST use BigInt to prevent floating-point
// precision loss. `parseInt('999999999999999999')` returns
// `1000000000000000000` — a $1 error on a $1M micro-cent transaction.
// These utilities centralize BigInt arithmetic so consumers never need
// to derive BigInt from string themselves.
// ---------------------------------------------------------------------------
/** Zero in micro-USD. */
export const ZERO_MICRO = '0';
/** Pattern for valid micro-USD strings (non-negative integers). */
const MICRO_PATTERN = /^[0-9]+$/;
function assertMicro(value, label) {
    if (!MICRO_PATTERN.test(value)) {
        throw new Error(`${label} must be a non-negative integer string, got "${value}"`);
    }
    return BigInt(value);
}
/**
 * Add two micro-USD amounts.
 *
 * @param a - First micro-USD amount (string-encoded integer)
 * @param b - Second micro-USD amount (string-encoded integer)
 * @returns Sum as string-encoded integer
 * @throws If either input is not a valid micro-USD string
 */
export function addMicro(a, b) {
    return String(assertMicro(a, 'a') + assertMicro(b, 'b'));
}
/**
 * Subtract micro-USD amounts with underflow protection.
 *
 * @param a - Minuend (string-encoded integer)
 * @param b - Subtrahend (string-encoded integer)
 * @returns Difference as string-encoded integer
 * @throws If result would be negative (underflow protection)
 * @throws If either input is not a valid micro-USD string
 */
export function subtractMicro(a, b) {
    const va = assertMicro(a, 'a');
    const vb = assertMicro(b, 'b');
    if (vb > va) {
        throw new Error(`Underflow: ${a} - ${b} would produce a negative result`);
    }
    return String(va - vb);
}
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
export function multiplyBps(amount, bps) {
    if (!Number.isInteger(bps) || bps < 0) {
        throw new Error(`bps must be a non-negative integer, got ${bps}`);
    }
    const va = assertMicro(amount, 'amount');
    return String((va * BigInt(bps)) / 10000n);
}
/**
 * Compare two micro-USD amounts.
 *
 * @param a - First amount (string-encoded integer)
 * @param b - Second amount (string-encoded integer)
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 * @throws If either input is not a valid micro-USD string
 */
export function compareMicro(a, b) {
    const va = assertMicro(a, 'a');
    const vb = assertMicro(b, 'b');
    if (va < vb)
        return -1;
    if (va > vb)
        return 1;
    return 0;
}
//# sourceMappingURL=currency.js.map