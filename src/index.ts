/**
 * @0xhoneyjar/loa-hounfour
 *
 * Shared protocol contracts for the loa-finn / arrakis integration layer.
 *
 * Ownership: 0xHoneyJar team
 * Versioning: semver (additive-only minor, required-field changes major only)
 * Update procedure: bump version, run semver:check, publish, pin in consumers
 */

// Domain sub-packages
export * from './core/index.js';
export * from './economy/index.js';
export * from './model/index.js';
export * from './governance/index.js';
export * from './constraints/index.js';
export * from './integrity/index.js';

// Cross-cutting concerns (stay in root)
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas, type CrossFieldValidator } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
// Note: computeReqHash, verifyReqHash, decompressBody, deriveIdempotencyKey now
// re-exported via ./integrity/index.js (v5.5.0 — integrity barrel creation).

// Schema Graph (v5.5.0, FR-4)
export { extractReferences, buildSchemaGraph, type SchemaReference, type SchemaGraphNode } from './utilities/schema-graph.js';

// AccessPolicy Evaluation (v7.1.0, FR-6)
export {
  evaluateAccessPolicy,
  type AccessPolicyContext,
  type AccessPolicyResult,
} from './utilities/access-policy.js';

// Reputation Event Sourcing (v7.3.0, C2 + Spec V)
export {
  reconstructAggregateFromEvents,
  verifyAggregateConsistency,
  computeEventStreamHash,
  type ReconstructedAggregate,
  type ConsistencyReport,
} from './utilities/reputation-replay.js';

// Reputation Credential Prior (v7.3.0, C1 + Spec IV)
export { computeCredentialPrior, isCredentialExpired, CREDENTIAL_CONFIDENCE_THRESHOLD } from './utilities/reputation-credential.js';

// Constraint Namespace Validation (v7.8.0, DR-F4)
export { detectReservedNameCollisions, type NameCollision } from './utilities/constraint-validation.js';

// Economic Boundary Decision Engine (v7.9.0, FR-1; extended v7.9.1)
export {
  evaluateEconomicBoundary,
  evaluateFromBoundary,
  parseMicroUsd,
  type ParseMicroUsdResult,
} from './utilities/economic-boundary.js';

// Reputation Vocabulary (v7.9.0 — root barrel export; v7.9.1 type guard)
export {
  REPUTATION_STATE_ORDER,
  REPUTATION_STATES,
  isKnownReputationState,
  type ReputationStateName,
} from './vocabulary/reputation.js';
