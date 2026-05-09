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
import { Type } from '@sinclair/typebox';
/** Valid tier levels for tenant access control. */
export const TierSchema = Type.Union([
    Type.Literal('free'),
    Type.Literal('pro'),
    Type.Literal('enterprise'),
], { $id: 'Tier', description: 'Tenant subscription tier' });
/** BYOK (Bring Your Own Key) claims embedded in gateway JWT. */
export const ByokClaimsSchema = Type.Object({
    token_id: Type.String({ description: 'Reference to stored key in arrakis (never the raw key)' }),
    provider: Type.String({ description: 'Target provider (e.g., openai, anthropic)' }),
    scopes: Type.Array(Type.String(), { description: 'Permitted operations', minItems: 1 }),
}, { $id: 'ByokClaims', additionalProperties: false });
/**
 * Canonical JWT claims validated by loa-finn gateway.
 *
 * Header requirements (validated before claims):
 * - alg MUST be ES256
 * - kid MUST be present
 * - typ is optional/ignored
 */
export const JwtClaimsSchema = Type.Object({
    // Standard claims
    iss: Type.String({ description: 'Issuer — must match allowlist (exact string match, per-environment)' }),
    aud: Type.String({ description: 'Audience — "loa-finn" for invoke, "loa-finn-admin" for admin, "arrakis" for S2S' }),
    sub: Type.String({ description: 'Subject — user or service identifier' }),
    iat: Type.Number({ description: 'Issued at (Unix seconds)' }),
    exp: Type.Number({ description: 'Expiration (Unix seconds)' }),
    jti: Type.Optional(Type.String({
        description: 'JWT ID — required for invoke/admin, optional for S2S GET (short exp ≤ 60s compensates)',
    })),
    // Custom claims
    tenant_id: Type.String({ minLength: 1, description: 'Tenant identifier' }),
    tier: TierSchema,
    req_hash: Type.String({
        pattern: '^sha256:[a-f0-9]{64}$',
        description: 'SHA-256 hex digest of canonical request body',
    }),
    // Optional routing claims
    nft_id: Type.Optional(Type.String({ description: 'NFT identifier for personality-based routing' })),
    model_preferences: Type.Optional(Type.Record(Type.String(), Type.String(), {
        description: 'Task type → pool ID overrides',
    })),
    // Optional BYOK claims
    byok: Type.Optional(ByokClaimsSchema),
}, {
    $id: 'JwtClaims',
    additionalProperties: false,
    description: 'Canonical JWT claims for loa-finn ↔ arrakis protocol',
});
/**
 * S2S JWT claims for service-to-service communication.
 * Used for arrakis budget reconciliation, BYOK proxy, etc.
 *
 * kid must be from a separate namespace from gateway JWTs.
 */
export const S2SJwtClaimsSchema = Type.Object({
    iss: Type.String({ description: 'Issuer — service identity' }),
    aud: Type.String({ description: 'Audience — target service (e.g., "arrakis")' }),
    sub: Type.String({ description: 'Subject — source service identity' }),
    iat: Type.Number(),
    exp: Type.Number({ description: 'Short-lived: max 60s for GETs, 300s for mutations' }),
    jti: Type.Optional(Type.String({ description: 'Optional for GETs (exp ≤ 60s compensates)' })),
    scope: Type.Optional(Type.String({ description: 'Permission scope (e.g., "admin:jwks")' })),
}, {
    $id: 'S2SJwtClaims',
    additionalProperties: false,
    description: 'Service-to-service JWT claims',
});
/**
 * Issuer allowlist configuration.
 * Exact string match, per-environment.
 */
export const IssuerAllowlistSchema = Type.Object({
    gateway: Type.Array(Type.String(), { description: 'Allowed issuers for gateway JWTs' }),
    s2s: Type.Array(Type.String(), { description: 'Allowed issuers for S2S JWTs' }),
}, { $id: 'IssuerAllowlist' });
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
export const JTI_POLICY = {
    invoke: { required: true },
    admin: { required: true },
    s2s_get: { required: false, compensating: 'exp <= 60s' },
    byok: { required: true, mode: 'bounded-use', maxUses: 100 },
};
//# sourceMappingURL=jwt-claims.js.map