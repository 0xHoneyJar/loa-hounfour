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
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';

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
  type GuardSeverity,
} from './utilities/lifecycle.js';

// Utilities — Billing (v2.0.0)
export {
  validateBillingEntry,
  validateBillingRecipients,
  validateCreditNote,
  allocateRecipients,
} from './utilities/billing.js';

// Schemas — Conversation & Message (v2.0.0, access_policy v3.0.0)
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

// Schemas — Domain Event (v2.0.0, v4.0.0 aggregate extension)
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
  // v2.2.0 — Runtime payload validation (BB-V3-002)
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

// Vocabulary — Currency (v2.0.0, centralized arithmetic v2.4.0, signed default v4.0.0)
export {
  MicroUSD,
  MicroUSDUnsigned,
  MicroUSDSigned,
  ZERO_MICRO,
  addMicro,
  subtractMicro,
  subtractMicroSigned,
  multiplyBps,
  compareMicro,
  negateMicro,
  isNegativeMicro,
} from './vocabulary/currency.js';

// Vocabulary — Transfer Choreography (v2.3.0, invariants v2.4.0)
export {
  TRANSFER_CHOREOGRAPHY,
  TRANSFER_INVARIANTS,
  type TransferChoreography,
  type ScenarioChoreography,
  type TransferInvariant,
  type TransferInvariants,
} from './vocabulary/transfer-choreography.js';

// Schemas — Routing Constraint (v4.0.0)
export {
  RoutingConstraintSchema,
  type RoutingConstraint,
} from './schemas/routing-constraint.js';

// Schemas — Performance (v4.1.0)
export {
  PerformanceRecordSchema,
  PerformanceOutcomeSchema,
  type PerformanceRecord,
  type PerformanceOutcome,
} from './schemas/performance-record.js';

export {
  ContributionRecordSchema,
  type ContributionRecord,
} from './schemas/contribution-record.js';

// Vocabulary — Sanctions (v4.2.0)
export {
  SANCTION_SEVERITY_LEVELS,
  SANCTION_SEVERITY_ORDER,
  VIOLATION_TYPES,
  ESCALATION_RULES,
  type SanctionSeverity,
  type ViolationType,
} from './vocabulary/sanctions.js';

// Schemas — Governance (v4.2.0)
export {
  SanctionSchema,
  type Sanction,
} from './schemas/sanction.js';

export {
  DisputeRecordSchema,
  type DisputeRecord,
} from './schemas/dispute-record.js';

export {
  ValidatedOutcomeSchema,
  type ValidatedOutcome,
} from './schemas/validated-outcome.js';

// Vocabulary — Reputation (v4.3.0)
export {
  REPUTATION_WEIGHTS,
  REPUTATION_DECAY,
  MIN_REPUTATION_SAMPLE_SIZE,
  type ReputationComponent,
} from './vocabulary/reputation.js';

// Schemas — Reputation (v4.3.0)
export {
  ReputationScoreSchema,
  type ReputationScore,
} from './schemas/reputation-score.js';

// Vocabulary — Economic Choreography (v4.4.0)
export {
  ECONOMIC_CHOREOGRAPHY,
  type EconomicScenarioChoreography,
  type EconomicChoreography,
} from './vocabulary/economic-choreography.js';

// Schemas — Economy (v4.4.0)
export {
  EscrowEntrySchema,
  ESCROW_TRANSITIONS,
  isValidEscrowTransition,
  type EscrowEntry,
} from './schemas/escrow-entry.js';

export {
  StakePositionSchema,
  type StakePosition,
} from './schemas/stake-position.js';

export {
  CommonsDividendSchema,
  type CommonsDividend,
} from './schemas/commons-dividend.js';

export {
  MutualCreditSchema,
  type MutualCredit,
} from './schemas/mutual-credit.js';

// Utilities — Reputation (v4.5.0)
export { isReliableReputation } from './utilities/reputation.js';

// Utilities — Lifecycle sanction guard (v4.2.0)
export {
  requiresSanctionEvidence,
} from './utilities/lifecycle.js';

// Vocabulary — Errors
export { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from './vocabulary/errors.js';

// Schemas — Health Status (v3.1.0, BB-HFR-001)
export {
  HealthStatusSchema,
  CircuitStateSchema,
  type HealthStatus,
  type CircuitState,
} from './schemas/health-status.js';

// Schemas — Thinking Trace (v3.1.0, BB-HFR-002)
export {
  ThinkingTraceSchema,
  type ThinkingTrace,
} from './schemas/thinking-trace.js';

// Schemas — Tool Call (v3.1.0, BB-HFR-003)
export {
  ToolCallSchema,
  type ToolCall,
} from './schemas/tool-call.js';

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

// Vocabulary — Metadata Namespaces (v2.2.0, model namespace v2.4.0)
export {
  METADATA_NAMESPACES,
  MODEL_METADATA_KEYS,
  type MetadataNamespace,
  type ModelMetadataKey,
} from './vocabulary/metadata.js';

// Validators
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas, type CrossFieldValidator } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';

// Vocabulary — Patterns (v4.5.0)
export { UUID_V4_PATTERN, OPAQUE_ID_CONSTRAINTS } from './vocabulary/patterns.js';

// Vocabulary — Schema Stability (v4.5.0)
export { SCHEMA_STABILITY_LEVELS, isExperimentalSchema, type SchemaStabilityLevel } from './vocabulary/schema-stability.js';

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

// Vocabulary — Economy Integration (v4.5.0)
export { ECONOMY_FLOW, type EconomyFlowEntry } from './vocabulary/economy-integration.js';

// FR-5: Economy Flow Verification (v4.6.0)
export { verifyEconomyFlow } from './vocabulary/economy-integration.js';

// Vocabulary — State Machines (v4.6.0)
export {
  STATE_MACHINES,
  getValidTransitions,
  isTerminalState,
  isValidTransition as isValidStateMachineTransition,
  type StateMachineDefinition,
  type StateMachineTransition,
} from './vocabulary/state-machines.js';

// Vocabulary — Aggregate Boundaries (v4.6.0)
export {
  AGGREGATE_BOUNDARIES,
  type AggregateBoundary,
  type ConsistencyModel,
} from './vocabulary/aggregate-boundaries.js';

// FR-3: Temporal Properties (v4.6.0)
export {
  TEMPORAL_PROPERTIES,
  type TemporalProperty,
  type PropertyType,
} from './vocabulary/temporal-properties.js';

// FR-4: Cross-Language Constraints (v4.6.0)
export { type ConstraintFile, type Constraint } from './constraints/types.js';
export { evaluateConstraint, MAX_EXPRESSION_DEPTH } from './constraints/evaluator.js';

// FR-6: Deprecation (v4.6.0)
export {
  DEPRECATION_REGISTRY,
  type DeprecationEntry,
  getDeprecatedSchemas,
  isDeprecated,
} from './vocabulary/deprecation.js';

// FR-6: Metadata validation (v4.6.0)
export { isValidMetadataKey, getNamespaceOwner } from './vocabulary/metadata.js';

// Integrity — Idempotency
export { deriveIdempotencyKey } from './integrity/idempotency.js';

// Schemas — ModelPort (v5.0.0)
export {
  CompletionRequestSchema,
  type CompletionRequest,
} from './schemas/model/completion-request.js';

export {
  CompletionResultSchema,
  type CompletionResult,
} from './schemas/model/completion-result.js';

export {
  ModelCapabilitiesSchema,
  type ModelCapabilities,
} from './schemas/model/model-capabilities.js';

export {
  ProviderWireMessageSchema,
  type ProviderWireMessage,
} from './schemas/model/provider-wire-message.js';

export {
  ToolDefinitionSchema,
  type ToolDefinition,
} from './schemas/model/tool-definition.js';

export {
  ToolResultSchema,
  type ToolResult,
} from './schemas/model/tool-result.js';
