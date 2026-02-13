# PRD: loa-hounfour Protocol Types v2.0.0

**Status:** Flatline Reviewed
**Author:** Agent (from RFC loa-finn#66)
**Date:** 2026-02-13
**Source:** [Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66)

---

## 1. Executive Summary

loa-hounfour is the shared protocol package (`@0xhoneyjar/loa-hounfour`) that defines the canonical type schemas, validators, and integrity primitives consumed by loa-finn (inference engine), arrakis (gateway), and mibera-freeside (smart contracts). It is the single source of truth for the cross-repo contract.

v1.1.0 shipped JWT claims, stream events, invoke response, routing policy, pool vocabulary (5 pools), 31 error codes, and integrity functions (req-hash, idempotency). It is stable with 91 golden test vectors and zero TODOs.

v2.0.0 must define the protocol types required to bridge infrastructure completion (90%) to product launch (currently 25%). This is the **critical path bottleneck** — every downstream repo blocks on loa-hounfour types shipping first.

The work spans three delivery milestones:
- **v2.0.0** (Pre-Phase, Week 2-3): Agent identity, lifecycle, transfer, billing, and conversation types
- **v2.1.0** (Phase 4, Week 11-14): Tool marketplace types
- **v2.2.0** (Phase 5, Week 14-16): Inter-agent messaging types

---

## 2. Problem Statement

### The Gap

52 global sprints across 20 development cycles produced a complete multi-model inference platform: pool routing, ensemble orchestration, BigInt micro-USD budget tracking, JWT auth with JWKS rotation, BYOK proxy, and SSE streaming. Infrastructure is 90% ready.

But the product experience — agent identity, conversations, billing, transfers, tool marketplace, agent-to-agent messaging — is only 25% ready. The types for these product features do not exist in the shared protocol.

### Why loa-hounfour First

The anti-duplication matrix from the canonical launch plan assigns **type schemas exclusively to loa-hounfour**. Downstream repos consume types — they never invent them. If loa-hounfour doesn't define `AgentDescriptor`, three repos will independently create incompatible versions. The protocol package is the single chokepoint by design.

### Why v2.0.0 (Breaking)

The existing `CostBreakdown` schema tracks costs as flat aggregates. The new `BillingEntry` schema requires multi-party `recipients[]` (model provider, platform fee, tool producer splits) from day 1 to avoid a Stripe-Connect-style rewrite later. This is a semantic breaking change — downstream code that assumes single-party cost attribution will fail silently if we try additive extension.

> Source: RFC #66 Comment 7 (Bridgebuilder Finding 4), Comment 11 (Canonical Launch Plan)

---

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Unblock downstream repos for Phase 1 (Agent Identity & Chat) | loa-finn and arrakis can `npm install @0xhoneyjar/loa-hounfour@2.0.0` and import all Phase 1 types |
| G2 | Define canonical schemas that prevent cross-repo type drift | Zero type definitions duplicated across loa-finn, arrakis, or mibera-freeside |
| G3 | Maintain the quality bar established in v1.1.0 | Golden test vectors for every new schema; TypeBox + TypeCompiler validation |
| G4 | Provide migration path from v1.1.0 | Migration guide with before/after examples; `CostBreakdown` → `BillingEntry` mapping |
| G5 | Support content negotiation for agent surfaces | `AgentDescriptor` schema supports HTML, JSON-LD, and markdown representations |

### Success Metrics

| Metric | Target |
|--------|--------|
| v2.0.0 published to npm | Week 3 |
| Downstream repos upgraded (loa-finn, arrakis) | Week 4 |
| Zero type-related bugs in Phase 1 implementation | 0 regressions |
| Golden test vector coverage | 100% of new schemas |
| JSON Schema generation passing | All new schemas produce valid JSON Schema |

### Milestones

| Milestone | Version | Week | Deliverable |
|-----------|---------|------|-------------|
| Protocol Types | v2.0.0 | 2-3 | AgentDescriptor, AgentLifecycleState, TransferSpec, BillingEntry, Conversation types |
| Tool Types | v2.1.0 | 11-14 | ToolRegistration, ToolLifecycle, Operator pattern types |
| Messaging Types | v2.2.0 | 14-16 | AgentMessage, AgentAddress, inter-agent protocol types |

---

## 4. User & Stakeholder Context

### Primary Users (Downstream Developers)

| User | Repo | Consumes |
|------|------|----------|
| **loa-finn developer** | loa-finn | All types — implements routing, sessions, billing, tool registry |
| **arrakis developer** | arrakis | Agent page routing, conversation UI, credit purchase, marketplace frontend |
| **mibera-freeside developer** | mibera-freeside | Agent lifecycle events, TBA types, billing types (for smart contracts) |

### Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| **Product** | Agent homepage, chat experience, billing UX |
| **Security** | Transfer handling, credential isolation, pool enforcement |
| **Protocol consumers** | Backward compatibility, migration path, documentation |

### User Stories

**US1:** As a loa-finn developer, I need `AgentDescriptor` so I can implement the agent homepage endpoint with content negotiation (HTML/JSON-LD/markdown).

**US2:** As a loa-finn developer, I need `AgentLifecycleState` so I can implement the 6-state lifecycle machine with validated transitions.

**US3:** As an arrakis developer, I need `Conversation` and `Message` types so I can build the chat UI against a stable contract.

**US4:** As a loa-finn developer, I need `BillingEntry` with `recipients[]` so I can implement multi-party cost attribution from day 1.

**US5:** As a loa-finn developer, I need `TransferSpec` so I can implement the 5 transfer scenarios (happy path, mid-session, outstanding credits, rapid flip, transfer to contract).

**US6:** As a loa-finn developer, I need `ToolRegistration` and `ToolLifecycle` so I can promote the MCP interception spike to production with proper type safety.

**US7:** As a loa-finn developer, I need `AgentMessage` and `AgentAddress` types so I can implement the inter-agent messaging queue.

---

## 5. Functional Requirements

### FR1: AgentDescriptor Schema (v2.0.0)

**Priority:** P0 — Blocks Phase 1

The canonical representation of an agent for content negotiation. Follows ActivityPub/Cloudflare patterns.

```typescript
interface AgentDescriptor {
  // JSON-LD context
  "@context": "https://schema.honeyjar.xyz/agent/v1";

  // Identity (uses canonical NftId format)
  id: string;                    // Canonical format: "eip155:{chainId}/{collectionAddress}/{tokenId}"
  name: string;                  // Display name
  chain_id: number;              // EIP-155 chain ID (e.g., 80094 for Berachain)
  collection: string;            // NFT collection address (checksummed)
  token_id: string;              // NFT token ID

  // Personality
  personality: string;           // Personality ID (maps to BEAUVOIR.md)
  description?: string;          // Short agent bio
  avatar_url?: string;           // Profile image URL

  // Capabilities
  capabilities: string[];        // ["chat", "analysis", "code", ...]
  models: Record<string, string>; // Task type → pool mapping
  tools?: string[];              // Available tool IDs

  // On-chain
  tba?: string;                  // ERC-6551 Token Bound Account address
  owner?: string;                // Current NFT owner address

  // Network
  homepage: string;              // Agent homepage URL
  inbox?: string;                // Agent inbox endpoint
  llms_txt?: string;             // Token-efficient markdown endpoint

  // Stats (optional, for public display)
  stats?: {
    interactions: number;
    uptime: number;              // 0-1
    created_at: string;          // ISO datetime
    last_active?: string;        // ISO datetime
  };

  // Lifecycle
  lifecycle_state: AgentLifecycleState;

  // Protocol
  contract_version: string;
}
```

**Content Negotiation:**
- `Accept: text/html` → rendered agent page (downstream responsibility)
- `Accept: application/json` → full `AgentDescriptor` JSON-LD
- `Accept: text/markdown` → token-efficient `llms.txt` format

**Canonical NftId Type:**
```typescript
// Used across all schemas for consistent NFT identification
// Format: "eip155:{chainId}/{collectionAddress}/{tokenId}"
// Example: "eip155:80094/0x1234...abcd/4269"
type NftId = string; // Pattern: ^eip155:\d+\/0x[a-fA-F0-9]{40}\/\d+$

function parseNftId(id: string): { chainId: number; collection: string; tokenId: string };
function formatNftId(chainId: number, collection: string, tokenId: string): NftId;
function checksumCollection(address: string): string; // EIP-55 checksum
```

> Flatline SKP-005 (BLOCKER, accepted): Canonical NftId with EIP-155 chain qualifier ensures global uniqueness across chains/collections.

**Validation Rules:**
- `id` must match NftId pattern `^eip155:\d+\/0x[a-fA-F0-9]{40}\/\d+$`
- `collection` must be EIP-55 checksummed
- `capabilities` must have at least one entry
- `models` values must be valid `PoolId`
- `homepage` must be a valid URL
- `lifecycle_state` must be a valid `AgentLifecycleState`

> Source: RFC #66 Comment 7 Finding 1, Comment 8 (Cloudflare standard), Comment 11

### FR2: AgentLifecycleState Enum (v2.0.0)

**Priority:** P0 — Blocks Phase 1

```typescript
type AgentLifecycleState =
  | "DORMANT"       // NFT exists but agent not provisioned
  | "PROVISIONING"  // Setup in progress (TBA deployment, personality load)
  | "ACTIVE"        // Fully operational, accepting conversations
  | "SUSPENDED"     // Temporarily disabled (budget exhausted, owner action)
  | "TRANSFERRED"   // Ownership change detected, transitioning
  | "ARCHIVED";     // Permanently deactivated
```

**Valid Transitions:**
```
DORMANT      → PROVISIONING
PROVISIONING → ACTIVE | DORMANT (on failure)
ACTIVE       → SUSPENDED | TRANSFERRED | ARCHIVED
SUSPENDED    → ACTIVE | ARCHIVED
TRANSFERRED  → PROVISIONING (new owner) | ARCHIVED
ARCHIVED     → (terminal, no transitions out)
```

**Transition Validation:**
- Export a `isValidTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean` function
- Export the transition map as a typed constant for downstream consumption

> Source: RFC #66 Comment 7 Finding 7, Comment 11

### FR3: TransferSpec Types (v2.0.0)

**Priority:** P0 — Blocks Phase 2

```typescript
type TransferScenario =
  | "HAPPY_PATH"         // Standard trade, no active sessions
  | "MID_SESSION"        // Active WebSocket during transfer
  | "OUTSTANDING_CREDITS"// Credits remain in TBA
  | "RAPID_FLIP"         // Re-transfer within 5 minutes
  | "TO_CONTRACT";       // Transfer to vault/escrow/multisig

interface ConversationSealingPolicy {
  seal_behavior: "immediate" | "grace_period";
  grace_period_ms?: number;      // Only if seal_behavior === "grace_period"
  encrypted: boolean;            // Whether sealed conversations are encrypted
  encryption_scheme?: string;    // e.g., "aes-256-gcm" (required if encrypted: true)
  key_derivation?: string;       // e.g., "hkdf-sha256" — how seal key is derived
  key_reference?: string;        // Opaque reference to sealing key (never the key itself)
  previous_owner_access: "none" | "read_only_24h";
  access_audit: boolean;         // Whether access to sealed conversations is logged
}
```

> Flatline SKP-007 (BLOCKER, accepted): Sealing policy now specifies encryption scheme, key derivation method, and key reference. Access auditing field ensures compliance trail. Key management implementation remains in loa-finn, but the protocol defines required security properties.

```typescript

interface TransferEvent {
  nft_id: string;
  collection: string;
  token_id: string;
  from_address: string;
  to_address: string;
  transaction_hash: string;
  block_number: number;
  timestamp: string;             // ISO datetime
  scenario: TransferScenario;
  sealing_policy: ConversationSealingPolicy;
}

interface TransferResult {
  transfer_event: TransferEvent;
  conversations_sealed: number;
  websockets_terminated: number;
  lifecycle_transition: {
    from: AgentLifecycleState;
    to: AgentLifecycleState;
  };
  credits_transferred: boolean;  // Credits stay in TBA
  personality_preserved: boolean; // Always true
}
```

> Source: RFC #66 Comment 7 Finding 11, Comment 11

### FR4: BillingEntry with Multi-Party Recipients (v2.0.0)

**Priority:** P0 — Blocks Phase 3

Replaces and extends `CostBreakdown` with multi-party attribution.

```typescript
type CostType =
  | "model_inference"
  | "tool_call"
  | "platform_fee"
  | "byok_subscription"
  | "agent_setup";

interface BillingRecipient {
  address: string;               // Wallet or account address
  role: "provider" | "platform" | "producer" | "agent_tba";
  share_bps: number;             // Basis points (0-10000)
  amount_micro: string;          // String-encoded micro-USD (consistent with v1.1.0)
}

interface BillingEntry {
  // Identity
  trace_id: string;
  tenant_id: string;
  nft_id?: string;

  // What was billed
  cost_type: CostType;
  provider: string;
  model?: string;                // Only for model_inference
  pool_id?: string;              // Only for model_inference
  tool_id?: string;              // Only for tool_call

  // Costs
  currency: "USD";               // ISO 4217 currency code (USD only at launch)
  precision: 6;                  // Micro-USD = 6 decimal places
  raw_cost_micro: string;        // String-encoded micro-USD (provider's actual cost)
  multiplier_bps: number;        // Total multiplier in basis points (30000 = 3.0x, 25000 = 2.5x)
  total_cost_micro: string;      // raw_cost_micro * multiplier_bps / 10000
  rounding_policy: "largest_remainder"; // Deterministic allocation across recipients

  // Multi-party split
  recipients: BillingRecipient[]; // At least 1 recipient

  // Metadata
  idempotency_key: string;
  timestamp: string;             // ISO datetime
  contract_version: string;

  // Legacy compatibility
  usage?: Usage;                 // Token usage (for model_inference)
}
```

**Multiplier Tiers (from RFC):**
- 0-100K tokens: 30000 multiplier_bps (3.0x — pay $3 for $1 of model cost)
- 100K-1M tokens: 25000 multiplier_bps (2.5x)
- 1M+ tokens: 20000 multiplier_bps (2.0x)
- BYOK: 10000 multiplier_bps (1.0x — no markup, flat $5/mo platform fee)

> Flatline IMP-004 (DISPUTED, accepted): Fixed from `markup_bps` to `multiplier_bps`. 30000 bps = 3.0x multiplier (total cost = raw * 30000/10000). Previous notation "3000 bps = 3.0x" was mathematically incorrect.

**Deterministic Allocation Rules:**
- Rounding: `largest_remainder` method ensures `recipients[].amount_micro` sums exactly to `total_cost_micro`
- Direction: Truncate individual shares, assign remainder to largest recipient
- Currency: `USD` (ISO 4217) — single currency at launch, field reserved for future expansion
- Precision: 6 decimal places (micro-USD, 1 micro = $0.000001)

> Flatline SKP-003 (BLOCKER, accepted): Specifying deterministic allocation prevents silent rounding drift across services.

**CreditNote Type (for refunds/reversals):**
```typescript
interface CreditNote {
  id: string;                    // ULID
  references_billing_entry: string; // Original BillingEntry trace_id
  reason: "refund" | "dispute" | "partial_failure" | "adjustment";
  amount_micro: string;          // Positive value (amount credited back)
  recipients: BillingRecipient[]; // Who gets credited (may differ from original)
  issued_at: string;             // ISO datetime
  contract_version: string;
}
```

> Flatline IMP-002 (HIGH_CONSENSUS, avg: 810): BillingEntry invariants assume positive flows only. CreditNote handles reversals as separate ledger events referencing the original entry, preserving the invariant that `recipients[].share_bps` always sums to 10000.

**Invariants:**
- `recipients[].share_bps` must sum to 10000
- `recipients[].amount_micro` must sum to `total_cost_micro`
- At least one recipient required
- Refunds/reversals use `CreditNote`, not negative `BillingEntry`

**Migration from CostBreakdown:**
- `CostBreakdown.total_cost_micro` → `BillingEntry.raw_cost_micro` (pre-markup)
- `CostBreakdown.input_cost_micro` / `output_cost_micro` → removed (implementation detail)
- `BillingEntry.total_cost_micro` → includes markup
- `UsageReport.cost` → replaced by `BillingEntry` (breaking)

> Source: RFC #66 Comment 7 Finding 4, Comment 11

### FR5: Conversation & Message Types (v2.0.0)

**Priority:** P0 — Blocks Phase 1

```typescript
type ConversationStatus = "active" | "archived" | "sealed";
type MessageRole = "user" | "assistant" | "system" | "tool";
type ConversationVisibility = "private" | "public";

interface Conversation {
  id: string;                    // ULID
  nft_id: string;                // Agent that owns this conversation
  owner_address: string;         // Wallet address of current NFT holder
  title?: string;                // User-set or auto-generated title
  status: ConversationStatus;
  visibility: ConversationVisibility;
  created_at: string;            // ISO datetime
  updated_at: string;            // ISO datetime
  sealed_at?: string;            // Set when sealed on transfer
  sealed_by?: string;            // Transfer transaction hash
  message_count: number;
  last_message_preview?: string; // Truncated last message for list view
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;                    // ULID
  conversation_id: string;
  nft_id: string;
  role: MessageRole;
  content: string;
  tool_calls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;        // For tool role messages
  model?: string;               // Model that generated (for assistant role)
  pool_id?: string;             // Pool used (for assistant role)
  billing_entry_id?: string;    // Reference to BillingEntry
  timestamp: string;            // ISO datetime
  sequence: number;             // Monotonic within conversation
}

interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  offset: number;
  limit: number;
}

interface MessageListResponse {
  messages: Message[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}
```

**Storage tiers (informational, implementation in loa-finn):**
- Hot: In-memory, 30 min TTL
- Warm: Disk JSONL, 30 days
- Cold: R2/S3, forever

> Source: RFC #66 Comment 1 (session persistence), Comment 11 (Chat & Conversation Architecture)

### FR6: ToolRegistration & ToolLifecycle Types (v2.1.0)

**Priority:** P1 — Blocks Phase 4

```typescript
type ToolLifecycleState =
  | "REGISTERED"     // Submitted, pending verification
  | "VERIFIED"       // Passed automated checks
  | "ACTIVE"         // Live, discoverable, billable
  | "DEGRADED"       // Operational but impaired (high error rate)
  | "SUSPENDED"      // Temporarily disabled (policy violation, maintenance)
  | "DEREGISTERED";  // Permanently removed

interface ToolRegistration {
  id: string;                    // Tool ID (globally unique)
  name: string;                  // Display name
  description: string;           // What the tool does
  version: string;               // Semver
  provider: string;              // Producer identity

  // MCP
  mcp_server_url: string;        // MCP server endpoint
  mcp_capabilities: string[];    // Supported MCP methods

  // Billing
  cost_per_call_micro: string;   // String-encoded micro-USD
  revenue_split: {
    producer_bps: number;        // Default: 8500 (85%)
    platform_bps: number;        // Default: 1500 (15%)
  };

  // Metadata
  lifecycle_state: ToolLifecycleState;
  registered_at: string;         // ISO datetime
  verified_at?: string;
  last_health_check?: string;
  error_rate?: number;           // 0-1, rolling window

  // Access control
  min_tier?: Tier;               // Minimum tier to use this tool
  allowed_pools?: PoolId[];      // Pools that can invoke this tool

  contract_version: string;
}
```

**Valid Transitions:**
```
REGISTERED   → VERIFIED | DEREGISTERED
VERIFIED     → ACTIVE | DEREGISTERED
ACTIVE       → DEGRADED | SUSPENDED | DEREGISTERED
DEGRADED     → ACTIVE | SUSPENDED | DEREGISTERED
SUSPENDED    → ACTIVE | DEREGISTERED
DEREGISTERED → (terminal)
```

**ToolListResponse (for discovery/pagination):**
```typescript
interface ToolListResponse {
  tools: ToolRegistration[];
  total: number;
  offset: number;
  limit: number;
  filters_applied?: {
    lifecycle_state?: ToolLifecycleState;
    min_tier?: Tier;
    provider?: string;
  };
}
```

> Flatline IMP-005 (DISPUTED, accepted): Consistent pagination shape with ConversationListResponse.

> Source: RFC #66 Comment 7 Finding 9 (Operator pattern), Comment 11 Phase 4

### FR7: AgentMessage & AgentAddress Types (v2.2.0)

**Priority:** P2 — Blocks Phase 5

```typescript
// Agent addressing scheme
interface AgentAddress {
  scheme: "agent";               // Protocol scheme
  nft_id: string;                // Target agent NFT ID
  collection?: string;           // Optional collection qualifier
}

// Parse "agent://4269" or "agent://bears/4269"
function parseAgentAddress(uri: string): AgentAddress;
function formatAgentAddress(addr: AgentAddress): string;

type MessagePriority = "normal" | "urgent" | "bulk";
type MessageDeliveryStatus = "queued" | "delivered" | "read" | "failed" | "expired";

interface AgentMessage {
  id: string;                    // ULID
  from: AgentAddress;
  to: AgentAddress;

  // Content
  subject?: string;
  content: string;
  content_type: "text/plain" | "application/json";

  // Delivery
  priority: MessagePriority;
  delivery_status: MessageDeliveryStatus;

  // Billing
  billing_entry_id?: string;     // Cost attributed to sender's TBA

  // Metadata
  sent_at: string;               // ISO datetime
  delivered_at?: string;
  read_at?: string;
  expires_at?: string;           // TTL for ephemeral messages

  // Threading
  in_reply_to?: string;          // Message ID for threading
  thread_id?: string;            // Thread root ID

  contract_version: string;
}

interface AgentInbox {
  agent: AgentAddress;
  messages: AgentMessage[];
  unread_count: number;
  total: number;
  offset: number;
  limit: number;
}
```

> Source: RFC #66 Comment 11 Phase 5

### FR8: DomainEvent Envelope (v2.0.0)

**Priority:** P0 — Cross-cutting audit infrastructure

> Flatline IMP-003 (HIGH_CONSENSUS, avg: 845): Multiple state machines (agent lifecycle, tool lifecycle, conversation status, transfer) and billing reconciliation require a consistent audit envelope. Downstream systems already rely on streams (StreamEvent). A minimal versioned envelope ensures cross-repo event consistency.

```typescript
interface DomainEvent<T = unknown> {
  event_id: string;              // ULID
  aggregate_id: string;          // Entity this event belongs to (nft_id, tool_id, etc.)
  aggregate_type: "agent" | "conversation" | "billing" | "tool" | "transfer" | "message";
  type: string;                  // e.g., "agent.lifecycle.transitioned", "billing.entry.created"
  version: number;               // Event schema version (monotonic)
  occurred_at: string;           // ISO datetime
  actor: string;                 // Who/what caused this (user address, system, service ID)
  correlation_id?: string;       // Trace ID for cross-service correlation
  causation_id?: string;         // ID of the event that caused this event
  payload: T;                    // Event-specific data
  contract_version: string;
}
```

**Event naming convention:** `{aggregate_type}.{entity}.{past_tense_verb}` (e.g., `agent.lifecycle.transitioned`, `billing.entry.created`, `conversation.status.sealed`)

### FR9: New Error Codes (v2.0.0+)

Extend the existing 31 error codes with agent-related errors.

```typescript
// v2.0.0 additions
AGENT_NOT_FOUND           // 404 — Agent NFT ID not recognized
AGENT_NOT_ACTIVE          // 403 — Agent lifecycle state is not ACTIVE
AGENT_TRANSFER_IN_PROGRESS// 409 — Transfer detected, operations suspended
CONVERSATION_SEALED       // 403 — Conversation sealed after transfer
CONVERSATION_NOT_FOUND    // 404 — Conversation ID not found
OWNERSHIP_MISMATCH        // 403 — Caller is not current NFT owner
BILLING_RECIPIENTS_INVALID// 400 — Recipients don't sum to 10000 bps

// v2.1.0 additions
TOOL_NOT_FOUND            // 404 — Tool ID not registered
TOOL_NOT_ACTIVE           // 403 — Tool lifecycle state is not ACTIVE
TOOL_CALL_BUDGET_EXCEEDED // 402 — Tool call cost exceeds remaining budget

// v2.2.0 additions
AGENT_MESSAGE_UNDELIVERABLE // 502 — Target agent unreachable
AGENT_INBOX_FULL            // 429 — Target inbox capacity exceeded
```

---

## 6. Technical Requirements

### TR1: TypeBox Schemas

All new types must be defined as TypeBox schemas with companion TypeScript types, consistent with v1.1.0 patterns:
- `Type.Object()` for interfaces
- `Type.Union()` with `Type.Literal()` for discriminated unions / enums
- `Type.Optional()` for optional fields
- Lazy-compiled `TypeCompiler.Compile()` validators

### TR2: JSON Schema Generation

All new schemas must produce valid JSON Schema via the existing `schema:generate` script. Output to `schemas/` directory for downstream consumption without TypeScript dependency.

### TR3: Golden Test Vectors

Each new schema must have golden test vectors in `vectors/` following the existing pattern:
- Valid examples (happy path)
- Invalid examples (each validation rule exercised)
- Edge cases (empty arrays, max values, boundary conditions)
- Migration examples (v1.1.0 → v2.0.0 before/after)

### TR4: Export Surface

New types exported from `src/index.ts` following existing barrel export pattern:
- Schema objects (`AgentDescriptorSchema`, etc.)
- TypeScript types (`type AgentDescriptor`, etc.)
- Validation functions (`isValidTransition`, `parseAgentAddress`, etc.)
- Constants (`AGENT_LIFECYCLE_TRANSITIONS`, `TRANSFER_SCENARIOS`, etc.)

### TR5: Backward Compatibility

- v2.0.0 is a breaking release — `CONTRACT_VERSION` bumps to `2.0.0`
- `MIN_SUPPORTED_VERSION` bumps to `2.0.0` (no N-1 compat for major bump)
- `CostBreakdown` removed in favor of `BillingEntry`
- `UsageReport.cost` replaced by `BillingEntry` reference
- Migration guide included in package README

### TR6: Package Exports

Extend package.json exports to include new schema paths:
```json
{
  "./schemas/agent": "./schemas/agent-descriptor.schema.json",
  "./schemas/billing": "./schemas/billing-entry.schema.json",
  "./schemas/conversation": "./schemas/conversation.schema.json",
  "./schemas/tool": "./schemas/tool-registration.schema.json",
  "./schemas/messaging": "./schemas/agent-message.schema.json"
}
```

---

## 7. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Bundle size** | <50KB gzipped (total package) | Consumed by edge workers; size matters |
| **Tree-shaking** | ESM exports, side-effect-free | Downstream repos import selectively |
| **Zero runtime deps** | TypeBox is devDependency only | Compiled validators have no runtime deps |
| **Node.js compat** | >=22 (consistent with v1.1.0) | LTS schedule alignment |
| **TypeScript** | Strict mode, no `any` | Type safety is the product |
| **Validation perf** | <1ms per schema validation | Hot path in request processing |

---

## 8. Scope & Prioritization

### In Scope

| Version | Deliverables | Phase |
|---------|-------------|-------|
| **v2.0.0** | AgentDescriptor, AgentLifecycleState, TransferSpec, BillingEntry, Conversation/Message types, new error codes, migration guide, golden vectors | Pre-Phase |
| **v2.1.0** | ToolRegistration, ToolLifecycle, tool error codes, golden vectors | Phase 4 |
| **v2.2.0** | AgentMessage, AgentAddress, messaging error codes, golden vectors | Phase 5 |

### Explicitly Out of Scope

| Item | Reason | Revisit |
|------|--------|---------|
| Soul memory schema | Deferred per RFC — stateless chat for v1 | Post-Phase 1 conversation data |
| Personality evolution types | Deferred — static BEAUVOIR.md sufficient | Post-Phase 1 |
| ERC-7860 AgentNFT schema | Draft standard, no tooling | Standard finalization |
| EIP-7702 delegation types | Pectra timeline unclear | Mainnet launch |
| Insurance pool types | Needs actuarial data | Post-Phase 4 marketplace data |
| Voice/transcription schemas | Channel expansion deferred | Post consumer MVP validation |
| On-chain event ABI types | mibera-freeside generates from Solidity | Smart contract compilation |
| Runtime implementation | loa-finn/arrakis implement; loa-hounfour defines | Always |

---

## 9. Risks & Dependencies

### Critical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **loa-hounfour delays block all downstream** | 4 repos idle | Medium | Pre-Phase is only 5 types; keep scope tight |
| **Breaking change coordination fails** | Runtime errors in loa-finn/arrakis | Medium | Publish v2.0.0-beta.1 for integration testing before final release |
| **AgentDescriptor schema churn** | Downstream rework | Low | Bridgebuilder review already locked the schema shape |
| **BillingEntry recipients invariant bugs** | Silent financial errors | Medium | Golden vectors with comprehensive edge cases; property-based tests |
| **TypeBox limitations for JSON-LD** | `@context` field naming | Low | TypeBox supports arbitrary string keys via `Type.Index` |

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| TypeBox ^0.34 | Dev dependency | Installed (v1.1.0) |
| jose ^6.1 | Dev dependency | Installed (v1.1.0) |
| viem | NOT needed | loa-hounfour defines types only; no on-chain calls |
| loa-finn RFC #31 completion | External | 96% complete |
| arrakis Issue #54 (adopt hounfour) | External | Open |
| Cloudflare llms.txt standard | Spec reference | Published |
| ERC-6551 standard | Spec reference | Established |

---

## 10. Flatline Review Decisions

### Overridden Blockers (with rationale)

**SKP-001** (severity: 930) — *No contingency plan for critical-path bottleneck*
> **Override rationale:** Single chokepoint is by design per the anti-duplication matrix. The RFC's Bridgebuilder review already locked the schema shapes. The 5 v2.0.0 types are well-defined with full interface specs. Risk of slip is low; risk of schema churn is the real concern, and a frozen spec prevents that.

**SKP-002** (severity: 880) — *Breaking change strategy too strict (no N-1 compat)*
> **Override rationale:** All 4 repos coordinate in a single launch plan. One synchronized migration is simpler than maintaining translation layers. The downstream repos (loa-finn, arrakis) are controlled by the same team. Clean break avoids compat complexity that would outlive its usefulness.

### Accepted Findings

| ID | Type | Summary | Integrated |
|----|------|---------|------------|
| IMP-002 | HIGH_CONSENSUS | CreditNote type for billing reversals | Yes |
| IMP-003 | HIGH_CONSENSUS | DomainEvent audit envelope | Yes |
| IMP-004 | DISPUTED | markup_bps → multiplier_bps (math fix) | Yes |
| IMP-005 | DISPUTED | ToolListResponse pagination type | Yes (v2.1.0) |
| SKP-003 | BLOCKER | Deterministic billing allocation rules | Yes |
| SKP-005 | BLOCKER | Canonical NftId with EIP-155 chain qualifier | Yes |
| SKP-007 | BLOCKER | Sealing encryption scheme specification | Yes |

---

## 11. Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| OQ1 | Should `AgentDescriptor.@context` be a hosted JSON-LD context document, or is the TypeScript type sufficient? | Product | Affects whether we need to deploy a schema endpoint |
| OQ2 | Should `ConversationSealingPolicy.encrypted` specify the encryption scheme, or is that an implementation detail for loa-finn? | Security | Affects type complexity |
| OQ3 | Should `BillingEntry` support negative amounts for refunds/credits? | Product | Affects invariant validation |
| OQ4 | Should `ToolRegistration.mcp_capabilities` be typed enum or freeform strings? | loa-finn | MCP spec may add new methods |
| OQ5 | Should `AgentAddress` support cross-collection addressing (e.g., `agent://bears/4269` vs `agent://4269`)? | Product | Affects the address format and parsing |

---

## 11. Appendices

### A. Migration Guide Outline (v1.1.0 → v2.0.0)

**Breaking Changes:**
1. `CostBreakdown` removed → use `BillingEntry`
2. `UsageReport.cost: CostBreakdown` → `UsageReport.billing_entry_id: string` (reference)
3. `InvokeResponse.cost: CostBreakdown` → `InvokeResponse.billing_entry_id: string` (reference)
4. `CONTRACT_VERSION` = `"2.0.0"`
5. `MIN_SUPPORTED_VERSION` = `"2.0.0"`

**Additive (non-breaking):**
1. New schemas: AgentDescriptor, AgentLifecycleState, TransferSpec, Conversation, Message
2. New error codes: 7 agent-related codes
3. New validators: lifecycle transition, agent address, billing recipients
4. New exports: constants, utility functions

### B. Repo Ownership Matrix (from RFC)

| Concern | Owner |
|---------|-------|
| Type schemas | loa-hounfour ONLY |
| JWT minting | arrakis ONLY |
| JWT validation | loa-finn ONLY |
| Smart contracts | mibera-freeside ONLY |
| Model routing | loa-finn ONLY |
| Conversation store | loa-finn ONLY |
| User-facing UI | arrakis ONLY |
| Billing ledger | loa-finn ONLY |
| Credit purchase | arrakis ONLY |
| Tool registry | loa-finn ONLY |
| Tool discovery | arrakis ONLY |

### C. Revenue Model Reference

| Stream | Rate | BillingEntry.cost_type |
|--------|------|----------------------|
| PAYG (0-100K tokens) | 3.0x markup | `model_inference` |
| PAYG (100K-1M tokens) | 2.5x markup | `model_inference` |
| PAYG (1M+ tokens) | 2.0x markup | `model_inference` |
| BYOK subscription | $5/month flat | `byok_subscription` |
| Agent setup | 0.01 ETH one-time | `agent_setup` |
| Tool call | 15% platform fee | `tool_call` |

### D. Competitive Context

| Advantage | vs. Nanobot | vs. Hive |
|-----------|-------------|----------|
| Token-gated model access | Unique | Unique |
| NFT-bound persistent identity | Unique | Unique |
| Confused deputy prevention | Unique | N/A |
| Ensemble multi-model + atomic budget | Ahead | Ahead |
| BYOK with deny-by-default | Unique | N/A |
| Protocol-first (shared types package) | Unique | N/A |
