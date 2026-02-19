# @0xhoneyjar/loa-hounfour

Shared protocol contracts for the **loa-finn ↔ arrakis** integration layer.

This package is the single source of truth for the wire format between [loa-finn](https://github.com/0xHoneyJar/loa-finn) (runtime) and [arrakis](https://github.com/0xHoneyJar/arrakis) (gateway). Both repos import from this package — no cross-repo hope-based coordination.

## Installation

```bash
# npm
npm install @0xhoneyjar/loa-hounfour

# pnpm
pnpm add @0xhoneyjar/loa-hounfour

# git dependency (if not yet published to npm)
pnpm add github:0xHoneyJar/loa-hounfour
```

## What's Included

### Schemas (TypeBox → JSON Schema 2020-12)

| Schema | Export | Description |
|--------|--------|-------------|
| JWT Claims | `JwtClaimsSchema`, `S2SJwtClaimsSchema` | Gateway authentication tokens |
| Invoke Response | `InvokeResponseSchema` | Model invocation response format |
| Usage Report | `UsageReportSchema` | Token usage and cost attribution |
| Stream Events | `StreamEventSchema` | SSE discriminated union (6 event types) |
| Routing Policy | `RoutingPolicySchema` | NFT personality routing shape validation |

### Vocabulary

| Export | Description |
|--------|-------------|
| `POOL_IDS` | Canonical pool IDs: `cheap`, `fast-code`, `reviewer`, `reasoning`, `architect` |
| `TIER_POOL_ACCESS` | Tier → pool access mapping (free, pro, enterprise) |
| `TIER_DEFAULT_POOL` | Default pool per tier |
| `ERROR_CODES` | 28 standard error codes across 8 categories |
| `JTI_POLICY` | JTI requirement matrix by endpoint type |

### Integrity Functions

| Export | Description |
|--------|-------------|
| `computeReqHash()` | SHA-256 over logical body bytes (handles gzip/br/deflate) |
| `verifyReqHash()` | Constant-time req_hash verification |
| `deriveIdempotencyKey()` | Deterministic `SHA256(tenant:reqHash:provider:model)` |
| `decompressBody()` | Safe decompression with bomb protection (10MB limit, 100:1 ratio) |

### Validators

| Export | Description |
|--------|-------------|
| `validate()` | Generic TypeBox validation with compile cache |
| `validators` | Pre-compiled validators for all schemas |
| `validateCompatibility()` | N/N-1 semver version negotiation |

### Version

| Export | Description |
|--------|-------------|
| `CONTRACT_VERSION` | Current version (`1.0.0`) |
| `MIN_SUPPORTED_VERSION` | Minimum supported (`1.0.0`) |
| `parseSemver()` | Semver parser utility |

## Usage

```typescript
import {
  JwtClaimsSchema,
  InvokeResponseSchema,
  StreamEventSchema,
  validate,
  validators,
  CONTRACT_VERSION,
  POOL_IDS,
  ERROR_CODES,
  computeReqHash,
  deriveIdempotencyKey,
  validateCompatibility,
} from '@0xhoneyjar/loa-hounfour';

// Validate JWT claims
const result = validators.jwtClaims(claims);
if (!result.success) throw new Error('Invalid claims');

// Check version compatibility
const compat = validateCompatibility('1.0.0', '1.1.0');
// { compatible: true, warning: 'Minor version mismatch' }

// Compute request hash
const hash = await computeReqHash(bodyBuffer, 'gzip');

// Derive idempotency key
const key = await deriveIdempotencyKey(tenantId, reqHash, provider, model);
```

## JSON Schemas

Pre-generated JSON Schema 2020-12 files are available at `schemas/`:

```typescript
import schema from '@0xhoneyjar/loa-hounfour/schemas/jwt-claims.schema.json';
```

These enable cross-language validation (Python, Go, Rust, etc.).

## Golden Test Vectors

Cross-language conformance vectors in `vectors/`:

- `vectors/budget/` — 56 budget calculation scenarios (basic pricing, streaming cancel, extreme tokens, price changes, provider corrections)
- `vectors/jwt/` — JWT conformance vectors
- Idempotency and req-hash vectors in test files

## Ownership & Versioning

### Ownership Model

The **loa-finn team** maintains this package. The server owns the contract — schema changes land here first, then consumers update.

### Versioning Policy

Strict semver with N/N-1 support window:

| Change Type | Version Bump | Examples |
|-------------|-------------|---------|
| Bug fixes, docs | PATCH | Fix typo in error code description |
| New optional fields, new schemas | MINOR | Add `reasoning_tokens` to usage report |
| Required field additions, removals | MAJOR | Make `req_hash` mandatory |

### Compatibility

- **Same major+minor**: COMPATIBLE
- **Same major, minor ±1**: COMPATIBLE_WITH_WARNING (`X-Contract-Version-Warning` header)
- **Different major**: INCOMPATIBLE (400 `CONTRACT_VERSION_MISMATCH`)

Both arrakis and loa-finn must support versions N and N-1 minor for a 30-day overlap window.

### Breaking Change Process

1. Open RFC issue with proposed change
2. Update schemas in loa-hounfour with version bump
3. Add conformance vectors for new behavior
4. CI: `semver:check` validates no accidental breaks
5. Both consumers update within overlap window

## Consuming from arrakis

Arrakis should replace `tests/e2e/contracts/schema/` fixtures with imports:

```typescript
// Before (fixture-based)
import schema from '../contracts/schema/jwt-claims.json';

// After (shared package)
import { JwtClaimsSchema } from '@0xhoneyjar/loa-hounfour';
```

Migration mapping:

| arrakis fixture | loa-hounfour export |
|----------------|-------------------|
| `jwt-claims.json` | `JwtClaimsSchema` |
| `invoke-response.json` | `InvokeResponseSchema` |
| `usage-report.json` | `UsageReportSchema` |
| `stream-event.json` | `StreamEventSchema` |

## Scripts

```bash
pnpm run build          # Compile TypeScript
pnpm run test           # Run all 90 tests
pnpm run typecheck      # Type-only check
pnpm run schema:generate # Regenerate JSON schemas from TypeBox
pnpm run schema:check   # Validate schema integrity
pnpm run semver:check   # Check for breaking changes
```

## References

- [RFC #31 — The Hounfour](https://github.com/0xHoneyJar/loa-finn/issues/31)
- [Issue #60 — Extract loa-hounfour protocol](https://github.com/0xHoneyJar/loa-finn/issues/60)

## License

[AGPL-3.0](LICENSE.md) — Use, modify, distribute freely. Network service deployments must release source code.

Commercial licenses are available for organizations that wish to use loa-hounfour without AGPL obligations.
