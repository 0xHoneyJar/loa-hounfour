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

// v8.4.0 — Synthetic-deliberation set + OrgOverseer (FR-A1..FR-A4 + FR-B1..FR-B3).
// v8.5.0 — Authority cascade Layer 2 + 3 (PR-A2.2) + Recall machinery + Forget /
// Commit / Estate + Assertion family (PR-A2.3). Re-exported at root for
// discoverability per Issue #76 F2 (the v8.4.0 / v8.5.0 governance surface
// previously required a `/governance` subpath import). The `/governance`
// subpath remains supported and emits identical bindings — root surface
// is the convenience path.
export {
  // FR-A1 Panel deliberation input
  PanelDecisionArtifactSchema, type PanelDecisionArtifact,
  ClaimSchema, type Claim,
  ClaimGroundingSchema, type ClaimGrounding,
  ProposedActionSchema, type ProposedAction,
  TrustContextSchema, type TrustContext,
  // FR-A2 Panel verdict
  PanelVerdictSchema, type PanelVerdict,
  JurorVerdictSchema, type JurorVerdict,
  AsymmetricBlockerSignalSchema, type AsymmetricBlockerSignal,
  // FR-A3 Deliberation dissent
  DeliberationDissentSchema, type DeliberationDissent,
  // FR-A4 Cross-score report + PairwiseScore (PR-A2.2 promotion)
  CrossScoreReportSchema, type CrossScoreReport,
  PairwiseScoreSchema, type PairwiseScore,
  // FR-B1..B3 Org-overseer
  OrgIdentitySchema, type OrgIdentity,
  OrgRepresentativeDelegationSchema, type OrgRepresentativeDelegation,
  ORG_DELEGATION_GENESIS_SENTINEL,
  SuccessionPolicySchema, type SuccessionPolicy,
  // Shared signing-context envelope
  SigningContextSchema, type SigningContext,
  // v8.5.0 PR-A2.2 Authority cascade Layer 2 + 3
  KeyringSchema, type Keyring,
  SignerEntrySchema, type SignerEntry,
  SignerCompetenceRuleSchema, type SignerCompetenceRule,
  SignerCompetenceResultSchema, type SignerCompetenceResult,
  SignatureEnvelopeSchema, type SignatureEnvelope,
  SignerTypeSchema, type SignerType,
  SignatureTypeSchema, type SignatureType,
  SignerStatusSchema, type SignerStatus,
  PolicyDecisionOutcomeSchema, type PolicyDecisionOutcome,
  // v8.5.0 PR-A2.3 Recall machinery
  ReceiptDetailLevelSchema, type ReceiptDetailLevel,
  SurfaceContextSchema, type SurfaceContext,
  RecallRequestSchema, type RecallRequest,
  RecallPackSchema, type RecallPack,
  RecallReceiptSchema, type RecallReceipt,
  // v8.5.0 PR-A2.3 Forget / Commit / Estate
  ForgetRecordSchema, type ForgetRecord,
  CommitmentTypeSchema, type CommitmentType,
  CommitmentRootSchema, type CommitmentRoot,
  AgentEstateStatusSchema, type AgentEstateStatus,
  AgentEstateSchema, type AgentEstate,
  // v8.5.0 PR-A2.3 Assertion family
  PrivacyScopeSchema, type PrivacyScope,
  RiskLevelSchema, type RiskLevel,
  AssertionStatusSchema, type AssertionStatus,
  AssertionClassSchema, type AssertionClass,
  AssertionSchema, type Assertion,
} from './governance/index.js';

export * from './constraints/index.js';
export * from './integrity/index.js';

// v8.0.0 — Commons Protocol
export * from './commons/index.js';

// Cross-cutting concerns (stay in root)
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas, type CrossFieldValidator, type ValidationResult } from './validators/index.js';
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

// Audit event-type 3-segment namespace spec (v8.5.0 — F6 + G5)
export {
  AUDIT_EVENT_TYPES_KNOWN_PREFIXES,
  isThreeSegmentEventType,
  extractEventTypePrefix,
} from './vocabulary/audit-event-types.js';

// Sanctioned canonicalization helper (v8.5.0 — G3 + G4)
export {
  safeCanonicalize,
  SAFE_CANONICALIZE_DEFAULT_MAX_BYTES,
  CanonicalizeSizeError,
  CanonicalizeNFCError,
  CanonicalizeKeyCollisionError,
  type SafeCanonicalizeOptions,
} from './utilities/safe-canonicalize.js';
