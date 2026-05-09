/**
 * Core sub-package barrel.
 *
 * Re-exports agent lifecycle, conversation, transfer, domain events,
 * and protocol-level vocabulary (errors, patterns, stability, deprecation).
 */
export { AgentDescriptorSchema, type AgentDescriptor, } from '../schemas/agent-descriptor.js';
export { AgentLifecycleStateSchema, AGENT_LIFECYCLE_STATES, AGENT_LIFECYCLE_TRANSITIONS, isValidTransition, type AgentLifecycleState, } from '../schemas/agent-lifecycle.js';
export { ConversationSchema, ConversationStatusSchema, ConversationSealingPolicySchema, AccessPolicySchema, MessageSchema, MessageRoleSchema, validateSealingPolicy, validateAccessPolicy, type AccessPolicyValidationOptions, type Conversation, type ConversationStatus, type ConversationSealingPolicy, type AccessPolicy, type Message, type MessageRole, } from '../schemas/conversation.js';
export { TransferSpecSchema, TransferEventSchema, TransferScenarioSchema, TransferResultSchema, type TransferSpec, type TransferEventRecord, type TransferScenario, type TransferResult, } from '../schemas/transfer-spec.js';
export { DomainEventSchema, DomainEventBatchSchema, type DomainEvent, type DomainEventBatch, type AgentEvent, type BillingEvent, type ConversationEvent, type TransferEvent, type ToolEvent, type MessageEvent, type PerformanceEvent, type GovernanceEvent, type ReputationEvent, type EconomyEvent, AgentEventPayloadSchema, BillingEventPayloadSchema, ConversationEventPayloadSchema, TransferEventPayloadSchema, ToolEventPayloadSchema, MessageEventPayloadSchema, PerformanceEventPayloadSchema, GovernanceEventPayloadSchema, ReputationEventPayloadSchema, EconomyEventPayloadSchema, isAgentEvent, isBillingEvent, isConversationEvent, isTransferEvent, isToolEvent, isMessageEvent, isPerformanceEvent, isGovernanceEvent, isReputationEvent, isEconomyEvent, } from '../schemas/domain-event.js';
export { SagaContextSchema, validateSagaContext, type SagaContext, } from '../schemas/saga-context.js';
export { LifecycleTransitionPayloadSchema, type LifecycleTransitionPayload, type LifecycleTransitionEvent, } from '../schemas/lifecycle-event-payload.js';
export { HealthStatusSchema, CircuitStateSchema, type HealthStatus, type CircuitState, } from '../schemas/health-status.js';
export { ThinkingTraceSchema, type ThinkingTrace, } from '../schemas/thinking-trace.js';
export { ToolCallSchema, type ToolCall, } from '../schemas/tool-call.js';
export { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema, type Capability, type CapabilityQuery, type CapabilityResponse, } from '../schemas/capability.js';
export { ProtocolDiscoverySchema, ProviderSummarySchema, buildDiscoveryDocument, type ProtocolDiscovery, type ProviderSummary, type BuildDiscoveryOptions, } from '../schemas/discovery.js';
export { StreamEventSchema, StreamStartSchema, StreamChunkSchema, StreamToolCallSchema, StreamUsageSchema, StreamEndSchema, StreamErrorSchema, STREAM_RECONNECT_HEADER, type StreamEvent, type StreamStart, type StreamChunk, type StreamToolCall, type StreamUsage, type StreamEnd, type StreamError, } from '../schemas/stream-events.js';
export { RoutingPolicySchema, PersonalityRoutingSchema, TaskTypeSchema, type RoutingPolicy, type PersonalityRouting, type TaskType, } from '../schemas/routing-policy.js';
export { LIFECYCLE_REASON_CODES, LIFECYCLE_REASON_CODE_VALUES, type LifecycleReasonCode, } from '../vocabulary/lifecycle-reasons.js';
export { EVENT_TYPES, EVENT_TYPE_VALUES, isKnownEventType, type EventType, } from '../vocabulary/event-types.js';
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from '../vocabulary/errors.js';
export { UUID_V4_PATTERN, OPAQUE_ID_CONSTRAINTS } from '../vocabulary/patterns.js';
export { SCHEMA_STABILITY_LEVELS, isExperimentalSchema, type SchemaStabilityLevel } from '../vocabulary/schema-stability.js';
export { DEPRECATION_REGISTRY, type DeprecationEntry, getDeprecatedSchemas, isDeprecated, } from '../vocabulary/deprecation.js';
export { PersonalityTierSchema, type PersonalityTier, PersonalityAssignmentSchema, type PersonalityAssignment, } from './personality-assignment.js';
export { AgentIdentitySchema, TrustLevelSchema, AgentTypeSchema, CapabilityScopeSchema, CapabilityScopedTrustSchema, TRUST_LEVELS, CAPABILITY_SCOPES, DELEGATION_TRUST_THRESHOLD, trustLevelIndex, trustLevelForScope, meetsThresholdForScope, effectiveTrustLevel, flatTrustToScoped, parseAgentIdentity, type AgentIdentity, type TrustLevel, type AgentType, type CapabilityScope, type CapabilityScopedTrust, } from '../schemas/agent-identity.js';
//# sourceMappingURL=index.d.ts.map