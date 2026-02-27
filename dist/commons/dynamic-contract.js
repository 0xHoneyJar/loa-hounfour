/**
 * DynamicContract + ProtocolSurface — reputation-parameterized protocol access.
 *
 * Maps each ReputationState to a ProtocolSurface defining available schemas,
 * capabilities, rate limits, and ensemble strategies. The monotonic surface
 * expansion constraint ensures capability growth follows reputation progression.
 *
 * @see SDD §4.9.1 — DynamicContract Schema (FR-4.1, FR-4.2)
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';
/**
 * Capability enum — enabled features at a given surface level.
 *
 * @governance protocol-fixed
 */
export const ProtocolCapabilitySchema = Type.Union([
    Type.Literal('inference'),
    Type.Literal('ensemble'),
    Type.Literal('tools'),
    Type.Literal('governance'),
    Type.Literal('byok'),
]);
/**
 * Rate limit tiers mapped to protocol surfaces.
 *
 * @governance protocol-fixed
 */
export const RateLimitTierSchema = Type.Union([
    Type.Literal('restricted'),
    Type.Literal('standard'),
    Type.Literal('extended'),
    Type.Literal('unlimited'),
]);
/**
 * Protocol surface — defines what a model can access at a reputation tier.
 */
export const ProtocolSurfaceSchema = Type.Object({
    schemas: Type.Array(Type.String({ minLength: 1 }), {
        description: 'Accessible schema $id values at this surface level.',
    }),
    capabilities: Type.Array(ProtocolCapabilitySchema, {
        description: 'Enabled capabilities at this surface level.',
    }),
    rate_limit_tier: RateLimitTierSchema,
    ensemble_strategies: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Available ensemble strategy identifiers at this surface level.',
    })),
}, {
    $id: 'ProtocolSurface',
    additionalProperties: false,
});
/**
 * Dynamic contract — maps ReputationState → ProtocolSurface.
 *
 * A model at cold state accesses different protocol features
 * than one at authoritative. The mapping must be monotonically
 * expanding (capabilities at state N ⊇ capabilities at state N-1).
 */
export const DynamicContractSchema = Type.Object({
    contract_id: Type.String({ format: 'uuid' }),
    surfaces: Type.Record(ReputationStateSchema, ProtocolSurfaceSchema, {
        description: 'Maps each ReputationState to its allowed ProtocolSurface. '
            + 'cold → restricted, warming → standard, established → extended, authoritative → full.',
    }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    created_at: Type.String({ format: 'date-time' }),
}, {
    $id: 'DynamicContract',
    additionalProperties: false,
    description: 'Maps reputation state to protocol surface. '
        + 'A model at cold state accesses different protocol features than one at authoritative.',
});
//# sourceMappingURL=dynamic-contract.js.map