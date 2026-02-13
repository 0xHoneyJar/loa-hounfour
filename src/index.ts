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
  type InvokeResponse,
  type UsageReport,
  type Usage,
} from './schemas/invoke-response.js';

// Schemas — Billing (v2.0.0)
export {
  BillingEntrySchema,
  BillingRecipientSchema,
  CostTypeSchema,
  CreditNoteSchema,
  type BillingEntry,
  type BillingRecipient,
  type CostType,
  type CreditNote,
} from './schemas/billing-entry.js';

// Schemas — Agent (v2.0.0)
export {
  AgentDescriptorSchema,
  type AgentDescriptor,
} from './schemas/agent-descriptor.js';

export {
  AgentLifecycleStateSchema,
  AGENT_LIFECYCLE_STATES,
  AGENT_LIFECYCLE_TRANSITIONS,
  isValidTransition,
  type AgentLifecycleState,
} from './schemas/agent-lifecycle.js';

// Utilities — NFT Identity (v2.0.0)
export {
  NftIdSchema,
  NFT_ID_PATTERN,
  parseNftId,
  formatNftId,
  isValidNftId,
  checksumAddress,
  type NftId,
  type ParsedNftId,
} from './utilities/nft-id.js';

// Utilities — Lifecycle (v2.0.0)
export {
  createTransitionValidator,
  type TransitionValidator,
} from './utilities/lifecycle.js';

// Utilities — Billing (v2.0.0)
export {
  validateBillingRecipients,
  allocateRecipients,
} from './utilities/billing.js';

// Schemas — Conversation & Message (v2.0.0)
export {
  ConversationSchema,
  ConversationStatusSchema,
  ConversationSealingPolicySchema,
  MessageSchema,
  MessageRoleSchema,
  validateSealingPolicy,
  type Conversation,
  type ConversationStatus,
  type ConversationSealingPolicy,
  type Message,
  type MessageRole,
} from './schemas/conversation.js';

// Schemas — Transfer (v2.0.0)
export {
  TransferSpecSchema,
  TransferEventSchema,
  TransferScenarioSchema,
  TransferResultSchema,
  type TransferSpec,
  type TransferEventRecord,
  type TransferScenario,
  type TransferResult,
} from './schemas/transfer-spec.js';

// Schemas — Domain Event (v2.0.0)
export {
  DomainEventSchema,
  type DomainEvent,
  type AgentEvent,
  type BillingEvent,
  type ConversationEvent,
  type TransferEvent,
} from './schemas/domain-event.js';

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
  PoolCapabilitiesSchema,
  isValidPoolId,
  tierHasAccess,
  type PoolId,
  type PoolCapabilities,
} from './vocabulary/pools.js';

// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from './vocabulary/errors.js';

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
