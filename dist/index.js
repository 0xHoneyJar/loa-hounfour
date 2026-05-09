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
SanctionSchema, DisputeRecordSchema, ValidatedOutcomeSchema, ReputationScoreSchema, PerformanceRecordSchema, PerformanceOutcomeSchema, ContributionRecordSchema, SANCTION_SEVERITY_LEVELS, SANCTION_SEVERITY_ORDER, VIOLATION_TYPES, ESCALATION_RULES, SanctionSeveritySchema, SANCTION_SEVERITY_LADDER, getSeverityEntry, compareSeverity, REPUTATION_WEIGHTS, REPUTATION_DECAY, MIN_REPUTATION_SAMPLE_SIZE, BAYESIAN_BLEND, ANTI_MANIPULATION, DEFAULT_HALF_LIFE_DAYS, ReputationStateSchema, ReputationTransitionSchema, ModelCohortSchema, ReputationAggregateSchema, REPUTATION_TRANSITIONS, isValidReputationTransition, computePersonalWeight, computeBlendedScore, computeDecayedSampleCount, computeCrossModelScore, getModelCohort, AggregateSnapshotSchema, QualityEventSchema, RecordQualityEventCommandSchema, QueryReputationCommandSchema, ResetReputationCommandSchema, ReputationStateChangedPayloadSchema, QualityEventRecordedPayloadSchema, CollectionScoreUpdatedPayloadSchema, isReliableReputation, ReputationCredentialSchema, GovernanceConfigSchema, MissionAlignmentSchema, DEFAULT_GOVERNANCE_CONFIG, resolveReservationTier, resolveAdvisoryThreshold, ForkTypeSchema, TreeNodeStatusSchema, TreeStrategySchema, BudgetAllocationSchema, DelegationTreeNodeSchema, DelegationTreeSchema, chainToTree, treeToChain, OutcomeTypeSchema, VoteChoiceSchema, DelegationVoteSchema, DissentTypeSchema, DissentSeveritySchema, DissentRecordSchema, DelegationOutcomeSchema, ReportingRequirementSchema, RevocationPolicySchema, PermissionBoundarySchema, ProposalStatusSchema, PROPOSAL_STATUS_TRANSITIONS, ProposedChangeSchema, GovernanceVoteSchema, VotingRecordSchema, GovernanceProposalSchema, EventFilterSchema, DeliveryMethodSchema, EventCursorSchema, EventSubscriptionSchema, PortabilityScopeSchema, ReputationPortabilityRequestSchema, PortabilityResponseSchema, QualitySignalLevelSchema, OutcomeQualityMappingSchema, DEFAULT_OUTCOME_QUALITY_MAPPING, QUALITY_SIGNAL_SCORES, DelegationQualityEventSchema, DemotionRuleSchema, ReputationDecayPolicySchema, CollectionGovernanceConfigSchema, DEFAULT_DEMOTION_RULES, ConstraintLifecycleStatusSchema, CONSTRAINT_LIFECYCLE_TRANSITIONS, ConstraintCandidateSchema, ConstraintLifecycleEventSchema, RoutingSignalTypeSchema, ReputationRoutingSignalSchema, PolicyTypeSchema, PolicyVersionSchema, ExecutionStatusSchema, EXECUTION_STATUS_TRANSITIONS, ChangeApplicationResultSchema, ProposalExecutionSchema, ExecutionStrategySchema, CheckpointHealthSchema, ProceedDecisionSchema, ExecutionCheckpointSchema, RollbackScopeSchema, ProposalEventTypeSchema, ProposalOutcomeEventSchema, EngagementSignalTypeSchema, CommunityEngagementSignalSchema, isProposalActionable, computeVotingResult, isConstraintEnactable, computeGovernanceWeight, computeModelRoutingScores, selectModel, computeCompositeBasketWeights, isModelEligible, computeRebalancedWeights, 
// v7.10.0 — Task-Dimensional Reputation (non-colliding exports only)
TASK_TYPES, TaskTypeCohortSchema, validateTaskCohortUniqueness, ReputationEventSchema, QualitySignalEventSchema, TaskCompletedEventSchema, CredentialUpdateEventSchema, ModelPerformanceEventSchema, QualityObservationSchema, ScoringPathSchema, ScoringPathLogSchema, } from './governance/index.js';
// v7.10.1 — Aliased re-exports for colliding governance types (ADR-001).
// These provide root-barrel discoverability without renaming $id values.
// Core types (routing-policy TaskType, domain-event ReputationEvent) keep
// their unaliased names; governance variants get the Governance* prefix.
export { TaskTypeSchema as GovernanceTaskTypeSchema, } from './governance/task-type.js';
export { ReputationEventSchema as GovernanceReputationEventSchema, } from './governance/reputation-event.js';
// v8.4.0 — Synthetic-deliberation set + OrgOverseer (FR-A1..FR-A4 + FR-B1..FR-B3).
// v8.5.0 — Authority cascade Layer 2 + 3 (PR-A2.2) + Recall machinery + Forget /
// Commit / Estate + Assertion family (PR-A2.3). Re-exported at root for
// discoverability per Issue #76 F2 (the v8.4.0 / v8.5.0 governance surface
// previously required a `/governance` subpath import). The `/governance`
// subpath remains supported and emits identical bindings — root surface
// is the convenience path.
export { 
// FR-A1 Panel deliberation input
PanelDecisionArtifactSchema, ClaimSchema, ClaimGroundingSchema, ProposedActionSchema, TrustContextSchema, 
// FR-A2 Panel verdict
PanelVerdictSchema, JurorVerdictSchema, AsymmetricBlockerSignalSchema, 
// FR-A3 Deliberation dissent
DeliberationDissentSchema, 
// FR-A4 Cross-score report + PairwiseScore (PR-A2.2 promotion)
CrossScoreReportSchema, PairwiseScoreSchema, 
// FR-B1..B3 Org-overseer
OrgIdentitySchema, OrgRepresentativeDelegationSchema, ORG_DELEGATION_GENESIS_SENTINEL, SuccessionPolicySchema, 
// Shared signing-context envelope
SigningContextSchema, 
// v8.5.0 PR-A2.2 Authority cascade Layer 2 + 3
KeyringSchema, SignerEntrySchema, SignerCompetenceRuleSchema, SignerCompetenceResultSchema, SignatureEnvelopeSchema, SignerTypeSchema, SignatureTypeSchema, SignerStatusSchema, PolicyDecisionOutcomeSchema, 
// v8.5.0 PR-A2.3 Recall machinery
ReceiptDetailLevelSchema, SurfaceContextSchema, RecallRequestSchema, RecallPackSchema, RecallReceiptSchema, 
// v8.5.0 PR-A2.3 Forget / Commit / Estate
ForgetRecordSchema, CommitmentTypeSchema, CommitmentRootSchema, AgentEstateStatusSchema, AgentEstateSchema, 
// v8.5.0 PR-A2.3 Assertion family
PrivacyScopeSchema, RiskLevelSchema, AssertionStatusSchema, AssertionClassSchema, AssertionSchema, } from './governance/index.js';
export * from './constraints/index.js';
export * from './integrity/index.js';
// v8.6.0 PR-A3.5 — Operations cluster (FR-B3..B8).
export * from './operations/index.js';
// v8.0.0 — Commons Protocol
export * from './commons/index.js';
// Cross-cutting concerns (stay in root)
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas } from './validators/index.js';
export { validateCompatibility } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
// Note: computeReqHash, verifyReqHash, decompressBody, deriveIdempotencyKey now
// re-exported via ./integrity/index.js (v5.5.0 — integrity barrel creation).
// Schema Graph (v5.5.0, FR-4)
export { extractReferences, buildSchemaGraph } from './utilities/schema-graph.js';
// AccessPolicy Evaluation (v7.1.0, FR-6)
export { evaluateAccessPolicy, } from './utilities/access-policy.js';
// Reputation Event Sourcing (v7.3.0, C2 + Spec V)
export { reconstructAggregateFromEvents, verifyAggregateConsistency, computeEventStreamHash, } from './utilities/reputation-replay.js';
// Reputation Credential Prior (v7.3.0, C1 + Spec IV)
export { computeCredentialPrior, isCredentialExpired, CREDENTIAL_CONFIDENCE_THRESHOLD } from './utilities/reputation-credential.js';
// Constraint Namespace Validation (v7.8.0, DR-F4)
export { detectReservedNameCollisions } from './utilities/constraint-validation.js';
// Economic Boundary Decision Engine (v7.9.0, FR-1; extended v7.9.1)
export { evaluateEconomicBoundary, evaluateFromBoundary, parseMicroUsd, } from './utilities/economic-boundary.js';
// Reputation Vocabulary (v7.9.0 — root barrel export; v7.9.1 type guard)
export { REPUTATION_STATE_ORDER, REPUTATION_STATES, isKnownReputationState, } from './vocabulary/reputation.js';
// Audit event-type 3-segment namespace spec (v8.5.0 — F6 + G5)
export { AUDIT_EVENT_TYPES_KNOWN_PREFIXES, isThreeSegmentEventType, extractEventTypePrefix, } from './vocabulary/audit-event-types.js';
// Sanctioned canonicalization helper (v8.5.0 — G3 + G4)
export { safeCanonicalize, SAFE_CANONICALIZE_DEFAULT_MAX_BYTES, CanonicalizeSizeError, CanonicalizeNFCError, CanonicalizeKeyCollisionError, } from './utilities/safe-canonicalize.js';
//# sourceMappingURL=index.js.map