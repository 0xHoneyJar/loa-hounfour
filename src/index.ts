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

// Utilities — Lifecycle (v2.0.0, structured results v2.4.0)
export {
  createTransitionValidator,
  DEFAULT_GUARDS,
  guardKey,
  isValidGuardResult,
  // Named guard functions (BB-C4-ADV-005)
  requiresTransferId,
  requiresNoActiveTransfer,
  requiresReasonResolved,
  requiresTransferCompleted,
  type TransitionValidator,
  type TransitionGuard,
  type GuardResult,
} from './utilities/lifecycle.js';

// Utilities — Billing (v2.0.0)
export {
  validateBillingEntry,
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
  DomainEventBatchSchema,
  type DomainEvent,
  type DomainEventBatch,
  type AgentEvent,
  type BillingEvent,
  type ConversationEvent,
  type TransferEvent,
  type ToolEvent,
  type MessageEvent,
  // v2.2.0 — Runtime payload validation (BB-V3-002)
  AgentEventPayloadSchema,
  BillingEventPayloadSchema,
  ConversationEventPayloadSchema,
  TransferEventPayloadSchema,
  ToolEventPayloadSchema,
  MessageEventPayloadSchema,
  isAgentEvent,
  isBillingEvent,
  isConversationEvent,
  isTransferEvent,
  isToolEvent,
  isMessageEvent,
} from './schemas/domain-event.js';

// Schemas — Saga Context (v2.2.0, BB-V3-012)
export {
  SagaContextSchema,
  validateSagaContext,
  type SagaContext,
} from './schemas/saga-context.js';

// Schemas — Lifecycle Event Payload (v2.1.0)
export {
  LifecycleTransitionPayloadSchema,
  type LifecycleTransitionPayload,
  type LifecycleTransitionEvent,
} from './schemas/lifecycle-event-payload.js';

// Vocabulary — Lifecycle Reason Codes (v2.2.0, BB-V3-009)
export {
  LIFECYCLE_REASON_CODES,
  LIFECYCLE_REASON_CODE_VALUES,
  type LifecycleReasonCode,
} from './vocabulary/lifecycle-reasons.js';

// Vocabulary — Event Types (v2.2.0, BB-V3-011)
export {
  EVENT_TYPES,
  EVENT_TYPE_VALUES,
  isKnownEventType,
  type EventType,
} from './vocabulary/event-types.js';

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

// Vocabulary — Currency (v2.0.0, centralized arithmetic v2.4.0)
export {
  MicroUSD,
  ZERO_MICRO,
  addMicro,
  subtractMicro,
  multiplyBps,
  compareMicro,
} from './vocabulary/currency.js';

// Vocabulary — Transfer Choreography (v2.3.0, BB-POST-002)
export {
  TRANSFER_CHOREOGRAPHY,
  type TransferChoreography,
  type ScenarioChoreography,
} from './vocabulary/transfer-choreography.js';

// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from './vocabulary/errors.js';

// Schemas — Capability Negotiation (v2.2.0, BB-V3-005)
export {
  CapabilitySchema,
  CapabilityQuerySchema,
  CapabilityResponseSchema,
  type Capability,
  type CapabilityQuery,
  type CapabilityResponse,
} from './schemas/capability.js';

// Schemas — Protocol Discovery (v2.2.0, BB-V3-006)
export {
  ProtocolDiscoverySchema,
  buildDiscoveryDocument,
  type ProtocolDiscovery,
} from './schemas/discovery.js';

// Vocabulary — Metadata Namespaces (v2.2.0, BB-V3-001)
export { METADATA_NAMESPACES, type MetadataNamespace } from './vocabulary/metadata.js';

// Validators
export { validate, validators } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';

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
