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
