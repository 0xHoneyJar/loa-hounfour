/**
 * @0xhoneyjar/loa-hounfour
 *
 * Shared protocol contracts for the loa-finn / arrakis integration layer.
 *
 * Ownership: 0xHoneyJar team
 * Versioning: semver (additive-only minor, required-field changes major only)
 * Update procedure: bump version, run semver:check, publish, pin in consumers
 */
export * from './core/index.js';
export * from './economy/index.js';
export * from './model/index.js';
export * from './governance/index.js';
export * from './constraints/index.js';
export * from './integrity/index.js';
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';
export { validate, validators, registerCrossFieldValidator, getCrossFieldValidatorSchemas, type CrossFieldValidator } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
export { extractReferences, buildSchemaGraph, type SchemaReference, type SchemaGraphNode } from './utilities/schema-graph.js';
export { evaluateAccessPolicy, type AccessPolicyContext, type AccessPolicyResult, } from './utilities/access-policy.js';
//# sourceMappingURL=index.d.ts.map