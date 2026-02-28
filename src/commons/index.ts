/**
 * Commons Protocol — unified governance substrate for AI agent economy.
 *
 * Barrel export for the src/commons/ module.
 *
 * @see SDD — Commons Protocol v8.0.0
 * @since v8.0.0
 */

// Foundation schemas
export { InvariantSchema, type Invariant } from './invariant.js';
export { ConservationLawSchema, type ConservationLaw } from './conservation-law.js';
// Conservation law factory functions (v8.1.0, Bridgebuilder F7)
export {
  buildSumInvariant,
  buildNonNegativeInvariant,
  buildBoundedInvariant,
  createBalanceConservation,
  createNonNegativeConservation,
  createBoundedConservation,
  createMonotonicConservation,
  resetFactoryCounter,
} from './conservation-law-factories.js';
export {
  AuditEntrySchema,
  AuditTrailSchema,
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditEntry,
  type AuditTrail,
} from './audit-trail.js';
export {
  StateSchema,
  TransitionSchema,
  StateMachineConfigSchema,
  type State,
  type Transition,
  type StateMachineConfig,
} from './state-machine.js';
export {
  GovernanceClassSchema,
  GOVERNED_RESOURCE_FIELDS,
  GovernanceMutationSchema,
  type GovernanceClass,
  type GovernanceMutation,
} from './governed-resource.js';

// Concrete instantiations
export { GovernedCreditsSchema, type GovernedCredits } from './governed-credits.js';
export { GovernedReputationSchema, type GovernedReputation } from './governed-reputation.js';
export { GovernedFreshnessSchema, type GovernedFreshness } from './governed-freshness.js';

// Hash chain operational response (ADR-006)
export {
  HashChainDiscontinuitySchema,
  type HashChainDiscontinuity,
} from './hash-chain-discontinuity.js';
export {
  QuarantineStatusSchema,
  QuarantineRecordSchema,
  type QuarantineStatus,
  type QuarantineRecord,
} from './quarantine.js';

// Domain-separated hash utility
export {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
  type AuditEntryHashInput,
  type AuditTrailVerificationResult,
} from './audit-trail-hash.js';

// Audit trail checkpointing utilities (v8.1.0, Bridgebuilder F8)
export {
  createCheckpoint,
  verifyCheckpointContinuity,
  pruneBeforeCheckpoint,
  type CheckpointResult,
} from './audit-trail-checkpoint.js';

// Dynamic contracts (FR-4)
export {
  ProtocolCapabilitySchema,
  RateLimitTierSchema,
  ProtocolSurfaceSchema,
  DynamicContractSchema,
  type ProtocolCapability,
  type RateLimitTier,
  type ProtocolSurface,
  type DynamicContract,
} from './dynamic-contract.js';
export {
  AssertionMethodSchema,
  ContractNegotiationSchema,
  type AssertionMethod,
  type ContractNegotiation,
} from './contract-negotiation.js';

// ContractNegotiation TTL validation (v8.1.0, Bridgebuilder F9)
export {
  isNegotiationValid,
  computeNegotiationExpiry,
  type NegotiationValidityResult,
} from './contract-negotiation-validity.js';

// DynamicContract monotonic expansion verification (v8.1.0, Bridgebuilder F10)
export {
  verifyMonotonicExpansion,
  type MonotonicViolation,
  type MonotonicExpansionResult,
} from './dynamic-contract-monotonic.js';

// Governance mutation evaluation (v8.1.0, Bridgebuilder F6)
export {
  evaluateGovernanceMutation,
  type GovernanceMutationEvalResult,
} from './governance-mutation-eval.js';

// Feedback dampening (v8.3.0, FR-3)
export {
  FeedbackDampeningConfigSchema,
  computeDampenedScore,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DEFAULT_PSEUDO_COUNT,
  type FeedbackDampeningConfig,
} from './feedback-dampening.js';

// Chain-bound hash (v8.3.0, FR-5)
export {
  computeChainBoundHash,
  validateDomainTag,
  ChainBoundHashError,
  type AuditEntryHashInput as ChainBoundHashInput,
} from './chain-bound-hash.js';

// Audit timestamp validation (v8.3.0, FR-5)
export {
  validateAuditTimestamp,
  type AuditTimestampResult,
} from './audit-timestamp.js';

// Advisory lock key (v8.3.0, FR-5)
export {
  computeAdvisoryLockKey,
} from './advisory-lock.js';

// GovernedResource<T> runtime interface (v8.3.0, FR-8)
export {
  TransitionResultSchema,
  InvariantResultSchema,
  MutationContextSchema,
  GovernedResourceBase,
  type TransitionResult,
  type InvariantResult,
  type MutationContext,
  type GovernedResource,
  type TransitionResultStatic,
  type InvariantResultStatic,
  type MutationContextStatic,
} from './governed-resource-runtime.js';

// Error taxonomy
export {
  InvariantViolationSchema,
  InvalidTransitionSchema,
  GuardFailureSchema,
  EvaluationErrorSchema,
  HashDiscontinuityErrorSchema,
  PartialApplicationSchema,
  GovernanceErrorSchema,
  type InvariantViolation,
  type InvalidTransition,
  type GuardFailure,
  type EvaluationError,
  type HashDiscontinuityError,
  type PartialApplication,
  type GovernanceError,
} from './error-taxonomy.js';
