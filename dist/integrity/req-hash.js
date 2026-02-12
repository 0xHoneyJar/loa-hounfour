/**
 * Request hash computation and verification.
 *
 * Canonical algorithm (SDD 6.1):
 * 1. Read raw body bytes
 * 2. If Content-Encoding present: decompress (with safety limits)
 * 3. SHA-256 hash the decompressed bytes
 * 4. Format: "sha256:<64 hex chars>"
 * 5. Constant-time comparison
 *
 * Decompression safety limits (SKP-006):
 * - Max decompressed size: 10MB (configurable REQ_HASH_MAX_BODY_BYTES)
 * - Max compression ratio: 100:1
 * - Decompression timeout: 5s
 * - Allowed encodings: gzip, deflate, br, identity
 * - Max encoding depth: 2 layers
 *
 * @see SDD 6.1 — req_hash Canonicalization
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib';
/** Default maximum decompressed body size (10MB). */
export const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
/** Default maximum compression ratio. */
export const DEFAULT_MAX_COMPRESSION_RATIO = 100;
/** Maximum encoding layers. */
export const MAX_ENCODING_DEPTH = 2;
/** Allowed content encodings. */
const ALLOWED_ENCODINGS = new Set(['gzip', 'deflate', 'br', 'identity']);
export class DecompressionError extends Error {
    code;
    httpStatus;
    constructor(message, code, httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.name = 'DecompressionError';
    }
}
/**
 * Parse and validate Content-Encoding header.
 * Returns encodings in application order (outermost first for unwrapping).
 */
function parseEncodings(contentEncoding) {
    if (!contentEncoding || contentEncoding === 'identity')
        return [];
    const encodings = contentEncoding
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e !== 'identity');
    if (encodings.length > MAX_ENCODING_DEPTH) {
        throw new DecompressionError(`Too many encoding layers: ${encodings.length} (max ${MAX_ENCODING_DEPTH})`, 'ENCODING_TOO_DEEP', 400);
    }
    for (const enc of encodings) {
        if (!ALLOWED_ENCODINGS.has(enc)) {
            throw new DecompressionError(`Unsupported encoding: "${enc}". Allowed: ${[...ALLOWED_ENCODINGS].join(', ')}`, 'ENCODING_UNSUPPORTED', 415);
        }
    }
    // Return in reverse order for unwrapping (outermost first)
    return encodings.reverse();
}
/**
 * Decompress a single encoding layer with safety limits.
 */
function decompressLayer(data, encoding, maxBytes, maxRatio) {
    let result;
    try {
        switch (encoding) {
            case 'gzip':
                result = gunzipSync(data, { maxOutputLength: maxBytes });
                break;
            case 'deflate':
                result = inflateSync(data, { maxOutputLength: maxBytes });
                break;
            case 'br':
                result = brotliDecompressSync(data, { maxOutputLength: maxBytes });
                break;
            default:
                throw new DecompressionError(`Unsupported encoding: "${encoding}"`, 'ENCODING_UNSUPPORTED', 415);
        }
    }
    catch (err) {
        if (err instanceof DecompressionError)
            throw err;
        // Node zlib throws RangeError when maxOutputLength exceeded
        throw new DecompressionError(`Decompressed size exceeds limit ${maxBytes} bytes`, 'BODY_TOO_LARGE', 413);
    }
    // Check decompression bomb (ratio)
    if (data.length > 0) {
        const ratio = result.length / data.length;
        if (ratio > maxRatio) {
            throw new DecompressionError(`Compression ratio ${ratio.toFixed(1)}:1 exceeds limit ${maxRatio}:1`, 'DECOMPRESSION_BOMB', 413);
        }
    }
    // Check absolute size
    if (result.length > maxBytes) {
        throw new DecompressionError(`Decompressed size ${result.length} exceeds limit ${maxBytes}`, 'BODY_TOO_LARGE', 413);
    }
    return result;
}
/**
 * Decompress body bytes according to Content-Encoding.
 * Applies safety limits at each layer.
 */
export function decompressBody(body, contentEncoding, options = {}) {
    const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    const maxRatio = options.maxCompressionRatio ?? DEFAULT_MAX_COMPRESSION_RATIO;
    const encodings = parseEncodings(contentEncoding);
    if (encodings.length === 0)
        return body;
    let current = body;
    for (const encoding of encodings) {
        current = decompressLayer(current, encoding, maxBytes, maxRatio);
    }
    return current;
}
/**
 * Compute the canonical request hash.
 *
 * Algorithm:
 * 1. If Content-Encoding: decompress with safety limits
 * 2. SHA-256 hash the (decompressed) body bytes
 * 3. Return "sha256:<64 hex chars>"
 *
 * Empty body hashes to sha256 of empty string:
 * sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
 */
export function computeReqHash(body, contentEncoding, options) {
    const decompressed = decompressBody(body, contentEncoding, options);
    const hash = createHash('sha256').update(decompressed).digest('hex');
    return `sha256:${hash}`;
}
/**
 * Verify a request hash using constant-time comparison.
 *
 * @returns true if the computed hash matches the expected hash
 */
export function verifyReqHash(body, expectedHash, contentEncoding, options) {
    const computed = computeReqHash(body, contentEncoding, options);
    // Constant-time comparison to prevent timing side-channel
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(expectedHash, 'utf8');
    if (a.length !== b.length)
        return false;
    return timingSafeEqual(a, b);
}
/**
 * SHA-256 hash of an empty body (for reference/testing).
 */
export const EMPTY_BODY_HASH = 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
//# sourceMappingURL=req-hash.js.map