import { Type } from '@sinclair/typebox';

/** String-encoded micro-USD integer (signed). 1 USD = 1,000,000 micro-USD. Allows negative amounts for credits/refunds. */
export const MicroUSD = Type.String({
  pattern: '^-?[0-9]+$',
  description: 'Micro-USD amount as string, signed (1 USD = 1,000,000 micro-USD). Negative values represent credits/refunds.',
});

/** String-encoded unsigned micro-USD integer. Use when negative amounts must be rejected. */
export const MicroUSDUnsigned = Type.String({
  pattern: '^[0-9]+$',
  description: 'Unsigned micro-USD amount as string (1 USD = 1,000,000 micro-USD)',
});

/** String-encoded micro-USDC integer. On-chain USDC in micro-units (6 decimal places). Always unsigned. */
export const MicroUSDCSchema = Type.String({
  $id: 'MicroUSDC',
  pattern: '^[0-9]+$',
  description: 'On-chain USDC amount in micro-units (6 decimal places). String-encoded unsigned bigint.',
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
export const ZERO_MICRO = '0' as const;

/** Pattern for valid signed micro-USD strings (allows negative). */
const SIGNED_MICRO_PATTERN = /^-?[0-9]+$/;

function assertMicro(value: string, label: string): bigint {
  if (!SIGNED_MICRO_PATTERN.test(value)) {
    throw new Error(`${label} must be an integer string, got "${value}"`);
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
export function addMicro(a: string, b: string): string {
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
export function subtractMicro(a: string, b: string): string {
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
export function multiplyBps(amount: string, bps: number): string {
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
export function compareMicro(a: string, b: string): -1 | 0 | 1 {
  const va = assertMicro(a, 'a');
  const vb = assertMicro(b, 'b');
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Signed MicroUSD Arithmetic (v3.2.0, BB-C5-Part5-§3)
//
/**
 * Signed MicroUSD — the v4.0.0 "signed by default" decision.
 *
 * Financial systems inevitably need negative amounts (credits, refunds, adjustments).
 * Stripe added negative_amount_cents years after launch. We made MicroUSD signed from
 * the start, with MicroUSDUnsigned as the explicit opt-in for non-negative contexts.
 *
 * @see BB-C5-Part5-§3, BB-POST-MERGE-004
 */
//
// Financial systems need negative amounts for credits, refunds, and
// adjustments. Stripe eventually added negative_amount_cents — we
// anticipate the need here rather than bolting it on later.
// ---------------------------------------------------------------------------

/**
 * Alias for MicroUSD — MicroUSD is now signed by default (v4.0.0).
 *
 * @see BB-C5-Part5-§3 — CreditMicro signed amount type
 * @since v3.2.0
 * @deprecated Use MicroUSD directly; it now accepts signed values.
 */
export const MicroUSDSigned = MicroUSD;

function assertSignedMicro(value: string, label: string): bigint {
  if (!SIGNED_MICRO_PATTERN.test(value)) {
    throw new Error(`${label} must be a signed integer string, got "${value}"`);
  }
  return BigInt(value);
}

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
export function subtractMicroSigned(a: string, b: string): string {
  return String(assertSignedMicro(a, 'a') - assertSignedMicro(b, 'b'));
}

/**
 * Negate a micro-USD amount (flip sign).
 *
 * @param a - Amount to negate (string-encoded signed integer)
 * @returns Negated amount as string-encoded signed integer
 */
export function negateMicro(a: string): string {
  const val = assertSignedMicro(a, 'a');
  return String(-val);
}

/**
 * Check whether a micro-USD amount is negative.
 *
 * @param a - Amount to check (string-encoded signed integer)
 * @returns true if the amount is less than zero
 */
export function isNegativeMicro(a: string): boolean {
  return assertSignedMicro(a, 'a') < 0n;
}
