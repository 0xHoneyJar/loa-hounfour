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
import { type Static } from '@sinclair/typebox';
/**
 * Capability enum — enabled features at a given surface level.
 *
 * @governance protocol-fixed
 */
export declare const ProtocolCapabilitySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>;
export type ProtocolCapability = Static<typeof ProtocolCapabilitySchema>;
/**
 * Rate limit tiers mapped to protocol surfaces.
 *
 * @governance protocol-fixed
 */
export declare const RateLimitTierSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
export type RateLimitTier = Static<typeof RateLimitTierSchema>;
/**
 * Protocol surface — defines what a model can access at a reputation tier.
 */
export declare const ProtocolSurfaceSchema: import("@sinclair/typebox").TObject<{
    schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
    rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
    ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type ProtocolSurface = Static<typeof ProtocolSurfaceSchema>;
/**
 * Dynamic contract — maps ReputationState → ProtocolSurface.
 *
 * A model at cold state accesses different protocol features
 * than one at authoritative. The mapping must be monotonically
 * expanding (capabilities at state N ⊇ capabilities at state N-1).
 */
export declare const DynamicContractSchema: import("@sinclair/typebox").TObject<{
    contract_id: import("@sinclair/typebox").TString;
    surfaces: import("@sinclair/typebox").TObject<{
        cold: import("@sinclair/typebox").TObject<{
            schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
            rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
            ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>;
        warming: import("@sinclair/typebox").TObject<{
            schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
            rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
            ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>;
        established: import("@sinclair/typebox").TObject<{
            schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
            rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
            ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>;
        authoritative: import("@sinclair/typebox").TObject<{
            schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
            rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
            ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>;
    }>;
    contract_version: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
}>;
export type DynamicContract = Static<typeof DynamicContractSchema>;
//# sourceMappingURL=dynamic-contract.d.ts.map