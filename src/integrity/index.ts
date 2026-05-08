/**
 * Integrity sub-package barrel.
 *
 * Re-exports conservation properties, request hashing, and idempotency.
 */

// Conservation Properties (v5.5.0, FR-1)
export {
  ConservationPropertySchema,
  ConservationPropertyRegistrySchema,
  EnforcementMechanismSchema,
  InvariantUniverseSchema,
  CANONICAL_CONSERVATION_PROPERTIES,
  ENFORCEMENT_MECHANISMS,
  type ConservationProperty,
  type ConservationPropertyRegistry,
  type EnforcementMechanism,
  type InvariantUniverse,
} from './conservation-properties.js';

// Liveness Properties (v6.0.0, FR-1)
export {
  LivenessPropertySchema,
  TimeoutBehaviorSchema,
  CANONICAL_LIVENESS_PROPERTIES,
  TIMEOUT_BEHAVIORS,
  type LivenessProperty,
  type TimeoutBehavior,
} from './liveness-properties.js';

// Request Hashing
export {
  computeReqHash,
  verifyReqHash,
  decompressBody,
  DecompressionError,
  EMPTY_BODY_HASH,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_COMPRESSION_RATIO,
  MAX_ENCODING_DEPTH,
  type ReqHashOptions,
} from './req-hash.js';

// Idempotency
export { deriveIdempotencyKey } from './idempotency.js';

// Consumer Contracts (v8.3.0, FR-4)
export {
  ConsumerContractEntrypointSchema,
  ConsumerContractSchema,
  validateConsumerContract,
  computeContractChecksum,
  type ConsumerContractEntrypoint,
  type ConsumerContract,
  type ContractValidationResult,
} from './consumer-contract.js';

// Canonicalization helper — CT-01 hybrid carve-out (cycle-005 / v8.6.0).
//
// `safeCanonicalize` is the v8.5.0 sanctioned canonicalization helper. It is
// re-exported here so consumers that need cross-language byte-identical output
// (NFR-3) have a single normative TypeScript reference implementation to
// mirror. Its export surface is governed by
// `docs/architecture/canonicalization-spec-v8.6.md`, NOT by long-term semver
// API stability — hence the `@experimental` annotation.
//
// Re-exporting any OTHER canonicalization or hashing helper from this barrel
// without an `@experimental` tag would cross the ADR-010 class-vs-policy
// boundary. Structural lint RULE-6 (`scripts/check-class-policy-boundary.ts`)
// enforces this.
//
// @experimental — surface governed by canonicalization-spec-v8.6.md, not semver.
// @see docs/architecture/canonicalization-spec-v8.6.md
// @see docs/adr/ADR-010-class-vs-policy-boundary.md
// @since v8.6.0 (PR-A3.0; CT-01 hybrid)
export {
  safeCanonicalize,
  SAFE_CANONICALIZE_DEFAULT_MAX_BYTES,
  CanonicalizeKeyCollisionError,
  type SafeCanonicalizeOptions,
} from '../utilities/safe-canonicalize.js';

// FR-B2 PhaseCompletionEnvelope (Tier-1 + Tier-2). v8.6.0 — PR-A3.4.
export {
  PhaseCompletionEnvelopeTier1Schema,
  type PhaseCompletionEnvelopeTier1,
} from './phase-completion-envelope-tier1.js';
export {
  PhaseCompletionEnvelopeSchema,
  type PhaseCompletionEnvelope,
} from './phase-completion-envelope.js';

// SHA-256 hex pattern constants (used by FR-B2 + downstream cycle-005
// schemas with content-addressed hash fields).
export {
  SHA256_HEX_PATTERN,
  SHA256_HEX_BARE_PATTERN,
} from './sha256-pattern.js';
