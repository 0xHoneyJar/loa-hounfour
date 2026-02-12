/**
 * @0xhoneyjar/loa-hounfour
 *
 * Shared protocol contracts for the loa-finn ↔ arrakis integration layer.
 *
 * Ownership: 0xHoneyJar team
 * Versioning: semver (additive-only minor, required-field changes major only)
 * Update procedure: bump version, run semver:check, publish, pin in consumers
 */
// Version
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, parseSemver } from './version.js';
// Schemas — JWT
export { JwtClaimsSchema, S2SJwtClaimsSchema, TierSchema, ByokClaimsSchema, IssuerAllowlistSchema, JTI_POLICY, } from './schemas/jwt-claims.js';
// Schemas — Invoke Response & Usage Report
export { InvokeResponseSchema, UsageReportSchema, UsageSchema, CostBreakdownSchema, } from './schemas/invoke-response.js';
// Schemas — Stream Events
export { StreamEventSchema, StreamStartSchema, StreamChunkSchema, StreamToolCallSchema, StreamUsageSchema, StreamEndSchema, StreamErrorSchema, STREAM_RECONNECT_HEADER, } from './schemas/stream-events.js';
// Schemas — Routing Policy
export { RoutingPolicySchema, PersonalityRoutingSchema, TaskTypeSchema, } from './schemas/routing-policy.js';
// Vocabulary — Pools
export { POOL_IDS, PoolIdSchema, TIER_POOL_ACCESS, TIER_DEFAULT_POOL, PoolCapabilitiesSchema, isValidPoolId, tierHasAccess, } from './vocabulary/pools.js';
// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS } from './vocabulary/errors.js';
// Validators
export { validate, validators } from './validators/index.js';
export { validateCompatibility } from './validators/compatibility.js';
// Integrity — Request Hash
export { computeReqHash, verifyReqHash, decompressBody, DecompressionError, EMPTY_BODY_HASH, DEFAULT_MAX_BODY_BYTES, DEFAULT_MAX_COMPRESSION_RATIO, MAX_ENCODING_DEPTH, } from './integrity/req-hash.js';
// Integrity — Idempotency
export { deriveIdempotencyKey } from './integrity/idempotency.js';
//# sourceMappingURL=index.js.map