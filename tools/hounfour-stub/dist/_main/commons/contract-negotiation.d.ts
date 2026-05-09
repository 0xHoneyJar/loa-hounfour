/**
 * ContractNegotiation — runtime handshake for dynamic contract access.
 *
 * Model presents reputation state, receives allowed protocol surface.
 * Trust model: reputation MUST be server-derived or signed — self-assertion
 * is non-conformant. Replay protection via nonce + TTL.
 *
 * @see SDD §4.9.2 — ContractNegotiation Schema (FR-4.3, FR-4.5, IMP-003, SKP-005)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Assertion method — how the reputation state was determined.
 *
 * @governance protocol-fixed
 */
export declare const AssertionMethodSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"server-derived">, import("@sinclair/typebox").TLiteral<"signed-attestation">]>;
export type AssertionMethod = Static<typeof AssertionMethodSchema>;
/**
 * Runtime contract negotiation handshake.
 */
export declare const ContractNegotiationSchema: import("@sinclair/typebox").TObject<{
    negotiation_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    reputation_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    assertion_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"server-derived">, import("@sinclair/typebox").TLiteral<"signed-attestation">]>;
    requested_surface: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
        rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
        ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    granted_surface: import("@sinclair/typebox").TObject<{
        schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"ensemble">, import("@sinclair/typebox").TLiteral<"tools">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"byok">]>>;
        rate_limit_tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"restricted">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"extended">, import("@sinclair/typebox").TLiteral<"unlimited">]>;
        ensemble_strategies: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>;
    negotiated_at: import("@sinclair/typebox").TString;
    nonce: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TString;
}>;
export type ContractNegotiation = Static<typeof ContractNegotiationSchema>;
//# sourceMappingURL=contract-negotiation.d.ts.map