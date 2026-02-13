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
export { InvokeResponseSchema, UsageReportSchema, UsageSchema, } from './schemas/invoke-response.js';
// Schemas — Billing (v2.0.0)
export { BillingEntrySchema, BillingRecipientSchema, CostTypeSchema, CreditNoteSchema, } from './schemas/billing-entry.js';
// Schemas — Agent (v2.0.0)
export { AgentDescriptorSchema, } from './schemas/agent-descriptor.js';
export { AgentLifecycleStateSchema, AGENT_LIFECYCLE_STATES, AGENT_LIFECYCLE_TRANSITIONS, isValidTransition, } from './schemas/agent-lifecycle.js';
// Utilities — NFT Identity (v2.0.0)
export { NftIdSchema, NFT_ID_PATTERN, parseNftId, formatNftId, isValidNftId, checksumAddress, } from './utilities/nft-id.js';
// Utilities — Lifecycle (v2.0.0)
export { createTransitionValidator, } from './utilities/lifecycle.js';
// Utilities — Billing (v2.0.0)
export { validateBillingRecipients, allocateRecipients, } from './utilities/billing.js';
// Schemas — Conversation & Message (v2.0.0)
export { ConversationSchema, ConversationStatusSchema, ConversationSealingPolicySchema, MessageSchema, MessageRoleSchema, validateSealingPolicy, } from './schemas/conversation.js';
// Schemas — Transfer (v2.0.0)
export { TransferSpecSchema, TransferEventSchema, TransferScenarioSchema, TransferResultSchema, } from './schemas/transfer-spec.js';
// Schemas — Domain Event (v2.0.0)
export { DomainEventSchema, DomainEventBatchSchema, 
// v2.2.0 — Runtime payload validation (BB-V3-002)
AgentEventPayloadSchema, BillingEventPayloadSchema, ConversationEventPayloadSchema, TransferEventPayloadSchema, ToolEventPayloadSchema, MessageEventPayloadSchema, isAgentEvent, isBillingEvent, isConversationEvent, isTransferEvent, isToolEvent, isMessageEvent, } from './schemas/domain-event.js';
// Schemas — Saga Context (v2.2.0, BB-V3-012)
export { SagaContextSchema, validateSagaContext, } from './schemas/saga-context.js';
// Schemas — Lifecycle Event Payload (v2.1.0)
export { LifecycleTransitionPayloadSchema, } from './schemas/lifecycle-event-payload.js';
// Vocabulary — Lifecycle Reason Codes (v2.2.0, BB-V3-009)
export { LIFECYCLE_REASON_CODES, LIFECYCLE_REASON_CODE_VALUES, } from './vocabulary/lifecycle-reasons.js';
// Vocabulary — Event Types (v2.2.0, BB-V3-011)
export { EVENT_TYPES, EVENT_TYPE_VALUES, isKnownEventType, } from './vocabulary/event-types.js';
// Schemas — Stream Events
export { StreamEventSchema, StreamStartSchema, StreamChunkSchema, StreamToolCallSchema, StreamUsageSchema, StreamEndSchema, StreamErrorSchema, STREAM_RECONNECT_HEADER, } from './schemas/stream-events.js';
// Schemas — Routing Policy
export { RoutingPolicySchema, PersonalityRoutingSchema, TaskTypeSchema, } from './schemas/routing-policy.js';
// Vocabulary — Pools
export { POOL_IDS, PoolIdSchema, TIER_POOL_ACCESS, TIER_DEFAULT_POOL, PoolCapabilitiesSchema, isValidPoolId, tierHasAccess, } from './vocabulary/pools.js';
// Vocabulary — Currency (v2.0.0)
export { MicroUSD } from './vocabulary/currency.js';
// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS } from './vocabulary/errors.js';
// Schemas — Capability Negotiation (v2.2.0, BB-V3-005)
export { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema, } from './schemas/capability.js';
// Schemas — Protocol Discovery (v2.2.0, BB-V3-006)
export { ProtocolDiscoverySchema, buildDiscoveryDocument, } from './schemas/discovery.js';
// Vocabulary — Metadata Namespaces (v2.2.0, BB-V3-001)
export { METADATA_NAMESPACES } from './vocabulary/metadata.js';
// Validators
export { validate, validators } from './validators/index.js';
export { validateCompatibility } from './validators/compatibility.js';
// Integrity — Request Hash
export { computeReqHash, verifyReqHash, decompressBody, DecompressionError, EMPTY_BODY_HASH, DEFAULT_MAX_BODY_BYTES, DEFAULT_MAX_COMPRESSION_RATIO, MAX_ENCODING_DEPTH, } from './integrity/req-hash.js';
// Integrity — Idempotency
export { deriveIdempotencyKey } from './integrity/idempotency.js';
//# sourceMappingURL=index.js.map