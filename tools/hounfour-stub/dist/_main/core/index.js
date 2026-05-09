/**
 * Core sub-package barrel.
 *
 * Re-exports agent lifecycle, conversation, transfer, domain events,
 * and protocol-level vocabulary (errors, patterns, stability, deprecation).
 */
// Schemas — Agent
export { AgentDescriptorSchema, } from '../schemas/agent-descriptor.js';
export { AgentLifecycleStateSchema, AGENT_LIFECYCLE_STATES, AGENT_LIFECYCLE_TRANSITIONS, isValidTransition, } from '../schemas/agent-lifecycle.js';
// Schemas — Conversation & Message
export { ConversationSchema, ConversationStatusSchema, ConversationSealingPolicySchema, AccessPolicySchema, MessageSchema, MessageRoleSchema, validateSealingPolicy, validateAccessPolicy, } from '../schemas/conversation.js';
// Schemas — Transfer
export { TransferSpecSchema, TransferEventSchema, TransferScenarioSchema, TransferResultSchema, } from '../schemas/transfer-spec.js';
// Schemas — Domain Event
export { DomainEventSchema, DomainEventBatchSchema, 
// v2.2.0 — Runtime payload validation
AgentEventPayloadSchema, BillingEventPayloadSchema, ConversationEventPayloadSchema, TransferEventPayloadSchema, ToolEventPayloadSchema, MessageEventPayloadSchema, 
// v4.0.0 — Value economy payload schemas
PerformanceEventPayloadSchema, GovernanceEventPayloadSchema, ReputationEventPayloadSchema, EconomyEventPayloadSchema, isAgentEvent, isBillingEvent, isConversationEvent, isTransferEvent, isToolEvent, isMessageEvent, 
// v4.0.0 — Value economy type guards
isPerformanceEvent, isGovernanceEvent, isReputationEvent, isEconomyEvent, } from '../schemas/domain-event.js';
// Schemas — Saga Context
export { SagaContextSchema, validateSagaContext, } from '../schemas/saga-context.js';
// Schemas — Lifecycle Event Payload
export { LifecycleTransitionPayloadSchema, } from '../schemas/lifecycle-event-payload.js';
// Schemas — Health Status
export { HealthStatusSchema, CircuitStateSchema, } from '../schemas/health-status.js';
// Schemas — Thinking Trace
export { ThinkingTraceSchema, } from '../schemas/thinking-trace.js';
// Schemas — Tool Call
export { ToolCallSchema, } from '../schemas/tool-call.js';
// Schemas — Capability Negotiation
export { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema, } from '../schemas/capability.js';
// Schemas — Protocol Discovery
export { ProtocolDiscoverySchema, ProviderSummarySchema, buildDiscoveryDocument, } from '../schemas/discovery.js';
// Schemas — Stream Events
export { StreamEventSchema, StreamStartSchema, StreamChunkSchema, StreamToolCallSchema, StreamUsageSchema, StreamEndSchema, StreamErrorSchema, STREAM_RECONNECT_HEADER, } from '../schemas/stream-events.js';
// Schemas — Routing Policy
export { RoutingPolicySchema, PersonalityRoutingSchema, TaskTypeSchema, } from '../schemas/routing-policy.js';
// Vocabulary — Lifecycle Reason Codes
export { LIFECYCLE_REASON_CODES, LIFECYCLE_REASON_CODE_VALUES, } from '../vocabulary/lifecycle-reasons.js';
// Vocabulary — Event Types
export { EVENT_TYPES, EVENT_TYPE_VALUES, isKnownEventType, } from '../vocabulary/event-types.js';
// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS } from '../vocabulary/errors.js';
// Vocabulary — Patterns
export { UUID_V4_PATTERN, OPAQUE_ID_CONSTRAINTS } from '../vocabulary/patterns.js';
// Vocabulary — Schema Stability
export { SCHEMA_STABILITY_LEVELS, isExperimentalSchema } from '../vocabulary/schema-stability.js';
// Vocabulary — Deprecation
export { DEPRECATION_REGISTRY, getDeprecatedSchemas, isDeprecated, } from '../vocabulary/deprecation.js';
// Schemas — Personality Assignment (v7.1.0, FR-2)
export { PersonalityTierSchema, PersonalityAssignmentSchema, } from './personality-assignment.js';
// Schemas — Agent Identity (v6.0.0, FR-2 — BREAKING: trust_level → trust_scopes)
export { AgentIdentitySchema, TrustLevelSchema, AgentTypeSchema, CapabilityScopeSchema, CapabilityScopedTrustSchema, TRUST_LEVELS, CAPABILITY_SCOPES, DELEGATION_TRUST_THRESHOLD, trustLevelIndex, trustLevelForScope, meetsThresholdForScope, effectiveTrustLevel, flatTrustToScoped, parseAgentIdentity, } from '../schemas/agent-identity.js';
//# sourceMappingURL=index.js.map