/**
 * Commons Protocol — unified governance substrate for AI agent economy.
 *
 * Barrel export for the src/commons/ module.
 *
 * @see SDD — Commons Protocol v8.0.0
 * @since v8.0.0
 */
export { InvariantSchema, type Invariant } from './invariant.js';
export { ConservationLawSchema, type ConservationLaw } from './conservation-law.js';
export { buildSumInvariant, buildNonNegativeInvariant, buildBoundedInvariant, createBalanceConservation, createNonNegativeConservation, createBoundedConservation, createMonotonicConservation, resetFactoryCounter, } from './conservation-law-factories.js';
export { AuditEntrySchema, AuditTrailSchema, AUDIT_TRAIL_GENESIS_HASH, type AuditEntry, type AuditTrail, } from './audit-trail.js';
export { StateSchema, TransitionSchema, StateMachineConfigSchema, type State, type Transition, type StateMachineConfig, } from './state-machine.js';
export { GovernanceClassSchema, GOVERNED_RESOURCE_FIELDS, GovernanceMutationSchema, type GovernanceClass, type GovernanceMutation, } from './governed-resource.js';
export { GovernedCreditsSchema, type GovernedCredits } from './governed-credits.js';
export { GovernedReputationSchema, type GovernedReputation } from './governed-reputation.js';
export { GovernedFreshnessSchema, type GovernedFreshness } from './governed-freshness.js';
export { HashChainDiscontinuitySchema, type HashChainDiscontinuity, } from './hash-chain-discontinuity.js';
export { QuarantineStatusSchema, QuarantineRecordSchema, type QuarantineStatus, type QuarantineRecord, } from './quarantine.js';
export { buildDomainTag, computeAuditEntryHash, verifyAuditTrailIntegrity, type AuditEntryHashInput, type AuditTrailVerificationResult, } from './audit-trail-hash.js';
export { createCheckpoint, verifyCheckpointContinuity, pruneBeforeCheckpoint, type CheckpointResult, } from './audit-trail-checkpoint.js';
export { ProtocolCapabilitySchema, RateLimitTierSchema, ProtocolSurfaceSchema, DynamicContractSchema, type ProtocolCapability, type RateLimitTier, type ProtocolSurface, type DynamicContract, } from './dynamic-contract.js';
export { AssertionMethodSchema, ContractNegotiationSchema, type AssertionMethod, type ContractNegotiation, } from './contract-negotiation.js';
export { isNegotiationValid, computeNegotiationExpiry, type NegotiationValidityResult, } from './contract-negotiation-validity.js';
export { verifyMonotonicExpansion, type MonotonicViolation, type MonotonicExpansionResult, } from './dynamic-contract-monotonic.js';
export { evaluateGovernanceMutation, type GovernanceMutationEvalResult, } from './governance-mutation-eval.js';
export { InvariantViolationSchema, InvalidTransitionSchema, GuardFailureSchema, EvaluationErrorSchema, HashDiscontinuityErrorSchema, PartialApplicationSchema, GovernanceErrorSchema, type InvariantViolation, type InvalidTransition, type GuardFailure, type EvaluationError, type HashDiscontinuityError, type PartialApplication, type GovernanceError, } from './error-taxonomy.js';
//# sourceMappingURL=index.d.ts.map