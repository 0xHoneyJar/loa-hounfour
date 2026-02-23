/**
 * Generate JSON Schema 2020-12 files from TypeBox definitions.
 *
 * Outputs to schemas/ directory for cross-language consumption.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JwtClaimsSchema, S2SJwtClaimsSchema } from '../src/schemas/jwt-claims.js';
import { InvokeResponseSchema, UsageReportSchema } from '../src/schemas/invoke-response.js';
import { StreamEventSchema } from '../src/schemas/stream-events.js';
import { RoutingPolicySchema } from '../src/schemas/routing-policy.js';
import { AgentDescriptorSchema } from '../src/schemas/agent-descriptor.js';
import { AgentLifecycleStateSchema } from '../src/schemas/agent-lifecycle.js';
import { BillingEntrySchema, CreditNoteSchema } from '../src/schemas/billing-entry.js';
import { ConversationSchema, MessageSchema } from '../src/schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../src/schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../src/schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../src/schemas/lifecycle-event-payload.js';
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../src/schemas/capability.js';
import { ProtocolDiscoverySchema } from '../src/schemas/discovery.js';
import { SagaContextSchema } from '../src/schemas/saga-context.js';
import { HealthStatusSchema } from '../src/schemas/health-status.js';
import { ThinkingTraceSchema } from '../src/schemas/thinking-trace.js';
import { ToolCallSchema } from '../src/schemas/tool-call.js';
import { RoutingConstraintSchema } from '../src/schemas/routing-constraint.js';
import { PerformanceRecordSchema } from '../src/schemas/performance-record.js';
import { ContributionRecordSchema } from '../src/schemas/contribution-record.js';
import { SanctionSchema } from '../src/schemas/sanction.js';
import { DisputeRecordSchema } from '../src/schemas/dispute-record.js';
import { ValidatedOutcomeSchema } from '../src/schemas/validated-outcome.js';
import { ReputationScoreSchema } from '../src/schemas/reputation-score.js';
import { EscrowEntrySchema } from '../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../src/schemas/stake-position.js';
import { CommonsDividendSchema } from '../src/schemas/commons-dividend.js';
import { MutualCreditSchema } from '../src/schemas/mutual-credit.js';
// v5.0.0 — ModelPort
import { CompletionRequestSchema } from '../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../src/schemas/model/completion-result.js';
import { ModelCapabilitiesSchema } from '../src/schemas/model/model-capabilities.js';
import { ProviderWireMessageSchema } from '../src/schemas/model/provider-wire-message.js';
import { ToolDefinitionSchema } from '../src/schemas/model/tool-definition.js';
import { ToolResultSchema } from '../src/schemas/model/tool-result.js';
// v5.0.0 — Ensemble
import { EnsembleRequestSchema } from '../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../src/schemas/model/ensemble/ensemble-result.js';
// v5.0.0 — Routing
import { AgentRequirementsSchema } from '../src/schemas/model/routing/agent-requirements.js';
import { BudgetScopeSchema } from '../src/schemas/model/routing/budget-scope.js';
import { RoutingResolutionSchema } from '../src/schemas/model/routing/routing-resolution.js';
// v5.0.0 — Constraint Evolution
import { ConstraintProposalSchema } from '../src/schemas/model/constraint-proposal.js';
// v5.1.0 — Protocol Constitution
import { ModelProviderSpecSchema } from '../src/schemas/model/model-provider-spec.js';
import { ConformanceLevelSchema } from '../src/schemas/model/conformance-level.js';
import { ConformanceVectorSchema } from '../src/schemas/model/conformance-vector.js';
// v5.1.0 — Governance
import { SanctionSeveritySchema } from '../src/vocabulary/sanction-severity.js';
// v5.1.0 — Reconciliation
import { ReconciliationModeSchema } from '../src/vocabulary/reconciliation-mode.js';
// v5.2.0 — Capacity Reservation
import { AgentCapacityReservationSchema } from '../src/schemas/model/routing/agent-capacity-reservation.js';
import { ReservationTierSchema } from '../src/vocabulary/reservation-tier.js';
import { ReservationEnforcementSchema } from '../src/vocabulary/reservation-enforcement.js';
import { ReservationStateSchema } from '../src/vocabulary/reservation-state.js';
// v5.2.0 — Conservation
import { ConservationStatusSchema } from '../src/vocabulary/conservation-status.js';
import { AuditTrailEntrySchema } from '../src/schemas/audit-trail-entry.js';
// v5.3.0 — Governance
import { GovernanceConfigSchema } from '../src/schemas/governance-config.js';
// v5.4.0 — Delegation
import { DelegationChainSchema } from '../src/schemas/model/routing/delegation-chain.js';
// v5.4.0 — Inter-Agent
import { InterAgentTransactionAuditSchema } from '../src/schemas/inter-agent-transaction-audit.js';
// v5.4.0 — Ensemble
import { EnsembleCapabilityProfileSchema } from '../src/schemas/model/ensemble/ensemble-capability-profile.js';
// v5.5.0 — Conservation Registry
import { ConservationPropertyRegistrySchema } from '../src/integrity/conservation-properties.js';
// v5.5.0 — JWT Boundary
import { JwtBoundarySpecSchema, OutboundClaimsSchema, InboundClaimsSchema } from '../src/economy/jwt-boundary.js';
// v5.5.0 — Agent Identity
import { AgentIdentitySchema, CapabilityScopedTrustSchema, CapabilityScopeSchema } from '../src/schemas/agent-identity.js';
// v6.0.0 — Liveness
import { LivenessPropertySchema, TimeoutBehaviorSchema } from '../src/integrity/liveness-properties.js';
// v6.0.0 — Constraint Type System
import { ConstraintTypeSchema } from '../src/constraints/constraint-types.js';
import { ConstraintTypeSignatureSchema } from '../src/constraints/constraint-types.js';
// v6.0.0 — Registry Bridge + Delegation Tree
import { BridgeEnforcementSchema } from '../src/economy/registry-composition.js';
import { BridgeInvariantSchema } from '../src/economy/registry-composition.js';
import { ExchangeRateTypeSchema } from '../src/economy/registry-composition.js';
import { ExchangeRateSpecSchema } from '../src/economy/registry-composition.js';
import { SettlementPolicySchema } from '../src/economy/registry-composition.js';
import { RegistryBridgeSchema } from '../src/economy/registry-composition.js';
import { MintingPolicySchema } from '../src/economy/minting-policy.js';
import { ForkTypeSchema } from '../src/governance/delegation-tree.js';
import { TreeNodeStatusSchema } from '../src/governance/delegation-tree.js';
import { TreeStrategySchema } from '../src/governance/delegation-tree.js';
import { BudgetAllocationSchema } from '../src/governance/delegation-tree.js';
import { DelegationTreeNodeSchema } from '../src/governance/delegation-tree.js';
import { DelegationTreeSchema } from '../src/governance/delegation-tree.js';
// v7.0.0 — Coordination Layer
import { BridgeTransferSagaSchema } from '../src/economy/bridge-transfer-saga.js';
import { MonetaryPolicySchema } from '../src/economy/monetary-policy.js';
import { DelegationOutcomeSchema } from '../src/governance/delegation-outcome.js';
import { PermissionBoundarySchema } from '../src/governance/permission-boundary.js';
import { GovernanceProposalSchema } from '../src/governance/governance-proposal.js';
// v7.1.0 — Reputation Protocol
import { MicroUSDCSchema } from '../src/vocabulary/currency.js';
import { PersonalityAssignmentSchema, PersonalityTierSchema } from '../src/core/personality-assignment.js';
import { ReputationAggregateSchema, ReputationStateSchema, ReputationTransitionSchema, AggregateSnapshotSchema } from '../src/governance/reputation-aggregate.js';
import { QualityEventSchema } from '../src/schemas/quality-event.js';
import { RecordQualityEventCommandSchema, QueryReputationCommandSchema, ResetReputationCommandSchema } from '../src/governance/reputation-commands.js';
import { ReputationStateChangedPayloadSchema, QualityEventRecordedPayloadSchema, CollectionScoreUpdatedPayloadSchema } from '../src/governance/reputation-events.js';
import { ReputationCredentialSchema } from '../src/governance/reputation-credential.js';
// v7.5.0 — Event Subscription + Reputation Portability
import { EventFilterSchema, DeliveryMethodSchema, EventCursorSchema, EventSubscriptionSchema } from '../src/governance/event-subscription.js';
import { PortabilityScopeSchema, ReputationPortabilityRequestSchema, PortabilityResponseSchema } from '../src/governance/reputation-portability.js';
// v7.5.0 — Delegation Quality
import { QualitySignalLevelSchema, OutcomeQualityMappingSchema, DelegationQualityEventSchema } from '../src/governance/delegation-quality.js';
// v7.6.0 — Collection Governance Config
import { DemotionRuleSchema, ReputationDecayPolicySchema, CollectionGovernanceConfigSchema } from '../src/governance/collection-governance-config.js';
// v7.6.0 — Constraint Lifecycle
import { ConstraintLifecycleStatusSchema, ConstraintCandidateSchema, ConstraintLifecycleEventSchema } from '../src/governance/constraint-lifecycle.js';
// v7.6.0 — Reputation Routing + Policy Version
import { RoutingSignalTypeSchema, ReputationRoutingSignalSchema } from '../src/governance/reputation-routing.js';
import { PolicyTypeSchema, PolicyVersionSchema } from '../src/governance/policy-version.js';
// v7.7.0 — Proposal Execution + Outcome Events
import { ExecutionStatusSchema, ChangeApplicationResultSchema, ProposalExecutionSchema } from '../src/governance/proposal-execution.js';
import { ProposalEventTypeSchema, ProposalOutcomeEventSchema } from '../src/governance/proposal-outcome-event.js';
// v7.7.0 — Economic Membrane
import { TrustLayerSnapshotSchema, CapitalLayerSnapshotSchema, AccessDecisionSchema, EconomicBoundarySchema } from '../src/economy/economic-boundary.js';
import { EconomicImpactTypeSchema, ReputationTriggerEventSchema, EconomicImpactEntrySchema, ReputationEconomicImpactSchema } from '../src/economy/reputation-economic-impact.js';
import { CostPerTokenSchema, ModelEconomicProfileSchema } from '../src/economy/model-economic-profile.js';
import { EngagementSignalTypeSchema, CommunityEngagementSignalSchema } from '../src/governance/community-engagement.js';
import { PerformanceOutcomeTypeSchema, EconomicPerformanceEventSchema, QualityBridgeDirectionSchema, PerformanceQualityBridgeSchema } from '../src/economy/economic-performance.js';
import { BasketCompositionEntrySchema, BasketCompositionSchema } from '../src/economy/basket-composition.js';
import { RebalanceTriggerTypeSchema, RoutingRebalanceEventSchema } from '../src/economy/routing-rebalance.js';
import { ExecutionStrategySchema } from '../src/governance/proposal-execution.js';
import { CheckpointHealthSchema, ProceedDecisionSchema, ExecutionCheckpointSchema } from '../src/governance/execution-checkpoint.js';
import { RollbackScopeSchema } from '../src/governance/rollback-scope.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../src/version.js';
import { postProcessSchema } from './schema-postprocess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'schemas');

const schemas = [
  { name: 'jwt-claims', schema: JwtClaimsSchema },
  { name: 's2s-jwt-claims', schema: S2SJwtClaimsSchema },
  { name: 'invoke-response', schema: InvokeResponseSchema },
  { name: 'usage-report', schema: UsageReportSchema },
  { name: 'stream-event', schema: StreamEventSchema },
  { name: 'routing-policy', schema: RoutingPolicySchema },
  // v2.0.0
  { name: 'agent-descriptor', schema: AgentDescriptorSchema },
  { name: 'agent-lifecycle-state', schema: AgentLifecycleStateSchema },
  { name: 'billing-entry', schema: BillingEntrySchema },
  { name: 'credit-note', schema: CreditNoteSchema },
  { name: 'conversation', schema: ConversationSchema },
  { name: 'message', schema: MessageSchema },
  { name: 'transfer-spec', schema: TransferSpecSchema },
  { name: 'transfer-event', schema: TransferEventSchema },
  { name: 'domain-event', schema: DomainEventSchema },
  // v2.1.0
  { name: 'domain-event-batch', schema: DomainEventBatchSchema },
  { name: 'lifecycle-transition-payload', schema: LifecycleTransitionPayloadSchema },
  // v2.2.0
  { name: 'capability', schema: CapabilitySchema },
  { name: 'capability-query', schema: CapabilityQuerySchema },
  { name: 'capability-response', schema: CapabilityResponseSchema },
  { name: 'protocol-discovery', schema: ProtocolDiscoverySchema },
  { name: 'saga-context', schema: SagaContextSchema },
  // v3.1.0
  { name: 'health-status', schema: HealthStatusSchema },
  { name: 'thinking-trace', schema: ThinkingTraceSchema },
  { name: 'tool-call', schema: ToolCallSchema },
  // v4.0.0
  { name: 'routing-constraint', schema: RoutingConstraintSchema },
  // v4.1.0
  { name: 'performance-record', schema: PerformanceRecordSchema },
  { name: 'contribution-record', schema: ContributionRecordSchema },
  // v4.2.0
  { name: 'sanction', schema: SanctionSchema },
  { name: 'dispute-record', schema: DisputeRecordSchema },
  { name: 'validated-outcome', schema: ValidatedOutcomeSchema },
  // v4.3.0
  { name: 'reputation-score', schema: ReputationScoreSchema },
  // v4.4.0
  { name: 'escrow-entry', schema: EscrowEntrySchema },
  { name: 'stake-position', schema: StakePositionSchema },
  { name: 'commons-dividend', schema: CommonsDividendSchema },
  { name: 'mutual-credit', schema: MutualCreditSchema },
  // v5.0.0 — ModelPort
  { name: 'completion-request', schema: CompletionRequestSchema },
  { name: 'completion-result', schema: CompletionResultSchema },
  { name: 'model-capabilities', schema: ModelCapabilitiesSchema },
  { name: 'provider-wire-message', schema: ProviderWireMessageSchema },
  { name: 'tool-definition', schema: ToolDefinitionSchema },
  { name: 'tool-result', schema: ToolResultSchema },
  // v5.0.0 — Ensemble
  { name: 'ensemble-request', schema: EnsembleRequestSchema },
  { name: 'ensemble-result', schema: EnsembleResultSchema },
  // v5.0.0 — Routing
  { name: 'agent-requirements', schema: AgentRequirementsSchema },
  { name: 'budget-scope', schema: BudgetScopeSchema },
  { name: 'routing-resolution', schema: RoutingResolutionSchema },
  // v5.0.0 — Constraint Evolution
  { name: 'constraint-proposal', schema: ConstraintProposalSchema },
  // v5.1.0 — Protocol Constitution
  { name: 'model-provider-spec', schema: ModelProviderSpecSchema },
  { name: 'conformance-level', schema: ConformanceLevelSchema },
  { name: 'conformance-vector', schema: ConformanceVectorSchema },
  // v5.1.0 — Governance
  { name: 'sanction-severity', schema: SanctionSeveritySchema },
  // v5.1.0 — Reconciliation
  { name: 'reconciliation-mode', schema: ReconciliationModeSchema },
  // v5.2.0 — Capacity Reservation
  { name: 'agent-capacity-reservation', schema: AgentCapacityReservationSchema },
  { name: 'reservation-tier', schema: ReservationTierSchema },
  { name: 'reservation-enforcement', schema: ReservationEnforcementSchema },
  { name: 'reservation-state', schema: ReservationStateSchema },
  // v5.2.0 — Conservation
  { name: 'conservation-status', schema: ConservationStatusSchema },
  { name: 'audit-trail-entry', schema: AuditTrailEntrySchema },
  // v5.3.0 — Governance
  { name: 'governance-config', schema: GovernanceConfigSchema },
  // v5.4.0 — Delegation
  { name: 'delegation-chain', schema: DelegationChainSchema },
  // v5.4.0 — Inter-Agent
  { name: 'inter-agent-transaction-audit', schema: InterAgentTransactionAuditSchema },
  // v5.4.0 — Ensemble
  { name: 'ensemble-capability-profile', schema: EnsembleCapabilityProfileSchema },
  // v5.5.0 — Conservation Registry
  { name: 'conservation-property-registry', schema: ConservationPropertyRegistrySchema },
  // v5.5.0 — JWT Boundary
  { name: 'jwt-boundary-spec', schema: JwtBoundarySpecSchema },
  { name: 'outbound-claims', schema: OutboundClaimsSchema },
  { name: 'inbound-claims', schema: InboundClaimsSchema },
  // v5.5.0 — Agent Identity
  { name: 'agent-identity', schema: AgentIdentitySchema },
  // v6.0.0 — Liveness + Capability Trust
  { name: 'liveness-property', schema: LivenessPropertySchema },
  { name: 'timeout-behavior', schema: TimeoutBehaviorSchema },
  { name: 'capability-scope', schema: CapabilityScopeSchema },
  { name: 'capability-scoped-trust', schema: CapabilityScopedTrustSchema },
  // v6.0.0 — Constraint Type System
  { name: 'constraint-type', schema: ConstraintTypeSchema },
  { name: 'constraint-type-signature', schema: ConstraintTypeSignatureSchema },
  // v6.0.0 — Registry Bridge + Delegation Tree
  { name: 'bridge-enforcement', schema: BridgeEnforcementSchema },
  { name: 'bridge-invariant', schema: BridgeInvariantSchema },
  { name: 'exchange-rate-type', schema: ExchangeRateTypeSchema },
  { name: 'exchange-rate-spec', schema: ExchangeRateSpecSchema },
  { name: 'settlement-policy', schema: SettlementPolicySchema },
  { name: 'registry-bridge', schema: RegistryBridgeSchema },
  { name: 'minting-policy', schema: MintingPolicySchema },
  { name: 'fork-type', schema: ForkTypeSchema },
  { name: 'tree-node-status', schema: TreeNodeStatusSchema },
  { name: 'tree-strategy', schema: TreeStrategySchema },
  { name: 'budget-allocation', schema: BudgetAllocationSchema },
  { name: 'delegation-tree-node', schema: DelegationTreeNodeSchema },
  { name: 'delegation-tree', schema: DelegationTreeSchema },
  // v7.0.0 — Coordination Layer
  { name: 'bridge-transfer-saga', schema: BridgeTransferSagaSchema },
  { name: 'monetary-policy', schema: MonetaryPolicySchema },
  { name: 'delegation-outcome', schema: DelegationOutcomeSchema },
  { name: 'permission-boundary', schema: PermissionBoundarySchema },
  { name: 'governance-proposal', schema: GovernanceProposalSchema },
  // v7.1.0 — Reputation Protocol
  { name: 'micro-usdc', schema: MicroUSDCSchema },
  { name: 'personality-tier', schema: PersonalityTierSchema },
  { name: 'personality-assignment', schema: PersonalityAssignmentSchema },
  { name: 'reputation-state', schema: ReputationStateSchema },
  { name: 'reputation-transition', schema: ReputationTransitionSchema },
  { name: 'reputation-aggregate', schema: ReputationAggregateSchema },
  { name: 'aggregate-snapshot', schema: AggregateSnapshotSchema },
  { name: 'quality-event', schema: QualityEventSchema },
  { name: 'record-quality-event-command', schema: RecordQualityEventCommandSchema },
  { name: 'query-reputation-command', schema: QueryReputationCommandSchema },
  { name: 'reset-reputation-command', schema: ResetReputationCommandSchema },
  { name: 'reputation-state-changed-payload', schema: ReputationStateChangedPayloadSchema },
  { name: 'quality-event-recorded-payload', schema: QualityEventRecordedPayloadSchema },
  { name: 'collection-score-updated-payload', schema: CollectionScoreUpdatedPayloadSchema },
  { name: 'reputation-credential', schema: ReputationCredentialSchema },
  // v7.5.0 — Event Subscription
  { name: 'event-filter', schema: EventFilterSchema },
  { name: 'delivery-method', schema: DeliveryMethodSchema },
  { name: 'event-cursor', schema: EventCursorSchema },
  { name: 'event-subscription', schema: EventSubscriptionSchema },
  // v7.5.0 — Reputation Portability
  { name: 'portability-scope', schema: PortabilityScopeSchema },
  { name: 'reputation-portability-request', schema: ReputationPortabilityRequestSchema },
  { name: 'portability-response', schema: PortabilityResponseSchema },
  // v7.5.0 — Delegation Quality
  { name: 'quality-signal-level', schema: QualitySignalLevelSchema },
  { name: 'outcome-quality-mapping', schema: OutcomeQualityMappingSchema },
  { name: 'delegation-quality-event', schema: DelegationQualityEventSchema },
  // v7.6.0 — Collection Governance Config
  { name: 'demotion-rule', schema: DemotionRuleSchema },
  { name: 'reputation-decay-policy', schema: ReputationDecayPolicySchema },
  { name: 'collection-governance-config', schema: CollectionGovernanceConfigSchema },
  // v7.6.0 — Constraint Lifecycle
  { name: 'constraint-lifecycle-status', schema: ConstraintLifecycleStatusSchema },
  { name: 'constraint-candidate', schema: ConstraintCandidateSchema },
  { name: 'constraint-lifecycle-event', schema: ConstraintLifecycleEventSchema },
  // v7.6.0 — Reputation Routing
  { name: 'routing-signal-type', schema: RoutingSignalTypeSchema },
  { name: 'reputation-routing-signal', schema: ReputationRoutingSignalSchema },
  // v7.6.0 — Policy Version
  { name: 'policy-type', schema: PolicyTypeSchema },
  { name: 'policy-version', schema: PolicyVersionSchema },
  // v7.7.0 — Proposal Execution
  { name: 'execution-status', schema: ExecutionStatusSchema },
  { name: 'change-application-result', schema: ChangeApplicationResultSchema },
  { name: 'proposal-execution', schema: ProposalExecutionSchema },
  // v7.7.0 — Proposal Outcome Events
  { name: 'proposal-event-type', schema: ProposalEventTypeSchema },
  { name: 'proposal-outcome-event', schema: ProposalOutcomeEventSchema },
  // v7.7.0 — Economic Membrane
  { name: 'trust-layer-snapshot', schema: TrustLayerSnapshotSchema },
  { name: 'capital-layer-snapshot', schema: CapitalLayerSnapshotSchema },
  { name: 'access-decision', schema: AccessDecisionSchema },
  { name: 'economic-boundary', schema: EconomicBoundarySchema },
  { name: 'economic-impact-type', schema: EconomicImpactTypeSchema },
  { name: 'reputation-trigger-event', schema: ReputationTriggerEventSchema },
  { name: 'economic-impact-entry', schema: EconomicImpactEntrySchema },
  { name: 'reputation-economic-impact', schema: ReputationEconomicImpactSchema },
  { name: 'cost-per-token', schema: CostPerTokenSchema },
  { name: 'model-economic-profile', schema: ModelEconomicProfileSchema },
  // Community Engagement (v7.7.0 Sprint 3)
  { name: 'engagement-signal-type', schema: EngagementSignalTypeSchema },
  { name: 'community-engagement-signal', schema: CommunityEngagementSignalSchema },
  // v7.8.0 — Economic Performance (DR-F1 feedback loop)
  { name: 'performance-outcome-type', schema: PerformanceOutcomeTypeSchema },
  { name: 'economic-performance-event', schema: EconomicPerformanceEventSchema },
  { name: 'quality-bridge-direction', schema: QualityBridgeDirectionSchema },
  { name: 'performance-quality-bridge', schema: PerformanceQualityBridgeSchema },
  // v7.8.0 — Basket Composition + Routing Rebalance (DR-F2)
  { name: 'basket-composition-entry', schema: BasketCompositionEntrySchema },
  { name: 'basket-composition', schema: BasketCompositionSchema },
  { name: 'rebalance-trigger-type', schema: RebalanceTriggerTypeSchema },
  { name: 'routing-rebalance-event', schema: RoutingRebalanceEventSchema },
  // v7.8.0 — Progressive Governance Execution (DR-F5)
  { name: 'execution-strategy', schema: ExecutionStrategySchema },
  { name: 'checkpoint-health', schema: CheckpointHealthSchema },
  { name: 'proceed-decision', schema: ProceedDecisionSchema },
  { name: 'execution-checkpoint', schema: ExecutionCheckpointSchema },
  { name: 'rollback-scope', schema: RollbackScopeSchema },
];

mkdirSync(outDir, { recursive: true });

for (const { name, schema } of schemas) {
  const jsonSchema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schema,
    // Override TypeBox $id with versioned URI (must come after spread)
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    $comment: (schema as Record<string, unknown>).$comment
      ? `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}. ${(schema as Record<string, unknown>).$comment}`
      : `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}`,
  };

  // Apply post-generation transforms (cross-field constraints, etc.)
  postProcessSchema(name, jsonSchema);

  const path = join(outDir, `${name}.schema.json`);
  writeFileSync(path, JSON.stringify(jsonSchema, null, 2) + '\n');
  console.log(`Generated: ${path}`);
}

console.log(`\n${schemas.length} schemas generated.`);

// Generate schemas/index.json — machine-readable schema registry
const index = {
  $schema: 'https://schemas.0xhoneyjar.com/loa-hounfour/index',
  version: CONTRACT_VERSION,
  min_supported_version: MIN_SUPPORTED_VERSION,
  generated_at: new Date().toISOString(),
  schemas: schemas.map(({ name, schema }) => ({
    name,
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    file: `${name}.schema.json`,
    description: (schema as Record<string, unknown>).description ?? schema.$id ?? name,
  })),
};

const indexPath = join(outDir, 'index.json');
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Generated: ${indexPath}`);

// Generate schemas/README.md — human-readable schema catalog
const readmeLines = [
  '# Schema Registry',
  '',
  `**Contract version:** ${CONTRACT_VERSION}`,
  `**Min supported:** ${MIN_SUPPORTED_VERSION}`,
  `**Schemas:** ${schemas.length}`,
  '',
  '## Schemas',
  '',
  '| Schema | $id | File |',
  '|--------|-----|------|',
  ...schemas.map(({ name }) =>
    `| ${name} | \`https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}\` | [${name}.schema.json](${name}.schema.json) |`,
  ),
  '',
  '## Usage',
  '',
  '```bash',
  '# Fetch a schema by $id',
  `curl https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/billing-entry`,
  '```',
  '',
  '## Programmatic Access',
  '',
  '```ts',
  "import index from './index.json';",
  "// index.schemas[0].$id → 'https://schemas.0xhoneyjar.com/loa-hounfour/...'",
  '```',
  '',
  `> Generated by \`npm run schema:generate\` — do not edit manually.`,
  '',
];

const readmePath = join(outDir, 'README.md');
writeFileSync(readmePath, readmeLines.join('\n'));
console.log(`Generated: ${readmePath}`);
