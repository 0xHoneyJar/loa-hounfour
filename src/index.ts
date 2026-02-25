/**
 * @0xhoneyjar/loa-hounfour
 *
 * Shared protocol contracts for the loa-finn / arrakis integration layer.
 *
 * Ownership: 0xHoneyJar team
 * Versioning: semver (additive-only minor, required-field changes major only)
 * Update procedure: bump version, run semver:check, publish, pin in consumers
 */

// Domain sub-packages
export * from './core/index.js';
export * from './economy/index.js';
export * from './model/index.js';
// Note: governance TaskTypeSchema/TaskType collide with core's routing-policy TaskType,
// and governance ReputationEvent collides with core's domain-event ReputationEvent.
// Core types take precedence in root barrel per ADR-001. Governance variants are
// available via:
//   1. '@0xhoneyjar/loa-hounfour/governance' sub-package import
//   2. GovernanceTaskTypeSchema / GovernanceReputationEventSchema aliases (below)
export {
  // Exclude: TaskTypeSchema, type TaskType (collision with core/routing-policy)
  // Exclude: type ReputationEvent (collision with core/domain-event)
  // Everything else re-exported:
  SanctionSchema, type Sanction,
  DisputeRecordSchema, type DisputeRecord,
  ValidatedOutcomeSchema, type ValidatedOutcome,
  ReputationScoreSchema, type ReputationScore,
  PerformanceRecordSchema, PerformanceOutcomeSchema, type PerformanceRecord, type PerformanceOutcome,
  ContributionRecordSchema, type ContributionRecord,
  SANCTION_SEVERITY_LEVELS, SANCTION_SEVERITY_ORDER, VIOLATION_TYPES, ESCALATION_RULES, type SanctionSeverity, type ViolationType,
  SanctionSeveritySchema, SANCTION_SEVERITY_LADDER, getSeverityEntry, compareSeverity, type SanctionSeverityLevel, type SeverityLadderEntry,
  REPUTATION_WEIGHTS, REPUTATION_DECAY, MIN_REPUTATION_SAMPLE_SIZE, type ReputationComponent, BAYESIAN_BLEND, ANTI_MANIPULATION, DEFAULT_HALF_LIFE_DAYS,
  ReputationStateSchema, type ReputationState, ReputationTransitionSchema, type ReputationTransition, ModelCohortSchema, type ModelCohort, ReputationAggregateSchema, type ReputationAggregate, REPUTATION_TRANSITIONS, isValidReputationTransition, computePersonalWeight, computeBlendedScore, computeDecayedSampleCount, computeCrossModelScore, getModelCohort, AggregateSnapshotSchema, type AggregateSnapshot,
  QualityEventSchema, type QualityEvent,
  RecordQualityEventCommandSchema, type RecordQualityEventCommand, QueryReputationCommandSchema, type QueryReputationCommand, ResetReputationCommandSchema, type ResetReputationCommand,
  ReputationStateChangedPayloadSchema, type ReputationStateChangedPayload, QualityEventRecordedPayloadSchema, type QualityEventRecordedPayload, CollectionScoreUpdatedPayloadSchema, type CollectionScoreUpdatedPayload,
  isReliableReputation,
  ReputationCredentialSchema, type ReputationCredential,
  GovernanceConfigSchema, MissionAlignmentSchema, DEFAULT_GOVERNANCE_CONFIG, type GovernanceConfig, type MissionAlignment,
  resolveReservationTier, resolveAdvisoryThreshold,
  ForkTypeSchema, TreeNodeStatusSchema, TreeStrategySchema, BudgetAllocationSchema, DelegationTreeNodeSchema, DelegationTreeSchema, chainToTree, treeToChain, type ForkType, type TreeNodeStatus, type TreeStrategy, type BudgetAllocation, type DelegationTreeNode, type DelegationTree,
  OutcomeTypeSchema, VoteChoiceSchema, DelegationVoteSchema, DissentTypeSchema, DissentSeveritySchema, DissentRecordSchema, DelegationOutcomeSchema, type OutcomeType, type VoteChoice, type DelegationVote, type DissentType, type DissentSeverity, type DissentRecord, type DelegationOutcome,
  ReportingRequirementSchema, RevocationPolicySchema, PermissionBoundarySchema, type ReportingRequirement, type RevocationPolicy, type PermissionBoundary,
  ProposalStatusSchema, PROPOSAL_STATUS_TRANSITIONS, ProposedChangeSchema, GovernanceVoteSchema, VotingRecordSchema, GovernanceProposalSchema, type ProposalStatus, type ProposedChange, type GovernanceVote, type VotingRecord, type GovernanceProposal,
  EventFilterSchema, DeliveryMethodSchema, EventCursorSchema, EventSubscriptionSchema, type EventFilter, type DeliveryMethod, type EventCursor, type EventSubscription,
  PortabilityScopeSchema, ReputationPortabilityRequestSchema, PortabilityResponseSchema, type PortabilityScope, type ReputationPortabilityRequest, type PortabilityResponse,
  QualitySignalLevelSchema, OutcomeQualityMappingSchema, DEFAULT_OUTCOME_QUALITY_MAPPING, QUALITY_SIGNAL_SCORES, DelegationQualityEventSchema, type QualitySignalLevel, type OutcomeQualityMapping, type DelegationQualityEvent,
  DemotionRuleSchema, ReputationDecayPolicySchema, CollectionGovernanceConfigSchema, DEFAULT_DEMOTION_RULES, type DemotionRule, type ReputationDecayPolicy, type CollectionGovernanceConfig,
  ConstraintLifecycleStatusSchema, CONSTRAINT_LIFECYCLE_TRANSITIONS, ConstraintCandidateSchema, ConstraintLifecycleEventSchema, type ConstraintLifecycleStatus, type ConstraintCandidate, type ConstraintLifecycleEvent,
  RoutingSignalTypeSchema, ReputationRoutingSignalSchema, type RoutingSignalType, type ReputationRoutingSignal,
  PolicyTypeSchema, PolicyVersionSchema, type PolicyType, type PolicyVersion,
  ExecutionStatusSchema, EXECUTION_STATUS_TRANSITIONS, ChangeApplicationResultSchema, ProposalExecutionSchema, ExecutionStrategySchema, type ExecutionStatus, type ChangeApplicationResult, type ProposalExecution, type ExecutionStrategy,
  CheckpointHealthSchema, ProceedDecisionSchema, ExecutionCheckpointSchema, type CheckpointHealth, type ProceedDecision, type ExecutionCheckpoint,
  RollbackScopeSchema, type RollbackScope,
  ProposalEventTypeSchema, ProposalOutcomeEventSchema, type ProposalEventType, type ProposalOutcomeEvent,
  EngagementSignalTypeSchema, CommunityEngagementSignalSchema, type EngagementSignalType, type CommunityEngagementSignal,
  isProposalActionable, computeVotingResult, isConstraintEnactable, computeGovernanceWeight,
  computeModelRoutingScores, selectModel, computeCompositeBasketWeights, isModelEligible, computeRebalancedWeights, type ModelRoutingScore,
  // v7.10.0 — Task-Dimensional Reputation (non-colliding exports only)
  TASK_TYPES,
  TaskTypeCohortSchema, validateTaskCohortUniqueness, type TaskTypeCohort,
  ReputationEventSchema, QualitySignalEventSchema, TaskCompletedEventSchema, CredentialUpdateEventSchema, ModelPerformanceEventSchema, type QualitySignalEvent, type TaskCompletedEvent, type CredentialUpdateEvent, type ModelPerformanceEvent,
  QualityObservationSchema, type QualityObservation,
  ScoringPathSchema, ScoringPathLogSchema, type ScoringPath, type ScoringPathLog,
} from './governance/index.js';

// v7.10.1 — Aliased re-exports for colliding governance types (ADR-001).
// These provide root-barrel discoverability without renaming $id values.
// Core types (routing-policy TaskType, domain-event ReputationEvent) keep
// their unaliased names; governance variants get the Governance* prefix.
export {
  TaskTypeSchema as GovernanceTaskTypeSchema,
  type TaskType as GovernanceTaskType,
} from './governance/task-type.js';
export {
  ReputationEventSchema as GovernanceReputationEventSchema,
  type ReputationEvent as GovernanceReputationEvent,
} from './governance/reputation-event.js';

export * from './constraints/index.js';
export * from './integrity/index.js';

// v8.0.0 — Commons Protocol
export * from './commons/index.js';

// Cross-cutting concerns (stay in root)
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas, type CrossFieldValidator } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
// Note: computeReqHash, verifyReqHash, decompressBody, deriveIdempotencyKey now
// re-exported via ./integrity/index.js (v5.5.0 — integrity barrel creation).

// Schema Graph (v5.5.0, FR-4)
export { extractReferences, buildSchemaGraph, type SchemaReference, type SchemaGraphNode } from './utilities/schema-graph.js';

// AccessPolicy Evaluation (v7.1.0, FR-6)
export {
  evaluateAccessPolicy,
  type AccessPolicyContext,
  type AccessPolicyResult,
} from './utilities/access-policy.js';

// Reputation Event Sourcing (v7.3.0, C2 + Spec V)
export {
  reconstructAggregateFromEvents,
  verifyAggregateConsistency,
  computeEventStreamHash,
  type ReconstructedAggregate,
  type ConsistencyReport,
} from './utilities/reputation-replay.js';

// Reputation Credential Prior (v7.3.0, C1 + Spec IV)
export { computeCredentialPrior, isCredentialExpired, CREDENTIAL_CONFIDENCE_THRESHOLD } from './utilities/reputation-credential.js';

// Constraint Namespace Validation (v7.8.0, DR-F4)
export { detectReservedNameCollisions, type NameCollision } from './utilities/constraint-validation.js';

// Economic Boundary Decision Engine (v7.9.0, FR-1; extended v7.9.1)
export {
  evaluateEconomicBoundary,
  evaluateFromBoundary,
  parseMicroUsd,
  type ParseMicroUsdResult,
} from './utilities/economic-boundary.js';

// Reputation Vocabulary (v7.9.0 — root barrel export; v7.9.1 type guard)
export {
  REPUTATION_STATE_ORDER,
  REPUTATION_STATES,
  isKnownReputationState,
  type ReputationStateName,
} from './vocabulary/reputation.js';
