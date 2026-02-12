/**
 * Standard error codes shared across loa-finn and arrakis.
 */
export declare const ERROR_CODES: {
    readonly JWT_INVALID: "JWT_INVALID";
    readonly JWT_EXPIRED: "JWT_EXPIRED";
    readonly JTI_REQUIRED: "JTI_REQUIRED";
    readonly JTI_REPLAY: "JTI_REPLAY";
    readonly ISSUER_NOT_ALLOWED: "ISSUER_NOT_ALLOWED";
    readonly AUDIENCE_MISMATCH: "AUDIENCE_MISMATCH";
    readonly REQ_HASH_MISMATCH: "REQ_HASH_MISMATCH";
    readonly TIER_INSUFFICIENT: "TIER_INSUFFICIENT";
    readonly JWKS_UNAVAILABLE: "JWKS_UNAVAILABLE";
    readonly BUDGET_EXCEEDED: "BUDGET_EXCEEDED";
    readonly BUDGET_OVERFLOW: "BUDGET_OVERFLOW";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly CONTRACT_VERSION_MISMATCH: "CONTRACT_VERSION_MISMATCH";
    readonly POOL_UNKNOWN: "POOL_UNKNOWN";
    readonly BODY_TOO_LARGE: "BODY_TOO_LARGE";
    readonly ENCODING_UNSUPPORTED: "ENCODING_UNSUPPORTED";
    readonly DECOMPRESSION_BOMB: "DECOMPRESSION_BOMB";
    readonly PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE";
    readonly PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT";
    readonly PROVIDER_ERROR: "PROVIDER_ERROR";
    readonly MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE";
    readonly NATIVE_RUNTIME_SPAWN_FAILED: "NATIVE_RUNTIME_SPAWN_FAILED";
    readonly NATIVE_RUNTIME_TIMEOUT: "NATIVE_RUNTIME_TIMEOUT";
    readonly NATIVE_RUNTIME_ORPHAN: "NATIVE_RUNTIME_ORPHAN";
    readonly ENSEMBLE_ALL_FAILED: "ENSEMBLE_ALL_FAILED";
    readonly BYOK_SESSION_EXPIRED: "BYOK_SESSION_EXPIRED";
    readonly BYOK_BOUNDED_USE_EXCEEDED: "BYOK_BOUNDED_USE_EXCEEDED";
    readonly BYOK_NONCE_REPLAY: "BYOK_NONCE_REPLAY";
    readonly RECONCILIATION_DRIFT: "RECONCILIATION_DRIFT";
    readonly RECONCILIATION_FAIL_CLOSED: "RECONCILIATION_FAIL_CLOSED";
    readonly SSE_PARSE_ERROR: "SSE_PARSE_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
/**
 * Canonical HTTP status mapping for error codes.
 *
 * Ensures arrakis and loa-finn return consistent HTTP statuses
 * for the same error conditions. Without this, intermediaries
 * (load balancers, API gateways) cannot make correct routing
 * decisions based on HTTP status alone.
 *
 * @see PR #61 BridgeBuilder review — Finding 2
 */
export declare const ERROR_HTTP_STATUS: Record<ErrorCode, number>;
//# sourceMappingURL=errors.d.ts.map