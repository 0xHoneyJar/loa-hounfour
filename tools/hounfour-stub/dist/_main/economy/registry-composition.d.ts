/**
 * Registry Composition — cross-registry bridges, invariants, and exchange.
 *
 * Enables value transfer between independent economy registries with
 * formally specified invariants and settlement policies.
 *
 * @see SDD §2.5.1-2.5.3 — Registry Bridge, Invariants, Exchange Rate
 * @since v6.0.0
 */
import { type TSchema, type Static } from '@sinclair/typebox';
/**
 * Add custom JSON Schema extension properties to a TypeBox schema without
 * `as any` cast. Preserves full type safety while allowing x-* annotations.
 *
 * @see SDD §2.1.1 — F-007 resolution
 */
export declare function withAnnotation<T extends TSchema>(schema: T, annotations: Record<string, unknown>): T;
export declare const BridgeEnforcementSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"eventual">, import("@sinclair/typebox").TLiteral<"manual">]>;
export type BridgeEnforcement = Static<typeof BridgeEnforcementSchema>;
export declare const BridgeInvariantSchema: import("@sinclair/typebox").TObject<{
    invariant_id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    ltl_formula: import("@sinclair/typebox").TString;
    enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"eventual">, import("@sinclair/typebox").TLiteral<"manual">]>;
}>;
export type BridgeInvariant = Static<typeof BridgeInvariantSchema>;
export declare const SettlementPolicySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"immediate">, import("@sinclair/typebox").TLiteral<"batched">, import("@sinclair/typebox").TLiteral<"netting">]>;
export type SettlementPolicy = Static<typeof SettlementPolicySchema>;
export declare const ExchangeRateTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
export type ExchangeRateType = Static<typeof ExchangeRateTypeSchema>;
export declare const ExchangeRateSpecSchema: import("@sinclair/typebox").TObject<{
    rate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
    value: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    oracle_endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    governance_proposal_required: import("@sinclair/typebox").TBoolean;
    staleness_threshold_seconds: import("@sinclair/typebox").TInteger;
}>;
export type ExchangeRateSpec = Static<typeof ExchangeRateSpecSchema>;
export declare const RegistryBridgeSchema: import("@sinclair/typebox").TObject<{
    bridge_id: import("@sinclair/typebox").TString;
    source_registry_id: import("@sinclair/typebox").TString;
    target_registry_id: import("@sinclair/typebox").TString;
    bridge_invariants: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        invariant_id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        ltl_formula: import("@sinclair/typebox").TString;
        enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"eventual">, import("@sinclair/typebox").TLiteral<"manual">]>;
    }>>;
    exchange_rate: import("@sinclair/typebox").TObject<{
        rate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
        value: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        oracle_endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        governance_proposal_required: import("@sinclair/typebox").TBoolean;
        staleness_threshold_seconds: import("@sinclair/typebox").TInteger;
    }>;
    settlement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"immediate">, import("@sinclair/typebox").TLiteral<"batched">, import("@sinclair/typebox").TLiteral<"netting">]>;
    transfer_protocol: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"choreography">]>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RegistryBridge = Static<typeof RegistryBridgeSchema>;
export declare const CANONICAL_BRIDGE_INVARIANTS: readonly BridgeInvariant[];
//# sourceMappingURL=registry-composition.d.ts.map