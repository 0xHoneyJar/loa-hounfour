# Sprint Plan: loa-hounfour Protocol Types v2.0.0

**Cycle:** cycle-001 — Protocol Types v2.0.0
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Source:** [RFC loa-finn#66](https://github.com/0xHoneyJar/loa-finn/issues/66)
**Created:** 2026-02-13

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 5 |
| **Scope** | v2.0.0 only (v2.1.0/v2.2.0 in future cycles) |
| **Team** | 1 AI agent |
| **Operator** | Single-operator autonomous (via `/run sprint-plan`) |
| **Quality gates** | Review + Audit per sprint |

### Sprint Sequencing & Timeboxing

```
Sprint 1: Foundation (NftId, Lifecycle, AgentDescriptor)     ── 1 session
    ↓
Sprint 2: Billing (BillingEntry, CreditNote, allocation)     ── 1 session
    ↓
Sprint 3: Conversations & Transfers (Conv, Msg, Transfer, DomainEvent) ── 1 session
    ↓
Sprint 4: Integration (errors, validators, exports, JSON Schema)       ── 1 session
    ↓
Sprint 5: Quality (golden vectors, migration guide, CI pipeline)       ── 1-2 sessions
```

**Timebox unit:** 1 session = 1 `/run sprint-N` invocation (~200K context). Each sprint is scoped to complete within a single autonomous session except Sprint 5 which may require 2 sessions for the ~70 vector files.

Sprints 1-3 are schema sprints (can't parallelize — Sprint 2 depends on Sprint 1 utilities, Sprint 3 depends on Sprint 2 billing refs). Sprint 4 is the integration sprint that wires everything together. Sprint 5 is the quality sprint.

---

## Sprint 1: Foundation — Agent Identity & Lifecycle

**Goal:** Establish the foundational types that all other schemas depend on: NftId canonical format, agent lifecycle state machine, agent descriptor, and lifecycle transition utilities.

**Dependencies:** None (first sprint)

### Tasks

#### S1-T1: NftId Utility Module

**File:** `src/utilities/nft-id.ts`

**Description:** Create the canonical NFT identification utility with EIP-55 checksum support. This is the most depended-on module in v2.0.0 — every agent-related schema references NftId.

**Implementation details:**
- `NftIdSchema`: TypeBox `Type.String()` with pattern `^eip155:\d+\/0x[a-fA-F0-9]{40}\/\d+$`
- `NFT_ID_PATTERN`: Compiled regex for runtime parsing
- `parseNftId(id)`: Extract chainId, collection (checksummed), tokenId
- `formatNftId(chainId, collection, tokenId)`: Construct canonical NftId string
- `checksumCollection(address)`: EIP-55 mixed-case checksum encoding using Keccak-256
- `isValidNftId(id)`: Boolean predicate
- Keccak-256: Use `@noble/hashes/sha3` (`keccak_256` export, ~3KB) or vendored pure-JS implementation. **NOT** `node:crypto` SHA3-256 (different algorithm, wrong checksums).

**Acceptance criteria:**
- [ ] `parseNftId("eip155:80094/0xAbCdEf.../4269")` returns `{ chainId: 80094, collection: "0xAbCdEf...", tokenId: "4269" }`
- [ ] `parseNftId("invalid")` throws with descriptive error
- [ ] `formatNftId(80094, "0xabcdef...", "4269")` returns EIP-55 checksummed NftId
- [ ] `checksumCollection` matches canonical EIP-55 test vectors (at least 5 known addresses)
- [ ] `isValidNftId` returns true/false without throwing
- [ ] TypeBox schema validates correct NftId strings, rejects malformed ones
- [ ] **Strictness:** `parseNftId` accepts any valid hex address (lowercase, uppercase, or mixed-case) but `formatNftId` always outputs EIP-55 checksummed. Validation does NOT require checksum-correct input — it normalizes.
- [ ] **Scope:** tokenId is always decimal (no hex encoding). ERC-1155 is out of scope (HoneyJar is ERC-721 only). chainId must be positive integer.
- [ ] **Edge cases:** tokenId "0" is valid, leading zeros in tokenId are valid, max tokenId (uint256 range) is valid, empty collection address is invalid

**Testing:** 10 vectors (valid parsing, roundtrip, all-lowercase input, all-uppercase input, wrong checksum input normalizes, boundary tokenIds, invalid formats)

---

#### S1-T2: Agent Lifecycle State Machine

**File:** `src/schemas/agent-lifecycle.ts`

**Description:** Define the 6-state agent lifecycle enum and transition map. Used by AgentDescriptor and TransferSpec.

**Implementation details:**
- `AGENT_LIFECYCLE_STATES` array constant
- `AgentLifecycleStateSchema`: TypeBox `Type.Union()` of 6 `Type.Literal()` values
- `AGENT_LIFECYCLE_TRANSITIONS`: Typed constant mapping each state to valid target states
- `isValidTransition(from, to)`: Boolean validator

**Acceptance criteria:**
- [ ] All 6 states defined: DORMANT, PROVISIONING, ACTIVE, SUSPENDED, TRANSFERRED, ARCHIVED
- [ ] ARCHIVED is terminal (no valid transitions out)
- [ ] `isValidTransition('ACTIVE', 'SUSPENDED')` returns true
- [ ] `isValidTransition('ARCHIVED', 'ACTIVE')` returns false
- [ ] Schema validates valid state strings, rejects unknown strings

**Testing:** 8 vectors (valid states, invalid states, all valid transitions, all invalid transitions)

---

#### S1-T3: Lifecycle Transition Utility

**File:** `src/utilities/lifecycle.ts`

**Description:** Shared transition validation utility for agent lifecycle (v2.0.0) and later tool lifecycle (v2.1.0).

**Implementation details:**
- `createTransitionValidator<T extends string>(transitions: Record<T, readonly T[]>)`: Generic factory
- Returns `{ isValid(from, to): boolean; getValidTargets(from): readonly T[] }`
- Export pre-built `agentLifecycleValidator` using `AGENT_LIFECYCLE_TRANSITIONS`

**Acceptance criteria:**
- [ ] Generic factory works with any string union type
- [ ] `agentLifecycleValidator.isValid('DORMANT', 'PROVISIONING')` returns true
- [ ] `agentLifecycleValidator.getValidTargets('ACTIVE')` returns `['SUSPENDED', 'TRANSFERRED', 'ARCHIVED']`

**Testing:** Covered by S1-T2 lifecycle vectors

---

#### S1-T4: Agent Descriptor Schema

**File:** `src/schemas/agent-descriptor.ts`

**Description:** The canonical agent representation for content negotiation. Most complex new schema — references NftId, AgentLifecycleState, and PoolId.

**Implementation details:**
- `AgentStatsSchema`: Optional nested object (interactions, uptime, created_at, last_active)
- `AgentDescriptorSchema`: Full schema per SDD Section 4.3
- Imports: `NftIdSchema`, `AgentLifecycleStateSchema`, `PoolIdSchema`
- `@context` field: `Type.Literal('https://schema.honeyjar.xyz/agent/v1')`

**Acceptance criteria:**
- [ ] Schema compiles without TypeBox errors
- [ ] Valid descriptor with all fields passes validation
- [ ] Valid descriptor with only required fields passes validation
- [ ] Missing `capabilities` (required) fails validation
- [ ] Empty `capabilities` array fails validation (minItems: 1)
- [ ] Invalid `lifecycle_state` value fails validation
- [ ] `@context` must be exact literal string
- [ ] `models` values must be valid PoolId strings

**Testing:** 10 vectors (full valid, minimal valid, each required field missing, invalid values)

---

### Sprint 1 Summary

| Task | File | Est. Lines | Depends On |
|------|------|-----------|------------|
| S1-T1 | `src/utilities/nft-id.ts` | ~80 | None |
| S1-T2 | `src/schemas/agent-lifecycle.ts` | ~50 | None |
| S1-T3 | `src/utilities/lifecycle.ts` | ~30 | S1-T2 |
| S1-T4 | `src/schemas/agent-descriptor.ts` | ~80 | S1-T1, S1-T2 |
| **Total** | | **~240** | |

---

## Sprint 2: Billing — Multi-Party Cost Attribution

**Goal:** Replace the v1.1.0 `CostBreakdown` with `BillingEntry` + `CreditNote`, implement deterministic recipient allocation, and create the breaking changes to `InvokeResponse` and `UsageReport`.

**Dependencies:** Sprint 1 (NftId for `BillingEntry.nft_id`)

### Tasks

#### S2-T1: BillingEntry & CreditNote Schemas

**File:** `src/schemas/billing-entry.ts`

**Description:** Define the multi-party billing schema that replaces CostBreakdown. This is the key breaking change driving v2.0.0.

**Implementation details:**
- `MicroUsdSchema`: `Type.String({ pattern: '^[0-9]+$' })`
- `CostTypeSchema`: Union of 5 cost types
- `BillingRecipientSchema`: address, role, share_bps, amount_micro
- `BillingEntrySchema`: Full schema per SDD Section 4.5, including new `id` field (ULID)
- `CreditNoteSchema`: Reversal type per PRD FR4

**Acceptance criteria:**
- [ ] `BillingEntry.id` field exists (ULID, canonical identifier)
- [ ] `BillingEntry.trace_id` field exists (distributed tracing, separate from `id`)
- [ ] `recipients[].share_bps` validated as integer 0-10000
- [ ] `multiplier_bps` validated as integer 10000-100000
- [ ] `currency` locked to literal `"USD"`
- [ ] `precision` locked to literal `6`
- [ ] `rounding_policy` locked to literal `"largest_remainder"`
- [ ] `CreditNote.references_billing_entry` is required string
- [ ] `CreditNote.reason` is one of 4 valid values

**Testing:** 15 vectors (valid entry, valid minimal, invalid share_bps, invalid multiplier_bps, valid credit note, invalid reason, edge cases)

---

#### S2-T2: Billing Allocation Utilities

**File:** `src/utilities/billing.ts`

**Description:** Deterministic largest-remainder allocation and recipient validation.

**Implementation details:**
- `validateBillingRecipients(recipients, totalCostMicro)`: Checks share_bps sum and amount_micro sum
- `allocateRecipients(recipients, totalCostMicro)`: Largest-remainder algorithm using BigInt arithmetic
- All arithmetic uses `BigInt` to prevent floating-point issues

**Acceptance criteria:**
- [ ] `allocateRecipients` output amounts sum exactly to `totalCostMicro` (zero dust)
- [ ] Largest remainder goes to recipient with highest truncation remainder
- [ ] 2-party split: 60/40 of "100" → "60" / "40"
- [ ] 3-party split: 33.33/33.33/33.34 of "100" → "33" / "33" / "34" (largest remainder to third)
- [ ] Single recipient (10000 bps) gets full amount
- [ ] `validateBillingRecipients` returns errors for bps sum !== 10000
- [ ] `validateBillingRecipients` returns errors for amount sum !== total
- [ ] **Input convention:** `allocateRecipients` takes `share_bps` only; it computes `amount_micro`. Callers never provide `amount_micro` to `allocateRecipients` — the schema stores both fields but only `allocateRecipients` is the correct producer.
- [ ] **Zero total:** `allocateRecipients("0", recipients)` returns all recipients with `amount_micro: "0"` (no error)
- [ ] **Tie-breaking:** When two recipients have equal remainders, the one appearing first in the input array receives the extra micro-unit (deterministic by position)
- [ ] **Uniqueness:** Recipients are NOT required to have unique address+role pairs (same address can appear twice with different roles)

**Testing:** 8 vectors (2-party, 3-party, single, edge amounts, zero total, equal-remainder tie-break, validation failures)

---

#### S2-T3: InvokeResponse Breaking Change

**File:** `src/schemas/invoke-response.ts` (MODIFY)

**Description:** Remove `CostBreakdownSchema` and `CostBreakdown` type. Replace `cost` field with `billing_entry_id`. Update `UsageReport` similarly.

**Implementation details:**
- Remove: `CostBreakdownSchema`, `CostBreakdown` type export
- Keep: `UsageSchema`, `Usage` type export (still used by BillingEntry.usage)
- Add: `billing_entry_id: Type.String({ minLength: 1 })` to `InvokeResponseSchema`
- Add: `billing_entry_id: Type.String({ minLength: 1 })` to `UsageReportSchema`
- `billing_entry_id` references `BillingEntry.id` (ULID), NOT `trace_id`

**Acceptance criteria:**
- [ ] `CostBreakdownSchema` removed from file
- [ ] `CostBreakdown` type removed from exports
- [ ] `UsageSchema` and `Usage` still exported
- [ ] `InvokeResponse` has `billing_entry_id: string` field
- [ ] `UsageReport` has `billing_entry_id: string` field
- [ ] Existing InvokeResponse tests updated for new shape
- [ ] Existing budget test vectors updated for breaking change

**Testing:** Update existing vectors + 2 new migration vectors

---

### Sprint 2 Summary

| Task | File | Est. Lines | Depends On |
|------|------|-----------|------------|
| S2-T1 | `src/schemas/billing-entry.ts` | ~120 | S1-T1 (NftId) |
| S2-T2 | `src/utilities/billing.ts` | ~60 | S2-T1 |
| S2-T3 | `src/schemas/invoke-response.ts` | ~-20 (net) | S2-T1 |
| **Total** | | **~160** | |

---

## Sprint 3: Conversations, Transfers & Events

**Goal:** Define conversation/message types, transfer spec/events, and the cross-cutting DomainEvent envelope. Completes all v2.0.0 schema files.

**Dependencies:** Sprint 1 (NftId, lifecycle), Sprint 2 (billing refs)

### Tasks

#### S3-T1: Conversation & Message Schemas

**File:** `src/schemas/conversation.ts`

**Description:** Conversation and Message types per SDD Section 4.6b. Conversations belong to the NFT, not the user.

**Implementation details:**
- `ConversationStatusSchema`: Union of 4 statuses (active, paused, sealed, archived)
- `ConversationSealingPolicySchema`: encryption_scheme, key_derivation, key_reference, access_audit, previous_owner_access
- `ConversationSchema`: Full schema with nft_id, status, sealing_policy, timestamps
- `MessageRoleSchema`: Union of 4 roles (user, assistant, system, tool)
- `MessageSchema`: Full schema with conversation_id, role, content, tool_calls, billing_entry_id

**Acceptance criteria:**
- [ ] `Conversation.nft_id` uses `NftIdSchema` (not plain string)
- [ ] `Conversation.sealing_policy` is optional
- [ ] `ConversationSealingPolicy.encryption_scheme` validates "aes-256-gcm" | "none"
- [ ] `ConversationSealingPolicy.previous_owner_access` validates "none" | "read_only_24h"
- [ ] `Message.tool_calls` is optional array with id, name, arguments
- [ ] `Message.billing_entry_id` is optional (only assistant/tool messages have billing)
- [ ] All datetime fields validate as ISO format strings
- [ ] **Sealing policy required fields:** When `encryption_scheme !== "none"`, `key_derivation` must also be non-"none" and `key_reference` must be provided (TypeBox conditional validation or documented invariant with dedicated validator)
- [ ] **Sealing policy edge cases:** `encryption_scheme: "none"` with `key_reference` present is valid (ignored). `access_audit: true` without encryption is valid (audits unencrypted access).

**Testing:** 12 vectors (valid conversation, valid message, sealed conversation, message with tool_calls, invalid status, invalid role, sealing with encryption, sealing without encryption, missing key_reference when encrypted)

---

#### S3-T2: Transfer Spec & Events

**File:** `src/schemas/transfer-spec.ts`

**Description:** Transfer specification and event schemas per SDD Section 4.6c. Defines the transfer scenarios and their outcomes.

**Implementation details:**
- `TransferScenarioSchema`: Union of 4 scenarios (sale, gift, admin_recovery, custody_change)
- `TransferResultSchema`: Union of 3 results (completed, failed, rolled_back)
- `TransferSpecSchema`: transfer_id, nft_id, from_owner, to_owner, scenario, sealing_policy
- `TransferEventSchema`: Extends TransferSpec with result, conversations_sealed/migrated counts, completed_at
- **Naming convention:** The schema type is `TransferEventRecord` (per SDD) to avoid collision with `TransferEvent` DomainEvent typed wrapper in domain-event.ts. Barrel export will export both — `TransferEventRecord` (schema) and `TransferEvent` (DomainEvent wrapper).

**Acceptance criteria:**
- [ ] `TransferSpec.from_owner` and `to_owner` validate Ethereum address pattern
- [ ] `TransferSpec.sealing_policy` uses `ConversationSealingPolicySchema` (imported from conversation.ts)
- [ ] `TransferEvent.conversations_sealed` is non-negative integer
- [ ] `TransferEvent.result` validates the 3 result values
- [ ] `TransferEvent.completed_at` is optional (null if still in progress)

**Testing:** 8 vectors (valid spec, valid event per scenario, failed transfer, invalid addresses)

---

#### S3-T3: Domain Event Envelope

**File:** `src/schemas/domain-event.ts`

**Description:** Generic event envelope for cross-service audit consistency per SDD Section 4.7.

**Implementation details:**
- `AggregateTypeSchema`: Union of 6 aggregate types
- `DomainEventSchema`: TypeBox schema with `Type.Unknown()` payload
- `DomainEvent<T>`: Generic TypeScript type (`Omit<Static<...>, 'payload'> & { payload: T }`)
- Typed wrappers: `AgentEvent`, `BillingEvent`, `ConversationEvent`, `TransferEvent`
- Event type pattern: `^[a-z]+\.[a-z_]+\.[a-z_]+$`

**Acceptance criteria:**
- [ ] Schema validates envelope structure with any payload
- [ ] Generic `DomainEvent<T>` type compiles correctly
- [ ] Typed wrappers compile and narrow payload type
- [ ] `type` field validates naming convention pattern
- [ ] `version` is positive integer (minimum: 1)
- [ ] `correlation_id` and `causation_id` are optional

**Testing:** 5 vectors (valid event per aggregate type, invalid type pattern, invalid version)

---

### Sprint 3 Summary

| Task | File | Est. Lines | Depends On |
|------|------|-----------|------------|
| S3-T1 | `src/schemas/conversation.ts` | ~100 | S1-T1 (NftId) |
| S3-T2 | `src/schemas/transfer-spec.ts` | ~90 | S1-T2 (lifecycle), S3-T1 (sealing policy) |
| S3-T3 | `src/schemas/domain-event.ts` | ~40 | None |
| **Total** | | **~230** | |

---

## Sprint 4: Integration — Wiring Everything Together

**Goal:** Connect all new schemas to the existing package infrastructure: error codes, validators, barrel exports, JSON Schema generation, and package.json version bump.

**Dependencies:** Sprints 1-3 (all schemas must exist)

### Tasks

#### S4-T1: New Error Codes

**File:** `src/vocabulary/errors.ts` (MODIFY)

**Description:** Add 7 new v2.0.0 error codes to the existing ERROR_CODES object and ERROR_HTTP_STATUS mapping.

**Implementation details:**
- Add to `ERROR_CODES`: AGENT_NOT_FOUND, AGENT_NOT_ACTIVE, AGENT_TRANSFER_IN_PROGRESS, CONVERSATION_SEALED, CONVERSATION_NOT_FOUND, OWNERSHIP_MISMATCH, BILLING_RECIPIENTS_INVALID
- Add to `ERROR_HTTP_STATUS`: 404, 403, 409, 403, 404, 403, 400 respectively

**Acceptance criteria:**
- [ ] 7 new error codes added (total: 38)
- [ ] Each error code has corresponding HTTP status mapping
- [ ] Existing 31 error codes unchanged
- [ ] TypeScript union type includes new codes

**Testing:** Verify error code count and HTTP status mapping in Sprint 5 vectors

---

#### S4-T2: Lazy-Compiled Validators

**File:** `src/validators/index.ts` (MODIFY)

**Description:** Add lazy-compiled `TypeCompiler.Compile()` validators for all new schemas.

**Implementation details:**
- Add validators: `agentDescriptor`, `billingEntry`, `creditNote`, `conversation`, `message`, `transferSpec`, `transferEvent`, `conversationSealingPolicy`, `domainEvent`
- Follow existing pattern: `() => TypeCompiler.Compile(Schema)`
- Import all new schemas

**Acceptance criteria:**
- [ ] 9 new validators added (total ~15)
- [ ] Lazy compilation — validator compiled only on first `.Check()` call
- [ ] Each validator correctly validates corresponding schema
- [ ] Existing validators unchanged and still functional

**Testing:** Each validator tested in Sprint 5 with at least 1 valid + 1 invalid input

---

#### S4-T3: Version Bump & Compatibility

**File:** `src/version.ts` (MODIFY)

**Description:** Bump contract version and minimum supported version.

**Implementation details:**
- `CONTRACT_VERSION = '2.0.0' as const`
- `MIN_SUPPORTED_VERSION = '2.0.0' as const`

**Acceptance criteria:**
- [ ] `CONTRACT_VERSION` is `'2.0.0'`
- [ ] `MIN_SUPPORTED_VERSION` is `'2.0.0'`
- [ ] Existing compatibility check functions work with new version

**Testing:** 2 vectors (version string match, compat check)

---

#### S4-T4: Barrel Exports

**File:** `src/index.ts` (MODIFY)

**Description:** Add all new schemas, types, utilities, and constants to the barrel export.

**Implementation details:**
- Export from `./schemas/agent-descriptor.js`
- Export from `./schemas/agent-lifecycle.js`
- Export from `./schemas/transfer-spec.js`
- Export from `./schemas/billing-entry.js`
- Export from `./schemas/conversation.js`
- Export from `./schemas/domain-event.js`
- Export from `./utilities/nft-id.js`
- Export from `./utilities/lifecycle.js`
- Export from `./utilities/billing.js`
- ~40 new named exports

**Acceptance criteria:**
- [ ] All new schemas importable from package root
- [ ] All new types importable from package root
- [ ] All new utility functions importable from package root
- [ ] Existing exports unchanged
- [ ] No circular dependency issues (`tsc --noEmit` passes)

**Testing:** Compile check (tsc --noEmit); import check in Sprint 5

---

#### S4-T5: JSON Schema Generation

**File:** `scripts/generate-schemas.ts` (MODIFY)

**Description:** Register all new schemas in the JSON Schema generation script.

**Implementation details:**
- Add 8 new entries to `schemasToGenerate` array (per SDD Section 9.2)
- Generate `schemas/index.json` manifest
- All `$ref` references resolved inline (self-contained files)

**Acceptance criteria:**
- [ ] `pnpm run schema:generate` produces 8 new `.schema.json` files
- [ ] `schemas/index.json` manifest lists all schemas with version
- [ ] Each JSON Schema file is valid Draft 2020-12
- [ ] No external `$ref` — all references inlined
- [ ] Existing schemas still generated correctly

**Testing:** `pnpm run schema:check` passes

---

#### S4-T6: Package.json Updates

**File:** `package.json` (MODIFY)

**Description:** Bump version and add schema export paths.

**Implementation details:**
- Version: `"2.0.0"`
- Add `exports` entries for `"./schemas/*": "./schemas/*"`
- Verify `engines.node` still `">=22"`

**Acceptance criteria:**
- [ ] `version` is `"2.0.0"`
- [ ] `exports["./schemas/*"]` maps to `"./schemas/*"`
- [ ] No new runtime dependencies added
- [ ] `pnpm run build` succeeds

**Testing:** Build verification

---

### Sprint 4 Summary

| Task | File | Est. Lines | Depends On |
|------|------|-----------|------------|
| S4-T1 | `src/vocabulary/errors.ts` | ~+20 | None |
| S4-T2 | `src/validators/index.ts` | ~+20 | S1-S3 (all schemas) |
| S4-T3 | `src/version.ts` | ~2 | None |
| S4-T4 | `src/index.ts` | ~+40 | S1-S3 (all schemas) |
| S4-T5 | `scripts/generate-schemas.ts` | ~+20 | S4-T4 |
| S4-T6 | `package.json` | ~+5 | S4-T3 |
| **Total** | | **~107** | |

---

## Sprint 5: Quality — Golden Test Vectors & Migration Guide

**Goal:** Create comprehensive golden test vectors for all new schemas, update existing vectors for breaking changes, and write the migration guide. This sprint ensures v2.0.0 meets the quality bar set by v1.1.0's 91 vectors.

**Dependencies:** Sprint 4 (all schemas integrated and exportable)

### Tasks

#### S5-T1: Agent Test Vectors

**Files:**
- `vectors/agent/descriptor-valid.json`
- `vectors/agent/descriptor-invalid.json`
- `vectors/agent/lifecycle-transitions.json`
- `vectors/agent/nft-id-parsing.json`
- `tests/vectors/agent-descriptor.test.ts`
- `tests/vectors/agent-lifecycle.test.ts`
- `tests/vectors/nft-id.test.ts`

**Description:** Golden vectors for AgentDescriptor, AgentLifecycleState, and NftId.

**Acceptance criteria:**
- [ ] ~26 vectors covering: valid descriptors (full + minimal), each required field missing, each validation rule, lifecycle transitions (all valid + invalid), NftId parsing (valid formats, checksum verification, roundtrip, invalid formats)
- [ ] All tests pass with `pnpm run test`
- [ ] Vectors are JSON files consumable by other languages

**Testing:** Self-testing (these ARE the tests)

---

#### S5-T2: Billing Test Vectors

**Files:**
- `vectors/billing/entry-valid.json`
- `vectors/billing/entry-invalid.json`
- `vectors/billing/credit-note-valid.json`
- `vectors/billing/recipient-allocation.json`
- `vectors/billing/migration-from-v1.json`
- `tests/vectors/billing-entry.test.ts`
- `tests/vectors/billing-allocation.test.ts`

**Description:** Golden vectors for BillingEntry, CreditNote, and allocation utilities. This is the highest-priority test area (financial correctness).

**Acceptance criteria:**
- [ ] ~21 vectors covering: valid entries (all cost types), invalid share_bps (sum !== 10000), invalid multiplier_bps (out of range), credit note (all reasons), allocation (2-party, 3-party, single, edge amounts, zero dust guarantee), migration before/after
- [ ] All BigInt arithmetic produces deterministic results
- [ ] Allocation vectors verify exact micro-USD amounts (no rounding drift)

**Testing:** Self-testing

---

#### S5-T3: Conversation & Transfer Test Vectors

**Files:**
- `vectors/conversation/conversation-valid.json`
- `vectors/conversation/message-valid.json`
- `vectors/conversation/sealing-scenarios.json`
- `vectors/transfer/events-valid.json`
- `vectors/transfer/scenarios.json`
- `tests/vectors/conversation.test.ts`
- `tests/vectors/transfer-spec.test.ts`

**Description:** Golden vectors for Conversation, Message, ConversationSealingPolicy, TransferSpec, and TransferEvent.

**Acceptance criteria:**
- [ ] ~18 vectors covering: valid conversations (active, sealed, archived), messages (all roles, with tool_calls), sealing policies (encrypted + unencrypted), transfers (all scenarios), transfer results (completed, failed, rolled_back)
- [ ] Sealed conversations have sealed_at timestamp set
- [ ] Transfer events reference valid sealing policies

**Testing:** Self-testing

---

#### S5-T4: Domain Event & Error Code Test Vectors

**Files:**
- `vectors/domain-event/event-valid.json`
- `vectors/domain-event/naming-conventions.json`
- `tests/vectors/domain-event.test.ts`

**Description:** Golden vectors for DomainEvent envelope and new error codes.

**Acceptance criteria:**
- [ ] ~5 vectors covering: one valid event per aggregate type, invalid type pattern, invalid version
- [ ] Event naming convention validated: `{aggregate}.{entity}.{verb}`
- [ ] Error code count validated: 38 total (31 existing + 7 new)

**Testing:** Self-testing

---

#### S5-T5: Migration Guide

**File:** `MIGRATION.md` (in package root, included in npm publish)

**Description:** Produce a standalone migration guide for downstream developers upgrading from v1.1.0 to v2.0.0. This is a stated success criterion in the PRD.

**Implementation details:**
- Breaking changes table with before/after code snippets
- `CostBreakdown` → `BillingEntry` field-by-field mapping
- `InvokeResponse.cost` → `InvokeResponse.billing_entry_id` example
- `UsageReport.cost` → `UsageReport.billing_entry_id` example
- New type imports checklist
- `allocateRecipients()` usage example

**Acceptance criteria:**
- [ ] `MIGRATION.md` exists at package root
- [ ] Covers all 5 breaking changes from SDD Section 11.1
- [ ] Includes runnable before/after TypeScript code examples
- [ ] References BillingEntry.id (ULID) as the canonical identifier (not trace_id)

**Testing:** Human-readable document; no automated tests

---

#### S5-T6: Update Existing Test Vectors

**Files:**
- `tests/vectors/budget.test.ts` (MODIFY)
- Existing `vectors/budget/*.json` (MODIFY)

**Description:** Update existing v1.1.0 test vectors that reference CostBreakdown to use the new billing_entry_id field.

**Acceptance criteria:**
- [ ] All existing 91 vectors still pass (with updates for breaking changes)
- [ ] Budget vectors use `billing_entry_id` instead of `cost: CostBreakdown`
- [ ] No false positives from stale test data

**Testing:** `pnpm run test` — all green

---

#### S5-T7: Full CI Pipeline Verification

**Description:** Run the complete CI pipeline to verify everything works end-to-end.

**Acceptance criteria:**
- [ ] `pnpm run typecheck` passes (strict mode, no errors)
- [ ] `pnpm run build` produces clean dist/ output
- [ ] `pnpm run test` all vectors pass (~160+ total: 91 existing + ~70 new)
- [ ] `pnpm run schema:generate` produces all JSON Schema files
- [ ] `pnpm run schema:check` validates generated schemas
- [ ] No circular dependencies, no `any` types, no implicit returns

**Testing:** Full pipeline run

---

### Sprint 5 Summary

| Task | Files | Est. Vectors | Depends On |
|------|-------|-------------|------------|
| S5-T1 | 7 files | ~26 | Sprint 1 schemas |
| S5-T2 | 7 files | ~21 | Sprint 2 schemas |
| S5-T3 | 7 files | ~18 | Sprint 3 schemas |
| S5-T4 | 3 files | ~5 | Sprint 3 (DomainEvent) |
| S5-T5 | 1 file | - | All sprints |
| S5-T6 | 2+ files | ~0 (updates) | All sprints |
| S5-T7 | - | - | All sprints |
| **Total** | | **~70 new** | |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| EIP-55 Keccak implementation | Blocks Sprint 1 | Low | Use audited @noble/hashes; test against known vectors |
| TypeBox `@context` field | Blocks S1-T4 | Low | Verified: TypeBox supports arbitrary string keys |
| Breaking change to invoke-response | Breaks existing tests | Certain | S2-T3 handles carefully; S5-T5 updates vectors |
| 70 new vectors is significant | Effort overrun in Sprint 5 | Medium | Prioritize billing + lifecycle first (financial impact) |
| JSON Schema generation for new types | May need script modifications | Low | TypeBox's JSON Schema output is well-tested |

---

## Success Criteria (Cycle Complete)

- [ ] `@0xhoneyjar/loa-hounfour@2.0.0` publishable to npm
- [ ] CONTRACT_VERSION = "2.0.0"
- [ ] ~160+ golden test vectors passing (91 existing + ~70 new)
- [ ] Zero type definitions requiring downstream repos to invent their own
- [ ] JSON Schema files generated for all new types
- [ ] Migration guide with before/after examples
- [ ] Clean `pnpm run typecheck && pnpm run build && pnpm run test`

---

## Flatline Review Decisions

### HIGH_CONSENSUS (Auto-Integrated)

| ID | Finding | Integration |
|----|---------|-------------|
| IMP-001 (835) | No timebox/duration per sprint | Added session-based timeboxing in Sprint Sequencing section |
| IMP-003 (860) | Migration guide missing as explicit task | Added S5-T5: Migration Guide with acceptance criteria |
| IMP-008 (825) | TransferEvent naming collision with DomainEvent wrapper | Clarified: schema type = `TransferEventRecord`, DomainEvent wrapper = `TransferEvent` |
| IMP-010 (870) | Template artifacts (false positive) | Overridden — orchestrator template injection artifact |

### BLOCKERS (Human Decisions)

| ID | Concern | Decision | Rationale |
|----|---------|----------|-----------|
| SKP-001 (920) | Template artifacts | **OVERRIDDEN** — false positive | Flatline sees orchestrator template markers, not actual document |
| SKP-002 (880) | Single AI agent quality risk | **OVERRIDDEN** | Review + Audit quality gates per sprint; `/run` enforces implement→review→audit cycle |
| SKP-003 (760) | NftId format assumptions | **ACCEPTED** | Added edge case vectors: all-lowercase, all-uppercase, boundary tokenIds, ERC-721 scope |
| SKP-004 (740) | EIP-55 checksum strictness | **ACCEPTED** | Added parse/format strictness rules: parse normalizes, format checksums |
| SKP-005 (900) | Billing allocation rules incomplete | **ACCEPTED** | Added: shares-only input convention, zero total handling, tie-breaking rule, uniqueness policy |
| SKP-008 (780) | Sealing policy lacks concrete requirements | **ACCEPTED** | Added: required fields when encryption enabled, edge case vectors |
