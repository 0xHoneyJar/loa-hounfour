/**
 * Economy sub-package barrel.
 *
 * Re-exports JWT, invoke/billing, escrow, staking, mutual credit,
 * and economic vocabulary (currency, choreography, pools, integration).
 */

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
} from '../schemas/jwt-claims.js';

// Schemas — Invoke Response & Usage Report
export {
  InvokeResponseSchema,
  UsageReportSchema,
  UsageSchema,
  type InvokeResponse,
  type UsageReport,
  type Usage,
} from '../schemas/invoke-response.js';

// Schemas — Billing
export {
  BillingEntrySchema,
  BillingRecipientSchema,
  CostTypeSchema,
  CreditNoteSchema,
  type BillingEntry,
  type BillingRecipient,
  type CostType,
  type CreditNote,
} from '../schemas/billing-entry.js';

// Schemas — Escrow
export {
  EscrowEntrySchema,
  ESCROW_TRANSITIONS,
  isValidEscrowTransition,
  type EscrowEntry,
} from '../schemas/escrow-entry.js';

// Schemas — Stake Position
export {
  StakePositionSchema,
  type StakePosition,
} from '../schemas/stake-position.js';

// Schemas — Commons Dividend
export {
  CommonsDividendSchema,
  type CommonsDividend,
} from '../schemas/commons-dividend.js';

// Schemas — Mutual Credit
export {
  MutualCreditSchema,
  type MutualCredit,
} from '../schemas/mutual-credit.js';

// Vocabulary — Currency
export {
  MicroUSD,
  MicroUSDUnsigned,
  MicroUSDSigned,
  MicroUSDCSchema,
  ZERO_MICRO,
  addMicro,
  subtractMicro,
  subtractMicroSigned,
  multiplyBps,
  compareMicro,
  negateMicro,
  isNegativeMicro,
} from '../vocabulary/currency.js';

// Vocabulary — Transfer Choreography
export {
  TRANSFER_CHOREOGRAPHY,
  TRANSFER_INVARIANTS,
  type TransferChoreography,
  type ScenarioChoreography,
  type TransferInvariant,
  type TransferInvariants,
} from '../vocabulary/transfer-choreography.js';

// Vocabulary — Economic Choreography
export {
  ECONOMIC_CHOREOGRAPHY,
  type EconomicScenarioChoreography,
  type EconomicChoreography,
} from '../vocabulary/economic-choreography.js';

// Vocabulary — Economy Integration
export { ECONOMY_FLOW, verifyEconomyFlow, type EconomyFlowEntry } from '../vocabulary/economy-integration.js';

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
} from '../vocabulary/pools.js';

// Utilities — Pricing (v5.1.0)
export {
  computeCostMicro,
  computeCostMicroSafe,
  verifyPricingConservation,
  parseMicroUSD,
  type PricingInput,
  type UsageInput,
  type ConservationResult,
} from '../utilities/pricing.js';

// Vocabulary — Conservation Status (v5.2.0)
export {
  ConservationStatusSchema,
  CONSERVATION_STATUSES,
  type ConservationStatus,
} from '../vocabulary/conservation-status.js';

// Vocabulary — Reconciliation Mode (v5.1.0)
export {
  ReconciliationModeSchema,
  RECONCILIATION_MODES,
  type ReconciliationMode,
} from '../vocabulary/reconciliation-mode.js';

// Utilities — Billing
export {
  validateBillingEntry,
  validateBillingRecipients,
  validateCreditNote,
  allocateRecipients,
} from '../utilities/billing.js';

// Utilities — NFT Identity
export {
  NftIdSchema,
  NFT_ID_PATTERN,
  parseNftId,
  formatNftId,
  isValidNftId,
  checksumAddress,
  type NftId,
  type ParsedNftId,
} from '../utilities/nft-id.js';

// Schemas — Audit Trail (v5.2.0)
export {
  AuditTrailEntrySchema,
  type AuditTrailEntry,
} from '../schemas/audit-trail-entry.js';

// Schemas — Inter-Agent Transaction Audit (v5.4.0, FR-2)
export {
  InterAgentTransactionAuditSchema,
  type InterAgentTransactionAudit,
} from '../schemas/inter-agent-transaction-audit.js';

// Branded Arithmetic Types (v5.5.0, FR-3)
export {
  microUSD,
  basisPoints,
  accountId,
  addMicroUSD,
  subtractMicroUSD,
  multiplyBPS,
  bpsShare,
  serializeMicroUSD,
  deserializeMicroUSD,
  serializeBasisPoints,
  deserializeBasisPoints,
  type MicroUSD as BrandedMicroUSD,
  type BasisPoints,
  type AccountId,
} from './branded-types.js';

// MicroUSDC Branded Type (v7.1.0, FR-1)
export {
  type MicroUSDC,
  microUSDC,
  readMicroUSDC,
  serializeMicroUSDC,
  deserializeMicroUSDC,
  microUSDToUSDC,
  microUSDCToUSD,
} from './branded-types.js';

// Schemas — JWT Boundary Verification (v5.5.0, FR-2)
export {
  JwtVerificationStepSchema,
  JwtBoundarySpecSchema,
  OutboundClaimsSchema,
  InboundClaimsSchema,
  CANONICAL_JWT_BOUNDARY_STEPS,
  type JwtVerificationStep,
  type JwtBoundarySpec,
  type OutboundClaims,
  type InboundClaims,
} from './jwt-boundary.js';

// Schemas — Registry Composition (v6.0.0, FR-5)
export {
  withAnnotation,
  BridgeEnforcementSchema,
  BridgeInvariantSchema,
  SettlementPolicySchema,
  ExchangeRateTypeSchema,
  ExchangeRateSpecSchema,
  RegistryBridgeSchema,
  CANONICAL_BRIDGE_INVARIANTS,
  type BridgeEnforcement,
  type BridgeInvariant,
  type SettlementPolicy,
  type ExchangeRateType,
  type ExchangeRateSpec,
  type RegistryBridge,
} from './registry-composition.js';

// Schemas — Minting Policy (v6.0.0, FR-5)
export {
  MintingPolicySchema,
  type MintingPolicy,
} from './minting-policy.js';

// Schemas — Bridge Transfer Saga (v7.0.0)
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
} from './bridge-transfer-saga.js';

// Schemas — Monetary Policy (v7.0.0)
export {
  ReviewTriggerSchema,
  MonetaryPolicySchema,
  type ReviewTrigger,
  type MonetaryPolicy,
} from './monetary-policy.js';

// Schemas — Economic Boundary (v7.7.0, extended v7.9.0)
export {
  TrustLayerSnapshotSchema,
  CapitalLayerSnapshotSchema,
  AccessDecisionSchema,
  EconomicBoundarySchema,
  QualificationCriteriaSchema,
  TrustEvaluationSchema,
  CapitalEvaluationSchema,
  EconomicBoundaryEvaluationResultSchema,
  type TrustLayerSnapshot,
  type CapitalLayerSnapshot,
  type AccessDecision,
  type EconomicBoundary,
  type QualificationCriteria,
  type TrustEvaluation,
  type CapitalEvaluation,
  type EconomicBoundaryEvaluationResult,
} from './economic-boundary.js';

// Schemas — Reputation Economic Impact (v7.7.0)
export {
  EconomicImpactTypeSchema,
  ReputationTriggerEventSchema,
  EconomicImpactEntrySchema,
  ReputationEconomicImpactSchema,
  type EconomicImpactType,
  type ReputationTriggerEvent,
  type EconomicImpactEntry,
  type ReputationEconomicImpact,
} from './reputation-economic-impact.js';

// Schemas — Model Economic Profile (v7.7.0)
export {
  CostPerTokenSchema,
  ModelEconomicProfileSchema,
  type CostPerToken,
  type ModelEconomicProfile,
} from './model-economic-profile.js';

// Schemas — Economic Performance Events (v7.8.0 — DR-F1 feedback loop)
export {
  PerformanceOutcomeTypeSchema,
  EconomicPerformanceEventSchema,
  QualityBridgeDirectionSchema,
  PerformanceQualityBridgeSchema,
  type PerformanceOutcomeType,
  type EconomicPerformanceEvent,
  type QualityBridgeDirection,
  type PerformanceQualityBridge,
} from './economic-performance.js';

// Schemas — Basket Composition (v7.8.0 — DR-F2 dynamic rebalancing)
export {
  BasketCompositionEntrySchema,
  BasketCompositionSchema,
  type BasketCompositionEntry,
  type BasketComposition,
} from './basket-composition.js';

// Schemas — Routing Rebalance Event (v7.8.0 — DR-F2)
export {
  RebalanceTriggerTypeSchema,
  RoutingRebalanceEventSchema,
  type RebalanceTriggerType,
  type RoutingRebalanceEvent,
} from './routing-rebalance.js';

// Utilities — Lifecycle (transition guards)
export {
  createTransitionValidator,
  DEFAULT_GUARDS,
  guardKey,
  isValidGuardResult,
  requiresTransferId,
  requiresNoActiveTransfer,
  requiresReasonResolved,
  requiresTransferCompleted,
  requiresSanctionEvidence,
  type TransitionValidator,
  type TransitionGuard,
  type GuardResult,
  type GuardSeverity,
} from '../utilities/lifecycle.js';
