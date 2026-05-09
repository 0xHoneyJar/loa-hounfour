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
/** Branded micro-USD amount. 1 USD = 1,000,000 micro-USD. Non-negative. */
export type MicroUSD = bigint & {
    readonly __brand: 'micro_usd';
};
/** Branded basis points. 10000 = 100%. Range: 0–10000. */
export type BasisPoints = bigint & {
    readonly __brand: 'basis_points';
};
/** Branded agent/account identifier. Non-empty string. */
export type AccountId = string & {
    readonly __brand: 'account_id';
};
/** Create a branded MicroUSD value. Throws RangeError if negative. */
export declare function microUSD(value: bigint): MicroUSD;
/** Create a branded BasisPoints value. Throws RangeError if outside 0–10000. */
export declare function basisPoints(value: bigint): BasisPoints;
/** Create a branded AccountId. Throws RangeError if empty. */
export declare function accountId(value: string): AccountId;
/** Add two MicroUSD values. */
export declare function addMicroUSD(a: MicroUSD, b: MicroUSD): MicroUSD;
/** Subtract MicroUSD values. Throws RangeError if result would be negative. */
export declare function subtractMicroUSD(a: MicroUSD, b: MicroUSD): MicroUSD;
/** Multiply a MicroUSD amount by basis points. Formula: (amount * bps) / 10000. */
export declare function multiplyBPS(amount: MicroUSD, bps: BasisPoints): MicroUSD;
/** Compute the basis-point share: (part / whole) * 10000. Throws on zero whole. */
export declare function bpsShare(part: MicroUSD, whole: MicroUSD): BasisPoints;
/** Serialize MicroUSD to string (for protocol wire format). */
export declare function serializeMicroUSD(value: MicroUSD): string;
/** Deserialize string to MicroUSD. Throws on invalid format. */
export declare function deserializeMicroUSD(value: string): MicroUSD;
/** Serialize BasisPoints to string. */
export declare function serializeBasisPoints(value: BasisPoints): string;
/** Deserialize string to BasisPoints. Throws on invalid format or range. */
export declare function deserializeBasisPoints(value: string): BasisPoints;
/** Branded micro-USDC amount. 1 USDC = 1,000,000 micro-USDC. Non-negative (on-chain amounts are never negative). */
export type MicroUSDC = bigint & {
    readonly __brand: 'micro_usdc';
};
/** Create a branded MicroUSDC value. Throws RangeError if negative. */
export declare function microUSDC(value: bigint): MicroUSDC;
/** Lenient reader — returns undefined on invalid input instead of throwing. */
export declare function readMicroUSDC(value: unknown): MicroUSDC | undefined;
/** Serialize MicroUSDC to string (for protocol wire format). */
export declare function serializeMicroUSDC(value: MicroUSDC): string;
/** Deserialize string to MicroUSDC. Throws on invalid format. */
export declare function deserializeMicroUSDC(value: string): MicroUSDC;
/** Convert MicroUSD to MicroUSDC (same numeric scale, different semantic brand). */
export declare function microUSDToUSDC(value: MicroUSD): MicroUSDC;
/** Convert MicroUSDC to MicroUSD (same numeric scale, different semantic brand). */
export declare function microUSDCToUSD(value: MicroUSDC): MicroUSD;
//# sourceMappingURL=branded-types.d.ts.map