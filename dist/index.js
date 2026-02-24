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
// Core types take precedence in root barrel. Import governance variants from
// '@0xhoneyjar/loa-hounfour/governance' directly.
export { 
// Exclude: TaskTypeSchema, type TaskType (collision with core/routing-policy)
// Exclude: type ReputationEvent (collision with core/domain-event)
// Everything else re-exported:
SanctionSchema, DisputeRecordSchema, ValidatedOutcomeSchema, ReputationScoreSchema, PerformanceRecordSchema, PerformanceOutcomeSchema, ContributionRecordSchema, SANCTION_SEVERITY_LEVELS, SANCTION_SEVERITY_ORDER, VIOLATION_TYPES, ESCALATION_RULES, SanctionSeveritySchema, SANCTION_SEVERITY_LADDER, getSeverityEntry, compareSeverity, REPUTATION_WEIGHTS, REPUTATION_DECAY, MIN_REPUTATION_SAMPLE_SIZE, BAYESIAN_BLEND, ANTI_MANIPULATION, DEFAULT_HALF_LIFE_DAYS, ReputationStateSchema, ReputationTransitionSchema, ModelCohortSchema, ReputationAggregateSchema, REPUTATION_TRANSITIONS, isValidReputationTransition, computePersonalWeight, computeBlendedScore, computeDecayedSampleCount, computeCrossModelScore, getModelCohort, AggregateSnapshotSchema, QualityEventSchema, RecordQualityEventCommandSchema, QueryReputationCommandSchema, ResetReputationCommandSchema, ReputationStateChangedPayloadSchema, QualityEventRecordedPayloadSchema, CollectionScoreUpdatedPayloadSchema, isReliableReputation, ReputationCredentialSchema, GovernanceConfigSchema, MissionAlignmentSchema, DEFAULT_GOVERNANCE_CONFIG, resolveReservationTier, resolveAdvisoryThreshold, ForkTypeSchema, TreeNodeStatusSchema, TreeStrategySchema, BudgetAllocationSchema, DelegationTreeNodeSchema, DelegationTreeSchema, chainToTree, treeToChain, OutcomeTypeSchema, VoteChoiceSchema, DelegationVoteSchema, DissentTypeSchema, DissentSeveritySchema, DissentRecordSchema, DelegationOutcomeSchema, ReportingRequirementSchema, RevocationPolicySchema, PermissionBoundarySchema, ProposalStatusSchema, PROPOSAL_STATUS_TRANSITIONS, ProposedChangeSchema, GovernanceVoteSchema, VotingRecordSchema, GovernanceProposalSchema, EventFilterSchema, DeliveryMethodSchema, EventCursorSchema, EventSubscriptionSchema, PortabilityScopeSchema, ReputationPortabilityRequestSchema, PortabilityResponseSchema, QualitySignalLevelSchema, OutcomeQualityMappingSchema, DEFAULT_OUTCOME_QUALITY_MAPPING, QUALITY_SIGNAL_SCORES, DelegationQualityEventSchema, DemotionRuleSchema, ReputationDecayPolicySchema, CollectionGovernanceConfigSchema, DEFAULT_DEMOTION_RULES, ConstraintLifecycleStatusSchema, CONSTRAINT_LIFECYCLE_TRANSITIONS, ConstraintCandidateSchema, ConstraintLifecycleEventSchema, RoutingSignalTypeSchema, ReputationRoutingSignalSchema, PolicyTypeSchema, PolicyVersionSchema, ExecutionStatusSchema, EXECUTION_STATUS_TRANSITIONS, ChangeApplicationResultSchema, ProposalExecutionSchema, ExecutionStrategySchema, CheckpointHealthSchema, ProceedDecisionSchema, ExecutionCheckpointSchema, RollbackScopeSchema, ProposalEventTypeSchema, ProposalOutcomeEventSchema, EngagementSignalTypeSchema, CommunityEngagementSignalSchema, isProposalActionable, computeVotingResult, isConstraintEnactable, computeGovernanceWeight, computeModelRoutingScores, selectModel, computeCompositeBasketWeights, isModelEligible, computeRebalancedWeights, 
// v7.10.0 — Task-Dimensional Reputation (non-colliding exports only)
TASK_TYPES, TaskTypeCohortSchema, validateTaskCohortUniqueness, ReputationEventSchema, QualitySignalEventSchema, TaskCompletedEventSchema, CredentialUpdateEventSchema, ScoringPathSchema, ScoringPathLogSchema, } from './governance/index.js';
export * from './constraints/index.js';
export * from './integrity/index.js';
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
//# sourceMappingURL=index.js.map