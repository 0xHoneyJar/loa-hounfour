/**
 * Sanctioned canonicalization helper for v8.5.0 hash domains.
 *
 * Wraps `canonicalize` (RFC 8785 JSON Canonicalization Scheme) with
 * two normative behaviors that the raw library cannot enforce:
 *
 *   1. Unicode NFC normalization on every string value before
 *      canonicalization. RFC 8785 produces deterministic UTF-8 byte
 *      sequences from a JSON value but does NOT normalize Unicode
 *      composition; callers that hash NFD-form vs NFC-form inputs
 *      would get different hashes for semantically-identical content.
 *      `safeCanonicalize` walks the payload and NFC-normalizes every
 *      string so the canonical bytes (and the SHA-256 over them) are
 *      stable across normalization forms.
 *
 *   2. A 100 KB default size cap. Synchronous JSON canonicalization
 *      is O(n log n) on payload size, and the SHA-256 hash that
 *      typically follows is O(n). At >100 KB the combined work
 *      blocks the Node.js event loop long enough to be a practical
 *      DoS surface. Callers that genuinely need larger payloads can
 *      override `maxBytes` and assume responsibility for back-
 *      pressuring the call site.
 *
 * RULE-5 of the class-vs-policy structural lint blocks direct
 * `canonicalize` package imports outside this file. Bypassing the cap
 * therefore requires editing this helper itself, surfacing the change
 * in code review.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @since v8.5.0 (G3 + G4)
 */
import _canonicalize from 'canonicalize';
const canonicalize = _canonicalize;
/**
 * Default maximum serialized size in UTF-8 bytes (100 KB).
 *
 * Set per Phase-5 G3 (lowered from F10's 1 MB recommendation after
 * synchronous DoS analysis flagged that >100 KB blocks the event loop
 * for noticeable durations on commodity hardware).
 */
export const SAFE_CANONICALIZE_DEFAULT_MAX_BYTES = 100_000;
/**
 * Thrown when the canonicalized output exceeds the configured byte cap.
 * The cap is enforced AFTER canonicalization (the canonical form is
 * what hits the wire / hash function) so the error carries the actual
 * serialized length rather than the input object size.
 */
export class CanonicalizeSizeError extends Error {
    /** Stable error code for programmatic detection. */
    code = 'CANONICALIZE_SIZE_EXCEEDED';
    /** Serialized length in UTF-8 bytes. */
    serializedBytes;
    /** Configured cap that was exceeded. */
    maxBytes;
    constructor(serializedBytes, maxBytes) {
        super(`Canonicalized payload is ${serializedBytes} bytes; exceeds ${maxBytes}-byte cap. ` +
            `Override via { maxBytes: <higher> } only when the call site has its own ` +
            `back-pressure mechanism for synchronous canonicalization work.`);
        this.name = 'CanonicalizeSizeError';
        this.serializedBytes = serializedBytes;
        this.maxBytes = maxBytes;
    }
}
/**
 * Thrown when the payload contains malformed Unicode that cannot be
 * NFC-normalized. Extremely rare in practice (would require a
 * lone-surrogate string slipping past JSON parsing); kept as a named
 * error so consumers don't have to grep for substrings of the
 * underlying `RangeError.message`.
 */
export class CanonicalizeNFCError extends Error {
    code = 'CANONICALIZE_NFC_FAILED';
    cause;
    constructor(message, cause) {
        super(message);
        this.name = 'CanonicalizeNFCError';
        this.cause = cause;
    }
}
/**
 * NFC-normalize every string value in a payload tree. Operates on a
 * structural copy (does not mutate the input) so the caller's object
 * graph is unchanged. Non-string leaves (numbers, booleans, null,
 * BigInt-ish, etc.) pass through untouched.
 */
function nfcNormalizeTree(value) {
    if (typeof value === 'string') {
        try {
            return value.normalize('NFC');
        }
        catch (e) {
            throw new CanonicalizeNFCError('NFC normalization failed; payload contains malformed Unicode.', e);
        }
    }
    if (Array.isArray(value)) {
        return value.map(nfcNormalizeTree);
    }
    if (value !== null && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            // Keys are also strings; normalize them too (relevant when keys
            // carry combining marks). canonicalize() will lex-sort them
            // afterwards, so normalizing first guarantees ordering stability.
            out[k.normalize('NFC')] = nfcNormalizeTree(v);
        }
        return out;
    }
    return value;
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
export function safeCanonicalize(payload, options = {}) {
    const maxBytes = options.maxBytes ?? SAFE_CANONICALIZE_DEFAULT_MAX_BYTES;
    const normalized = nfcNormalizeTree(payload);
    const canonical = canonicalize(normalized);
    if (typeof canonical !== 'string') {
        // The library returns `undefined` for `undefined` or function
        // payloads. Treat that as a TypeError so callers don't silently
        // pass a bogus value into a hash function.
        throw new TypeError(`safeCanonicalize: payload is not representable as canonical JSON ` +
            `(canonicalize returned ${typeof canonical}).`);
    }
    const serializedBytes = Buffer.byteLength(canonical, 'utf8');
    if (serializedBytes > maxBytes) {
        throw new CanonicalizeSizeError(serializedBytes, maxBytes);
    }
    return canonical;
}
//# sourceMappingURL=safe-canonicalize.js.map