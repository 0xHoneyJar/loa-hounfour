/**
 * Composition sub-package barrel.
 *
 * Unified entry point for cross-domain composition types:
 * registry bridges, exchange rates, minting policies, delegation trees,
 * bridge transfer sagas, delegation outcomes, monetary policies,
 * permission boundaries, and governance proposals.
 *
 * @since v6.0.0
 * @updated v7.0.0 — added saga, outcome, permission, proposal, monetary policy
 */

// Registry Composition (economy domain)
export {
  BridgeEnforcementSchema,
  BridgeInvariantSchema,
  ExchangeRateTypeSchema,
  ExchangeRateSpecSchema,
  SettlementPolicySchema,
  RegistryBridgeSchema,
  type BridgeEnforcement,
  type BridgeInvariant,
  type ExchangeRateType,
  type ExchangeRateSpec,
  type SettlementPolicy,
  type RegistryBridge,
  CANONICAL_BRIDGE_INVARIANTS,
} from '../economy/registry-composition.js';

// Minting Policy (economy domain)
export {
  MintingPolicySchema,
  type MintingPolicy,
} from '../economy/minting-policy.js';

// Bridge Transfer Saga (economy domain — v7.0.0)
export {
  SagaStatusSchema,
  SAGA_TRANSITIONS,
  StepTypeSchema,
  StepStatusSchema,
  BridgeTransferStepSchema,
  ParticipantRoleSchema,
  SagaParticipantSchema,
  SagaErrorSchema,
  BridgeTransferSagaSchema,
  type SagaStatus,
  type StepType,
  type StepStatus,
  type BridgeTransferStep,
  type ParticipantRole,
  type SagaParticipant,
  type SagaError,
  type BridgeTransferSaga,
} from '../economy/bridge-transfer-saga.js';

// Monetary Policy (economy domain — v7.0.0)
export {
  ReviewTriggerSchema,
  MonetaryPolicySchema,
  type ReviewTrigger,
  type MonetaryPolicy,
} from '../economy/monetary-policy.js';

// Delegation Tree (governance domain)
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
} from '../governance/delegation-tree.js';

// Delegation Outcome (governance domain — v7.0.0)
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
} from '../governance/delegation-outcome.js';

// Permission Boundary (governance domain — v7.0.0)
export {
  ReportingRequirementSchema,
  RevocationPolicySchema,
  PermissionBoundarySchema,
  type ReportingRequirement,
  type RevocationPolicy,
  type PermissionBoundary,
} from '../governance/permission-boundary.js';

// Governance Proposal (governance domain — v7.0.0)
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
} from '../governance/governance-proposal.js';
