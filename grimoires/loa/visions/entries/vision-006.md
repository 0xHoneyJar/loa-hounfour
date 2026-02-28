# Vision 006: S2S JWT Protocol Gap — Missing jti Claim for Replay Protection

## Source
- Bridge: freeside PR #88 (bridge-20260222-1d94d2), Iteration 1, high-1
- Finding Severity: HIGH

## Insight

Freeside's `S2SJwtSigner.signS2SJwt()` creates service-to-service JWTs without a `jti` (JWT ID) claim. Without `jti`, the receiving service (loa-finn) cannot enforce single-use tokens within the 60s TTL window. A captured token can be replayed until expiry.

This was fixed in freeside (added `.setJti(randomUUID())`), but the fix is consumer-side. Hounfour defines JWT schemas (`JwtPayloadSchema`, etc.) but does not require `jti` for S2S tokens at the protocol level.

## Pattern

```typescript
// Current hounfour JWT schema — jti is optional
export const JwtPayloadSchema = Type.Object({
  iss: Type.String(),
  sub: Type.String(),
  aud: Type.Union([Type.String(), Type.Array(Type.String())]),
  exp: Type.Integer(),
  iat: Type.Integer(),
  jti: Type.Optional(Type.String({ format: 'uuid' })),  // Optional — should it be required for S2S?
});

// Proposed: S2S-specific schema requiring jti
export const S2SJwtPayloadSchema = Type.Intersect([
  JwtPayloadSchema,
  Type.Object({
    jti: Type.String({ format: 'uuid' }),  // Required for replay protection
  }),
]);
```

## Applicability

- Hounfour economy module: define S2S JWT schema requiring `jti`
- Any service-to-service JWT flow in the ecosystem
- Note: adding `jti` as required to EXISTING `JwtPayloadSchema` would be BREAKING. A new `S2SJwtPayloadSchema` is additive.

## Connection

- FR-1 (x402 payment schemas — payment proofs use JWTs)
- Freeside PR #88 HIGH-1 (already fixed consumer-side)
- OWASP JWT security guidelines (jti is recommended for all security-sensitive JWTs)

## Status

Deferred — protocol-level decision needed. Adding as required in existing schema would be MAJOR (breaking). New S2S-specific schema would be MINOR (additive). Target v8.3.0 if additive, v9.0.0 if breaking.
