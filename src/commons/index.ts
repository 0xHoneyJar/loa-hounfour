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
