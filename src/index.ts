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
export {
  JwtClaimsSchema,
  S2SJwtClaimsSchema,
  TierSchema,
  ByokClaimsSchema,
  IssuerAllowlistSchema,
  JTI_POLICY,
  type JwtClaims,
  type S2SJwtClaims,
  type Tier,
  type ByokClaims,
  type IssuerAllowlist,
} from './schemas/jwt-claims.js';

// Schemas — Invoke Response & Usage Report
export {
  InvokeResponseSchema,
  UsageReportSchema,
  UsageSchema,
  CostBreakdownSchema,
  type InvokeResponse,
  type UsageReport,
  type Usage,
  type CostBreakdown,
} from './schemas/invoke-response.js';

// Schemas — Stream Events
export {
  StreamEventSchema,
  StreamStartSchema,
  StreamChunkSchema,
  StreamToolCallSchema,
  StreamUsageSchema,
  StreamEndSchema,
  StreamErrorSchema,
  STREAM_RECONNECT_HEADER,
  type StreamEvent,
  type StreamStart,
  type StreamChunk,
  type StreamToolCall,
  type StreamUsage,
  type StreamEnd,
  type StreamError,
} from './schemas/stream-events.js';

// Schemas — Routing Policy
export {
  RoutingPolicySchema,
  PersonalityRoutingSchema,
  TaskTypeSchema,
  type RoutingPolicy,
  type PersonalityRouting,
  type TaskType,
} from './schemas/routing-policy.js';

// Vocabulary — Pools
export {
  POOL_IDS,
  PoolIdSchema,
  TIER_POOL_ACCESS,
  TIER_DEFAULT_POOL,
  isValidPoolId,
  tierHasAccess,
  type PoolId,
} from './vocabulary/pools.js';

// Vocabulary — Errors
export { ERROR_CODES, type ErrorCode } from './vocabulary/errors.js';

// Validators
export { validate, validators } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';

// Integrity — Request Hash
export {
  computeReqHash,
  verifyReqHash,
  decompressBody,
  DecompressionError,
  EMPTY_BODY_HASH,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_COMPRESSION_RATIO,
  MAX_ENCODING_DEPTH,
  type ReqHashOptions,
} from './integrity/req-hash.js';

// Integrity — Idempotency
export { deriveIdempotencyKey } from './integrity/idempotency.js';
