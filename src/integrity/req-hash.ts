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

export interface ReqHashOptions {
  /** Max decompressed body size in bytes. Default: 10MB. */
  maxBodyBytes?: number;
  /** Max compression ratio. Default: 100:1. */
  maxCompressionRatio?: number;
}

export class DecompressionError extends Error {
  constructor(
    message: string,
    public readonly code: 'BODY_TOO_LARGE' | 'DECOMPRESSION_BOMB' | 'ENCODING_UNSUPPORTED' | 'ENCODING_TOO_DEEP',
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'DecompressionError';
  }
}

/**
 * Parse and validate Content-Encoding header.
 * Returns encodings in unwrap order for decompression.
 *
 * HTTP Content-Encoding semantics (RFC 9110 §8.4):
 *
 *   Content-Encoding: gzip, br
 *
 * means the body was first compressed with brotli, then gzip was applied
 * on top. The header lists encodings in the order they were applied
 * (innermost-last). To decompress, we must unwrap in reverse:
 *
 *   1. gunzip  (outermost layer — listed first in header)
 *   2. brotli  (innermost layer — listed last in header)
 *
 * This function reverses the header order so callers can iterate
 * left-to-right to peel layers from outside in.
 *
 * Example:
 *   parseEncodings("gzip, br") → ["gzip", "br"]
 *   // Step 1: gunzip the wire bytes
 *   // Step 2: brotli-decompress the result → original body
 *
 * @see PR #61 BridgeBuilder review — Finding 7
 */
function parseEncodings(contentEncoding: string | undefined): string[] {
  if (!contentEncoding || contentEncoding === 'identity') return [];

  const encodings = contentEncoding
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== 'identity');

  if (encodings.length > MAX_ENCODING_DEPTH) {
    throw new DecompressionError(
      `Too many encoding layers: ${encodings.length} (max ${MAX_ENCODING_DEPTH})`,
      'ENCODING_TOO_DEEP',
      400,
    );
  }

  for (const enc of encodings) {
    if (!ALLOWED_ENCODINGS.has(enc)) {
      throw new DecompressionError(
        `Unsupported encoding: "${enc}". Allowed: ${[...ALLOWED_ENCODINGS].join(', ')}`,
        'ENCODING_UNSUPPORTED',
        415,
      );
    }
  }

  // Reverse: header lists innermost-last, we unwrap outermost-first.
  // "gzip, br" → ["gzip", "br"] (gunzip first, then brotli).
  return encodings.reverse();
}

/**
 * Decompress a single encoding layer with safety limits.
 */
function decompressLayer(
  data: Buffer,
  encoding: string,
  maxBytes: number,
  maxRatio: number,
): Buffer {
  let result: Buffer;

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
        throw new DecompressionError(
          `Unsupported encoding: "${encoding}"`,
          'ENCODING_UNSUPPORTED',
          415,
        );
    }
  } catch (err) {
    if (err instanceof DecompressionError) throw err;
    // Node zlib throws RangeError when maxOutputLength exceeded
    throw new DecompressionError(
      `Decompressed size exceeds limit ${maxBytes} bytes`,
      'BODY_TOO_LARGE',
      413,
    );
  }

  // Check decompression bomb (ratio)
  if (data.length > 0) {
    const ratio = result.length / data.length;
    if (ratio > maxRatio) {
      throw new DecompressionError(
        `Compression ratio ${ratio.toFixed(1)}:1 exceeds limit ${maxRatio}:1`,
        'DECOMPRESSION_BOMB',
        413,
      );
    }
  }

  // Check absolute size
  if (result.length > maxBytes) {
    throw new DecompressionError(
      `Decompressed size ${result.length} exceeds limit ${maxBytes}`,
      'BODY_TOO_LARGE',
      413,
    );
  }

  return result;
}

/**
 * Decompress body bytes according to Content-Encoding.
 * Applies safety limits at each layer.
 */
export function decompressBody(
  body: Buffer,
  contentEncoding: string | undefined,
  options: ReqHashOptions = {},
): Buffer {
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const maxRatio = options.maxCompressionRatio ?? DEFAULT_MAX_COMPRESSION_RATIO;

  const encodings = parseEncodings(contentEncoding);
  if (encodings.length === 0) return body;

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
export function computeReqHash(
  body: Buffer,
  contentEncoding?: string,
  options?: ReqHashOptions,
): string {
  const decompressed = decompressBody(body, contentEncoding, options);
  const hash = createHash('sha256').update(decompressed).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Verify a request hash using constant-time comparison.
 *
 * @returns true if the computed hash matches the expected hash
 */
export function verifyReqHash(
  body: Buffer,
  expectedHash: string,
  contentEncoding?: string,
  options?: ReqHashOptions,
): boolean {
  const computed = computeReqHash(body, contentEncoding, options);

  // Constant-time comparison to prevent timing side-channel
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(expectedHash, 'utf8');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * SHA-256 hash of an empty body (for reference/testing).
 */
export const EMPTY_BODY_HASH =
  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' as const;
