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
// Constructors (validate + brand)
// ---------------------------------------------------------------------------
/** Create a branded MicroUSD value. Throws RangeError if negative. */
export function microUSD(value) {
    if (value < 0n)
        throw new RangeError(`MicroUSD must be non-negative, got ${value}`);
    return value;
}
/** Create a branded BasisPoints value. Throws RangeError if outside 0–10000. */
export function basisPoints(value) {
    if (value < 0n || value > 10000n)
        throw new RangeError(`BasisPoints must be 0–10000, got ${value}`);
    return value;
}
/** Create a branded AccountId. Throws RangeError if empty. */
export function accountId(value) {
    if (value.length === 0)
        throw new RangeError('AccountId must be non-empty');
    return value;
}
// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------
/** Add two MicroUSD values. */
export function addMicroUSD(a, b) {
    return (a + b);
}
/** Subtract MicroUSD values. Throws RangeError if result would be negative. */
export function subtractMicroUSD(a, b) {
    const result = a - b;
    if (result < 0n)
        throw new RangeError(`MicroUSD subtraction underflow: ${a} - ${b}`);
    return result;
}
/** Multiply a MicroUSD amount by basis points. Formula: (amount * bps) / 10000. */
export function multiplyBPS(amount, bps) {
    return ((amount * bps) / 10000n);
}
/** Compute the basis-point share: (part / whole) * 10000. Throws on zero whole. */
export function bpsShare(part, whole) {
    if (whole === 0n)
        throw new RangeError('Cannot compute bpsShare with zero whole');
    return ((part * 10000n) / whole);
}
// ---------------------------------------------------------------------------
// Serialization (string ↔ branded)
// ---------------------------------------------------------------------------
/** Serialize MicroUSD to string (for protocol wire format). */
export function serializeMicroUSD(value) {
    return String(value);
}
/** Deserialize string to MicroUSD. Throws on invalid format. */
export function deserializeMicroUSD(value) {
    if (!/^[0-9]+$/.test(value))
        throw new RangeError(`Invalid MicroUSD string: "${value}"`);
    return BigInt(value);
}
/** Serialize BasisPoints to string. */
export function serializeBasisPoints(value) {
    return String(value);
}
/** Deserialize string to BasisPoints. Throws on invalid format or range. */
export function deserializeBasisPoints(value) {
    if (!/^[0-9]+$/.test(value))
        throw new RangeError(`Invalid BasisPoints string: "${value}"`);
    const val = BigInt(value);
    if (val > 10000n)
        throw new RangeError(`BasisPoints must be 0–10000, got ${value}`);
    return val;
}
/** Create a branded MicroUSDC value. Throws RangeError if negative. */
export function microUSDC(value) {
    if (value < 0n)
        throw new RangeError(`MicroUSDC must be non-negative, got ${value}`);
    return value;
}
/** Lenient reader — returns undefined on invalid input instead of throwing. */
export function readMicroUSDC(value) {
    if (typeof value === 'bigint' && value >= 0n)
        return value;
    if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
        return BigInt(value);
    }
    return undefined;
}
/** Serialize MicroUSDC to string (for protocol wire format). */
export function serializeMicroUSDC(value) {
    return String(value);
}
/** Deserialize string to MicroUSDC. Throws on invalid format. */
export function deserializeMicroUSDC(value) {
    if (!/^[0-9]+$/.test(value))
        throw new RangeError(`Invalid MicroUSDC string: "${value}"`);
    return BigInt(value);
}
/** Convert MicroUSD to MicroUSDC (same numeric scale, different semantic brand). */
export function microUSDToUSDC(value) {
    return value;
}
/** Convert MicroUSDC to MicroUSD (same numeric scale, different semantic brand). */
export function microUSDCToUSD(value) {
    return value;
}
//# sourceMappingURL=branded-types.js.map