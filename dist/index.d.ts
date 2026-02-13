/**
 * @0xhoneyjar/loa-hounfour
 *
 * Shared protocol contracts for the loa-finn ↔ arrakis integration layer.
 *
 * Ownership: 0xHoneyJar team
 * Versioning: semver (additive-only minor, required-field changes major only)
 * Update procedure: bump version, run semver:check, publish, pin in consumers
 */
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, parseSemver } from './version.js';
export { JwtClaimsSchema, S2SJwtClaimsSchema, TierSchema, ByokClaimsSchema, IssuerAllowlistSchema, JTI_POLICY, type JwtClaims, type S2SJwtClaims, type Tier, type ByokClaims, type IssuerAllowlist, } from './schemas/jwt-claims.js';
export { InvokeResponseSchema, UsageReportSchema, UsageSchema, type InvokeResponse, type UsageReport, type Usage, } from './schemas/invoke-response.js';
export { BillingEntrySchema, BillingRecipientSchema, CostTypeSchema, CreditNoteSchema, type BillingEntry, type BillingRecipient, type CostType, type CreditNote, } from './schemas/billing-entry.js';
export { AgentDescriptorSchema, type AgentDescriptor, } from './schemas/agent-descriptor.js';
export { AgentLifecycleStateSchema, AGENT_LIFECYCLE_STATES, AGENT_LIFECYCLE_TRANSITIONS, isValidTransition, type AgentLifecycleState, } from './schemas/agent-lifecycle.js';
export { NftIdSchema, NFT_ID_PATTERN, parseNftId, formatNftId, isValidNftId, checksumAddress, type NftId, type ParsedNftId, } from './utilities/nft-id.js';
export { createTransitionValidator, type TransitionValidator, } from './utilities/lifecycle.js';
export { validateBillingRecipients, allocateRecipients, } from './utilities/billing.js';
export { ConversationSchema, ConversationStatusSchema, ConversationSealingPolicySchema, MessageSchema, MessageRoleSchema, validateSealingPolicy, type Conversation, type ConversationStatus, type ConversationSealingPolicy, type Message, type MessageRole, } from './schemas/conversation.js';
export { TransferSpecSchema, TransferEventSchema, TransferScenarioSchema, TransferResultSchema, type TransferSpec, type TransferEventRecord, type TransferScenario, type TransferResult, } from './schemas/transfer-spec.js';
export { DomainEventSchema, DomainEventBatchSchema, type DomainEvent, type DomainEventBatch, type AgentEvent, type BillingEvent, type ConversationEvent, type TransferEvent, type ToolEvent, type MessageEvent, AgentEventPayloadSchema, BillingEventPayloadSchema, ConversationEventPayloadSchema, TransferEventPayloadSchema, ToolEventPayloadSchema, MessageEventPayloadSchema, isAgentEvent, isBillingEvent, isConversationEvent, isTransferEvent, isToolEvent, isMessageEvent, } from './schemas/domain-event.js';
export { SagaContextSchema, validateSagaContext, type SagaContext, } from './schemas/saga-context.js';
export { LifecycleTransitionPayloadSchema, type LifecycleTransitionPayload, type LifecycleTransitionEvent, } from './schemas/lifecycle-event-payload.js';
export { LIFECYCLE_REASON_CODES, LIFECYCLE_REASON_CODE_VALUES, type LifecycleReasonCode, } from './vocabulary/lifecycle-reasons.js';
export { EVENT_TYPES, EVENT_TYPE_VALUES, isKnownEventType, type EventType, } from './vocabulary/event-types.js';
export { StreamEventSchema, StreamStartSchema, StreamChunkSchema, StreamToolCallSchema, StreamUsageSchema, StreamEndSchema, StreamErrorSchema, STREAM_RECONNECT_HEADER, type StreamEvent, type StreamStart, type StreamChunk, type StreamToolCall, type StreamUsage, type StreamEnd, type StreamError, } from './schemas/stream-events.js';
export { RoutingPolicySchema, PersonalityRoutingSchema, TaskTypeSchema, type RoutingPolicy, type PersonalityRouting, type TaskType, } from './schemas/routing-policy.js';
export { POOL_IDS, PoolIdSchema, TIER_POOL_ACCESS, TIER_DEFAULT_POOL, PoolCapabilitiesSchema, isValidPoolId, tierHasAccess, type PoolId, type PoolCapabilities, } from './vocabulary/pools.js';
export { MicroUSD } from './vocabulary/currency.js';
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from './vocabulary/errors.js';
export { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema, type Capability, type CapabilityQuery, type CapabilityResponse, } from './schemas/capability.js';
export { ProtocolDiscoverySchema, buildDiscoveryDocument, type ProtocolDiscovery, } from './schemas/discovery.js';
export { METADATA_NAMESPACES, type MetadataNamespace } from './vocabulary/metadata.js';
export { validate, validators } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { computeReqHash, verifyReqHash, decompressBody, DecompressionError, EMPTY_BODY_HASH, DEFAULT_MAX_BODY_BYTES, DEFAULT_MAX_COMPRESSION_RATIO, MAX_ENCODING_DEPTH, type ReqHashOptions, } from './integrity/req-hash.js';
export { deriveIdempotencyKey } from './integrity/idempotency.js';
//# sourceMappingURL=index.d.ts.map