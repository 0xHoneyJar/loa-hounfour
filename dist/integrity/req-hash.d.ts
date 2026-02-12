/** Default maximum decompressed body size (10MB). */
export declare const DEFAULT_MAX_BODY_BYTES: number;
/** Default maximum compression ratio. */
export declare const DEFAULT_MAX_COMPRESSION_RATIO = 100;
/** Maximum encoding layers. */
export declare const MAX_ENCODING_DEPTH = 2;
export interface ReqHashOptions {
    /** Max decompressed body size in bytes. Default: 10MB. */
    maxBodyBytes?: number;
    /** Max compression ratio. Default: 100:1. */
    maxCompressionRatio?: number;
}
export declare class DecompressionError extends Error {
    readonly code: 'BODY_TOO_LARGE' | 'DECOMPRESSION_BOMB' | 'ENCODING_UNSUPPORTED' | 'ENCODING_TOO_DEEP';
    readonly httpStatus: number;
    constructor(message: string, code: 'BODY_TOO_LARGE' | 'DECOMPRESSION_BOMB' | 'ENCODING_UNSUPPORTED' | 'ENCODING_TOO_DEEP', httpStatus: number);
}
/**
 * Decompress body bytes according to Content-Encoding.
 * Applies safety limits at each layer.
 */
export declare function decompressBody(body: Buffer, contentEncoding: string | undefined, options?: ReqHashOptions): Buffer;
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
export declare function computeReqHash(body: Buffer, contentEncoding?: string, options?: ReqHashOptions): string;
/**
 * Verify a request hash using constant-time comparison.
 *
 * @returns true if the computed hash matches the expected hash
 */
export declare function verifyReqHash(body: Buffer, expectedHash: string, contentEncoding?: string, options?: ReqHashOptions): boolean;
/**
 * SHA-256 hash of an empty body (for reference/testing).
 */
export declare const EMPTY_BODY_HASH: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
//# sourceMappingURL=req-hash.d.ts.map