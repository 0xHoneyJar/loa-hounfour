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
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas } from './validators/index.js';
export { validateCompatibility } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
// Note: computeReqHash, verifyReqHash, decompressBody, deriveIdempotencyKey now
// re-exported via ./integrity/index.js (v5.5.0 — integrity barrel creation).
// Schema Graph (v5.5.0, FR-4)
export { extractReferences, buildSchemaGraph } from './utilities/schema-graph.js';
// AccessPolicy Evaluation (v7.1.0, FR-6)
export { evaluateAccessPolicy, } from './utilities/access-policy.js';
// Reputation Event Sourcing (v7.3.0, C2 + Spec V)
export { reconstructAggregateFromEvents, verifyAggregateConsistency, computeEventStreamHash, } from './utilities/reputation-replay.js';
// Reputation Credential Prior (v7.3.0, C1 + Spec IV)
export { computeCredentialPrior, isCredentialExpired, CREDENTIAL_CONFIDENCE_THRESHOLD } from './utilities/reputation-credential.js';
// Constraint Namespace Validation (v7.8.0, DR-F4)
export { detectReservedNameCollisions } from './utilities/constraint-validation.js';
// Economic Boundary Decision Engine (v7.9.0, FR-1)
export { evaluateEconomicBoundary, parseMicroUsd, } from './utilities/economic-boundary.js';
// Reputation Vocabulary (v7.9.0 — root barrel export)
export { REPUTATION_STATE_ORDER, REPUTATION_STATES, } from './vocabulary/reputation.js';
//# sourceMappingURL=index.js.map