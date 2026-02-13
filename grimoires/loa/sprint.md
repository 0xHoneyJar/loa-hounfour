# Sprint Plan: Post-Flatline Deep Excellence v2.2.0

**Cycle:** cycle-003 — Post-Flatline Deep Excellence
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Source:** [PR #1 Bridgebuilder Review — BB-V3](https://github.com/0xHoneyJar/loa-hounfour/pull/1)
**Findings:** BB-V3-001 through BB-V3-013 (13 actionable from 18 total)
**Created:** 2026-02-13

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 3 |
| **Total tasks** | 15 |
| **Scope** | v2.2.0 — Post-flatline deep excellence from Bridgebuilder architectural examination |
| **Team** | 1 AI agent |
| **Operator** | Single-operator autonomous (via `/run sprint-plan` or `/run-bridge`) |
| **Quality gates** | Review + Audit per sprint |
| **Version bump** | v2.1.0 → v2.2.0 (MINOR — new optional fields, new schemas, vocabulary additions, no breaking changes) |

### Philosophy

> *"A flatline doesn't mean there's nothing left to find. It means the current review methodology has exhausted its ability to find things at the current depth of inquiry."*

Cycle-001 built the bridge (v2.0.0, severity 47). Cycle-002 made it beautiful (v2.1.0, severity 0). Cycle-003 makes it *endure* — addressing the deeper structural questions that only surface when you ask "will this protocol survive its first 10 consumers across 3 languages and 5 model providers?"

The BB-V3 review changed the lens from "does this code work correctly?" to "what happens when this becomes infrastructure?" Every finding in this cycle addresses a class of problem that mature protocols (gRPC, CloudEvents, OpenTelemetry) discovered through years of production exposure. We have the opportunity to address them before production.

### Sprint Sequencing

```
Sprint 1: Protocol Safety — Trust Boundaries & Correctness    ── 1 session
  BB-V3-007: Fix req-hash comment-code divergence
  BB-V3-001: Metadata namespace conventions
  BB-V3-002: Runtime payload validation for typed wrappers
  BB-V3-003: Constrain validator API
  BB-V3-008: Cross-field validation in JSON Schema
    ↓
Sprint 2: Schema Evolution — Vocabulary & Structured Events    ── 1 session
  BB-V3-004: Deprecation mechanism
  BB-V3-009: Structured reason codes on lifecycle events
  BB-V3-011: Event type vocabulary registry
  BB-V3-010: Batch envelope context
  BB-V3-012: Saga compensation protocol
    ↓
Sprint 3: Interoperability, Vectors & Distribution             ── 1-2 sessions
  BB-V3-013: New vector categories (compatibility, invariants, edge-cases)
  BB-V3-013: Vectors README (design philosophy)
  BB-V3-005: Capability negotiation schema
  BB-V3-006: Schema discovery convention
  Version bump: v2.1.0 → v2.2.0
```

**Version bump happens at the end of Sprint 3** after all changes land.

---

## Sprint 1: Protocol Safety — Trust Boundaries & Correctness

**Goal:** Harden the protocol's trust boundaries. Fix documentation-code divergence, establish metadata governance, add runtime payload validation, constrain the validator API, and express cross-field invariants in JSON Schema.

**Dependencies:** None (builds on v2.1.0 foundation)

**Findings addressed:** BB-V3-001, BB-V3-002, BB-V3-003, BB-V3-007, BB-V3-008

### Tasks

#### S1-T1: Fix req-hash `parseEncodings` Comment-Code Divergence

**Finding:** BB-V3-007 (Medium)
**File:** `src/integrity/req-hash.ts`

**Description:** The `parseEncodings` function correctly implements RFC 9110 §8.4 decompression ordering — it reverses the header-listed encodings so the caller processes outermost-first. But both the JSDoc example (lines 71-76) and the inline comment (lines 104-106) describe the *opposite* order. The code is correct; the comments are wrong.

> **FAANG Parallel:** Mozilla's NSS library had a similar comment-code divergence in its TLS handshake state machine that persisted for three years. The code was correct, the comments described a different protocol version.

**Implementation details:**
- Fix the JSDoc example at lines 71-76:
  ```
  Before: parseEncodings("gzip, br") → ["gzip", "br"]
  After:  parseEncodings("gzip, br") → ["br", "gzip"]
  ```
  ```
  Before: Step 1: gunzip the wire bytes / Step 2: brotli-decompress
  After:  Step 1: brotli-decompress (outermost) / Step 2: gunzip (innermost)
  ```
- Fix the inline comment at lines 104-106:
  ```
  Before: // "gzip, br" → ["gzip", "br"] (gunzip first, then brotli).
  After:  // "gzip, br" → reversed to ["br", "gzip"] (brotli first, then gunzip).
  ```

**Acceptance criteria:**
- [ ] JSDoc example shows correct return value `["br", "gzip"]` for input `"gzip, br"`
- [ ] JSDoc steps describe correct decompression order (outermost first)
- [ ] Inline comment matches actual `.reverse()` behavior
- [ ] No runtime changes — documentation fix only
- [ ] Existing req-hash tests still pass

**Testing:** Existing tests validate behavior. This is a comment fix.

---

#### S1-T2: Metadata Namespace Conventions

**Finding:** BB-V3-001 (Medium)
**Files:** `src/schemas/domain-event.ts`, `src/schemas/billing-entry.ts`, `src/schemas/invoke-response.ts`

**Description:** The `metadata` field added in v2.1.0 is a pressure relief valve for `additionalProperties: false`. But without namespace conventions, it risks becoming a shadow schema — consumers silently establishing implicit contracts via metadata keys.

> **FAANG Parallel:** Google's FieldMask became the most contentious type in their infrastructure because every team used it differently. CloudEvents uses `ce-` prefix. OpenTelemetry uses `otel.` prefix.

**Implementation details:**
- Update the `metadata` field description on all three envelope schemas:
  ```typescript
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
    description: 'Consumer-extensible metadata. Namespace conventions: '
      + 'loa.* reserved for protocol-level metadata, '
      + 'trace.* for OpenTelemetry-compatible observability, '
      + 'x-* for consumer-defined extensions. '
      + 'Not validated by protocol contract.',
  })),
  ```
- Create `src/vocabulary/metadata.ts` exporting the namespace constants:
  ```typescript
  export const METADATA_NAMESPACES = {
    PROTOCOL: 'loa.',
    TRACE: 'trace.',
    CONSUMER: 'x-',
  } as const;
  ```
- Add to barrel exports in `src/index.ts`

**Acceptance criteria:**
- [ ] All three metadata descriptions include namespace conventions
- [ ] `vocabulary/metadata.ts` exports namespace constants
- [ ] Constants exported from barrel `index.ts`
- [ ] JSON Schema output includes updated descriptions
- [ ] No runtime validation of namespaces (conventions, not enforcement)

**Testing:** 2 new vectors — event with `loa.*` metadata key, event with `x-*` metadata key (both valid)

---

#### S1-T3: Runtime Payload Validation for Typed Event Wrappers

**Finding:** BB-V3-002 (Medium)
**Files:** `src/schemas/domain-event.ts`, `src/validators/index.ts`

**Description:** The typed wrappers (`AgentEvent`, `BillingEvent`, etc.) provide compile-time safety but no runtime enforcement. A service receiving a `DomainEvent` with `aggregate_type: "billing"` can cast to `BillingEvent` and access `event.payload.billing_entry_id` — but if the producer omitted that field, the cast silently returns `undefined` where the type says `string`.

> **FAANG Parallel:** Stripe's webhook SDK evolved to include runtime payload validation after discovering that producers occasionally sent events with malformed payloads due to version skew.

**Implementation details:**
- Create minimal payload schemas for each typed wrapper (with `additionalProperties: true` to preserve extensibility):
  ```typescript
  export const AgentEventPayloadSchema = Type.Object({
    agent_id: Type.String({ minLength: 1 }),
  }, { $id: 'AgentEventPayload', additionalProperties: true });

  export const BillingEventPayloadSchema = Type.Object({
    billing_entry_id: Type.String({ minLength: 1 }),
  }, { $id: 'BillingEventPayload', additionalProperties: true });

  export const ConversationEventPayloadSchema = Type.Object({
    conversation_id: Type.String({ minLength: 1 }),
  }, { $id: 'ConversationEventPayload', additionalProperties: true });

  export const TransferEventPayloadSchema = Type.Object({
    transfer_id: Type.String({ minLength: 1 }),
    from_owner: Type.String({ minLength: 1 }),
    to_owner: Type.String({ minLength: 1 }),
  }, { $id: 'TransferEventPayload', additionalProperties: true });
  ```
- Create type guard functions:
  ```typescript
  export function isAgentEvent(event: DomainEvent): event is AgentEvent {
    return event.aggregate_type === 'agent'
      && validate(AgentEventPayloadSchema, event.payload).valid;
  }
  ```
- Export from barrel and add to validators

**Acceptance criteria:**
- [ ] Payload schemas validate minimum contract for each typed wrapper
- [ ] `additionalProperties: true` on payload schemas preserves extensibility
- [ ] Type guard functions narrow correctly (compile-time and runtime)
- [ ] Guards return `false` for mismatched aggregate_type or missing payload fields
- [ ] Exported from barrel exports

**Testing:** 6 new vectors — valid agent event, valid billing event, agent event with missing agent_id (rejected by guard), billing event with extra payload fields (accepted)

---

#### S1-T4: Constrain Validator API to Protocol Schemas

**Finding:** BB-V3-003 (Low)
**File:** `src/validators/index.ts`

**Description:** The `validate()` function accepts any `TSchema`, but the cache (`Map<string, TypeCheck<TSchema>>`) grows without bound if arbitrary schemas are passed. For a protocol package, the schemas ARE the protocol — validation against non-protocol schemas is out of scope.

> **FAANG Parallel:** V8's hidden class transition cache had no eviction policy in early versions, causing memory issues in long-running services with dynamic property shapes.

**Implementation details:**
- Add a `validateProtocol()` function that only accepts known protocol schemas via the `validators` object
- Keep `validate()` public but add a JSDoc warning:
  ```typescript
  /**
   * Validate data against any TypeBox schema.
   *
   * @remarks For protocol schemas, prefer using the `validators` object
   * which provides pre-defined, cached validators for all protocol types.
   * This function creates and caches compiled validators for any schema,
   * which is suitable for a bounded set of schemas but not for
   * dynamically-generated schemas in long-running processes.
   */
  ```
- No runtime behavioral change — this is API documentation and guidance

**Acceptance criteria:**
- [ ] `validate()` has JSDoc warning about cache behavior
- [ ] `validators` object remains the recommended API for protocol validation
- [ ] No runtime changes
- [ ] Existing tests pass unchanged

**Testing:** No new tests (documentation/guidance only)

---

#### S1-T5: Cross-Field Validation in JSON Schema Output

**Finding:** BB-V3-008 (Medium)
**Files:** `src/schemas/conversation.ts`, `scripts/generate-schemas.ts`

**Description:** `validateSealingPolicy()` enforces cross-field invariants (encryption requires key_derivation and key_reference), but the generated JSON Schema doesn't indicate these constraints exist. Go and Python consumers see the fields as independent and may produce invalid combinations.

> **Research Parallel:** JSON Schema 2020-12 supports `if/then/else` and `dependentRequired` for conditional validation.

**Implementation details:**
- Add `$comment` to `ConversationSealingPolicySchema` documenting the cross-field invariant:
  ```typescript
  $comment: 'Cross-field invariant: when encryption_scheme !== "none", '
    + 'key_derivation must be non-"none" and key_reference must be provided. '
    + 'Enforced by validateSealingPolicy() in TypeScript. '
    + 'Cross-language consumers should implement equivalent validation.',
  ```
- In the generated JSON Schema, add `dependentRequired` to express the constraint:
  ```json
  "dependentRequired": {
    "encryption_scheme": ["key_derivation"]
  }
  ```
- Update `generate-schemas.ts` to inject the `if/then` conditional validation block into the sealing policy schema output:
  ```json
  "if": {
    "properties": { "encryption_scheme": { "not": { "const": "none" } } },
    "required": ["encryption_scheme"]
  },
  "then": {
    "required": ["key_reference"],
    "properties": {
      "key_derivation": { "not": { "const": "none" } }
    }
  }
  ```
- Add sealing policy vectors to the cross-language runners

**Acceptance criteria:**
- [ ] Generated JSON Schema for ConversationSealingPolicy includes `$comment` documenting the invariant
- [ ] `if/then` block in generated schema rejects `encryption_scheme: "aes-256-gcm"` with `key_derivation: "none"`
- [ ] Go and Python vector runners can validate the cross-field constraint natively
- [ ] TypeScript `validateSealingPolicy()` behavior unchanged
- [ ] New invalid vectors: encryption with no key_derivation, encryption with no key_reference

**Testing:** 3 new vectors — valid encryption config, encryption with missing key_derivation (invalid), encryption with missing key_reference (invalid)

---

### Sprint 1 Summary

| Task | Finding | Category | Files | Depends On |
|------|---------|----------|-------|------------|
| S1-T1 | BB-V3-007 | Correctness | req-hash.ts | None |
| S1-T2 | BB-V3-001 | Architecture | domain-event.ts, billing-entry.ts, invoke-response.ts, vocabulary/metadata.ts | None |
| S1-T3 | BB-V3-002 | Security | domain-event.ts, validators/index.ts | None |
| S1-T4 | BB-V3-003 | Architecture | validators/index.ts | None |
| S1-T5 | BB-V3-008 | Interop | conversation.ts, generate-schemas.ts | None |

---

## Sprint 2: Schema Evolution — Vocabulary & Structured Events

**Goal:** Establish schema evolution mechanisms and build the vocabulary layer. Add deprecation conventions, structured reason codes, event type registry, batch routing context, and saga compensation protocol.

**Dependencies:** Sprint 1 (metadata namespace conventions inform vocabulary design)

**Findings addressed:** BB-V3-004, BB-V3-009, BB-V3-010, BB-V3-011, BB-V3-012

### Tasks

#### S2-T1: Schema Field Deprecation Convention

**Finding:** BB-V3-004 (Medium)
**Files:** `src/schemas/conversation.ts` (exemplar), documentation

**Description:** When v3.0.0 needs to remove a field, there is currently no deprecation mechanism. Protobuf has `reserved` and `[deprecated = true]`. TypeBox supports `deprecated: true` which flows through to JSON Schema output.

> **FAANG Parallel:** Protobuf's field lifecycle — adding `[deprecated = true]` generates compiler warnings without breaking consumers. Removal uses `reserved` to prevent field number reuse.

**Implementation details:**
- Establish the convention by marking `previous_owner_access` as a deprecation exemplar:
  ```typescript
  previous_owner_access: Type.Union([
    Type.Literal('none'),
    Type.Literal('read_only_24h'),
  ], {
    deprecated: true,
    description: 'Deprecated in v2.2.0. Will be replaced by a richer access_policy in v3.0.0. '
      + 'Consumers should treat this field as informational only.',
  }),
  ```
- Document the deprecation convention in `SCHEMA-CHANGELOG.md`:
  - Fields marked `deprecated: true` appear in JSON Schema with `"deprecated": true`
  - IDE tooltips show the deprecation notice
  - Fields remain in the schema for N/N-1 backward compatibility
  - Removal happens only at major version boundaries
- Note: `previous_owner_access` is chosen as the exemplar because it was flagged in the review as a likely candidate for evolution. If this field should NOT be deprecated yet, choose a different exemplar or create a `_deprecated_example` field for demonstration only.

**Acceptance criteria:**
- [ ] At least one field marked with `deprecated: true` in TypeBox
- [ ] Generated JSON Schema includes `"deprecated": true` on that field
- [ ] `SCHEMA-CHANGELOG.md` documents the deprecation convention
- [ ] Convention documented with clear lifecycle: add deprecated → warn → remove at major

**Testing:** 1 vector — document with deprecated field still validates (backward-compatible)

---

#### S2-T2: Structured Reason Codes on Lifecycle Events

**Finding:** BB-V3-009 (Medium)
**File:** `src/schemas/lifecycle-event-payload.ts`, new: `src/vocabulary/lifecycle-reasons.ts`

**Description:** The `reason` field on `LifecycleTransitionPayloadSchema` is freeform (`Type.String`). Kubernetes evolved to separate `reason` (machine-readable) from `message` (human-readable) because production monitoring requires filterable reason codes.

> **FAANG Parallel:** Kubernetes PodCondition uses PascalCase reason codes (OOMKilled, Evicted, ContainersNotReady) that dashboards filter by, plus freeform message text for humans.

**Implementation details:**
- Create `src/vocabulary/lifecycle-reasons.ts`:
  ```typescript
  export const LIFECYCLE_REASON_CODES = {
    owner_requested: 'Owner explicitly requested state change',
    budget_exhausted: 'Agent budget limit reached',
    inactivity_timeout: 'No activity within configured timeout',
    transfer_initiated: 'NFT ownership transfer in progress',
    transfer_completed: 'NFT ownership transfer completed',
    admin_action: 'Administrative action by platform operator',
    provisioning_complete: 'Agent provisioning finished successfully',
    provisioning_failed: 'Agent provisioning encountered an error',
    policy_violation: 'Agent violated platform policy',
    system_maintenance: 'Scheduled system maintenance',
  } as const;
  export type LifecycleReasonCode = keyof typeof LIFECYCLE_REASON_CODES;
  ```
- Update `LifecycleTransitionPayloadSchema`:
  - Rename `reason` → keep as-is but add `reason_code` alongside it:
    ```typescript
    reason: Type.String({ minLength: 1, description: 'Human-readable reason for transition' }),
    reason_code: Type.Optional(Type.Union(
      Object.keys(LIFECYCLE_REASON_CODES).map(k => Type.Literal(k)),
      { description: 'Machine-readable reason code for filtering and monitoring' }
    )),
    ```
  - `reason_code` is Optional for backward compatibility (v2.1.0 events won't have it)
  - `reason` remains required (always provide human context)
- Export from barrel

**Acceptance criteria:**
- [ ] `LIFECYCLE_REASON_CODES` vocabulary exported with 10+ canonical codes
- [ ] `reason_code` optional field added to LifecycleTransitionPayload
- [ ] `reason` remains required (backward-compatible)
- [ ] JSON Schema includes enum constraint for reason_code
- [ ] Existing lifecycle vectors still pass (reason_code is optional)

**Testing:** 3 new vectors — transition with reason_code, transition without reason_code (backward compat), transition with invalid reason_code (rejected)

---

#### S2-T3: Canonical Event Type Vocabulary Registry

**Finding:** BB-V3-011 (Medium)
**File:** New: `src/vocabulary/event-types.ts`

**Description:** The `DomainEvent.type` pattern constrains format but not vocabulary. In multi-model systems, one model might emit `agent.lifecycle.transitioned` while another emits `agent.state.changed` — both valid, both describing the same event. A canonical registry prevents divergence.

> **Research Parallel:** HTTP status codes are a vocabulary. Without a registry, every server would invent their own codes. The IANA HTTP Status Code Registry ensures 404 means "Not Found" everywhere.

**Implementation details:**
- Create `src/vocabulary/event-types.ts`:
  ```typescript
  export const EVENT_TYPES = {
    // Agent aggregate
    'agent.lifecycle.transitioned': 'Agent lifecycle state changed',
    'agent.descriptor.updated': 'Agent descriptor modified',
    'agent.descriptor.created': 'Agent descriptor first created',

    // Billing aggregate
    'billing.entry.created': 'New billing entry recorded',
    'billing.entry.voided': 'Billing entry voided',
    'billing.credit.issued': 'Credit note issued against billing entry',

    // Conversation aggregate
    'conversation.thread.created': 'New conversation thread created',
    'conversation.thread.sealed': 'Conversation sealed during transfer',
    'conversation.status.changed': 'Conversation status updated',
    'conversation.message.added': 'Message added to conversation',

    // Transfer aggregate
    'transfer.spec.created': 'Transfer initiated',
    'transfer.spec.completed': 'Transfer completed successfully',
    'transfer.spec.failed': 'Transfer failed',
    'transfer.spec.rolled_back': 'Transfer rolled back after failure',

    // Tool aggregate
    'tool.call.started': 'Tool call execution started',
    'tool.call.completed': 'Tool call execution completed',
    'tool.call.failed': 'Tool call execution failed',
  } as const;

  export type EventType = keyof typeof EVENT_TYPES;

  export function isKnownEventType(type: string): type is EventType {
    return type in EVENT_TYPES;
  }
  ```
- Export from barrel
- Update AsyncAPI spec to reference event types

**Acceptance criteria:**
- [ ] `EVENT_TYPES` registry covers all 6 aggregate types
- [ ] Type guard function `isKnownEventType()` exported
- [ ] Event type descriptions are human-readable
- [ ] Exported from barrel exports
- [ ] Golden vectors use only registered event types

**Testing:** 2 new vectors — event with registered type (valid), verify existing vectors use registered types

---

#### S2-T4: DomainEventBatch Envelope Context

**Finding:** BB-V3-010 (Low)
**File:** `src/schemas/domain-event.ts`

**Description:** `DomainEventBatch` has `batch_id` and `correlation_id` but no transfer-level routing context. Consumers that route batches by transfer must inspect every payload — O(n) vs O(1) per message.

> **Metaphor:** A shipping container labeled with its tracking number but not which purchase order it belongs to. The warehouse must open it and read every packing slip.

**Implementation details:**
- Add an optional `context` field to `DomainEventBatchSchema`:
  ```typescript
  context: Type.Optional(Type.Object({
    transfer_id: Type.Optional(Type.String({ description: 'Associated transfer ID' })),
    aggregate_id: Type.Optional(Type.String({ description: 'Primary aggregate this batch concerns' })),
    aggregate_type: Type.Optional(AggregateTypeSchema),
  }, {
    additionalProperties: true,
    description: 'Envelope-level routing context (avoids payload inspection)',
  })),
  ```
- `additionalProperties: true` on the context object allows future fields without schema changes

**Acceptance criteria:**
- [ ] `context` optional field added to DomainEventBatch
- [ ] Batch without context still validates (backward-compatible)
- [ ] Batch with transfer context validates
- [ ] Context fields are all optional (no specific context is required)
- [ ] JSON Schema generated correctly

**Testing:** 2 new vectors — batch with transfer context, batch without context (backward compat)

---

#### S2-T5: Transfer Saga Compensation Protocol

**Finding:** BB-V3-012 (Medium)
**File:** `src/schemas/domain-event.ts`

**Description:** The transfer operation is a distributed saga. `DomainEventBatch` handles the forward path. But there's no protocol-level distinction between forward events and compensation (rollback) events. When a transfer partially fails, consumers need to know if a batch is undoing previous work.

> **FAANG Parallel:** Uber's Temporal tags every event with its position in the workflow execution — enabling replay and compensation without external state.

**Implementation details:**
- Add an optional `saga` field to `DomainEventBatchSchema`:
  ```typescript
  saga: Type.Optional(Type.Object({
    saga_id: Type.String({ minLength: 1, description: 'Saga/workflow execution ID' }),
    step: Type.Integer({ minimum: 1, description: 'Step number within the saga' }),
    total_steps: Type.Optional(Type.Integer({ minimum: 1, description: 'Total expected steps (if known)' })),
    direction: Type.Union([
      Type.Literal('forward'),
      Type.Literal('compensation'),
    ], { description: 'Whether this batch progresses or compensates the saga' }),
  }, {
    $id: 'SagaContext',
    additionalProperties: false,
    description: 'Saga execution context for multi-step distributed operations',
  })),
  ```
- Export `SagaContext` type from barrel

**Acceptance criteria:**
- [ ] `saga` optional field added to DomainEventBatch
- [ ] Batch without saga still validates (backward-compatible)
- [ ] Forward saga batch validates
- [ ] Compensation saga batch validates
- [ ] `SagaContext` type exported

**Testing:** 3 new vectors — batch with forward saga, batch with compensation saga, batch without saga

---

### Sprint 2 Summary

| Task | Finding | Category | Files | Depends On |
|------|---------|----------|-------|------------|
| S2-T1 | BB-V3-004 | Evolution | conversation.ts, SCHEMA-CHANGELOG.md | None |
| S2-T2 | BB-V3-009 | Architecture | lifecycle-event-payload.ts, vocabulary/lifecycle-reasons.ts | None |
| S2-T3 | BB-V3-011 | Vocabulary | vocabulary/event-types.ts | None |
| S2-T4 | BB-V3-010 | Architecture | domain-event.ts | None |
| S2-T5 | BB-V3-012 | Architecture | domain-event.ts | S2-T4 |

---

## Sprint 3: Interoperability, Vectors & Distribution

**Goal:** Expand the test vector taxonomy to cover compatibility, semantic invariants, and edge cases. Add capability negotiation schema for multi-model collaboration. Establish schema discovery convention. Bump version to v2.2.0.

**Dependencies:** Sprint 1 + Sprint 2 (new schemas and fields need vectors and version bump)

**Findings addressed:** BB-V3-005, BB-V3-006, BB-V3-013

### Tasks

#### S3-T1: Compatibility Test Vectors

**Finding:** BB-V3-013 (Medium — part 1)
**Files:** New: `vectors/compatibility/`

**Description:** No vectors test cross-version compatibility. A v2.0.0 consumer receiving a v2.2.0 event with `metadata`, `reason_code`, `saga`, and `context` fields will reject it (due to `additionalProperties: false` on the v2.0.0 schema). This is the intended behavior, but it should be explicitly tested.

**Implementation details:**
- Create `vectors/compatibility/cross-version.json`:
  - v2.1.0 event consumed by v2.0.0 schema (fails — metadata field unknown)
  - v2.0.0 event consumed by v2.2.0 schema (passes — all new fields optional)
  - v2.2.0 batch consumed by v2.1.0 schema (fails — context/saga unknown)
- Create `vectors/compatibility/README.md` explaining the compatibility model
- Update cross-language runners to load compatibility vectors optionally

**Acceptance criteria:**
- [ ] Compatibility vectors document the expected cross-version behavior
- [ ] Vectors include both "passes" and "fails" cases with explanatory notes
- [ ] README explains N/N-1 compatibility policy
- [ ] Cross-language runners can optionally load and verify these vectors

**Testing:** 6 new vectors (3 pass, 3 fail with documented reasons)

---

#### S3-T2: Semantic Invariant & Edge-Case Vectors

**Finding:** BB-V3-013 (Medium — parts 2 and 3)
**Files:** New: `vectors/invariants/`, `vectors/edge-cases/`

**Description:** Current vectors cover structural validation but not semantic invariants (structurally valid but semantically invalid) or extreme values (empty, maximum, boundary conditions).

**Implementation details:**
- Create `vectors/invariants/sealing-policy.json`:
  - Valid encryption config (encryption + key_derivation + key_reference)
  - Invalid: encryption with key_derivation "none" (passes JSON Schema if no if/then, fails if if/then added in S1-T5)
  - Invalid: encryption without key_reference (same)
- Create `vectors/invariants/billing.json`:
  - CreditNote amount exceeding referenced entry (structurally valid, semantically invalid)
  - BillingRecipient share_bps summing to 9000 (structurally valid, semantically invalid)
- Create `vectors/edge-cases/allocation.json`:
  - Single recipient with 10000 bps (trivial)
  - 100 recipients with 100 bps each (high cardinality)
  - Total cost "0" (zero-cost entry)
  - Total cost "1" with 3 recipients (smallest allocation possible)
- Create `vectors/edge-cases/strings.json`:
  - Minimum-length strings (1 char for minLength: 1 fields)
  - Maximum reasonable lengths
  - Unicode content in metadata values
- Create `vectors/README.md` explaining the vector taxonomy and design philosophy

**Acceptance criteria:**
- [ ] Invariant vectors document structurally-valid/semantically-invalid cases
- [ ] Edge-case vectors test boundary conditions
- [ ] `vectors/README.md` explains the taxonomy: structural, invariant, edge-case, compatibility
- [ ] Notes field on each vector explains what it tests and why
- [ ] Cross-language runners load invariant vectors when semantic validation is available

**Testing:** ~15 new vectors across invariants and edge cases

---

#### S3-T3: Capability Negotiation Schema

**Finding:** BB-V3-005 (Medium)
**Files:** New: `src/schemas/capability.ts`

**Description:** The Hounfour's multi-model architecture needs a protocol primitive for capability queries. `AgentDescriptor` describes what an agent *has*; a capability schema describes what an agent *can do at what quality*.

> **Research Parallel:** HTTP Accept headers solve content negotiation. W3C DID describes identity capabilities. A2A protocol defines `AgentCard` with capability descriptions.

**Implementation details:**
- Create `src/schemas/capability.ts`:
  ```typescript
  export const CapabilitySchema = Type.Object({
    skill_id: Type.String({ minLength: 1, description: 'Skill or capability identifier' }),
    description: Type.Optional(Type.String()),
    input_modes: Type.Optional(Type.Array(Type.String(), { description: 'Accepted input types' })),
    output_modes: Type.Optional(Type.Array(Type.String(), { description: 'Produced output types' })),
    models: Type.Optional(Type.Array(Type.String(), { description: 'Model IDs that can execute this capability' })),
    max_latency_ms: Type.Optional(Type.Integer({ minimum: 0, description: 'Maximum acceptable latency' })),
  }, { $id: 'Capability', additionalProperties: false });

  export const CapabilityQuerySchema = Type.Object({
    required_skills: Type.Optional(Type.Array(Type.String())),
    preferred_models: Type.Optional(Type.Array(Type.String())),
    max_latency_ms: Type.Optional(Type.Integer({ minimum: 0 })),
    min_context_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
  }, { $id: 'CapabilityQuery', additionalProperties: true });

  export const CapabilityResponseSchema = Type.Object({
    agent_id: Type.String({ minLength: 1 }),
    capabilities: Type.Array(CapabilitySchema),
    available: Type.Boolean({ description: 'Whether the agent can currently accept work' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  }, { $id: 'CapabilityResponse', additionalProperties: false });
  ```
- Add to barrel exports, validators, generate-schemas, check-schemas
- Generate JSON Schema files

**Acceptance criteria:**
- [ ] `CapabilitySchema`, `CapabilityQuerySchema`, `CapabilityResponseSchema` defined
- [ ] All schemas have `$id` and `additionalProperties` set appropriately
- [ ] Exported from barrel with types
- [ ] Validators available via `validators.capability()` etc.
- [ ] JSON Schemas generated

**Testing:** 4 new vectors — valid capability, valid query, valid response, invalid response (missing required fields)

---

#### S3-T4: Schema Discovery Convention

**Finding:** BB-V3-006 (Low)
**Files:** New: `src/schemas/discovery.ts`, update `schemas/index.json`

**Description:** No runtime mechanism for services to discover which schemas an endpoint supports. A `/.well-known/loa-hounfour` endpoint convention would enable automatic protocol negotiation.

> **Research Parallel:** `/.well-known/openid-configuration` enables OAuth discovery. `llms.txt` enables AI agent discovery. The pattern is universal for runtime protocol negotiation.

**Implementation details:**
- Create `src/schemas/discovery.ts`:
  ```typescript
  export const ProtocolDiscoverySchema = Type.Object({
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    min_supported_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    schemas: Type.Array(Type.String({ format: 'uri' }), {
      description: 'List of supported schema $id URLs',
    }),
    capabilities: Type.Optional(Type.Array(Type.String(), {
      description: 'Supported aggregate types',
    })),
  }, { $id: 'ProtocolDiscovery', additionalProperties: false });
  ```
- Add helper function:
  ```typescript
  export function buildDiscoveryDocument(): Static<typeof ProtocolDiscoverySchema> {
    // Returns discovery document from current contract version and schema registry
  }
  ```
- Add to barrel exports and validators

**Acceptance criteria:**
- [ ] `ProtocolDiscoverySchema` defined with contract version and schema list
- [ ] `buildDiscoveryDocument()` helper generates from current state
- [ ] Exported from barrel with types
- [ ] JSON Schema generated

**Testing:** 2 new vectors — valid discovery document, invalid (missing version)

---

#### S3-T5: Version Bump to v2.2.0 and Final Integration

**Files:** `src/version.ts`, `package.json`, `vectors/VERSION`, `SCHEMA-CHANGELOG.md`, all generated schemas

**Description:** Bump version to v2.2.0, regenerate all schemas (including new capability and discovery schemas), update version references, update SCHEMA-CHANGELOG.md, run full test suite and cross-language runners.

**Implementation details:**
- Update `CONTRACT_VERSION` to `'2.2.0'`
- Update `MIN_SUPPORTED_VERSION` — remains `'2.0.0'` (all changes are additive)
- Update `package.json` version to `2.2.0`
- Update `vectors/VERSION` to `2.2.0`
- Regenerate all JSON schemas (new schemas get `$id` URLs with `/2.2.0/`)
- Update `schemas/index.json` with new schemas
- Update `SCHEMA-CHANGELOG.md` with v2.2.0 section documenting all changes
- Update AsyncAPI spec with new event types and capabilities
- Run full test suite
- Run Python vector runner
- Verify Go runner README is current

**Acceptance criteria:**
- [ ] `CONTRACT_VERSION === '2.2.0'`
- [ ] `MIN_SUPPORTED_VERSION === '2.0.0'`
- [ ] All JSON schemas regenerated with v2.2.0 $id URLs
- [ ] `schema:check` passes
- [ ] `vectors:check` passes
- [ ] All tests pass (existing + new)
- [ ] TypeScript strict mode — 0 errors
- [ ] Python vector runner passes all vectors
- [ ] `SCHEMA-CHANGELOG.md` v2.2.0 section complete
- [ ] AsyncAPI spec updated

**Testing:** Full suite: `npm test`, `npm run schema:check`, `npm run vectors:check`, Python runner

---

### Sprint 3 Summary

| Task | Finding | Category | Files | Depends On |
|------|---------|----------|-------|------------|
| S3-T1 | BB-V3-013 | Testing | vectors/compatibility/ | S1, S2 |
| S3-T2 | BB-V3-013 | Testing | vectors/invariants/, vectors/edge-cases/, vectors/README.md | S1-T5 |
| S3-T3 | BB-V3-005 | Interop | schemas/capability.ts | None |
| S3-T4 | BB-V3-006 | Distribution | schemas/discovery.ts | None |
| S3-T5 | — | Integration | version.ts, package.json, all schemas | S3-T1..T4 |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JSON Schema `if/then` complexity in TypeBox | Medium | Medium | Fall back to `$comment` documentation if TypeBox doesn't support `if/then` natively |
| Capability schema scope creep | Medium | Low | Keep schemas minimal — `additionalProperties: true` on query for extensibility |
| Backward compatibility of new optional fields | Low | High | All new fields are `Type.Optional` — existing consumers unaffected |
| Cross-language runner maintenance burden | Low | Medium | Runners are <100 lines each, single dependency |
| Event type vocabulary completeness | Medium | Low | Vocabulary is extensible — new types can be added in patch releases |

## Success Metrics

| Metric | Target |
|--------|--------|
| All BB-V3 findings addressed | 13/13 actionable |
| New vocabulary files | 3 (metadata, lifecycle-reasons, event-types) |
| New test vectors added | ~40 across structural, invariant, edge-case, compatibility |
| New schemas | 4 (Capability, CapabilityQuery, CapabilityResponse, ProtocolDiscovery) |
| Cross-field validation in JSON Schema | ConversationSealingPolicy |
| Deprecation convention established | 1 exemplar field |
| Version bump | v2.1.0 → v2.2.0 (minor, backward-compatible) |

---

## Appendix: Finding → Task Traceability

| Finding | Severity | Sprint | Task | Description |
|---------|----------|--------|------|-------------|
| BB-V3-001 | Medium | 1 | S1-T2 | Metadata namespace conventions |
| BB-V3-002 | Medium | 1 | S1-T3 | Runtime payload validation for typed wrappers |
| BB-V3-003 | Low | 1 | S1-T4 | Constrain validator API documentation |
| BB-V3-004 | Medium | 2 | S2-T1 | Schema field deprecation convention |
| BB-V3-005 | Medium | 3 | S3-T3 | Capability negotiation schema |
| BB-V3-006 | Low | 3 | S3-T4 | Schema discovery convention |
| BB-V3-007 | Medium | 1 | S1-T1 | Fix req-hash comment-code divergence |
| BB-V3-008 | Medium | 1 | S1-T5 | Cross-field validation in JSON Schema |
| BB-V3-009 | Medium | 2 | S2-T2 | Structured reason codes |
| BB-V3-010 | Low | 2 | S2-T4 | Batch envelope context |
| BB-V3-011 | Medium | 2 | S2-T3 | Event type vocabulary registry |
| BB-V3-012 | Medium | 2 | S2-T5 | Saga compensation protocol |
| BB-V3-013 | Medium | 3 | S3-T1, S3-T2 | New vector categories |
