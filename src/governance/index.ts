/**
 * Governance sub-package barrel.
 *
 * Re-exports sanctions, disputes, validated outcomes, reputation,
 * performance, contributions, and governance vocabulary.
 */

// Schemas — Governance
export {
  SanctionSchema,
  type Sanction,
} from '../schemas/sanction.js';

export {
  DisputeRecordSchema,
  type DisputeRecord,
} from '../schemas/dispute-record.js';

export {
  ValidatedOutcomeSchema,
  type ValidatedOutcome,
} from '../schemas/validated-outcome.js';

// Schemas — Reputation
export {
  ReputationScoreSchema,
  type ReputationScore,
} from '../schemas/reputation-score.js';

// Schemas — Performance
export {
  PerformanceRecordSchema,
  PerformanceOutcomeSchema,
  type PerformanceRecord,
  type PerformanceOutcome,
} from '../schemas/performance-record.js';

export {
  ContributionRecordSchema,
  type ContributionRecord,
} from '../schemas/contribution-record.js';

// Vocabulary — Sanctions
export {
  SANCTION_SEVERITY_LEVELS,
  SANCTION_SEVERITY_ORDER,
  VIOLATION_TYPES,
  ESCALATION_RULES,
  type SanctionSeverity,
  type ViolationType,
} from '../vocabulary/sanctions.js';

// Vocabulary — Sanction Severity (v5.1.0)
export {
  SanctionSeveritySchema,
  SANCTION_SEVERITY_LADDER,
  getSeverityEntry,
  compareSeverity,
  type SanctionSeverityLevel,
  type SeverityLadderEntry,
} from '../vocabulary/sanction-severity.js';

// Vocabulary — Reputation
export {
  REPUTATION_WEIGHTS,
  REPUTATION_DECAY,
  MIN_REPUTATION_SAMPLE_SIZE,
  type ReputationComponent,
  BAYESIAN_BLEND,
  ANTI_MANIPULATION,
  REPUTATION_STATES,
  REPUTATION_STATE_ORDER,
  DEFAULT_HALF_LIFE_DAYS,
} from '../vocabulary/reputation.js';

// Schemas — Reputation Aggregate (v7.1.0, FR-3; v7.3.0, C5+Spec I)
export {
  ReputationStateSchema,
  type ReputationState,
  ReputationTransitionSchema,
  type ReputationTransition,
  ModelCohortSchema,
  type ModelCohort,
  ReputationAggregateSchema,
  type ReputationAggregate,
  REPUTATION_TRANSITIONS,
  isValidReputationTransition,
  computePersonalWeight,
  computeBlendedScore,
  computeDecayedSampleCount,
  computeCrossModelScore,
  getModelCohort,
  AggregateSnapshotSchema,
  type AggregateSnapshot,
} from './reputation-aggregate.js';

// Schemas — Quality Event (v7.1.0, FR-3)
export {
  QualityEventSchema,
  type QualityEvent,
} from '../schemas/quality-event.js';

// Schemas — Reputation Commands (v7.1.0, FR-4)
export {
  RecordQualityEventCommandSchema,
  type RecordQualityEventCommand,
  QueryReputationCommandSchema,
  type QueryReputationCommand,
  ResetReputationCommandSchema,
  type ResetReputationCommand,
} from './reputation-commands.js';

// Schemas — Reputation Events (v7.1.0, FR-4)
export {
  ReputationStateChangedPayloadSchema,
  type ReputationStateChangedPayload,
  QualityEventRecordedPayloadSchema,
  type QualityEventRecordedPayload,
  CollectionScoreUpdatedPayloadSchema,
  type CollectionScoreUpdatedPayload,
} from './reputation-events.js';

// Utilities — Reputation
export { isReliableReputation } from '../utilities/reputation.js';

// Schemas — Reputation Credential (v7.3.0, C1 + Spec IV)
export {
  ReputationCredentialSchema,
  type ReputationCredential,
} from './reputation-credential.js';

// Schemas — Governance Config (v5.3.0)
export {
  GovernanceConfigSchema,
  MissionAlignmentSchema,
  DEFAULT_GOVERNANCE_CONFIG,
  type GovernanceConfig,
  type MissionAlignment,
} from '../schemas/governance-config.js';

// Utilities — Governance Resolution (v5.3.0)
export {
  resolveReservationTier,
  resolveAdvisoryThreshold,
} from '../utilities/governance.js';

// Schemas — Delegation Tree (v6.0.0, FR-6)
export {
  ForkTypeSchema,
  TreeNodeStatusSchema,
  TreeStrategySchema,
  BudgetAllocationSchema,
  DelegationTreeNodeSchema,
  DelegationTreeSchema,
  chainToTree,
  treeToChain,
  type ForkType,
  type TreeNodeStatus,
  type TreeStrategy,
  type BudgetAllocation,
  type DelegationTreeNode,
  type DelegationTree,
} from './delegation-tree.js';

// Schemas — Delegation Outcome (v7.0.0)
export {
  OutcomeTypeSchema,
  VoteChoiceSchema,
  DelegationVoteSchema,
  DissentTypeSchema,
  DissentSeveritySchema,
  DissentRecordSchema,
  DelegationOutcomeSchema,
  type OutcomeType,
  type VoteChoice,
  type DelegationVote,
  type DissentType,
  type DissentSeverity,
  type DissentRecord,
  type DelegationOutcome,
} from './delegation-outcome.js';

// Schemas — Permission Boundary (v7.0.0)
export {
  ReportingRequirementSchema,
  RevocationPolicySchema,
  PermissionBoundarySchema,
  type ReportingRequirement,
  type RevocationPolicy,
  type PermissionBoundary,
} from './permission-boundary.js';

// Schemas — Governance Proposal (v7.0.0)
export {
  ProposalStatusSchema,
  PROPOSAL_STATUS_TRANSITIONS,
  ProposedChangeSchema,
  GovernanceVoteSchema,
  VotingRecordSchema,
  GovernanceProposalSchema,
  type ProposalStatus,
  type ProposedChange,
  type GovernanceVote,
  type VotingRecord,
  type GovernanceProposal,
} from './governance-proposal.js';

// Schemas — Event Subscription (v7.5.0, DR-S1)
export {
  EventFilterSchema,
  DeliveryMethodSchema,
  EventCursorSchema,
  EventSubscriptionSchema,
  type EventFilter,
  type DeliveryMethod,
  type EventCursor,
  type EventSubscription,
} from './event-subscription.js';

// Schemas — Reputation Portability (v7.5.0, DR-S2)
export {
  PortabilityScopeSchema,
  ReputationPortabilityRequestSchema,
  PortabilityResponseSchema,
  type PortabilityScope,
  type ReputationPortabilityRequest,
  type PortabilityResponse,
} from './reputation-portability.js';

// Schemas — Delegation Quality (v7.5.0, DR-S3)
export {
  QualitySignalLevelSchema,
  OutcomeQualityMappingSchema,
  DEFAULT_OUTCOME_QUALITY_MAPPING,
  QUALITY_SIGNAL_SCORES,
  DelegationQualityEventSchema,
  type QualitySignalLevel,
  type OutcomeQualityMapping,
  type DelegationQualityEvent,
} from './delegation-quality.js';

// Schemas — Collection Governance Config (v7.6.0, DR-S5 + DR-S6)
export {
  DemotionRuleSchema,
  ReputationDecayPolicySchema,
  CollectionGovernanceConfigSchema,
  DEFAULT_DEMOTION_RULES,
  type DemotionRule,
  type ReputationDecayPolicy,
  type CollectionGovernanceConfig,
} from './collection-governance-config.js';

// Schemas — Constraint Lifecycle (v7.6.0, DR-S4)
export {
  ConstraintLifecycleStatusSchema,
  CONSTRAINT_LIFECYCLE_TRANSITIONS,
  ConstraintCandidateSchema,
  ConstraintLifecycleEventSchema,
  type ConstraintLifecycleStatus,
  type ConstraintCandidate,
  type ConstraintLifecycleEvent,
} from './constraint-lifecycle.js';

// Schemas — Reputation Routing (v7.6.0, DR-S7)
export {
  RoutingSignalTypeSchema,
  ReputationRoutingSignalSchema,
  type RoutingSignalType,
  type ReputationRoutingSignal,
} from './reputation-routing.js';

// Schemas — Policy Version (v7.6.0, DR-S8)
export {
  PolicyTypeSchema,
  PolicyVersionSchema,
  type PolicyType,
  type PolicyVersion,
} from './policy-version.js';

// Schemas — Proposal Execution (v7.7.0, DR-S9)
export {
  ExecutionStatusSchema,
  EXECUTION_STATUS_TRANSITIONS,
  ChangeApplicationResultSchema,
  ProposalExecutionSchema,
  type ExecutionStatus,
  type ChangeApplicationResult,
  type ProposalExecution,
} from './proposal-execution.js';

// Schemas — Proposal Outcome Event (v7.7.0, DR-S9)
export {
  ProposalEventTypeSchema,
  ProposalOutcomeEventSchema,
  type ProposalEventType,
  type ProposalOutcomeEvent,
} from './proposal-outcome-event.js';

// Schemas — Community Engagement (v7.7.0, DR-S10)
export {
  EngagementSignalTypeSchema,
  CommunityEngagementSignalSchema,
  type EngagementSignalType,
  type CommunityEngagementSignal,
} from './community-engagement.js';

// Utilities — Governance (v7.7.0, DR-S10)
export {
  isProposalActionable,
  computeVotingResult,
  isConstraintEnactable,
  computeGovernanceWeight,
} from '../utilities/governance-utils.js';
