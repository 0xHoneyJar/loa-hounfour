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
