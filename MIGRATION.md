# Migration & Schema Evolution Guide

> Cross-version communication strategy for `@0xhoneyjar/loa-hounfour` consumers.

---

## Schema Evolution Strategy

### Version Support Policy

| Property | Value |
|----------|-------|
| **Current Version** | 3.0.0 |
| **Minimum Supported** | 2.4.0 |
| **N/N-1 Guarantee** | Consumers must accept current and previous minor version |
| **Major Mismatch** | 400 with `CONTRACT_VERSION_MISMATCH` error |
| **Minor Mismatch** | `X-Contract-Version-Warning` header |

### Consumer Upgrade Matrix

| Consumer | Producer 2.4.0 | Producer 3.0.0 |
|----------|----------------|----------------|
| **2.0.0–2.3.0** | Fwd-compat* | **REJECTED** (below MIN_SUPPORTED_VERSION) |
| **2.4.0** | Full | Fwd-compat** |
| **3.0.0** | Full | Full |

\* Requires validate-then-strip for strict schemas. See below.

\*\* v3.0.0 removes `previous_owner_access` from `ConversationSealingPolicy` and adds optional `access_policy`. A v2.4.0 consumer with strict validation will reject v3.0.0 sealing policies containing `access_policy` (unknown field). Use validate-then-strip pattern. Consumers using `previous_owner_access` must migrate to `access_policy`.

### Schema `additionalProperties` Policy

Every schema has an explicit policy for unknown properties. Strict schemas reject unknown fields — a v2.2.0 consumer with strict validation will reject v2.3.0 documents containing new fields.

#### Strict Schemas (`additionalProperties: false`)

| Schema `$id` | Rationale |
|--------------|-----------|
| `AgentDescriptor` | Security boundary — agent identity must not contain unvetted fields |
| `BillingEntry` | Financial data — strict validation prevents billing injection |
| `BillingRecipient` | Financial sub-document |
| `CreditNote` | Financial reversal |
| `Conversation` | Ownership data transferred with NFT |
| `ConversationSealingPolicy` | Encryption configuration |
| `Message` | Content record |
| `TransferSpec` | Ownership transfer initiation |
| `TransferEventRecord` | Transfer outcome record |
| `DomainEvent` | Event envelope — strict to prevent payload confusion |
| `DomainEventBatch` | Batch envelope |
| `SagaContext` | Saga tracking |
| `LifecycleTransitionPayload` | Lifecycle event data |
| `Capability` | Agent capability descriptor |
| `CapabilityResponse` | Response to capability query |
| `ProtocolDiscovery` | Discovery document |

#### Extensible Schemas (`additionalProperties: true`)

| Schema `$id` | Rationale |
|--------------|-----------|
| `CapabilityQuery` | Query extensibility — future parameters without schema changes |

#### Union Types (no object properties)

`AgentLifecycleState`, `CostType`, `TransferScenario`, `TransferResult`, `MessageRole`, `ConversationStatus` — string literal unions with no `additionalProperties` concern.

### Forward Compatibility: `DomainEventBatch.saga`

The `saga` field was added to `DomainEventBatch` in v2.2.0. Since `DomainEventBatch` uses `additionalProperties: false`:

- **Go** with `DisallowUnknownFields`: **Rejects** the batch
- **Python** Pydantic with `extra="forbid"`: **Rejects** the batch
- **TypeScript** TypeBox `TypeCompiler`: **Rejects** — enforces `additionalProperties: false`
- **Loose consumer** without strict validation: **Accepts**

### Forward Compatibility: `ProtocolDiscovery.capabilities_url`

Added in v2.3.0. Same impact as above — v2.2.0 strict consumers reject v2.3.0 discovery documents.

### Consumer Patterns for Forward Compatibility

#### Pattern: Validate Then Strip Unknown Fields

```go
// Go: validate known fields, strip unknown
func validateAndStrip(data []byte, version string) (map[string]interface{}, error) {
    var raw map[string]interface{}
    json.Unmarshal(data, &raw)
    knownFields := getKnownFields(version)
    stripped := make(map[string]interface{})
    for k, v := range raw {
        if contains(knownFields, k) {
            stripped[k] = v
        }
    }
    return stripped, validate(stripped)
}
```

```python
# Python: Pydantic v2 with extra="ignore"
class DomainEventBatch(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Strip unknown fields
    batch_id: str
    correlation_id: str
    events: list[DomainEvent]
```

```typescript
// TypeScript: Value.Clean strips unknown properties before validation
import { Value } from '@sinclair/typebox/value';

function validateForward<T extends TSchema>(schema: T, data: unknown): Static<T> {
  const cleaned = Value.Clean(schema, structuredClone(data));
  const result = validate(schema, cleaned);
  if (!result.valid) throw new Error(result.errors.join(', '));
  return cleaned as Static<T>;
}
```

### `MIN_SUPPORTED_VERSION` and Wire Compatibility

- **Forward**: v2.0.0 consumer CAN validate v2.3.0 data IF it strips unknown fields
- **Backward**: v2.3.0 consumer CAN always validate v2.0.0 data (no fields removed)
- **Breaking**: v3.0.0 removed `previous_owner_access` and bumped `MIN_SUPPORTED_VERSION` to `2.4.0`

### Migration Checklist for New Versions

1. **New optional fields on strict schemas**: Document here and in SCHEMA-CHANGELOG
2. **New schemas**: No compatibility impact
3. **New vocabulary entries**: No impact — `isKnownEventType()` returns false for unknown types by design
4. **Deprecation**: Mark `deprecated: true` in TypeBox; remove only at major version boundary
5. **Required field addition**: MAJOR version bump required

### Strict Schema Additions (v3.0.0)

| Schema `$id` | Rationale |
|--------------|-----------|
| `AccessPolicy` | Access control configuration — strict to prevent unvetted fields |

---

# Migration Guide: v2.4.0 → v3.0.0

## Breaking Changes

### 1. `previous_owner_access` removed from `ConversationSealingPolicy`

The deprecated `previous_owner_access` string field has been removed. Use `access_policy` instead.

**Before (v2.4.0):**

```typescript
const sealingPolicy = {
  encryption_scheme: 'aes-256-gcm',
  key_derivation: 'hkdf-sha256',
  key_reference: 'kref-001',
  access_audit: true,
  previous_owner_access: 'read_only_24h',
};
```

**After (v3.0.0):**

```typescript
import { validateSealingPolicy, validateAccessPolicy } from '@0xhoneyjar/loa-hounfour';

const sealingPolicy = {
  encryption_scheme: 'aes-256-gcm',
  key_derivation: 'hkdf-sha256',
  key_reference: 'kref-001',
  access_audit: true,
  access_policy: {
    type: 'time_limited',
    duration_hours: 24,
    audit_required: true,
    revocable: true,
  },
};
```

#### Migration mapping for `previous_owner_access` values

| v2.x `previous_owner_access` | v3.0.0 `access_policy.type` | Additional fields |
|-------------------------------|-----------------------------|--------------------|
| `"none"` | `"none"` | `audit_required: false, revocable: false` |
| `"read_only_24h"` | `"time_limited"` | `duration_hours: 24, audit_required: true, revocable: true` |
| `"read_only"` | `"read_only"` | `audit_required: true, revocable: true` |
| *(new in v3.0.0)* | `"role_based"` | `roles: ["auditor"], audit_required: true, revocable: false` |

> **Note:** `role_based` is new in v3.0.0 with no v2.x equivalent. It is available for consumers who need fine-grained access control based on organizational roles.

```go
// Go: migrate previous_owner_access to access_policy
func migrateAccessPolicy(old string) map[string]interface{} {
    switch old {
    case "none":
        return map[string]interface{}{
            "type": "none", "audit_required": false, "revocable": false,
        }
    case "read_only_24h":
        return map[string]interface{}{
            "type": "time_limited", "duration_hours": 24,
            "audit_required": true, "revocable": true,
        }
    case "read_only":
        return map[string]interface{}{
            "type": "read_only", "audit_required": true, "revocable": true,
        }
    default:
        return map[string]interface{}{
            "type": "none", "audit_required": false, "revocable": false,
        }
    }
}
```

```python
# Python: migrate previous_owner_access to access_policy
def migrate_access_policy(old: str) -> dict:
    mapping = {
        "none": {"type": "none", "audit_required": False, "revocable": False},
        "read_only_24h": {
            "type": "time_limited", "duration_hours": 24,
            "audit_required": True, "revocable": True,
        },
        "read_only": {"type": "read_only", "audit_required": True, "revocable": True},
    }
    return mapping.get(old, mapping["none"])
```

### 2. `MIN_SUPPORTED_VERSION` bumped to `2.4.0`

Consumers on v2.0.0–v2.3.0 will receive `CONTRACT_VERSION_MISMATCH` errors. All consumers must be at v2.4.0+ before deploying v3.0.0.

### 3. `CONTRACT_VERSION` bumped to `3.0.0`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('2.4.0');

// After
expect(CONTRACT_VERSION).toBe('3.0.0');
```

## New Schemas

| Schema | Import | Description |
|--------|--------|-------------|
| `AccessPolicy` | `AccessPolicySchema` | Structured access control for sealed conversations |

## New Validators

| Function | Description |
|----------|-------------|
| `validateAccessPolicy(policy)` | Cross-field validation: `time_limited` requires `duration_hours`, `role_based` requires `roles` |

## Cross-Field Validation

`validateSealingPolicy()` now chains `validateAccessPolicy()` when `access_policy` is present. Always use `validateSealingPolicy()` — it validates both the sealing policy and any embedded access policy.

```typescript
import { validateSealingPolicy } from '@0xhoneyjar/loa-hounfour';

const result = validateSealingPolicy(policy);
if (!result.valid) {
  console.error(result.errors); // Includes access_policy validation errors
}
```

## Key Notes

- **`access_policy` is optional** — sealing policies without it are valid
- **`access_policy.type` determines required fields**:
  - `time_limited` → `duration_hours` required (1–8760)
  - `role_based` → `roles` required (non-empty array)
  - `none`, `read_only` → no additional required fields
- **Transfer vectors updated** — all golden vectors now use `access_policy` instead of `previous_owner_access`

---

# Migration Guide: v1.1.0 → v2.0.0

## Breaking Changes

### 1. `CostBreakdown` replaced by `BillingEntry`

The inline `CostBreakdown` type has been removed. Cost tracking is now handled by
the multi-party `BillingEntry` schema with recipient-level allocation.

**Before (v1.1.0):**

```typescript
import { type InvokeResponse, type CostBreakdown } from '@0xhoneyjar/loa-hounfour';

const response: InvokeResponse = {
  // ...
  cost: {
    input_cost_micro: '1500',
    output_cost_micro: '3000',
    total_cost_micro: '4500',
  },
};
```

**After (v2.0.0):**

```typescript
import {
  type InvokeResponse,
  type BillingEntry,
  allocateRecipients,
  deriveIdempotencyKey,
} from '@0xhoneyjar/loa-hounfour';

// Step 1: Create BillingEntry with multi-party recipients
const entry: BillingEntry = {
  id: ulid(),                     // Canonical billing entry identifier (ULID)
  trace_id: traceId,              // Distributed tracing correlation (separate concern)
  tenant_id: tenantId,
  cost_type: 'model_inference',
  provider: 'anthropic',
  model: 'claude-opus-4-6',
  pool_id: 'opus-main',
  currency: 'USD',
  precision: 6,
  raw_cost_micro: '4500',
  multiplier_bps: 25000,          // 2.5x markup (basis points)
  total_cost_micro: '11250',
  rounding_policy: 'largest_remainder',
  recipients: allocateRecipients([
    { address: '0xProvider', role: 'provider', share_bps: 4000 },
    { address: '0xPlatform', role: 'platform', share_bps: 6000 },
  ], '11250'),
  idempotency_key: deriveIdempotencyKey(/* ... */),
  timestamp: new Date().toISOString(),
  contract_version: '2.0.0',
  usage: response.usage,
};

// Step 2: Response references the entry by id
const response: InvokeResponse = {
  // ...
  billing_entry_id: entry.id,     // References BillingEntry.id (ULID)
};
```

### 2. `InvokeResponse.cost` → `InvokeResponse.billing_entry_id`

The `cost` field on `InvokeResponse` has been replaced with `billing_entry_id`,
a string reference to a `BillingEntry.id` (ULID).

```typescript
// Before
const total = response.cost.total_cost_micro;

// After
const billingId = response.billing_entry_id; // Look up BillingEntry separately
```

### 3. `UsageReport.cost` → `UsageReport.billing_entry_id`

Same change applies to `UsageReport`.

```typescript
// Before
const report: UsageReport = { /* ... */ cost: breakdown };

// After
const report: UsageReport = { /* ... */ billing_entry_id: entry.id };
```

### 4. `CONTRACT_VERSION` bumped to `'2.0.0'`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('1.1.0');

// After
expect(CONTRACT_VERSION).toBe('2.0.0');
```

### 5. `MIN_SUPPORTED_VERSION` bumped to `'2.0.0'`

v1.x clients will receive `CONTRACT_VERSION_MISMATCH` errors.
Update all consumers before deploying v2.0.0.

## New Schemas

| Schema | Import | Description |
|--------|--------|-------------|
| `AgentDescriptor` | `AgentDescriptorSchema` | Canonical agent representation |
| `AgentLifecycleState` | `AgentLifecycleStateSchema` | 6-state lifecycle enum |
| `BillingEntry` | `BillingEntrySchema` | Multi-party billing with recipients |
| `CreditNote` | `CreditNoteSchema` | Billing reversal/refund |
| `Conversation` | `ConversationSchema` | NFT-owned conversation |
| `Message` | `MessageSchema` | Conversation message |
| `TransferSpec` | `TransferSpecSchema` | NFT ownership transfer spec |
| `TransferEventRecord` | `TransferEventSchema` | Transfer outcome record |
| `DomainEvent` | `DomainEventSchema` | Cross-cutting event envelope |

## New Utilities

| Function | Description |
|----------|-------------|
| `allocateRecipients(recipients, totalCostMicro)` | Deterministic largest-remainder allocation |
| `validateBillingRecipients(recipients, totalCostMicro)` | Validate recipient invariants |
| `parseNftId(id)` | Parse canonical NftId string |
| `formatNftId(chainId, collection, tokenId)` | Format canonical NftId with EIP-55 checksum |
| `checksumAddress(address)` | EIP-55 mixed-case checksum via Keccak-256 |
| `isValidTransition(from, to)` | Check agent lifecycle transition validity |
| `createTransitionValidator(transitions)` | Generic state machine factory |

## New Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent does not exist |
| `AGENT_NOT_ACTIVE` | 403 | Agent is not in ACTIVE state |
| `AGENT_TRANSFER_IN_PROGRESS` | 409 | Agent is currently being transferred |
| `CONVERSATION_SEALED` | 403 | Conversation is sealed (read-only) |
| `CONVERSATION_NOT_FOUND` | 404 | Conversation does not exist |
| `OWNERSHIP_MISMATCH` | 403 | Caller does not own the agent |
| `BILLING_RECIPIENTS_INVALID` | 400 | Recipient shares/amounts are invalid |

## Key Notes

- **`BillingEntry.id` is the canonical identifier** (ULID). `trace_id` is a separate
  field for distributed tracing correlation — do not conflate the two.
- **`allocateRecipients()` produces `amount_micro`** — callers provide `share_bps` only.
  Never manually compute `amount_micro`.
- **Zero total is valid**: `allocateRecipients(recipients, "0")` returns all recipients
  with `amount_micro: "0"`.
- **Tie-breaking is deterministic**: when two recipients have equal remainders, the one
  appearing first in the input array receives the extra micro-unit.
