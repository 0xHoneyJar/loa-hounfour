/**
 * JWT Claims Schema for the loa-finn ↔ arrakis protocol.
 *
 * Defines the canonical JWT claims structure validated by both services.
 * Uses TypeBox for runtime validation + JSON Schema generation.
 *
 * jti policy:
 * - Required for invoke endpoints (reject 401 JTI_REQUIRED if absent)
 * - Optional for S2S GETs (short exp ≤ 60s compensates)
 * - Required for admin endpoints
 *
 * @see SDD 4.1 — JWT Claims Schema
 */
import { type Static } from '@sinclair/typebox';
/** Valid tier levels for tenant access control. */
export declare const TierSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"free">, import("@sinclair/typebox").TLiteral<"pro">, import("@sinclair/typebox").TLiteral<"enterprise">]>;
export type Tier = Static<typeof TierSchema>;
/** BYOK (Bring Your Own Key) claims embedded in gateway JWT. */
export declare const ByokClaimsSchema: import("@sinclair/typebox").TObject<{
    token_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    scopes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type ByokClaims = Static<typeof ByokClaimsSchema>;
/**
 * Canonical JWT claims validated by loa-finn gateway.
 *
 * Header requirements (validated before claims):
 * - alg MUST be ES256
 * - kid MUST be present
 * - typ is optional/ignored
 */
export declare const JwtClaimsSchema: import("@sinclair/typebox").TObject<{
    iss: import("@sinclair/typebox").TString;
    aud: import("@sinclair/typebox").TString;
    sub: import("@sinclair/typebox").TString;
    iat: import("@sinclair/typebox").TNumber;
    exp: import("@sinclair/typebox").TNumber;
    jti: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tenant_id: import("@sinclair/typebox").TString;
    tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"free">, import("@sinclair/typebox").TLiteral<"pro">, import("@sinclair/typebox").TLiteral<"enterprise">]>;
    req_hash: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    model_preferences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>>;
    byok: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        token_id: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        scopes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>>;
}>;
export type JwtClaims = Static<typeof JwtClaimsSchema>;
/**
 * S2S JWT claims for service-to-service communication.
 * Used for arrakis budget reconciliation, BYOK proxy, etc.
 *
 * kid must be from a separate namespace from gateway JWTs.
 */
export declare const S2SJwtClaimsSchema: import("@sinclair/typebox").TObject<{
    iss: import("@sinclair/typebox").TString;
    aud: import("@sinclair/typebox").TString;
    sub: import("@sinclair/typebox").TString;
    iat: import("@sinclair/typebox").TNumber;
    exp: import("@sinclair/typebox").TNumber;
    jti: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    scope: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type S2SJwtClaims = Static<typeof S2SJwtClaimsSchema>;
/**
 * Issuer allowlist configuration.
 * Exact string match, per-environment.
 */
export declare const IssuerAllowlistSchema: import("@sinclair/typebox").TObject<{
    gateway: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    s2s: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type IssuerAllowlist = Static<typeof IssuerAllowlistSchema>;
/**
 * jti requirement matrix.
 *
 * | Endpoint Type | jti Required | Compensating Control |
 * |---------------|-------------|---------------------|
 * | invoke        | YES         | —                   |
 * | admin         | YES         | —                   |
 * | S2S GET       | NO          | exp ≤ 60s           |
 * | BYOK          | YES (bounded-use) | INCR ≤ 100    |
 */
export declare const JTI_POLICY: {
    readonly invoke: {
        readonly required: true;
    };
    readonly admin: {
        readonly required: true;
    };
    readonly s2s_get: {
        readonly required: false;
        readonly compensating: "exp <= 60s";
    };
    readonly byok: {
        readonly required: true;
        readonly mode: "bounded-use";
        readonly maxUses: 100;
    };
};
//# sourceMappingURL=jwt-claims.d.ts.map