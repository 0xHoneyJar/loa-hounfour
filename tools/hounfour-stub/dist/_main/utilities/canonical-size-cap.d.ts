/**
 * Default canonical-size cap in bytes (4 KB).
 *
 * Schemas declaring a different cap via the
 * `'x-canonical-size-cap-bytes'` TypeBox metadata override this; the
 * constant is the v8.6.0 default for any schema not declaring its own.
 */
export declare const CANONICAL_SIZE_CAP_BYTES = 4096;
/**
 * Compute the UTF-8 byte length of `value`'s canonical-JSON form.
 *
 * Uses `safeCanonicalize` (RFC 8785 JCS + NFC + key-collision detection)
 * with a 100 KB ceiling — far above the 4 KB cap, so the helper's
 * semantics never depend on the underlying canonicalize-time cap.
 * Throws if `safeCanonicalize` itself rejects (NFC malformed,
 * key collision, non-JSON-representable type) — the caller treats
 * the throw as a structural-input error rather than a cap violation.
 */
export declare function canonicalByteLength(value: unknown): number;
/**
 * Convenience predicate: returns `true` if the value's canonical-JSON
 * byte length exceeds `cap` (default 4096).
 *
 * Used by the LOCAL `canonical_size_cap` constraint-DSL builtin
 * (see `src/constraints/builtins/canonical-size-cap.ts`).
 */
export declare function exceedsCanonicalCap(value: unknown, cap?: number): boolean;
//# sourceMappingURL=canonical-size-cap.d.ts.map