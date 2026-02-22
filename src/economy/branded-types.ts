/**
 * Branded Arithmetic Types — compile-time unit safety for economic values.
 *
 * Branded types prevent accidental mixing of semantically different numeric
 * values at the type level. A MicroUSD cannot be passed where BasisPoints
 * is expected, even though both are bigint at runtime.
 *
 * @see SDD §2.3 — Branded Arithmetic Types (FR-3)
 * @see Stripe's approach to currency safety
 */

// ---------------------------------------------------------------------------
// Branded Types
// ---------------------------------------------------------------------------

/** Branded micro-USD amount. 1 USD = 1,000,000 micro-USD. Non-negative. */
export type MicroUSD = bigint & { readonly __brand: 'micro_usd' };

/** Branded basis points. 10000 = 100%. Range: 0–10000. */
export type BasisPoints = bigint & { readonly __brand: 'basis_points' };

/** Branded agent/account identifier. Non-empty string. */
export type AccountId = string & { readonly __brand: 'account_id' };

// ---------------------------------------------------------------------------
// Constructors (validate + brand)
// ---------------------------------------------------------------------------

/** Create a branded MicroUSD value. Throws RangeError if negative. */
export function microUSD(value: bigint): MicroUSD {
  if (value < 0n) throw new RangeError(`MicroUSD must be non-negative, got ${value}`);
  return value as MicroUSD;
}

/** Create a branded BasisPoints value. Throws RangeError if outside 0–10000. */
export function basisPoints(value: bigint): BasisPoints {
  if (value < 0n || value > 10000n) throw new RangeError(`BasisPoints must be 0–10000, got ${value}`);
  return value as BasisPoints;
}

/** Create a branded AccountId. Throws RangeError if empty. */
export function accountId(value: string): AccountId {
  if (value.length === 0) throw new RangeError('AccountId must be non-empty');
  return value as AccountId;
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Add two MicroUSD values. */
export function addMicroUSD(a: MicroUSD, b: MicroUSD): MicroUSD {
  return (a + b) as MicroUSD;
}

/** Subtract MicroUSD values. Throws RangeError if result would be negative. */
export function subtractMicroUSD(a: MicroUSD, b: MicroUSD): MicroUSD {
  const result = a - b;
  if (result < 0n) throw new RangeError(`MicroUSD subtraction underflow: ${a} - ${b}`);
  return result as MicroUSD;
}

/** Multiply a MicroUSD amount by basis points. Formula: (amount * bps) / 10000. */
export function multiplyBPS(amount: MicroUSD, bps: BasisPoints): MicroUSD {
  return ((amount * bps) / 10000n) as MicroUSD;
}

/** Compute the basis-point share: (part / whole) * 10000. Throws on zero whole. */
export function bpsShare(part: MicroUSD, whole: MicroUSD): BasisPoints {
  if (whole === 0n) throw new RangeError('Cannot compute bpsShare with zero whole');
  return ((part * 10000n) / whole) as BasisPoints;
}

// ---------------------------------------------------------------------------
// Serialization (string ↔ branded)
// ---------------------------------------------------------------------------

/** Serialize MicroUSD to string (for protocol wire format). */
export function serializeMicroUSD(value: MicroUSD): string {
  return String(value);
}

/** Deserialize string to MicroUSD. Throws on invalid format. */
export function deserializeMicroUSD(value: string): MicroUSD {
  if (!/^[0-9]+$/.test(value)) throw new RangeError(`Invalid MicroUSD string: "${value}"`);
  return BigInt(value) as MicroUSD;
}

/** Serialize BasisPoints to string. */
export function serializeBasisPoints(value: BasisPoints): string {
  return String(value);
}

/** Deserialize string to BasisPoints. Throws on invalid format or range. */
export function deserializeBasisPoints(value: string): BasisPoints {
  if (!/^[0-9]+$/.test(value)) throw new RangeError(`Invalid BasisPoints string: "${value}"`);
  const val = BigInt(value);
  if (val > 10000n) throw new RangeError(`BasisPoints must be 0–10000, got ${value}`);
  return val as BasisPoints;
}

// ---------------------------------------------------------------------------
// MicroUSDC — on-chain USDC micro-units (v7.1.0)
// ---------------------------------------------------------------------------

/** Branded micro-USDC amount. 1 USDC = 1,000,000 micro-USDC. Non-negative (on-chain amounts are never negative). */
export type MicroUSDC = bigint & { readonly __brand: 'micro_usdc' };

/** Create a branded MicroUSDC value. Throws RangeError if negative. */
export function microUSDC(value: bigint): MicroUSDC {
  if (value < 0n) throw new RangeError(`MicroUSDC must be non-negative, got ${value}`);
  return value as MicroUSDC;
}

/** Lenient reader — returns undefined on invalid input instead of throwing. */
export function readMicroUSDC(value: unknown): MicroUSDC | undefined {
  if (typeof value === 'bigint' && value >= 0n) return value as MicroUSDC;
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return BigInt(value) as MicroUSDC;
  }
  return undefined;
}

/** Serialize MicroUSDC to string (for protocol wire format). */
export function serializeMicroUSDC(value: MicroUSDC): string {
  return String(value);
}

/** Deserialize string to MicroUSDC. Throws on invalid format. */
export function deserializeMicroUSDC(value: string): MicroUSDC {
  if (!/^[0-9]+$/.test(value)) throw new RangeError(`Invalid MicroUSDC string: "${value}"`);
  return BigInt(value) as MicroUSDC;
}

/** Convert MicroUSD to MicroUSDC (same numeric scale, different semantic brand). */
export function microUSDToUSDC(value: MicroUSD): MicroUSDC {
  return value as unknown as MicroUSDC;
}

/** Convert MicroUSDC to MicroUSD (same numeric scale, different semantic brand). */
export function microUSDCToUSD(value: MicroUSDC): MicroUSD {
  return value as unknown as MicroUSD;
}
