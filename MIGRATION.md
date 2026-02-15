# Migration & Schema Evolution Guide

> Cross-version communication strategy for `@0xhoneyjar/loa-hounfour` consumers.

---

## Schema Evolution Strategy

### Version Support Policy

| Property | Value |
|----------|-------|
| **Current Version** | 4.4.0 |
| **Minimum Supported** | 3.0.0 |
| **N/N-1 Guarantee** | Consumers must accept current and previous minor version |
| **Major Mismatch** | 400 with `CONTRACT_VERSION_MISMATCH` error |
| **Minor Mismatch** | `X-Contract-Version-Warning` header |

### Consumer Upgrade Matrix

| Consumer | Producer 3.0.0 | Producer 4.0.0–4.4.0 |
|----------|----------------|----------------------|
| **2.0.0–2.4.0** | Fwd-compat* | **REJECTED** (below MIN_SUPPORTED_VERSION) |
| **3.0.0–3.2.0** | Full | Fwd-compat** |
| **4.0.0–4.4.0** | Full | Full |

\* Requires validate-then-strip for strict schemas. See below.

\*\* v4.0.0 makes MicroUSD signed by default and relaxes DomainEvent/DomainEventBatch envelopes to `additionalProperties: true`. A v3.x consumer with strict unsigned MicroUSD validation will reject signed amounts containing `-`. Consumers using `MicroUSD` must handle the signed pattern or migrate to `MicroUSDUnsigned`.

### Schema `additionalProperties` Policy

Every schema has an explicit policy for unknown properties. Strict schemas reject unknown fields — a v3.0.0 consumer with strict validation will reject v4.0.0 documents containing new fields.

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
| `SagaContext` | Saga tracking |
| `LifecycleTransitionPayload` | Lifecycle event data |
| `Capability` | Agent capability descriptor |
| `CapabilityResponse` | Response to capability query |
| `ProtocolDiscovery` | Discovery document |
| `AccessPolicy` | Access control configuration |
| `PerformanceRecord` | Performance tracking (v4.1.0) |
| `ContributionRecord` | Contribution assessment (v4.1.0) |
| `Sanction` | Governance sanctions (v4.2.0) |
| `DisputeRecord` | Dispute tracking (v4.2.0) |
| `ValidatedOutcome` | Validated outcomes (v4.2.0) |
| `ReputationScore` | Reputation scoring (v4.3.0) |
| `EscrowEntry` | Escrow state machine (v4.4.0) |
| `StakePosition` | Stake positions (v4.4.0, experimental) |
| `CommonsDividend` | Commons dividends (v4.4.0, experimental) |
| `MutualCredit` | Mutual credit lines (v4.4.0, experimental) |

#### Extensible Schemas (`additionalProperties: true`)

| Schema `$id` | Rationale |
|--------------|-----------|
| `CapabilityQuery` | Query extensibility — future parameters without schema changes |
| `DomainEvent` | Envelope relaxation (v4.0.0) — allows consumer-defined extensions |
| `DomainEventBatch` | Envelope relaxation (v4.0.0) — allows consumer-defined extensions |
| `StreamStart` | Stream event extensibility |
| `StreamChunk` | Stream event extensibility |
| `StreamToolCall` | Stream event extensibility |
| `StreamUsage` | Stream event extensibility |
| `StreamEnd` | Stream event extensibility |
| `StreamError` | Stream event extensibility |

#### Union Types (no object properties)

`AgentLifecycleState`, `CostType`, `TransferScenario`, `TransferResult`, `MessageRole`, `ConversationStatus` — string literal unions with no `additionalProperties` concern.

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

- **Forward**: v3.0.0 consumer CAN validate v4.x data IF it strips unknown fields and handles signed MicroUSD
- **Backward**: v4.x consumer CAN always validate v3.0.0 data (no required fields removed)
- **Breaking**: v4.0.0 changed MicroUSD default to signed and relaxed envelope `additionalProperties`

### Migration Checklist for New Versions

1. **New optional fields on strict schemas**: Document here and in SCHEMA-CHANGELOG
2. **New schemas**: No compatibility impact
3. **New vocabulary entries**: No impact — `isKnownEventType()` returns false for unknown types by design
4. **Deprecation**: Mark `deprecated: true` in TypeBox; remove only at major version boundary
5. **Required field addition**: MAJOR version bump required

---

# Migration Guide: v3.2.0 → v4.4.0

## Breaking Changes (v4.0.0)

### 1. Signed MicroUSD (Default)
- `MicroUSD` now allows negative values (pattern: `^-?[0-9]+$`)
- Use `MicroUSDUnsigned` for non-negative enforcement
- `MicroUSDSigned` is now an alias for `MicroUSD`

**Before (v3.2.0):**

```typescript
import { MicroUSD, MicroUSDSigned } from '@0xhoneyjar/loa-hounfour';

// MicroUSD was unsigned: ^[0-9]+$
// MicroUSDSigned was separate: ^-?[0-9]+$
```

**After (v4.0.0):**

```typescript
import { MicroUSD, MicroUSDUnsigned, MicroUSDSigned } from '@0xhoneyjar/loa-hounfour';

// MicroUSD is now signed: ^-?[0-9]+$
// MicroUSDUnsigned for non-negative only: ^[0-9]+$
// MicroUSDSigned is a deprecated alias for MicroUSD
```

**Migration**: Replace `MicroUSD` with `MicroUSDUnsigned` if your code must reject negative amounts.

### 2. Envelope Relaxation
- `DomainEventSchema` and `DomainEventBatchSchema` now allow `additionalProperties`
- All 6 `StreamEvent` sub-schemas allow `additionalProperties`:
  - `StreamStart`
  - `StreamChunk`
  - `StreamToolCall`
  - `StreamUsage`
  - `StreamEnd`
  - `StreamError`
- Existing strict consumers should strip unknown fields before validation

**Before (v3.2.0):**

```typescript
// DomainEventSchema had additionalProperties: false
// Unknown fields were rejected
```

**After (v4.0.0):**

```typescript
// DomainEventSchema has additionalProperties: true
// Unknown fields are preserved — strip before validation if needed
import { Value } from '@sinclair/typebox/value';
const cleaned = Value.Clean(DomainEventSchema, structuredClone(event));
```

### 3. New Aggregate Types
- 4 new aggregate types: `performance`, `governance`, `reputation`, `economy`
- Type guards:
  - `isPerformanceEvent()` — narrows to `PerformanceEvent`
  - `isGovernanceEvent()` — narrows to `GovernanceEvent`
  - `isReputationEvent()` — narrows to `ReputationEvent`
  - `isEconomyEvent()` — narrows to `EconomyEvent`

```typescript
import {
  isPerformanceEvent,
  isGovernanceEvent,
  isReputationEvent,
  isEconomyEvent,
  type DomainEvent,
} from '@0xhoneyjar/loa-hounfour';

function routeEvent(event: DomainEvent): void {
  if (isPerformanceEvent(event)) {
    // event.payload.performance_record_id is available
  } else if (isGovernanceEvent(event)) {
    // event.payload.governance_action_id is available
  } else if (isReputationEvent(event)) {
    // event.payload.agent_id is available
  } else if (isEconomyEvent(event)) {
    // event.payload.transaction_id is available
  }
}
```

### 4. Version Constants
- `CONTRACT_VERSION`: `'4.4.0'`
- `MIN_SUPPORTED_VERSION`: `'3.0.0'`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('3.2.0');

// After
expect(CONTRACT_VERSION).toBe('4.4.0');
```

## Additive Changes (v4.1.0 – v4.4.0)

### v4.1.0: Performance Tracking

| Schema | Import | Description |
|--------|--------|-------------|
| `PerformanceRecord` | `PerformanceRecordSchema` | Agent performance metrics record |
| `ContributionRecord` | `ContributionRecordSchema` | Contribution assessment for peer review |

### v4.2.0: Governance

| Schema | Import | Description |
|--------|--------|-------------|
| `Sanction` | `SanctionSchema` | Governance sanction against an agent |
| `DisputeRecord` | `DisputeRecordSchema` | Dispute filed against agent or outcome |
| `ValidatedOutcome` | `ValidatedOutcomeSchema` | Validated governance outcome |

New vocabulary:
- **Sanctions vocabulary** (`vocabulary/sanctions`):
  - `SANCTION_SEVERITY_LEVELS`: `warning`, `rate_limited`, `pool_restricted`, `suspended`, `terminated`
  - `VIOLATION_TYPES`: `content_policy`, `rate_abuse`, `billing_fraud`, `identity_spoofing`, `resource_exhaustion`, `community_guideline`, `safety_violation`
  - `ESCALATION_RULES`: Severity progression per violation type
- **6 sanction lifecycle reason codes** (`vocabulary/lifecycle-reasons`):
  - `sanction_warning_issued`
  - `sanction_rate_limited`
  - `sanction_pool_restricted`
  - `sanction_suspended`
  - `sanction_terminated`
  - `sanction_appealed_successfully`

### v4.3.0: Reputation

| Schema | Import | Description |
|--------|--------|-------------|
| `ReputationScore` | `ReputationScoreSchema` | Agent reputation score with decay |

New vocabulary:
- **Reputation vocabulary** (`vocabulary/reputation`): reputation scoring constants and decay parameters
- **`BillingRecipient` role extended**: `agent_performer` and `commons` roles added

### v4.4.0: Economy

| Schema | Import | Description |
|--------|--------|-------------|
| `EscrowEntry` | `EscrowEntrySchema` | Escrow with state machine (created, funded, released, refunded, expired) |
| `StakePosition` | `StakePositionSchema` | Staking positions with vesting (experimental) |
| `CommonsDividend` | `CommonsDividendSchema` | Commons fund dividend distribution (experimental) |
| `MutualCredit` | `MutualCreditSchema` | Mutual credit lines between agents (experimental) |

New vocabulary:
- **Economic choreography vocabulary** (`vocabulary/economic-choreography`): escrow lifecycle, staking, dividend, and credit flow choreographies

## New Error Codes

| Code | HTTP | Version | Description |
|------|------|---------|-------------|
| `ROUTING_CONSTRAINT_VIOLATED` | 403 | v4.0.0 | Routing constraint violated |
| `SANCTION_ACTIVE` | 403 | v4.2.0 | Active sanction blocks operation |
| `SANCTION_APPEAL_DENIED` | 403 | v4.2.0 | Sanction appeal was denied |
| `DISPUTE_NOT_FOUND` | 404 | v4.2.0 | Referenced dispute does not exist |
| `DISPUTE_ALREADY_RESOLVED` | 409 | v4.2.0 | Dispute has already been resolved |
| `REPUTATION_INSUFFICIENT` | 403 | v4.3.0 | Agent reputation below required threshold |
| `ESCROW_NOT_FOUND` | 404 | v4.4.0 | Referenced escrow entry does not exist |
| `ESCROW_INVALID_STATE` | 409 | v4.4.0 | Escrow is in wrong state for operation |
| `STAKE_INSUFFICIENT` | 403 | v4.4.0 | Insufficient stake for operation |
| `CREDIT_LIMIT_EXCEEDED` | 402 | v4.4.0 | Mutual credit limit exceeded |
| `CREDIT_LINE_NOT_FOUND` | 404 | v4.4.0 | Referenced credit line does not exist |
| `DIVIDEND_NOT_DECLARED` | 400 | v4.4.0 | No dividend declared for distribution |

## New Event Types

### Performance Aggregate (v4.1.0)

| Event Type | Description |
|------------|-------------|
| `performance.record.created` | Performance record created |
| `performance.record.validated` | Performance record validated by peer |
| `contribution.submitted` | Contribution submitted for assessment |
| `contribution.assessed` | Contribution assessment completed |

### Governance Aggregate (v4.2.0)

| Event Type | Description |
|------------|-------------|
| `sanction.imposed` | Sanction imposed on agent |
| `sanction.appealed` | Sanction appeal submitted |
| `sanction.lifted` | Sanction lifted or expired |
| `dispute.filed` | Dispute filed against agent or outcome |
| `dispute.resolved` | Dispute resolution completed |
| `governance.vote.started` | Governance vote initiated |
| `governance.vote.concluded` | Governance vote concluded |

### Reputation Aggregate (v4.3.0)

| Event Type | Description |
|------------|-------------|
| `reputation.score.calculated` | Reputation score recalculated |
| `reputation.score.decayed` | Reputation score decayed over time |
| `reputation.threshold.breached` | Reputation dropped below threshold |

### Economy Aggregate (v4.4.0)

| Event Type | Description |
|------------|-------------|
| `economy.escrow.created` | Escrow entry created |
| `economy.escrow.funded` | Escrow entry funded |
| `economy.escrow.released` | Escrow funds released to payee |
| `economy.escrow.refunded` | Escrow funds refunded to payer |
| `economy.escrow.expired` | Escrow expired without release |
| `economy.stake.created` | Stake position created |
| `economy.stake.slashed` | Stake position slashed |
| `economy.stake.vested` | Stake vesting milestone reached |
| `economy.stake.withdrawn` | Stake position withdrawn |
| `economy.dividend.declared` | Commons dividend declared |
| `economy.dividend.distributed` | Commons dividend distributed |
| `economy.credit.extended` | Mutual credit line extended |
| `economy.credit.settled` | Mutual credit settled |

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
