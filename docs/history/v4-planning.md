<!-- docs-version: 7.0.0 -->

# v4.0.0 Planning Document

> Synthesizes all forward-looking suggestions from Bridgebuilder reviews (cycles 001–006)
> and aligns proposed changes with the [loa-finn product mission](https://github.com/0xHoneyJar/loa-finn/issues/66).

---

## Candidate Breaking Changes

### 1. Signed MicroUSD as Default

**Current**: `MicroUSD` is unsigned (`^[0-9]+$`). `MicroUSDSigned` was added in v3.2.0 as a separate type.

**Proposal**: In v4.0.0, make `MicroUSD` accept signed values by default. Rename the current unsigned type to `MicroUSDUnsigned` for cases that require non-negative enforcement.

| Field | v3.x Type | v4.0.0 Type |
|-------|-----------|-------------|
| `BillingEntry.raw_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `BillingEntry.total_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `CreditNote.amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `BillingRecipient.amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |

**Impact**: Low — existing unsigned values are valid signed values. Consumers using regex validation on `^[0-9]+$` will need updates.

**Migration**: `MicroUSD` pattern changes from `^[0-9]+$` to `^-?[0-9]+$`. No data migration required.

### 2. Schema `additionalProperties` Relaxation on Envelopes

**Current**: All schemas use `additionalProperties: false`.

**Proposal**: Relax to `true` on event envelope schemas only (see SCHEMA-EVOLUTION.md for analysis).

| Schema | v3.x | v4.0.0 |
|--------|------|--------|
| DomainEvent | `false` | `true` |
| DomainEventBatch | `false` | `true` |
| StreamEvent (all variants) | `false` | `true` |
| BillingEntry | `false` | `false` (unchanged) |
| CreditNote | `false` | `false` (unchanged) |
| All others | `false` | `false` (unchanged) |

**Impact**: Medium — consumers relying on strict rejection of unknown envelope fields will need adjustment. Financial and identity schemas remain strict.

**Migration**: Consumers using `DisallowUnknownFields` (Go) or `extra="forbid"` (Python) on event envelopes should switch to `extra="ignore"`.

### 3. New Aggregates from Product Roadmap

From [#66 P3](https://github.com/0xHoneyJar/loa-finn/issues/66):

#### SoulMemory Schema

Persistent agent memory and learned preferences. Enables the soul system referenced in the product mission.

```typescript
const SoulMemorySchema = Type.Object({
  agent_id: Type.String(),
  memory_type: Type.Union([
    Type.Literal('preference'),
    Type.Literal('learned_fact'),
    Type.Literal('interaction_pattern'),
    Type.Literal('emotional_context'),
  ]),
  content: Type.String(),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  source_conversation_id: Type.Optional(Type.String()),
  created_at: Type.String({ format: 'date-time' }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' })),
  contract_version: Type.String(),
}, { additionalProperties: false });
```

#### PersonalityEvolution Schema

Track personality trait changes over time. Supports the personality evolution system.

```typescript
const PersonalityEvolutionSchema = Type.Object({
  agent_id: Type.String(),
  trait: Type.String(),
  previous_value: Type.Number({ minimum: 0, maximum: 1 }),
  new_value: Type.Number({ minimum: 0, maximum: 1 }),
  trigger: Type.Union([
    Type.Literal('user_feedback'),
    Type.Literal('interaction_count'),
    Type.Literal('time_decay'),
    Type.Literal('manual_override'),
  ]),
  trigger_context: Type.Optional(Type.String()),
  occurred_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String(),
}, { additionalProperties: false });
```

#### InboxPrivacy Schema

Privacy controls for agent-to-agent messaging. Supports the inbox privacy feature.

```typescript
const InboxPrivacySchema = Type.Object({
  agent_id: Type.String(),
  policy: Type.Union([
    Type.Literal('open'),
    Type.Literal('contacts_only'),
    Type.Literal('owner_approved'),
    Type.Literal('closed'),
  ]),
  allowed_agents: Type.Optional(Type.Array(Type.String())),
  blocked_agents: Type.Optional(Type.Array(Type.String())),
  updated_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String(),
}, { additionalProperties: false });
```

### 4. `MIN_SUPPORTED_VERSION` Bump Strategy

**Current**: `MIN_SUPPORTED_VERSION = '2.4.0'`

**Proposal**: Bump to `3.0.0` in v4.0.0, dropping all v2.x support.

| Version Range | v3.x Support | v4.0.0 Support |
|---------------|-------------|----------------|
| v2.0.0–v2.3.0 | Rejected | Rejected |
| v2.4.0 | Supported | Rejected |
| v3.0.0+ | Supported | Supported |

**Rationale**: By the time v4.0.0 ships, all consumers should be on v3.x. The v2.x → v3.0.0 migration (AccessPolicy) is well-documented.

---

## Consumer Upgrade Matrix

| Consumer | Current Version | Required for v4.0.0 | Migration Effort |
|----------|----------------|---------------------|-----------------|
| **loa-finn** | v3.0.0 | v4.0.0 | Medium — new schemas, signed MicroUSD |
| **arrakis** | v3.0.0 | v4.0.0 | Low — envelope relaxation benefits arrakis |
| **mibera-freeside** | TBD | v4.0.0 | Low — new consumer, can start on v4.0.0 |

---

## Timeline Proposal

Aligned with [#66 §7 launch sequence](https://github.com/0xHoneyJar/loa-finn/issues/66):

| Phase | Milestone | Protocol Action |
|-------|-----------|----------------|
| **Pre-launch** | All P0 features in loa-finn | Ship v3.2.0 (current cycle) |
| **Launch** | Public release | Pin consumers at v3.2.0 |
| **Post-launch +1mo** | Stability confirmed | Begin v4.0.0-alpha development |
| **Post-launch +2mo** | Soul memory beta | Add SoulMemory schema (v4.0.0-alpha) |
| **Post-launch +3mo** | Personality evolution | Add PersonalityEvolution, InboxPrivacy schemas |
| **Post-launch +4mo** | v4.0.0-rc | All breaking changes applied, migration guide published |
| **Post-launch +5mo** | v4.0.0 release | Consumers upgrade, MIN_SUPPORTED bumped to 3.0.0 |

---

## Deferred from v4.0.0

These were considered but deferred to v5.0.0 or beyond:

| Feature | Reason for Deferral |
|---------|-------------------|
| GraphQL schema generation | Not enough consumer demand yet |
| Protocol Buffers alternative encoding | JSON-first approach sufficient for current scale |
| Schema versioning per-schema (instead of global) | Adds complexity without clear benefit at current adoption |
| WebSocket transport schemas | SSE is sufficient for current streaming needs |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Consumer upgrade fatigue | Medium | Medium | Clear migration guide, automated codemods |
| Soul memory schema instability | High | Medium | Ship as experimental (`x-experimental: true`) |
| Signed MicroUSD arithmetic bugs | Low | High | Property testing (fast-check) catches edge cases |
| Timeline slip vs product launch | Medium | High | v3.2.0 is launch-ready; v4.0.0 is post-launch |

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Signed MicroUSD as default | Stripe, Square, and every mature billing system uses signed amounts | 2026-02-14 |
| Selective envelope relaxation | Balances forward compat with security strictness | 2026-02-14 |
| Drop v2.x in v4.0.0 | 3 major versions of support window is generous | 2026-02-14 |
| New aggregates post-launch | Don't block launch on schema speculation | 2026-02-14 |
