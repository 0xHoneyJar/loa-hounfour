/**
 * Default maximum serialized size in UTF-8 bytes (100 KB).
 *
 * Set per Phase-5 G3 (lowered from F10's 1 MB recommendation after
 * synchronous DoS analysis flagged that >100 KB blocks the event loop
 * for noticeable durations on commodity hardware).
 */
export declare const SAFE_CANONICALIZE_DEFAULT_MAX_BYTES = 100000;
/** Options accepted by `safeCanonicalize`. */
export interface SafeCanonicalizeOptions {
    /**
     * Maximum allowed serialized size in UTF-8 bytes. Defaults to
     * `SAFE_CANONICALIZE_DEFAULT_MAX_BYTES` (100 KB). Override
     * explicitly when the call site has its own back-pressure
     * mechanism — the override is the consumer's signal that they
     * have accepted responsibility for the event-loop impact.
     */
    maxBytes?: number;
}
/**
 * Thrown when the canonicalized output exceeds the configured byte cap.
 * The cap is enforced AFTER canonicalization (the canonical form is
 * what hits the wire / hash function) so the error carries the actual
 * serialized length rather than the input object size.
 */
export declare class CanonicalizeSizeError extends Error {
    /** Stable error code for programmatic detection. */
    readonly code: "CANONICALIZE_SIZE_EXCEEDED";
    /** Serialized length in UTF-8 bytes. */
    readonly serializedBytes: number;
    /** Configured cap that was exceeded. */
    readonly maxBytes: number;
    constructor(serializedBytes: number, maxBytes: number);
}
/**
 * Thrown when the payload contains malformed Unicode that cannot be
 * NFC-normalized. Extremely rare in practice (would require a
 * lone-surrogate string slipping past JSON parsing); kept as a named
 * error so consumers don't have to grep for substrings of the
 * underlying `RangeError.message`.
 */
export declare class CanonicalizeNFCError extends Error {
    readonly code: "CANONICALIZE_NFC_FAILED";
    readonly cause?: unknown;
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when two distinct input keys NFC-normalize to the same form,
 * making the canonical mapping ambiguous.
 *
 * v8.5.0 PR-A2.1 normalized object keys to NFC before canonicalization
 * so that NFD-form vs NFC-form inputs hash identically. The naïve
 * implementation wrote normalized keys into a plain object, which
 * silently overwrote earlier entries when a collision occurred. Per
 * Issue #76 F5, the v8.5.1 implementation tracks normalized keys per
 * object and throws this error on collision so consumers cannot
 * accidentally feed an ambiguous payload to the hash function.
 *
 * Collisions are extremely rare in practice (they require two distinct
 * Unicode forms in the SAME object that fold to the same NFC string —
 * e.g. a precomposed character key alongside its NFD-decomposed
 * equivalent), but they ARE attacker-reachable via crafted JSON, and
 * silent overwrite would let two semantically-identical-looking
 * payloads produce different canonical output depending on iteration
 * order. The error closes that gap.
 *
 * @since v8.5.1 (Issue #76 F5)
 */
export declare class CanonicalizeKeyCollisionError extends Error {
    readonly code: "CANONICALIZE_KEY_COLLISION";
    /** The NFC-normalized key form that collided. */
    readonly normalizedKey: string;
    /** The original input keys that both normalize to `normalizedKey`. */
    readonly originalKeys: readonly [string, string];
    constructor(normalizedKey: string, originalKeys: readonly [string, string]);
}
/**
 * Sanctioned canonicalization for v8.5.0 hash domains.
 *
 * Pipeline:
 *   1. NFC-normalize every string value in the payload (keys included).
 *   2. RFC 8785 canonicalization via the `canonicalize` package.
 *   3. UTF-8 byte-length check against `maxBytes` (default 100 KB).
 *   4. Return the canonical string.
 *
 * @throws {CanonicalizeSizeError} if the canonicalized output exceeds
 *   `maxBytes`.
 * @throws {CanonicalizeNFCError} if the payload contains malformed
 *   Unicode that cannot be NFC-normalized.
 * @throws {TypeError} if the payload is structurally unrepresentable
 *   in canonical JSON (cycles, BigInt, functions, etc.) — propagated
 *   from the underlying `canonicalize` library.
 */
export declare function safeCanonicalize(payload: unknown, options?: SafeCanonicalizeOptions): string;
//# sourceMappingURL=safe-canonicalize.d.ts.map