/**
 * Commons Protocol — unified governance substrate for AI agent economy.
 *
 * Barrel export for the src/commons/ module.
 *
 * @see SDD — Commons Protocol v8.0.0
 * @since v8.0.0
 */
// Foundation schemas
export { InvariantSchema } from './invariant.js';
export { ConservationLawSchema } from './conservation-law.js';
// Conservation law factory functions (v8.1.0, Bridgebuilder F7)
export { buildSumInvariant, buildNonNegativeInvariant, buildBoundedInvariant, createBalanceConservation, createNonNegativeConservation, createBoundedConservation, createMonotonicConservation, resetFactoryCounter, } from './conservation-law-factories.js';
export { AuditEntrySchema, AuditTrailSchema, AUDIT_TRAIL_GENESIS_HASH, } from './audit-trail.js';
export { StateSchema, TransitionSchema, StateMachineConfigSchema, } from './state-machine.js';
export { GovernanceClassSchema, GOVERNED_RESOURCE_FIELDS, GovernanceMutationSchema, } from './governed-resource.js';
// Concrete instantiations
export { GovernedCreditsSchema } from './governed-credits.js';
export { GovernedReputationSchema } from './governed-reputation.js';
export { GovernedFreshnessSchema } from './governed-freshness.js';
// Hash chain operational response (ADR-006)
export { HashChainDiscontinuitySchema, } from './hash-chain-discontinuity.js';
export { QuarantineStatusSchema, QuarantineRecordSchema, } from './quarantine.js';
// Domain-separated hash utility
export { buildDomainTag, computeAuditEntryHash, verifyAuditTrailIntegrity, } from './audit-trail-hash.js';
// Audit trail checkpointing utilities (v8.1.0, Bridgebuilder F8)
export { createCheckpoint, verifyCheckpointContinuity, pruneBeforeCheckpoint, } from './audit-trail-checkpoint.js';
// Dynamic contracts (FR-4)
export { ProtocolCapabilitySchema, RateLimitTierSchema, ProtocolSurfaceSchema, DynamicContractSchema, } from './dynamic-contract.js';
export { AssertionMethodSchema, ContractNegotiationSchema, } from './contract-negotiation.js';
// ContractNegotiation TTL validation (v8.1.0, Bridgebuilder F9)
export { isNegotiationValid, computeNegotiationExpiry, } from './contract-negotiation-validity.js';
// DynamicContract monotonic expansion verification (v8.1.0, Bridgebuilder F10)
export { verifyMonotonicExpansion, } from './dynamic-contract-monotonic.js';
// Governance mutation evaluation (v8.1.0, Bridgebuilder F6)
export { evaluateGovernanceMutation, } from './governance-mutation-eval.js';
// Error taxonomy
export { InvariantViolationSchema, InvalidTransitionSchema, GuardFailureSchema, EvaluationErrorSchema, HashDiscontinuityErrorSchema, PartialApplicationSchema, GovernanceErrorSchema, } from './error-taxonomy.js';
//# sourceMappingURL=index.js.map