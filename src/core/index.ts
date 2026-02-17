/**
 * Core sub-package barrel.
 *
 * Re-exports agent lifecycle, conversation, transfer, domain events,
 * and protocol-level vocabulary (errors, patterns, stability, deprecation).
 */

// Schemas — Agent
export {
  AgentDescriptorSchema,
  type AgentDescriptor,
} from '../schemas/agent-descriptor.js';

export {
  AgentLifecycleStateSchema,
  AGENT_LIFECYCLE_STATES,
  AGENT_LIFECYCLE_TRANSITIONS,
  isValidTransition,
  type AgentLifecycleState,
} from '../schemas/agent-lifecycle.js';

// Schemas — Conversation & Message
export {
  ConversationSchema,
  ConversationStatusSchema,
  ConversationSealingPolicySchema,
  AccessPolicySchema,
  MessageSchema,
  MessageRoleSchema,
  validateSealingPolicy,
  validateAccessPolicy,
  type AccessPolicyValidationOptions,
  type Conversation,
  type ConversationStatus,
  type ConversationSealingPolicy,
  type AccessPolicy,
  type Message,
  type MessageRole,
} from '../schemas/conversation.js';

// Schemas — Transfer
export {
  TransferSpecSchema,
  TransferEventSchema,
  TransferScenarioSchema,
  TransferResultSchema,
  type TransferSpec,
  type TransferEventRecord,
  type TransferScenario,
  type TransferResult,
} from '../schemas/transfer-spec.js';

// Schemas — Domain Event
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
  // v4.0.0 — Value economy aggregate events
  type PerformanceEvent,
  type GovernanceEvent,
  type ReputationEvent,
  type EconomyEvent,
  // v2.2.0 — Runtime payload validation
  AgentEventPayloadSchema,
  BillingEventPayloadSchema,
  ConversationEventPayloadSchema,
  TransferEventPayloadSchema,
  ToolEventPayloadSchema,
  MessageEventPayloadSchema,
  // v4.0.0 — Value economy payload schemas
  PerformanceEventPayloadSchema,
  GovernanceEventPayloadSchema,
  ReputationEventPayloadSchema,
  EconomyEventPayloadSchema,
  isAgentEvent,
  isBillingEvent,
  isConversationEvent,
  isTransferEvent,
  isToolEvent,
  isMessageEvent,
  // v4.0.0 — Value economy type guards
  isPerformanceEvent,
  isGovernanceEvent,
  isReputationEvent,
  isEconomyEvent,
} from '../schemas/domain-event.js';

// Schemas — Saga Context
export {
  SagaContextSchema,
  validateSagaContext,
  type SagaContext,
} from '../schemas/saga-context.js';

// Schemas — Lifecycle Event Payload
export {
  LifecycleTransitionPayloadSchema,
  type LifecycleTransitionPayload,
  type LifecycleTransitionEvent,
} from '../schemas/lifecycle-event-payload.js';

// Schemas — Health Status
export {
  HealthStatusSchema,
  CircuitStateSchema,
  type HealthStatus,
  type CircuitState,
} from '../schemas/health-status.js';

// Schemas — Thinking Trace
export {
  ThinkingTraceSchema,
  type ThinkingTrace,
} from '../schemas/thinking-trace.js';

// Schemas — Tool Call
export {
  ToolCallSchema,
  type ToolCall,
} from '../schemas/tool-call.js';

// Schemas — Capability Negotiation
export {
  CapabilitySchema,
  CapabilityQuerySchema,
  CapabilityResponseSchema,
  type Capability,
  type CapabilityQuery,
  type CapabilityResponse,
} from '../schemas/capability.js';

// Schemas — Protocol Discovery
export {
  ProtocolDiscoverySchema,
  ProviderSummarySchema,
  buildDiscoveryDocument,
  type ProtocolDiscovery,
  type ProviderSummary,
  type BuildDiscoveryOptions,
} from '../schemas/discovery.js';

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
} from '../schemas/stream-events.js';

// Schemas — Routing Policy
export {
  RoutingPolicySchema,
  PersonalityRoutingSchema,
  TaskTypeSchema,
  type RoutingPolicy,
  type PersonalityRouting,
  type TaskType,
} from '../schemas/routing-policy.js';

// Vocabulary — Lifecycle Reason Codes
export {
  LIFECYCLE_REASON_CODES,
  LIFECYCLE_REASON_CODE_VALUES,
  type LifecycleReasonCode,
} from '../vocabulary/lifecycle-reasons.js';

// Vocabulary — Event Types
export {
  EVENT_TYPES,
  EVENT_TYPE_VALUES,
  isKnownEventType,
  type EventType,
} from '../vocabulary/event-types.js';

// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from '../vocabulary/errors.js';

// Vocabulary — Patterns
export { UUID_V4_PATTERN, OPAQUE_ID_CONSTRAINTS } from '../vocabulary/patterns.js';

// Vocabulary — Schema Stability
export { SCHEMA_STABILITY_LEVELS, isExperimentalSchema, type SchemaStabilityLevel } from '../vocabulary/schema-stability.js';

// Vocabulary — Deprecation
export {
  DEPRECATION_REGISTRY,
  type DeprecationEntry,
  getDeprecatedSchemas,
  isDeprecated,
} from '../vocabulary/deprecation.js';

// Schemas — Agent Identity (v5.5.0, FR-6)
export {
  AgentIdentitySchema,
  TrustLevelSchema,
  AgentTypeSchema,
  TRUST_LEVELS,
  DELEGATION_TRUST_THRESHOLD,
  trustLevelIndex,
  meetsThreshold,
  type AgentIdentity,
  type TrustLevel,
  type AgentType,
} from '../schemas/agent-identity.js';
