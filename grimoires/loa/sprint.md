# Sprint Plan: Protocol Maturity & v3.0.0 — The Sovereignty Release

**Cycle:** cycle-005 — Protocol Maturity & v3.0.0
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Source:** [PR #1 Bridgebuilder Deep Review](https://github.com/0xHoneyJar/loa-hounfour/pull/1) — BB-C4-ADV-001 through ADV-008 + v3.0.0 deprecation targets
**Created:** 2026-02-14

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 3 |
| **Total tasks** | 18 |
| **Scope** | v2.4.0 → v3.0.0 — Complete Bridgebuilder findings + breaking v3 changes |
| **Team** | 1 AI agent |
| **Operator** | Autonomous (via `/run sprint-plan` or `/run-bridge`) |
| **Quality gates** | Review + Audit per sprint |
| **Version strategy** | Sprint 1-2: v2.4.0 (additive), Sprint 3: v3.0.0 (breaking — deprecation removal + access_policy) |

### Philosophy

> *"Every Cambrian explosion resolves into a smaller number of body plans that actually work. The protocols that survive aren't the ones with the most features — they're the ones with the clearest contracts."*

Cycles 001-004 built a protocol from nothing to 22 schemas, 270 tests, and four flatlines. This cycle pushes through the v2/v3 boundary: addressing every Bridgebuilder finding, adding the multi-model metadata conventions the Hounfour needs, centralizing financial arithmetic, and completing the v3.0.0 breaking changes (removing `previous_owner_access`, replacing with `access_policy`).

### Findings Backlog (Sources)

| ID | Severity | Source | Description |
|----|----------|--------|-------------|
| BB-C4-ADV-001 | HIGH | Cycle-004 deep | Guard predicates return bare boolean — no error message |
| BB-C4-ADV-002 | HIGH | Cycle-004 deep | No spec for compensation failure (sad path of sad path) |
| BB-C4-ADV-003 | MEDIUM | Cycle-004 deep | `validateBillingEntry()` not in validation pipeline |
| BB-C4-ADV-004 | MEDIUM | Cycle-004 deep | No metadata namespace for model reasoning traces |
| BB-C4-ADV-005 | MEDIUM | Cycle-004 deep | Guard definitions conflate logic and binding |
| BB-C4-ADV-006 | MEDIUM | Cycle-004 deep | MicroUSD arithmetic not centralized |
| BB-C4-ADV-007 | LOW | Cycle-004 deep | check-migration.ts not in CI pipeline |
| BB-C4-ADV-008 | LOW | Cycle-004 deep | Choreography could generate Mermaid diagrams |
| BB-V3-004 | MEDIUM | Cycle-003 | `previous_owner_access` deprecated — needs replacement |
| BB-ADV-003 | LOW | Cycle-001 arch | Document CreditNote invariants (no over-credit) |

---

## Sprint 1: Guard Architecture & Financial Safety (v2.4.0-prep)

> *"Booleans answer 'what happened' but never 'why it happened.'"*

### Goal
Elevate the guard predicate system from boolean returns to structured results, centralize financial arithmetic to prevent the BigInt footgun, and wire check-migration.ts into CI.

### S1-T1: Structured Guard Results (BB-C4-ADV-001)

**Description:** Replace `TransitionGuard<T>` return type from `boolean` to `GuardResult`. Update `createTransitionValidator()` to surface guard key and rejection reason. Update `DEFAULT_GUARDS` to return structured results.

**Files:** `src/utilities/lifecycle.ts`, `src/index.ts`

**Changes:**
- Add `GuardResult` type: `{ valid: true } | { valid: false; reason: string; guard: string }`
- Update `TransitionGuard<T>` signature to return `GuardResult`
- Update `TransitionValidator.isValid()` to return `GuardResult` instead of `boolean`
- Update all 4 `DEFAULT_GUARDS` predicates with descriptive reasons
- Add `isValidTransitionResult()` convenience function for backward compat

**Acceptance Criteria:**
- [ ] `validator.isValid('ACTIVE', 'TRANSFERRED')` returns `{ valid: false, reason: 'ACTIVE→TRANSFERRED requires context.transfer_id', guard: 'ACTIVE→TRANSFERRED' }`
- [ ] `validator.isValid('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-1' })` returns `{ valid: true }`
- [ ] All existing lifecycle tests updated for new return type
- [ ] Backward compat: `isValidTransitionResult(result)` narrows to valid/invalid

**Tests:** 8+ new tests for structured results, reason messages, guard key reporting

---

### S1-T2: Named Guard Functions (BB-C4-ADV-005)

**Description:** Extract guard logic from inline lambdas into named, testable, reusable functions. Bind them in `DEFAULT_GUARDS` by reference.

**Files:** `src/utilities/lifecycle.ts`

**Changes:**
- Extract `requiresTransferId()`, `requiresNoActiveTransfer()`, `requiresReasonResolved()`, `requiresTransferCompleted()` as named exports
- `DEFAULT_GUARDS` references these by name instead of defining inline
- Add TSDoc to each guard function explaining the business rule

**Acceptance Criteria:**
- [ ] Each guard is independently importable and testable
- [ ] `DEFAULT_GUARDS` uses named references (no inline lambdas)
- [ ] TSDoc on each guard explains the precondition in business terms

**Tests:** 4 isolated guard function tests (separate from validator integration tests)

---

### S1-T3: Centralized MicroUSD Arithmetic (BB-C4-ADV-006)

**Description:** Add utility functions for safe micro-USD arithmetic using BigInt, preventing the `parseInt` footgun across consumers.

**Files:** `src/vocabulary/currency.ts`, `src/index.ts`

**Changes:**
- Add `addMicro(a: string, b: string): string`
- Add `subtractMicro(a: string, b: string): string` with underflow guard
- Add `multiplyBps(amount: string, bps: number): string` — `(BigInt(amount) * BigInt(bps)) / 10000n`
- Add `compareMicro(a: string, b: string): -1 | 0 | 1`
- Add `ZERO_MICRO: '0'` constant
- Export all from barrel

**Acceptance Criteria:**
- [ ] `multiplyBps('1000000', 15000)` returns `'1500000'` (1.5x markup)
- [ ] `subtractMicro('100', '200')` throws (underflow protection)
- [ ] `addMicro('999999999999999999', '1')` returns `'1000000000000000000'` (no precision loss)
- [ ] All functions handle string-encoded integers only (reject non-numeric strings)

**Tests:** 12+ tests covering arithmetic, edge cases (zero, max safe int, overflow), underflow protection

---

### S1-T4: Billing Validation Pipeline (BB-C4-ADV-003)

**Description:** Create a composed validation function that chains TypeBox schema validation with cross-field validation, making the full validation discoverable.

**Files:** `src/validators/billing.ts` (new), `src/validators/index.ts`, `src/index.ts`

**Changes:**
- Create `validateBillingEntryFull(data: unknown): { valid: true; entry: BillingEntry } | { valid: false; errors: string[] }`
- Chains: TypeBox schema validation → `validateBillingEntry()` cross-field check
- Export from barrel
- Add to `validators` object

**Acceptance Criteria:**
- [ ] Invalid schema (missing field) → returns schema validation error
- [ ] Valid schema, bad arithmetic → returns cross-field error
- [ ] Valid everything → returns typed `BillingEntry`
- [ ] Consumer calls ONE function, not two

**Tests:** 6+ tests covering schema failure, cross-field failure, success, edge cases

---

### S1-T5: Wire check-migration.ts into CI (BB-C4-ADV-007)

**Description:** Add check-migration.ts to package.json scripts and create a `check:all` aggregation script.

**Files:** `package.json`

**Changes:**
- Add `"check:migration": "tsx scripts/check-migration.ts"`
- Add `"check:all": "npm run schema:check && npm run vectors:check && npm run check:migration"`
- Document in MIGRATION.md that `npm run check:all` is the RTFM gate

**Acceptance Criteria:**
- [ ] `npm run check:migration` passes
- [ ] `npm run check:all` runs all three checks
- [ ] MIGRATION.md references the CI command

---

### S1-T6: Version Bump to v2.4.0

**Description:** Bump version and update changelog.

**Files:** `src/version.ts`, `package.json`, `vectors/VERSION`, `SCHEMA-CHANGELOG.md`

**Acceptance Criteria:**
- [ ] `CONTRACT_VERSION = '2.4.0'`
- [ ] `npm run check:all` passes
- [ ] SCHEMA-CHANGELOG v2.4.0 section added

---

## Sprint 2: Multi-Model Topology & Saga Resilience (v2.4.0)

> *"Namespace reservation costs nothing when the ecosystem is small and prevents everything when the ecosystem is large."*

### Goal
Prepare the protocol for the Hounfour's multi-model routing by establishing model metadata conventions, add compensation failure invariants to choreography, and generate visual documentation.

### S2-T1: Model Metadata Namespace (BB-C4-ADV-004)

**Description:** Reserve `model.*` metadata namespace for model-provenance tracking. Add vocabulary entries and document conventions.

**Files:** `src/vocabulary/metadata.ts`, `src/index.ts`

**Changes:**
- Add `model.id`, `model.provider`, `model.thinking_trace_available`, `model.context_window_used` to `METADATA_NAMESPACES`
- Add `MODEL_METADATA_KEYS` constant with descriptions
- Document in metadata.ts TSDoc that `model.*` is reserved for the Hounfour's multi-model routing layer

**Acceptance Criteria:**
- [ ] `METADATA_NAMESPACES` includes `model` alongside existing `loa`, `trace`, `x-`
- [ ] `MODEL_METADATA_KEYS` documents each key with type and description
- [ ] TSDoc references [The Hounfour RFC](https://github.com/0xHoneyJar/loa-finn/issues/31)

**Tests:** 3+ tests verifying namespace registration and key validation

---

### S2-T2: Transfer Compensation Invariants (BB-C4-ADV-002)

**Description:** Add `TRANSFER_INVARIANTS` constant alongside `TRANSFER_CHOREOGRAPHY` documenting safety properties that must hold regardless of event ordering or compensation failure.

**Files:** `src/vocabulary/transfer-choreography.ts`, `src/index.ts`

**Changes:**
- Add `TransferInvariant` interface: `{ description: string; enforceable: boolean; enforcement_mechanism: string }`
- Add `TRANSFER_INVARIANTS` constant per scenario
- Document: billing atomicity (void MUST succeed), seal permanence, terminal event exactly-once, compensation retry semantics
- Export from barrel

**Acceptance Criteria:**
- [ ] Each scenario has at least 2 invariants
- [ ] `sale` invariants include billing atomicity
- [ ] All scenarios include terminal event exactly-once
- [ ] TSDoc explains what happens when compensation itself fails

**Tests:** 5+ tests verifying invariant structure and cross-referencing with choreography

---

### S2-T3: Choreography Mermaid Diagram Generation (BB-C4-ADV-008)

**Description:** Create a script that generates Mermaid sequence diagrams from `TRANSFER_CHOREOGRAPHY`.

**Files:** `scripts/generate-choreography-diagrams.ts` (new)

**Changes:**
- Read `TRANSFER_CHOREOGRAPHY` at build time
- Generate a Mermaid sequence diagram per scenario (forward + compensation)
- Output to `docs/choreography/` as `.md` files with embedded Mermaid
- Add `"docs:choreography": "tsx scripts/generate-choreography-diagrams.ts"` to package.json

**Acceptance Criteria:**
- [ ] Generates 4 Mermaid diagrams (sale, gift, admin_recovery, custody_change)
- [ ] Each diagram shows forward path with green arrows and compensation with red
- [ ] Diagrams render correctly in GitHub markdown
- [ ] Script is idempotent (re-running produces identical output)

**Tests:** 1 snapshot test verifying diagram output hasn't drifted

---

### S2-T4: CreditNote Invariant Documentation (BB-ADV-003)

**Description:** Document CreditNote business invariants in schema description and MIGRATION.md.

**Files:** `src/schemas/billing-entry.ts`, `MIGRATION.md`

**Changes:**
- Add TSDoc to `CreditNoteSchema` documenting: no over-credit (sum of credits ≤ original entry total), referential integrity (referenced billing entry must exist), at-most-one void per entry
- Add CreditNote section to MIGRATION.md consumer guidance

**Acceptance Criteria:**
- [ ] CreditNote schema has `$comment` listing invariants
- [ ] MIGRATION.md includes CreditNote cross-field validation guidance
- [ ] Invariants documented but NOT enforced at schema level (service-layer responsibility)

---

### S2-T5: tool_calls model_source Field

**Description:** Add optional `model_source` field to tool call sub-objects for multi-model debugging.

**Files:** `src/schemas/conversation.ts`

**Changes:**
- Add `model_source: Type.Optional(Type.String({ description: 'Model that generated this tool call' }))` to tool_calls sub-object
- Update generated schemas

**Acceptance Criteria:**
- [ ] Field is optional (no breaking change)
- [ ] Existing tool_calls without `model_source` still validate
- [ ] JSON schema regenerated and verified

**Tests:** 2 tests: with and without model_source

---

### S2-T6: SCHEMA-CHANGELOG v2.4.0 Finalization

**Description:** Complete the v2.4.0 changelog section with all sprint 1-2 changes.

**Files:** `SCHEMA-CHANGELOG.md`

---

## Sprint 3: The v3.0.0 Breaking Release — The Sovereignty Release

> *"Major versions are the protocol's constitutional amendments. Every one should be necessary, documented, and irreversible."*

### Goal
Execute the v3.0.0 breaking changes: remove deprecated `previous_owner_access`, replace with richer `access_policy`, update MIN_SUPPORTED_VERSION, and ensure all consumers have migration guidance.

### S3-T1: AccessPolicy Schema (replaces previous_owner_access)

**Description:** Design and implement the `AccessPolicySchema` that replaces the deprecated `previous_owner_access` field on `ConversationSealingPolicy`.

**Files:** `src/schemas/conversation.ts`, `src/index.ts`

**Changes:**
- Create `AccessPolicySchema` with fields:
  - `type`: `'none' | 'read_only' | 'time_limited' | 'role_based'`
  - `duration_hours`: optional integer (for time_limited)
  - `roles`: optional array of strings (for role_based)
  - `audit_required`: boolean
  - `revocable`: boolean (can the new owner revoke access?)
- Remove `previous_owner_access` from `ConversationSealingPolicySchema`
- Add `access_policy: Type.Optional(AccessPolicySchema)` to `ConversationSealingPolicySchema`
- Update `validateSealingPolicy()` for new field

**Acceptance Criteria:**
- [ ] `previous_owner_access` field removed (BREAKING)
- [ ] `AccessPolicySchema` supports 4 access types
- [ ] Time-limited access has duration validation
- [ ] Role-based access has non-empty roles validation
- [ ] Cross-field: time_limited requires duration_hours, role_based requires roles

**Tests:** 10+ tests covering each access type, cross-field validation, backward incompat detection

---

### S3-T2: Major Version Bump

**Description:** Bump to v3.0.0, update MIN_SUPPORTED_VERSION, update all version references.

**Files:** `src/version.ts`, `package.json`, `vectors/VERSION`

**Changes:**
- `CONTRACT_VERSION = '3.0.0'`
- `MIN_SUPPORTED_VERSION = '2.4.0'` (support N-1 minor of previous major)
- `package.json` version `"3.0.0"`
- `vectors/VERSION` → `3.0.0`

**Acceptance Criteria:**
- [ ] `npm run semver:check` detects major bump
- [ ] `npm run vectors:check` passes
- [ ] `npm run check:all` passes

---

### S3-T3: v3.0.0 Migration Guide

**Description:** Update MIGRATION.md with v2→v3 migration guide including the `previous_owner_access` → `access_policy` migration path.

**Files:** `MIGRATION.md`, `SCHEMA-CHANGELOG.md`

**Changes:**
- Add "## v2 → v3 Migration" section to MIGRATION.md
- Document the field removal and replacement with code examples
- TypeScript migration: search-and-replace pattern
- Go migration: struct field rename pattern
- Python migration: Pydantic model update pattern
- Update consumer upgrade matrix

**Acceptance Criteria:**
- [ ] Before/after code examples for TypeScript, Go, Python
- [ ] Breaking change clearly identified with rationale
- [ ] `npm run check:migration` passes with new schema

---

### S3-T4: Update Golden Vectors for v3.0.0

**Description:** Update all conversation and sealing policy vectors to use `access_policy` instead of `previous_owner_access`.

**Files:** `vectors/conversations/*.json`, `vectors/transfer/*.json`

**Changes:**
- Update conversation vectors to use new `access_policy` field
- Add vectors for each access type (none, read_only, time_limited, role_based)
- Add invalid access_policy vectors (time_limited without duration, role_based without roles)
- Remove any vectors using `previous_owner_access`

**Acceptance Criteria:**
- [ ] All vectors validate against v3.0.0 schemas
- [ ] At least 1 vector per access_policy type
- [ ] At least 2 invalid vectors for cross-field validation
- [ ] No reference to `previous_owner_access` in any vector

**Tests:** All existing conversation tests pass with updated vectors

---

### S3-T5: SCHEMA-CHANGELOG v3.0.0 & Final Checks

**Description:** Complete v3.0.0 changelog, run all checks, verify schema generation.

**Files:** `SCHEMA-CHANGELOG.md`

**Changes:**
- Add v3.0.0 section documenting breaking changes
- Run `npm run schema:generate && npm run check:all && npm test`
- Verify all 22+ schemas generated correctly

**Acceptance Criteria:**
- [ ] `npm test` passes (280+ tests expected)
- [ ] `npm run check:all` passes
- [ ] SCHEMA-CHANGELOG v3.0.0 section complete
- [ ] Generated JSON schemas reflect v3.0.0 changes

---

### S3-T6: Build & Publish Readiness

**Description:** Final pre-publish verification — build, test, schema generation, all checks.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm test` all passing
- [ ] `npm run schema:generate && npm run schema:check` passes
- [ ] `npm run check:all` passes
- [ ] `npm pack --dry-run` produces correct package contents

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| v3.0.0 breaking change breaks consumers | Medium | High | Comprehensive migration guide with code examples per language |
| Guard result type change breaks consumers | Low | Medium | `isValidTransitionResult()` convenience function for gradual migration |
| MicroUSD arithmetic edge cases | Low | High | Extensive golden vectors for arithmetic operations |
| AccessPolicy over-engineering | Medium | Low | Start with 4 types, extend later; no custom policy DSL |

## Success Metrics

| Metric | Target |
|--------|--------|
| Tests | 310+ (270 → 310, +40 new) |
| Schemas | 23+ (22 + AccessPolicy) |
| Bridge findings addressed | 10/10 from BB-C4-ADV backlog |
| Deprecations removed | 1 (`previous_owner_access`) |
| Breaking changes | 1 (v3.0.0 field removal + replacement) |
| CI checks | 4 (schema, vectors, migration, all) |
