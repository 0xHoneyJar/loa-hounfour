# Schema Changelog

Per-schema evolution tracking for `@0xhoneyjar/loa-hounfour`. Each entry records what changed, when, and why — enabling consumers to answer "what's different between versions?" at the schema level.

> Inspired by Confluent's Schema Registry for Kafka, which tracks schema evolution across versions and enforces compatibility rules.

---

## v2.3.0 (Unreleased)

**Theme:** Protocol Resilience & Completeness — schema evolution strategy, saga choreography, capability-discovery composition, lifecycle guards.

### ProtocolDiscovery
- **Added:** `capabilities_url` optional field — URI pointer to capability negotiation endpoint, connecting discovery to capability queries (BB-POST-003)

### Vocabulary Additions
- `TRANSFER_CHOREOGRAPHY` — expected event sequences per `TransferScenario` with forward and compensation paths (BB-POST-002)

### Utility Additions
- `validateBillingEntry()` — cross-field validation: `total_cost_micro === raw_cost_micro * multiplier_bps / 10000` plus recipient invariants (BB-POST-001)
- `DEFAULT_GUARDS` — lifecycle transition guard predicates for `createTransitionValidator()` (BB-POST-004)
- `TransitionGuard` type — guard predicate signature for state machine transitions (BB-POST-004)
- `createTransitionValidator()` — now accepts optional `guards` parameter (BB-POST-004)

### Documentation
- Schema evolution migration strategy document (`MIGRATION.md`) with consumer upgrade matrix and `additionalProperties` policy catalog (BB-POST-001)
- Lifecycle guard condition TSDoc on `AGENT_LIFECYCLE_TRANSITIONS` with Kubernetes pod lifecycle parallels (BB-POST-004)

---

## v2.2.0

**Theme:** Post-Flatline Deep Excellence — trust boundaries, vocabulary, structured events, capability negotiation, and schema discovery.

### DomainEvent
- **Enhanced:** `metadata` description now includes namespace conventions: `loa.*` (protocol), `trace.*` (OpenTelemetry), `x-*` (consumer) — BB-V3-001

### DomainEventBatch
- **Added:** `context` optional field — envelope-level routing context (`transfer_id`, `aggregate_id`, `aggregate_type`) avoids payload inspection (BB-V3-010)
- **Added:** `saga` optional field — saga execution context with `saga_id`, `step`, `direction` (forward/compensation) for distributed saga tracking (BB-V3-012)

### SagaContext (NEW)
- Saga execution context for multi-step distributed operations (BB-V3-012)
- Fields: `saga_id`, `step`, `total_steps`, `direction` (forward | compensation)

### LifecycleTransitionPayload
- **Added:** `reason_code` optional field — machine-readable Kubernetes-style reason code for filtering and monitoring (BB-V3-009)
- **Enhanced:** `reason` description clarified as human-readable (was ambiguous)

### ConversationSealingPolicy
- **Added:** `$comment` documenting cross-field invariant for cross-language consumers (BB-V3-008)
- **Added:** JSON Schema `if/then` conditional validation for encryption → key_derivation constraint (BB-V3-008)
- **Deprecated:** `previous_owner_access` field — will be replaced by richer `access_policy` in v3.0.0 (BB-V3-004)

### BillingEntry
- **Enhanced:** `metadata` description now includes namespace conventions (BB-V3-001)

### InvokeResponse
- **Enhanced:** `metadata` description now includes namespace conventions (BB-V3-001)

### Capability (NEW)
- Agent capability descriptor: `skill_id`, `input_modes`, `output_modes`, `models`, `max_latency_ms` (BB-V3-005)

### CapabilityQuery (NEW)
- Capability discovery query: `required_skills`, `preferred_models`, `max_latency_ms`, `min_context_tokens` (BB-V3-005)
- `additionalProperties: true` for future extensibility

### CapabilityResponse (NEW)
- Response to capability query: `agent_id`, `capabilities[]`, `available`, `contract_version` (BB-V3-005)

### ProtocolDiscovery (NEW)
- Schema discovery document for `/.well-known/loa-hounfour` convention (BB-V3-006)
- Fields: `contract_version`, `min_supported_version`, `schemas[]`, `supported_aggregates`
- Helper: `buildDiscoveryDocument()` generates from current package state

### Vocabulary Additions
- `METADATA_NAMESPACES` — reserved metadata namespace prefixes (BB-V3-001)
- `LIFECYCLE_REASON_CODES` — 10 canonical lifecycle transition reason codes (BB-V3-009)
- `EVENT_TYPES` — 20 canonical domain event types across 6 aggregates (BB-V3-011)

### Deprecation Convention
- Established TypeBox `deprecated: true` → JSON Schema `"deprecated": true` pipeline (BB-V3-004)
- Lifecycle: add deprecated → warn → remove at major version boundary
- Exemplar: `previous_owner_access` on ConversationSealingPolicy

---

## v2.1.0

**Theme:** Bridgebuilder Excellence Refinements — extending the protocol for observability, atomic delivery, and cross-language interoperability.

### DomainEvent
- **Added:** `metadata` optional field — consumer-extensible key-value metadata not validated by protocol contract (BB-ADV-001)

### DomainEventBatch (NEW)
- New schema for atomic multi-event delivery with shared `correlation_id` (BB-ADV-004)
- Fields: `batch_id`, `correlation_id`, `events[]`, `source`, `produced_at`, `contract_version`
- Implements the transactional outbox pattern for complex operations (transfers, lifecycle transitions)

### BillingEntry
- **Added:** `metadata` optional field — consumer-extensible key-value metadata (BB-ADV-001)

### InvokeResponse
- **Added:** `metadata` optional field — provider-specific response metadata (BB-ADV-001)

### Conversation
- **Added:** `sealed_by` optional field — transfer ID that caused sealing, for causal audit trail (BB-ADV-002)

### LifecycleTransitionPayload (NEW)
- New typed payload for lifecycle transition events (BB-ADV-005)
- Fields: `agent_id`, `previous_state`, `new_state`, `reason` (required), `triggered_by`, `transfer_id`
- `LifecycleTransitionEvent` convenience type: `DomainEvent<LifecycleTransitionPayload>`

### CreditNote
- **Enhanced:** `amount_micro` and `references_billing_entry` descriptions document service-layer invariants (BB-ADV-003)

---

## v2.0.0

**Theme:** Protocol Types — agent identity, NFT binding, multi-party billing, conversation ownership, domain events.

### AgentDescriptor (NEW)
- Full agent identity with NFT binding (`nft_id`), capabilities, content negotiation
- Model preferences array, personality config, `@context` JSON-LD support
- Fields: 35+ fields covering identity, capabilities, preferences, stats

### AgentLifecycleState (NEW)
- 6-state lifecycle machine: `DORMANT` → `PROVISIONING` → `ACTIVE` → `SUSPENDED` → `TRANSFERRED` → `ARCHIVED`
- Deterministic transition map via `AGENT_LIFECYCLE_TRANSITIONS`
- `ARCHIVED` is terminal (no outgoing edges)

### BillingEntry (NEW)
- Multi-party cost attribution replacing `CostBreakdown` from v1.x
- String-encoded micro-USD (`^[0-9]+$`) prevents floating-point issues
- `recipients[]` array with `share_bps` (basis points) allocation
- Largest-remainder deterministic allocation via `allocateRecipients()`

### BillingRecipient (NEW)
- Recipient in a billing split: `address`, `role`, `share_bps`, `amount_micro`
- Roles: `provider`, `platform`, `producer`, `agent_tba`

### CostType (NEW)
- Billing cost category enum: `model_inference`, `tool_call`, `platform_fee`, `byok_subscription`, `agent_setup`

### CreditNote (NEW)
- Billing reversal referencing an original `BillingEntry`
- Reasons: `refund`, `dispute`, `partial_failure`, `adjustment`

### Conversation (NEW)
- Conversation belonging to an NFT agent (conversations transfer with the NFT)
- Statuses: `active`, `paused`, `sealed`, `archived`
- Optional `sealing_policy` for encryption during transfers

### ConversationSealingPolicy (NEW)
- Governs data handling during NFT transfers
- `encryption_scheme`: `aes-256-gcm` or `none`
- Cross-field validation via `validateSealingPolicy()` utility

### Message (NEW)
- Individual message within a conversation
- Roles: `user`, `assistant`, `system`, `tool`
- Optional `tool_calls`, `model`, `pool_id`, `billing_entry_id`

### DomainEvent (NEW)
- Generic event envelope with typed aggregate wrappers
- Three-segment dotted type convention: `{aggregate}.{noun}.{verb}`
- Convenience types: `AgentEvent`, `BillingEvent`, `ConversationEvent`, `TransferEvent`

### TransferSpec (NEW)
- NFT ownership transfer specification
- Scenarios: `sale`, `gift`, `admin_recovery`, `custody_change`
- Embeds `ConversationSealingPolicy` for data handling during transfer

### TransferEvent (NEW)
- Transfer lifecycle record with event stream
- Terminal results: `completed`, `failed`, `cancelled`

### NftId (utility)
- Canonical NFT identity format: `eip155:{chainId}/{collectionAddress}/{tokenId}`
- EIP-55 checksummed collection address via Keccak-256
- Parse/format/validate utilities

---

## v1.1.0

**Theme:** Foundation — JWT, invoke response, streaming, routing, integrity.

### JwtClaims
- JWT authentication claims with tenant, tier, issuer
- Tiers: `free`, `pro`, `enterprise`, `byok`

### S2SJwtClaims
- Service-to-service JWT with restricted scope

### InvokeResponse
- Model invocation response with billing reference
- `billing_entry_id` replaces inline `CostBreakdown` (v2.0.0 migration)

### UsageReport
- Usage reconciliation posted to arrakis
- Signed as JWS for tamper resistance

### Usage
- Token usage breakdown: `prompt_tokens`, `completion_tokens`, `reasoning_tokens`

### StreamEvent
- SSE stream event discriminated union (6 event types)
- Strict ordering invariants: start → chunks/tools → usage → end

### RoutingPolicy
- Model routing configuration with personality preferences
- Task types and pool routing rules
