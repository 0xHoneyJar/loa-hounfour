/**
 * Integrity sub-package barrel.
 *
 * Re-exports conservation properties, request hashing, and idempotency.
 */
// Conservation Properties (v5.5.0, FR-1)
export { ConservationPropertySchema, ConservationPropertyRegistrySchema, EnforcementMechanismSchema, InvariantUniverseSchema, CANONICAL_CONSERVATION_PROPERTIES, ENFORCEMENT_MECHANISMS, } from './conservation-properties.js';
// Liveness Properties (v6.0.0, FR-1)
export { LivenessPropertySchema, TimeoutBehaviorSchema, CANONICAL_LIVENESS_PROPERTIES, TIMEOUT_BEHAVIORS, } from './liveness-properties.js';
// Request Hashing
export { computeReqHash, verifyReqHash, decompressBody, DecompressionError, EMPTY_BODY_HASH, DEFAULT_MAX_BODY_BYTES, DEFAULT_MAX_COMPRESSION_RATIO, MAX_ENCODING_DEPTH, } from './req-hash.js';
// Idempotency
export { deriveIdempotencyKey } from './idempotency.js';
// Consumer Contracts (v8.3.0, FR-4)
export { ConsumerContractEntrypointSchema, ConsumerContractSchema, validateConsumerContract, computeContractChecksum, } from './consumer-contract.js';
//# sourceMappingURL=index.js.map