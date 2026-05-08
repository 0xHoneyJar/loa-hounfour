import { describe, it, expect } from 'vitest';
import { getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { ConversationSealingPolicySchema, AccessPolicySchema } from '../../src/schemas/conversation.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../../src/schemas/stake-position.js';
import { MutualCreditSchema } from '../../src/schemas/mutual-credit.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { DisputeRecordSchema } from '../../src/schemas/dispute-record.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { ProviderWireMessageSchema } from '../../src/schemas/model/provider-wire-message.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { BudgetScopeSchema } from '../../src/schemas/model/routing/budget-scope.js';
import { ConstraintProposalSchema } from '../../src/schemas/model/constraint-proposal.js';
import { ModelProviderSpecSchema } from '../../src/schemas/model/model-provider-spec.js';
import { AgentCapacityReservationSchema } from '../../src/schemas/model/routing/agent-capacity-reservation.js';
import { AuditTrailEntrySchema } from '../../src/schemas/audit-trail-entry.js';

describe('getCrossFieldValidatorSchemas()', () => {
  const registeredIds = getCrossFieldValidatorSchemas();

  const expectedSchemas = [
    'ConversationSealingPolicy',
    'AccessPolicy',
    'BillingEntry',
    'PerformanceRecord',
    'EscrowEntry',
    'StakePosition',
    'MutualCredit',
    'CommonsDividend',
    'DisputeRecord',
    'Sanction',
    'ReputationScore',
    // v5.0.0 — ModelPort
    'CompletionRequest',
    'CompletionResult',
    'ProviderWireMessage',
    // v5.0.0 — Ensemble & Routing
    'EnsembleRequest',
    'EnsembleResult',
    'BudgetScope',
    // v5.0.0 — Constraint Evolution
    'ConstraintProposal',
    // SagaContext
    'SagaContext',
    // v5.1.0 — Protocol Constitution
    'ModelProviderSpec',
    // v5.2.0 — Agent Capacity Reservation
    'AgentCapacityReservation',
    // v5.2.0 — Audit Trail
    'AuditTrailEntry',
    // v8.4.0 — Deliberation set + OrgOverseer (constraint-file-only validators;
    // substantive cross-field surface is constraints/<SchemaName>.constraints.json)
    'PanelDecisionArtifact',
    'PanelVerdict',
    'DeliberationDissent',
    'CrossScoreReport',
    'OrgIdentity',
    'OrgRepresentativeDelegation',
    'SuccessionPolicy',
    // v8.5.0 PR-A2.0 hygiene — registry/constraint-file 1:1 closure for the
    // constraint corpus that pre-dated the cross-field-validator registry.
    // All entries below use constraintFileOnlyValidator; canonical surface
    // is constraints/<SchemaName>.constraints.json.
    'AgentIdentity',
    'AuditTimestamp',
    'AuditTrail',
    'BasketComposition',
    'BridgeTransferSaga',
    'ChainBoundHash',
    'CollectionGovernanceConfig',
    'CollectionScoreUpdatedPayload',
    'CommunityEngagementSignal',
    'ConservationLaw',
    'ConservationPropertyRegistry',
    'ConstraintCandidate',
    'ConstraintLifecycleEvent',
    'ConsumerContract',
    'ContractNegotiation',
    'DelegationChain',
    'DelegationOutcome',
    'DelegationQualityEvent',
    'DelegationTree',
    'DynamicContract',
    'EconomicBoundary',
    'EconomicBoundaryEvaluationResult',
    'EconomicPerformanceEvent',
    'EnsembleCapabilityProfile',
    'EpistemicTristate',
    'EventSubscription',
    'ExecutionCheckpoint',
    'FeedbackDampeningConfig',
    'GovernanceConfig',
    'GovernanceProposal',
    'GovernedCredits',
    'GovernedFreshness',
    'GovernedReputation',
    'GovernedResourceRuntime',
    'HashChainDiscontinuity',
    'InterAgentTransactionAudit',
    'JwtBoundarySpec',
    'LivenessProperty',
    'MicroUSDC',
    'MintingPolicy',
    'ModelEconomicProfile',
    'MonetaryPolicy',
    'MutationContext',
    'PerformanceQualityBridge',
    'PermissionBoundary',
    'PersonalityAssignment',
    'PolicyVersion',
    'PortabilityResponse',
    'ProposalExecution',
    'ProposalOutcomeEvent',
    'QualityEvent',
    'QualityEventRecordedPayload',
    'QuarantineRecord',
    'QueryReputationCommand',
    'RecordQualityEventCommand',
    'RegistryBridge',
    'ReputationAggregate',
    'ReputationCredential',
    'ReputationEconomicImpact',
    'ReputationEvent',
    'ReputationPortabilityRequest',
    'ReputationRoutingSignal',
    'ReputationStateChangedPayload',
    'ReservationArithmetic',
    'ResetReputationCommand',
    'RollbackScope',
    'RoutingRebalanceEvent',
    'ScoringPathLog',
    'StateMachineConfig',
    'TaskType',
    'TaskTypeCohort',
    // v8.5.0 PR-A2.2 — Authority Cascade Layer 2 + 3
    'Keyring',
    'SignerEntry',
    'SignerCompetenceRule',
    'SignerCompetenceResult',
    'SignatureEnvelope',
    'SignerType',
    'SignatureType',
    'SignerStatus',
    'PolicyDecisionOutcome',
    // v8.5.0 PR-A2.3 — Recall machinery
    'ReceiptDetailLevel',
    'SurfaceContext',
    'RecallRequest',
    'RecallPack',
    'RecallReceipt',
    // v8.5.0 PR-A2.3 — Forget / Commit / Estate
    'ForgetRecord',
    'CommitmentType',
    'CommitmentRoot',
    'AgentEstateStatus',
    'AgentEstate',
    // v8.5.0 PR-A2.3 — Assertion Family
    'PrivacyScope',
    'RiskLevel',
    'AssertionStatus',
    'AssertionClass',
    'Assertion',
    // v8.6.0 PR-A3.4 — FR-B2 PhaseCompletionEnvelope (Tier-2; Tier-1 has no
    // cross-field rules — agent_signature derivation is runtime-deferred
    // per NF-1 via the existing 'x-crypto-bearing' manifest path).
    'PhaseCompletionEnvelope',
    // v8.6.0 PR-A3.5 — FR-B3..B8 Operations cluster.
    'OracleDigest',
    'OracleHealthEnvelope',
    'EscalationEnvelope',
    'RollbackPlan',
    'LatencyHistogramEnvelope',
    'EpicCheckpoint',
  ];

  it('returns an array of strings', () => {
    expect(Array.isArray(registeredIds)).toBe(true);
    for (const id of registeredIds) {
      expect(typeof id).toBe('string');
    }
  });

  for (const schemaId of expectedSchemas) {
    it(`includes "${schemaId}"`, () => {
      expect(registeredIds).toContain(schemaId);
    });
  }

  it('has exactly the expected number of registered schemas', () => {
    expect(registeredIds.length).toBe(expectedSchemas.length);
  });
});

describe('x-cross-field-validated annotation', () => {
  const annotatedSchemas = [
    { name: 'ConversationSealingPolicy', schema: ConversationSealingPolicySchema },
    { name: 'AccessPolicy', schema: AccessPolicySchema },
    { name: 'BillingEntry', schema: BillingEntrySchema },
    { name: 'PerformanceRecord', schema: PerformanceRecordSchema },
    { name: 'EscrowEntry', schema: EscrowEntrySchema },
    { name: 'StakePosition', schema: StakePositionSchema },
    { name: 'MutualCredit', schema: MutualCreditSchema },
    { name: 'CommonsDividend', schema: CommonsDividendSchema },
    { name: 'DisputeRecord', schema: DisputeRecordSchema },
    { name: 'Sanction', schema: SanctionSchema },
    { name: 'ReputationScore', schema: ReputationScoreSchema },
    // v5.0.0 — ModelPort
    { name: 'CompletionRequest', schema: CompletionRequestSchema },
    { name: 'CompletionResult', schema: CompletionResultSchema },
    { name: 'ProviderWireMessage', schema: ProviderWireMessageSchema },
    // v5.0.0 — Ensemble & Routing
    { name: 'EnsembleRequest', schema: EnsembleRequestSchema },
    { name: 'EnsembleResult', schema: EnsembleResultSchema },
    { name: 'BudgetScope', schema: BudgetScopeSchema },
    // v5.0.0 — Constraint Evolution
    { name: 'ConstraintProposal', schema: ConstraintProposalSchema },
    // v5.1.0 — Protocol Constitution
    { name: 'ModelProviderSpec', schema: ModelProviderSpecSchema },
    // v5.2.0 — Agent Capacity Reservation
    { name: 'AgentCapacityReservation', schema: AgentCapacityReservationSchema },
    // v5.2.0 — Audit Trail
    { name: 'AuditTrailEntry', schema: AuditTrailEntrySchema },
  ];

  for (const { name, schema } of annotatedSchemas) {
    it(`${name} has x-cross-field-validated: true`, () => {
      expect((schema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
    });
  }

  it('every schema with a cross-field validator has the annotation', () => {
    const registeredIds = getCrossFieldValidatorSchemas();
    for (const { name, schema } of annotatedSchemas) {
      if (registeredIds.includes(name)) {
        expect((schema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
      }
    }
  });
});
