# Schema Evolution Strategy

> Trade-offs and recommended patterns for evolving `@0xhoneyjar/loa-hounfour` schemas
> across major, minor, and patch version boundaries.

---

## The `additionalProperties: false` Trade-off

### Why We Use Strict Schemas

Every protocol schema in loa-hounfour sets `additionalProperties: false`. This is a deliberate choice:

| Benefit | Description |
|---------|-------------|
| **Type safety** | Consumers get compile-time guarantees — no surprise fields |
| **Security** | Financial schemas (BillingEntry, CreditNote) reject payload injection |
| **Debuggability** | Typos in field names cause validation errors, not silent data loss |
| **API contracts** | Both sides agree on the exact shape — no ambiguity |

### The Cost: Forward Compatibility

When a v3.1.0 producer adds a new optional field `execution_mode` to `StreamStart`, a v3.0.0 consumer with strict validation **rejects** the message. This is the N/N-1 forward compatibility problem.

```
Producer v3.1.0 → { type: "start", execution_mode: "native", ... }
Consumer v3.0.0 → ❌ REJECTED (unknown field "execution_mode")
```

### The Alternative: Permissive Envelopes

Some protocols (Kafka, CloudEvents) use `additionalProperties: true` on envelope schemas while keeping strict validation on payload schemas. This allows envelope evolution without consumer breakage.

**We do NOT do this.** Our position: strict everywhere, with consumer-side patterns to handle version skew.

---

## Consumer Patterns for Version Skew

### Pattern 1: Strip Then Validate (Recommended)

Remove unknown fields before validation. Safe for all consumers.

#### TypeScript

```typescript
import { Value } from '@sinclair/typebox/value';
import { validate, StreamEventSchema } from '@0xhoneyjar/loa-hounfour';

function validateForward<T extends TSchema>(schema: T, data: unknown): Static<T> {
  // Value.Clean removes properties not defined in the schema
  const cleaned = Value.Clean(schema, structuredClone(data));
  const result = validate(schema, cleaned);
  if (!result.valid) throw new Error(result.errors.join(', '));
  return cleaned as Static<T>;
}
```

#### Go

```go
func validateAndStrip(data []byte, knownFields []string) (map[string]interface{}, error) {
    var raw map[string]interface{}
    if err := json.Unmarshal(data, &raw); err != nil {
        return nil, err
    }

    stripped := make(map[string]interface{})
    for _, k := range knownFields {
        if v, ok := raw[k]; ok {
            stripped[k] = v
        }
    }

    return stripped, validateSchema(stripped)
}
```

#### Python

```python
from pydantic import BaseModel, ConfigDict

class StreamEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Strip unknown fields silently
    type: str
    # ... known fields
```

### Pattern 2: Version-Gated Validation

Use different schemas based on the `contract_version` field.

```typescript
import { parseSemver } from '@0xhoneyjar/loa-hounfour';

function selectSchema(contractVersion: string) {
  const { major, minor } = parseSemver(contractVersion);
  if (major >= 3 && minor >= 1) return StreamEventSchemaV31;
  return StreamEventSchemaV30;
}
```

### Pattern 3: Permissive Envelope, Strict Payload

For consumers that want maximum forward compatibility on envelopes but strict payloads:

```typescript
// Custom schema that allows additional properties on the envelope
const PermissiveStreamEvent = Type.Object({
  ...StreamEventSchema.properties,
}, { additionalProperties: true }); // Override for envelope only
```

**Warning**: This loses the typo-detection benefit. Use Pattern 1 instead.

---

## Versioned Schema Resolution

### Current Behavior

```
contract_version in message → consumer checks MIN_SUPPORTED_VERSION
  → If major mismatch: 400 CONTRACT_VERSION_MISMATCH
  → If minor mismatch: X-Contract-Version-Warning header
  → If within range: validate with consumer's schema
```

### Recommended: Schema Registry Lookup

For multi-version deployments, consumers can fetch the exact schema version:

```typescript
const schemaUrl = `https://schemas.0xhoneyjar.com/loa-hounfour/${contractVersion}/billing-entry`;
const schema = await fetch(schemaUrl).then(r => r.json());
```

This allows a consumer to validate v3.0.0 and v3.1.0 messages with the correct schema.

---

## The `Type.Intersect` Metadata Escape Hatch

TypeBox `Type.Intersect` allows adding metadata fields without violating `additionalProperties: false`:

```typescript
// Base schema (strict)
const BillingEntry = Type.Object({
  id: Type.String(),
  total_cost_micro: MicroUSD,
  // ... protocol fields
}, { additionalProperties: false });

// Consumer extension (adds fields without breaking validation)
const BillingEntryWithMetadata = Type.Intersect([
  BillingEntry,
  Type.Object({
    _internal_trace: Type.Optional(Type.String()),
    _processed_at: Type.Optional(Type.String()),
  }),
]);
```

**Caveat**: `Type.Intersect` with `additionalProperties: false` on both sides produces a schema that rejects all additional properties across both objects. The consumer extension must use `additionalProperties: true` or omit it.

---

## Compatibility Window Policy

| Policy | Value |
|--------|-------|
| **Support window** | N and N-1 minor versions |
| **MIN_SUPPORTED_VERSION** | Bumped at major boundaries |
| **Deprecation cycle** | Mark deprecated → 1 minor version → remove at next major |
| **New optional fields** | Minor version bump, documented in SCHEMA-CHANGELOG |
| **New required fields** | Major version bump only |
| **Field removal** | Major version bump only, with migration guide |

### v4.0.0 Decision: Selective Relaxation

For v4.0.0, we recommend selectively relaxing `additionalProperties` on **envelope schemas only**:

| Schema Category | v3.x | v4.0.0 (Proposed) |
|----------------|------|---------------------|
| Event envelopes (DomainEvent, StreamEvent) | `false` | `true` — allows payload extension |
| Financial schemas (BillingEntry, CreditNote) | `false` | `false` — security critical |
| Identity schemas (AgentDescriptor, NftId) | `false` | `false` — security critical |
| Transfer schemas (TransferSpec) | `false` | `false` — ownership critical |
| Query schemas (CapabilityQuery) | `true` | `true` — already extensible |

This hybrid approach gives event consumers forward compatibility while maintaining strict validation where security matters most.

---

## Summary

1. **Strict schemas are correct for this protocol** — financial and identity data cannot be permissive
2. **Consumer-side strip-then-validate** is the recommended forward compatibility pattern
3. **v4.0.0 may relax envelopes** — but only after measuring adoption friction
4. **Always document new fields** in SCHEMA-CHANGELOG.md and MIGRATION.md
