# Sprint Plan: loa-hounfour Excellence Refinements v2.1.0

**Cycle:** cycle-002 — Bridgebuilder Excellence Refinements
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Source:** [PR #1 Bridgebuilder Review](https://github.com/0xHoneyJar/loa-hounfour/pull/1)
**Findings:** BB-ADV-001 through BB-ADV-011, LOW-003
**Created:** 2026-02-13

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 3 |
| **Scope** | v2.1.0 — Excellence refinements from Bridgebuilder architectural review |
| **Team** | 1 AI agent |
| **Operator** | Single-operator autonomous (via `/run sprint-plan`) |
| **Quality gates** | Review + Audit per sprint |
| **Version bump** | v2.0.0 → v2.1.0 (MINOR — additive optional fields, new schemas, no breaking changes) |

### Philosophy

> *"The best codebases I've worked on read like a trail of breadcrumbs."*

Cycle-001 built the bridge — 8 new TypeBox schemas, 169 tests, 15 JSON schemas, zero TypeScript errors. The Bridgebuilder review flatlined at 93.6% severity reduction. The bridge is sound.

Cycle-002 makes the bridge *beautiful*. Every finding from the Bridgebuilder architectural review — from HIGH to LOW — gets addressed. Not because we must, but because what we're building matters. These schemas will be consumed by every agent in the system. The decision trails we leave now will be read by humans and agents for years. Excellence for its own sake, as an expression of care.

### Sprint Sequencing

```
Sprint 1: Schema Enrichment & New Types              ── 1 session
  BB-ADV-001: metadata extension fields
  BB-ADV-002: sealed_by on Conversation
  BB-ADV-004: DomainEventBatch schema
  BB-ADV-005: transition_reason via typed lifecycle payloads
    ↓
Sprint 2: Decision Trails & Documentation             ── 1 session
  BB-ADV-003: CreditNote invariant documentation
  BB-ADV-007: Design choice documentation (AES-256-GCM, multiplier_bps, event type convention)
  BB-ADV-011: Schema-level changelog (SCHEMA-CHANGELOG.md)
  LOW-003: TSDoc on createTransitionValidator
    ↓
Sprint 3: Interoperability & Distribution             ── 1-2 sessions
  BB-ADV-006: vectors/VERSION file + CI validation
  BB-ADV-008: Resolvable JSON Schema $id (schema landing pages)
  BB-ADV-009: OpenAPI/AsyncAPI spec generation
  BB-ADV-010: Cross-language golden vector runners (Python, Go)
```

**Version bump happens in Sprint 3** after all changes land.

---

## Sprint 1: Schema Enrichment — Extending the Protocol

**Goal:** Enrich existing schemas with suggested fields and add the `DomainEventBatch` schema. All new fields are `Type.Optional()` — no breaking changes, no major version bump.

**Dependencies:** None (builds on v2.0.0 foundation)

**Findings addressed:** BB-ADV-001, BB-ADV-002, BB-ADV-004, BB-ADV-005

### Tasks

#### S1-T1: Metadata Extension Fields on Envelope Schemas

**Finding:** BB-ADV-001 (Medium)
**Files:** `src/schemas/domain-event.ts`, `src/schemas/billing-entry.ts`, `src/schemas/invoke-response.ts`

**Description:** Add an optional `metadata` field to the top-level envelope schemas to future-proof the strict `additionalProperties: false` contract. This follows the pattern used by AWS CloudFormation, Kubernetes, and CloudEvents — strict schemas with a designated escape hatch for consumer-specific metadata.

> **FAANG Parallel (from review):** "Strict schemas are great until your first customer needs to pass through a trace header you didn't anticipate."

**Implementation details:**
- Add `metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown()))` to:
  - `DomainEventSchema` — for consumer-specific routing metadata
  - `BillingEntrySchema` — for billing system extensions (tax jurisdiction, currency pair, etc.)
  - `InvokeResponseSchema` — for provider-specific response metadata
- Add description: `'Consumer-extensible metadata (not validated by protocol contract)'`
- Do NOT add to leaf schemas (`MessageSchema`, `BillingRecipientSchema`) — only top-level envelopes

**Acceptance criteria:**
- [ ] `DomainEventSchema` accepts objects with and without `metadata` field
- [ ] `metadata` field accepts arbitrary key-value pairs
- [ ] Existing tests still pass (field is optional, no existing test data breaks)
- [ ] JSON Schema output includes `metadata` as optional property
- [ ] New test vectors: event with metadata, event without metadata (both valid)

**Testing:** 4 new vectors (1 per schema + 1 negative: metadata on leaf schema rejected)

---

#### S1-T2: Conversation `sealed_by` Field

**Finding:** BB-ADV-002 (Medium)
**File:** `src/schemas/conversation.ts`

**Description:** Add a `sealed_by` field to `ConversationSchema` — a reference to the `transfer_id` that caused the sealing. Currently, sealed conversations record *when* (`sealed_at`) but not *why*. In audit-heavy environments (NFT ownership transfers), the causal chain matters.

> **FAANG Parallel (from review):** "AWS CloudTrail captures not just what happened, but the request ID that triggered it."

**Implementation details:**
- Add `sealed_by: Type.Optional(Type.String({ minLength: 1, description: 'Transfer ID that caused sealing (causal audit trail)' }))` to `ConversationSchema`
- Position: after `sealed_at` for logical grouping
- Only relevant when `status === 'sealed'` — runtime validation of this invariant is documented but not enforced at schema level (same approach as `validateSealingPolicy`)

**Acceptance criteria:**
- [ ] `ConversationSchema` accepts sealed conversations with `sealed_by` field
- [ ] `ConversationSchema` accepts sealed conversations without `sealed_by` field (backward-compatible)
- [ ] Existing conversation test vectors still pass unchanged
- [ ] New vector: sealed conversation with `sealed_by` referencing a transfer_id

**Testing:** 2 new vectors

---

#### S1-T3: DomainEventBatch Schema

**Finding:** BB-ADV-004 (Medium)
**File:** `src/schemas/domain-event.ts`

**Description:** Add a `DomainEventBatch` schema for atomic multi-event delivery. When a transfer completes, it emits multiple events (lifecycle transition, conversation sealing, billing adjustment). If these arrive as individual messages, consumers must handle partial failures. A batch with a shared `correlation_id` enables atomic processing.

> **FAANG Parallel (from review):** "This is the 'transactional outbox' pattern from Microservices Patterns (Chris Richardson), and it's how Stripe delivers webhook events for complex operations."

**Implementation details:**
- `DomainEventBatchSchema`: `Type.Object()` with:
  - `batch_id: Type.String({ minLength: 1, description: 'Unique batch identifier' })`
  - `correlation_id: Type.String({ minLength: 1, description: 'Shared correlation across all events in batch' })`
  - `events: Type.Array(DomainEventSchema, { minItems: 1, description: 'Ordered list of domain events' })`
  - `source: Type.String({ minLength: 1, description: 'System that produced the batch' })`
  - `produced_at: Type.String({ format: 'date-time' })`
  - `contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' })`
- `$id: 'DomainEventBatch'`, `additionalProperties: false`
- Export type: `type DomainEventBatch = Static<typeof DomainEventBatchSchema>`
- Add to barrel exports in `src/index.ts`
- Add lazy validator in `src/validators/index.ts`
- Add to `scripts/generate-schemas.ts` and `scripts/check-schemas.ts`

**Acceptance criteria:**
- [ ] Schema validates a batch with 1-N events
- [ ] Empty events array rejected (minItems: 1)
- [ ] Each event in the batch is independently valid per DomainEventSchema
- [ ] JSON Schema generated successfully
- [ ] Validator available via `validators.domainEventBatch()`

**Testing:** 4 new vectors (single-event batch, multi-event batch, empty batch rejected, batch with metadata)

---

#### S1-T4: Typed Lifecycle Event Payloads with Transition Reason

**Finding:** BB-ADV-005 (Low)
**File:** `src/schemas/agent-lifecycle.ts` (extend), new: `src/schemas/lifecycle-event-payload.ts`

**Description:** Create typed payload schemas for lifecycle transition events that include a `reason` field. Kubernetes tracks `reason` and `message` on pod condition changes for production debugging. "Why did this agent go SUSPENDED?" should be answerable from the event stream.

> **FAANG Parallel (from review):** "Kubernetes tracks reason and message on pod condition changes, which makes debugging production issues enormously easier."

**Implementation details:**
- `LifecycleTransitionPayloadSchema`: `Type.Object()` with:
  - `agent_id: Type.String({ minLength: 1 })`
  - `previous_state: AgentLifecycleStateSchema`
  - `new_state: AgentLifecycleStateSchema`
  - `reason: Type.String({ minLength: 1, description: 'Human/agent-readable reason for transition' })`
  - `triggered_by: Type.Optional(Type.String({ description: 'Actor or event that triggered the transition' }))`
  - `transfer_id: Type.Optional(Type.String({ description: 'Associated transfer ID (for TRANSFERRED state)' }))`
- Export convenience type: `type LifecycleTransitionPayload = Static<typeof LifecycleTransitionPayloadSchema>`
- Add `LifecycleTransitionEvent` type alias: `DomainEvent<LifecycleTransitionPayload>`
- Add to barrel exports and validators

**Acceptance criteria:**
- [ ] Schema validates a payload with required fields (agent_id, previous_state, new_state, reason)
- [ ] Optional fields (`triggered_by`, `transfer_id`) accepted when present
- [ ] States must be valid `AgentLifecycleState` values
- [ ] `LifecycleTransitionEvent` type compiles correctly as DomainEvent wrapper
- [ ] JSON Schema generated

**Testing:** 3 new vectors (basic transition, transfer-triggered, invalid state rejected)

---

### Sprint 1 Summary

| Task | Finding | Files | Est. Lines | Depends On |
|------|---------|-------|-----------|------------|
| S1-T1 | BB-ADV-001 | domain-event, billing-entry, invoke-response | ~15 | None |
| S1-T2 | BB-ADV-002 | conversation.ts | ~5 | None |
| S1-T3 | BB-ADV-004 | domain-event.ts, index.ts, validators, scripts | ~60 | None |
| S1-T4 | BB-ADV-005 | lifecycle-event-payload.ts, agent-lifecycle.ts | ~50 | S1-T3 |
| **Total** | | | **~130** | |

---

## Sprint 2: Decision Trails — Documentation as Architecture

**Goal:** Document the "why" behind every key design decision. Transform the codebase from "trail of breadcrumbs" to "annotated trail with maps." Add TSDoc, schema-level changelog, and invariant documentation.

**Dependencies:** Sprint 1 (new schemas need documenting)

**Findings addressed:** BB-ADV-003, BB-ADV-007, BB-ADV-011, LOW-003

### Tasks

#### S2-T1: CreditNote Invariant Documentation

**Finding:** BB-ADV-003 (Low)
**File:** `src/schemas/billing-entry.ts`

**Description:** Document the business logic invariants that the schema alone cannot express. A `CreditNote` should never issue credits exceeding the original `BillingEntry` amount. A `CreditNote` should reference an existing `BillingEntry.id`. These are service-layer validations, but documenting them in the schema prevents future implementers from building incorrect assumptions.

> **Bridgebuilder:** "These are business logic validations that belong at the service layer, but documenting the invariants in the schema description or a dedicated ADR would help future implementers."

**Implementation details:**
- Add TSDoc block to `CreditNoteSchema` documenting:
  - `amount_micro` must not exceed the referenced `BillingEntry.total_cost_micro`
  - `references_billing_entry` must reference a valid `BillingEntry.id`
  - Multiple `CreditNote`s can reference the same `BillingEntry` (partial refunds)
  - Sum of all `CreditNote.amount_micro` for a single entry must not exceed the entry's total
- Add `description` to `amount_micro` field: `'Credit amount in micro-USD (must not exceed referenced entry total)'`
- Add inline code comment documenting the invariant for agents

**Acceptance criteria:**
- [ ] TSDoc on `CreditNoteSchema` documents all 4 invariants
- [ ] `amount_micro` field has descriptive `description` property
- [ ] No runtime changes — documentation only
- [ ] JSON Schema output includes enhanced descriptions

**Testing:** No new tests (documentation only)

---

#### S2-T2: Design Choice Documentation

**Finding:** BB-ADV-007 (Medium)
**Files:** `src/schemas/conversation.ts`, `src/schemas/billing-entry.ts`, `src/schemas/domain-event.ts`

**Description:** Document the "why" behind three key design choices that future agents and developers will encounter:

1. **AES-256-GCM** in `ConversationSealingPolicy` — why not XChaCha20-Poly1305?
2. **`multiplier_bps` bounded 10000-100000** in `BillingEntry` — business or technical constraint?
3. **Three-segment event type** pattern `^[a-z]+\.[a-z_]+\.[a-z_]+$` in `DomainEvent` — why three?

> **Bridgebuilder:** "A one-line comment like `// WebSocket chosen over SSE for bidirectional heartbeat requirement (see ADR-007)` turns this from a mystery into a mapped decision."

**Implementation details:**
- Add inline comments explaining each choice:
  - `// AES-256-GCM chosen over XChaCha20-Poly1305: GCM is the NIST standard with hardware acceleration`
    `// on modern CPUs (AES-NI), and all three downstream repos (loa-finn, arrakis, mibera-freeside)`
    `// already depend on Node.js crypto which provides GCM natively. XChaCha20 would require`
    `// an additional dependency (@noble/ciphers) for marginal nonce-misuse resistance benefit.`
  - `// multiplier_bps bounded [10000, 100000]: 10000 = 1.0x (cost pass-through), 100000 = 10.0x`
    `// (maximum markup). Business constraint from pricing model — no sub-cost pricing allowed`
    `// (providers would lose money), no >10x markup (consumer protection / regulatory).`
  - `// Event type: three-segment dotted convention {aggregate}.{noun}.{verb}`
    `// Examples: agent.lifecycle.transitioned, billing.entry.created, conversation.thread.sealed`
    `// Three segments chosen for routing: segment 1 selects the event bus partition,`
    `// segment 2 selects the handler group, segment 3 selects the specific handler.`
    `// This maps to Kafka topic.consumer-group.handler in the loa-finn event system.`

**Acceptance criteria:**
- [ ] Each of the 3 design choices has a comment explaining rationale
- [ ] Comments reference concrete technical reasons (not just "we chose this")
- [ ] Comments are positioned adjacent to the relevant schema field
- [ ] No runtime changes

**Testing:** No new tests (documentation only)

---

#### S2-T3: TSDoc on createTransitionValidator

**Finding:** LOW-003 (deferred from bridge iteration 2)
**File:** `src/utilities/lifecycle.ts`

**Description:** Add comprehensive TSDoc with usage examples to `createTransitionValidator`. This is the generic factory that will be reused for tool lifecycle (v2.1.0) and any future state machines.

**Implementation details:**
- Add TSDoc `@example` blocks showing:
  1. Creating a validator from `AGENT_LIFECYCLE_TRANSITIONS`
  2. Checking a valid transition
  3. Getting valid targets from a state
  4. Using with a custom state machine (e.g., tool lifecycle)
- Add `@typeParam T` documentation
- Add `@see` reference to `AGENT_LIFECYCLE_TRANSITIONS` and `isValidTransition`

**Acceptance criteria:**
- [ ] TSDoc includes at least 2 `@example` blocks
- [ ] `@typeParam T` is documented
- [ ] `@see` references related exports
- [ ] TypeDoc/TSDoc renders correctly (verify with IDE hover)

**Testing:** No new tests (documentation only)

---

#### S2-T4: Schema-Level Changelog

**Finding:** BB-ADV-011 (Low)
**File:** New: `SCHEMA-CHANGELOG.md`

**Description:** Create a schema-level changelog that tracks per-schema evolution across versions. When v2.1.0 lands, consumers need to know "what changed between 2.0.0 and 2.1.0?" at the schema level, not the file level.

> **FAANG Parallel (from review):** "Confluent's Schema Registry for Kafka serves exactly this purpose — it tracks schema evolution across versions and enforces compatibility rules."

**Implementation details:**
- Create `SCHEMA-CHANGELOG.md` at repo root with format:

```markdown
# Schema Changelog

## v2.1.0 (Unreleased)

### DomainEvent
- Added: `metadata` optional field (BB-ADV-001)

### DomainEventBatch (NEW)
- New schema for atomic multi-event delivery (BB-ADV-004)

### BillingEntry
- Added: `metadata` optional field (BB-ADV-001)

### Conversation
- Added: `sealed_by` optional field (BB-ADV-002)

### InvokeResponse
- Added: `metadata` optional field (BB-ADV-001)

### LifecycleTransitionPayload (NEW)
- New schema for typed lifecycle event payloads (BB-ADV-005)

## v2.0.0

### AgentDescriptor (NEW)
- Full agent identity with NFT binding, capabilities, content negotiation

### AgentLifecycleState (NEW)
- 6-state lifecycle machine: DORMANT → PROVISIONING → ACTIVE → SUSPENDED → TRANSFERRED → ARCHIVED
...
```

**Acceptance criteria:**
- [ ] Every schema has an entry for every version it was modified in
- [ ] Each entry links to the finding/issue that motivated the change
- [ ] Format is consumable by automated tooling (consistent heading structure)
- [ ] v2.0.0 section includes all schemas from cycle-001

**Testing:** No new tests (documentation only)

---

### Sprint 2 Summary

| Task | Finding | Files | Est. Lines | Depends On |
|------|---------|-------|-----------|------------|
| S2-T1 | BB-ADV-003 | billing-entry.ts | ~15 | None |
| S2-T2 | BB-ADV-007 | conversation.ts, billing-entry.ts, domain-event.ts | ~20 | None |
| S2-T3 | LOW-003 | lifecycle.ts | ~25 | None |
| S2-T4 | BB-ADV-011 | SCHEMA-CHANGELOG.md (new) | ~100 | Sprint 1 |
| **Total** | | | **~160** | |

---

## Sprint 3: Interoperability & Distribution — From Library to Protocol

**Goal:** Transform loa-hounfour from a "TypeScript library" into a "protocol specification with a TypeScript reference implementation." This sprint makes the schemas discoverable, consumable, and verifiable across any language and tooling ecosystem.

**Dependencies:** Sprint 1 + Sprint 2

**Findings addressed:** BB-ADV-006, BB-ADV-008, BB-ADV-009, BB-ADV-010

### Tasks

#### S3-T1: Vector Versioning & CI Validation

**Finding:** BB-ADV-006 (Low)
**File:** New: `vectors/VERSION`, update: `scripts/check-schemas.ts`

**Description:** Add a `vectors/VERSION` file tracking which contract version the vectors were generated for, and a CI check that fails if vectors exist for a version that doesn't match `CONTRACT_VERSION`.

**Implementation details:**
- Create `vectors/VERSION` file: single line containing the contract version (e.g., `2.1.0`)
- Update `scripts/check-schemas.ts` (or create `scripts/check-vectors.ts`) to:
  1. Read `vectors/VERSION`
  2. Compare against `CONTRACT_VERSION` from `src/version.ts`
  3. Fail with descriptive error if they don't match
- Add npm script: `"vectors:check": "tsx scripts/check-vectors.ts"`

**Acceptance criteria:**
- [ ] `vectors/VERSION` exists and contains the current contract version
- [ ] `scripts/check-vectors.ts` exits 0 when versions match
- [ ] `scripts/check-vectors.ts` exits 1 with descriptive error when versions mismatch
- [ ] npm script `vectors:check` registered in package.json

**Testing:** Manual verification (script tested with correct and incorrect version)

---

#### S3-T2: Schema Landing Pages (Resolvable $id URLs)

**Finding:** BB-ADV-008 (Medium)
**Files:** New: `schemas/index.html` (static), update: `scripts/generate-schemas.ts`

**Description:** Make the JSON Schema `$id` URLs resolvable. Currently schemas reference `https://schemas.0xhoneyjar.com/loa-hounfour/2.0.0/billing-entry` but these URLs return 404. Resolvable $id URLs enable IDE validation, SchemaStore.org integration, and any tooling that fetches schemas by $id.

**Implementation details:**
- Generate a `schemas/index.json` manifest listing all schemas with their $id URLs and file paths
- Generate a `schemas/README.md` with a table of all schemas, their $ids, and descriptions
- These serve as the human-readable and machine-readable schema registry
- The actual hosting (Vercel/Cloudflare Pages) is out of scope — we produce the artifacts that can be deployed as static files
- Update `scripts/generate-schemas.ts` to produce `index.json` and `README.md` alongside the `.schema.json` files

**Acceptance criteria:**
- [ ] `schemas/index.json` lists all schemas with `$id`, `file`, `description`, and `version`
- [ ] `schemas/README.md` renders as a human-readable schema catalog
- [ ] Schema generation script produces both files alongside the JSON schemas
- [ ] `schemas/index.json` validates as valid JSON
- [ ] Every schema file listed in `index.json` exists on disk

**Testing:** Assertion in `check-schemas.ts` that index.json references match actual files

---

#### S3-T3: AsyncAPI Spec Generation

**Finding:** BB-ADV-009 (Medium)
**Files:** New: `specs/asyncapi.yaml`, new: `scripts/generate-asyncapi.ts`

**Description:** Generate an AsyncAPI specification for the event-driven schemas (`DomainEvent`, `DomainEventBatch`, `StreamEvent`). AsyncAPI is the standard for documenting event-driven APIs, analogous to OpenAPI for REST APIs. This makes the protocol discoverable by any API tooling in the ecosystem.

**Implementation details:**
- Create `scripts/generate-asyncapi.ts` that:
  1. Imports the relevant schemas
  2. Generates an AsyncAPI 3.0 YAML document with:
     - `info`: package name, version, description
     - `channels`: one per event type (domain-events, stream-events)
     - `messages`: referencing the JSON Schema files
     - `schemas`: inline or $ref to generated JSON schemas
- Output: `specs/asyncapi.yaml`
- Add npm script: `"spec:generate": "tsx scripts/generate-asyncapi.ts"`

**Acceptance criteria:**
- [ ] `specs/asyncapi.yaml` is valid AsyncAPI 3.0 (validate with `@asyncapi/parser`)
- [ ] Spec references all event-related schemas (DomainEvent, DomainEventBatch, StreamEvent)
- [ ] Spec includes message examples from golden vectors
- [ ] npm script registered in package.json

**Testing:** Validation via AsyncAPI parser (dev dependency), or manual schema validation

---

#### S3-T4: Cross-Language Golden Vector Runners

**Finding:** BB-ADV-010 (High — the highest-priority interop finding)
**Files:** New: `vectors/runners/python/test_vectors.py`, new: `vectors/runners/go/vectors_test.go`

**Description:** Create minimal test runners in Python and Go that load the golden vector JSON files and validate them against native JSON Schema implementations. This transforms loa-hounfour from a "TypeScript library" into a "protocol specification with cross-language verification."

> **FAANG Parallel (from review):** "Every serious cryptographic standard ships with test vectors — known input/output pairs that any conforming implementation must reproduce."

**Implementation details:**

**Python runner** (`vectors/runners/python/test_vectors.py`):
- Use `jsonschema` library (the reference JSON Schema implementation)
- Load each `schemas/*.schema.json` file
- Load corresponding vectors from `vectors/`
- Validate `valid` vectors pass, `invalid` vectors fail
- Run with: `cd vectors/runners/python && pip install jsonschema && python test_vectors.py`
- Minimal: ~80 lines, zero framework dependencies beyond `jsonschema`

**Go runner** (`vectors/runners/go/vectors_test.go`):
- Use `github.com/santhosh-tekuri/jsonschema/v6` (fastest Go JSON Schema library)
- Same pattern: load schemas, load vectors, validate
- Run with: `cd vectors/runners/go && go test ./...`
- Minimal: ~100 lines, single dependency

Both runners should:
- Report pass/fail per vector with vector ID
- Exit non-zero on any failure
- Be self-contained (no dependency on the TypeScript build)

**Acceptance criteria:**
- [ ] Python runner validates all valid vectors pass and all invalid vectors fail
- [ ] Go runner validates all valid vectors pass and all invalid vectors fail
- [ ] Both runners can be executed independently (no TypeScript toolchain required)
- [ ] Both runners include a `README.md` with setup/run instructions
- [ ] Vector runners consume the same JSON files as the TypeScript tests (no duplication)

**Testing:** The runners ARE the tests. Each language validates against the golden vectors.

---

#### S3-T5: Version Bump and Final Integration

**Files:** `src/version.ts`, `package.json`, `vectors/VERSION`, `SCHEMA-CHANGELOG.md`

**Description:** Bump version to 2.1.0, regenerate all schemas (including new DomainEventBatch and LifecycleTransitionPayload), update version references, and run full test suite.

**Implementation details:**
- Update `CONTRACT_VERSION` to `'2.1.0'`
- Update `MIN_SUPPORTED_VERSION` to `'2.0.0'` (v2.0.0 consumers can still read v2.1.0 — additive only)
- Update `package.json` version to `2.1.0`
- Update `vectors/VERSION` to `2.1.0`
- Regenerate all JSON schemas (new schemas get `$id` URLs with `/2.1.0/`)
- Run `schema:check` to verify all schemas up to date
- Run full test suite
- Finalize `SCHEMA-CHANGELOG.md` v2.1.0 section

**Acceptance criteria:**
- [ ] `CONTRACT_VERSION === '2.1.0'`
- [ ] `MIN_SUPPORTED_VERSION === '2.0.0'` (backward compatible)
- [ ] All JSON schemas regenerated with v2.1.0 $id URLs
- [ ] `schema:check` passes
- [ ] `vectors:check` passes
- [ ] All tests pass (existing 169 + new ~15)
- [ ] TypeScript strict mode — 0 errors
- [ ] `SCHEMA-CHANGELOG.md` v2.1.0 section finalized

**Testing:** Full suite: `pnpm test`, `pnpm typecheck`, `pnpm schema:check`

---

### Sprint 3 Summary

| Task | Finding | Files | Est. Lines | Depends On |
|------|---------|-------|-----------|------------|
| S3-T1 | BB-ADV-006 | vectors/VERSION, scripts/check-vectors.ts | ~30 | None |
| S3-T2 | BB-ADV-008 | scripts/generate-schemas.ts, schemas/index.json | ~80 | None |
| S3-T3 | BB-ADV-009 | scripts/generate-asyncapi.ts, specs/asyncapi.yaml | ~120 | S3-T2 |
| S3-T4 | BB-ADV-010 | vectors/runners/python/, vectors/runners/go/ | ~200 | None |
| S3-T5 | — | version.ts, package.json, schemas | ~20 | S3-T1..T4 |
| **Total** | | | **~450** | |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AsyncAPI spec generation complexity | Medium | Low | Generate manually if automated generation is too complex; AsyncAPI is YAML |
| Go vector runner dependency management | Low | Low | Use `go mod init` with single dependency; Go modules are well-understood |
| New optional fields cause JSON Schema drift | Low | Medium | `schema:check` script catches any drift; CI prevents merge with stale schemas |
| Version bump confuses downstream consumers | Low | Medium | `MIN_SUPPORTED_VERSION` stays at 2.0.0; MIGRATION.md already exists |

## Success Metrics

| Metric | Target |
|--------|--------|
| All Bridgebuilder findings addressed | 12/12 |
| New test vectors added | ~15 |
| Cross-language runners passing | Python + Go |
| Schema changelog complete | All schemas documented |
| Design decisions documented | 3/3 key choices |
| Version bump | 2.0.0 → 2.1.0 (minor, backward-compatible) |

---

## Appendix: Finding → Task Traceability

| Finding | Severity | Sprint | Task | Status |
|---------|----------|--------|------|--------|
| BB-ADV-001 | Medium | 1 | S1-T1 | Pending |
| BB-ADV-002 | Medium | 1 | S1-T2 | Pending |
| BB-ADV-004 | Medium | 1 | S1-T3 | Pending |
| BB-ADV-005 | Low | 1 | S1-T4 | Pending |
| BB-ADV-003 | Low | 2 | S2-T1 | Pending |
| BB-ADV-007 | Medium | 2 | S2-T2 | Pending |
| LOW-003 | Low | 2 | S2-T3 | Pending |
| BB-ADV-011 | Low | 2 | S2-T4 | Pending |
| BB-ADV-006 | Low | 3 | S3-T1 | Pending |
| BB-ADV-008 | Medium | 3 | S3-T2 | Pending |
| BB-ADV-009 | Medium | 3 | S3-T3 | Pending |
| BB-ADV-010 | High | 3 | S3-T4 | Pending |
