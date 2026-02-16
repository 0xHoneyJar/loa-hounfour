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
  type PricingInput,
  type UsageInput,
  type ConservationResult,
} from '../utilities/pricing.js';

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
