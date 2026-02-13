# Schema Changelog

Per-schema evolution tracking for `@0xhoneyjar/loa-hounfour`. Each entry records what changed, when, and why — enabling consumers to answer "what's different between versions?" at the schema level.

> Inspired by Confluent's Schema Registry for Kafka, which tracks schema evolution across versions and enforces compatibility rules.

---

## v2.1.0 (Unreleased)

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
