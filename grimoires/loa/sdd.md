# SDD: loa-hounfour Protocol Types v2.0.0

**Status:** Draft
**Author:** Agent
**Date:** 2026-02-13
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Source:** [Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66)

---

## 1. Executive Summary

This SDD defines the architecture for extending `@0xhoneyjar/loa-hounfour` from v1.1.0 (inference protocol) to v2.0.0 (full agent protocol). The package remains a zero-runtime-dependency TypeScript library that exports TypeBox schemas, TypeScript types, validators, and utility functions.

**Architecture philosophy:** Extend, don't rewrite. The existing module structure (schemas, validators, vocabulary, integrity) is preserved. New modules are added alongside existing ones using identical patterns.

**Delivery:** v2.0.0 (9 new source files, ~2,000 lines), v2.1.0 (+2 files), v2.2.0 (+2 files).

---

## 2. System Architecture

### 2.1 Package Role in Ecosystem

```
┌─────────────────────────────────────────────────────────┐
│                   @0xhoneyjar/loa-hounfour              │
│                    (protocol package)                    │
│                                                         │
│  Schemas · Types · Validators · Utilities · Error Codes │
│                                                         │
│  npm publish → consumed by ↓ ↓ ↓                       │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
          ┌────▼────┐   ┌────▼────┐   ┌─────▼──────┐
          │loa-finn │   │arrakis  │   │mibera-     │
          │(engine) │   │(gateway)│   │freeside    │
          │         │   │         │   │(contracts) │
          └─────────┘   └─────────┘   └────────────┘
```

loa-hounfour defines types. Downstream repos implement. No runtime logic beyond validation and utility functions.

### 2.2 Module Architecture

```
src/
├── index.ts                      # Barrel exports (v1.1.0 + v2.0.0)
├── version.ts                    # CONTRACT_VERSION = "2.0.0"
│
├── schemas/                      # TypeBox schema definitions
│   ├── jwt-claims.ts             # ✓ Existing (v1.1.0)
│   ├── invoke-response.ts        # ✓ Existing (MODIFIED — billing_entry_id)
│   ├── stream-events.ts          # ✓ Existing (unchanged)
│   ├── routing-policy.ts         # ✓ Existing (unchanged)
│   ├── agent-descriptor.ts       # ★ NEW (v2.0.0) — FR1
│   ├── agent-lifecycle.ts        # ★ NEW (v2.0.0) — FR2
│   ├── transfer-spec.ts          # ★ NEW (v2.0.0) — FR3
│   ├── billing-entry.ts          # ★ NEW (v2.0.0) — FR4
│   ├── conversation.ts           # ★ NEW (v2.0.0) — FR5
│   ├── domain-event.ts           # ★ NEW (v2.0.0) — FR8
│   ├── tool-registration.ts      # ★ NEW (v2.1.0) — FR6
│   └── agent-message.ts          # ★ NEW (v2.2.0) — FR7
│
├── vocabulary/
│   ├── errors.ts                 # ✓ Existing (EXTENDED — FR9)
│   └── pools.ts                  # ✓ Existing (unchanged)
│
├── validators/
│   ├── index.ts                  # ✓ Existing (EXTENDED — new validators)
│   └── compatibility.ts          # ✓ Existing (updated version constants)
│
├── integrity/
│   ├── req-hash.ts               # ✓ Existing (unchanged)
│   └── idempotency.ts            # ✓ Existing (unchanged)
│
└── utilities/                    # ★ NEW directory
    ├── nft-id.ts                 # ★ NEW (v2.0.0) — NftId parsing/formatting
    ├── lifecycle.ts              # ★ NEW (v2.0.0) — Transition validators
    └── billing.ts               # ★ NEW (v2.0.0) — Recipient allocation
```

### 2.3 Dependency Graph (Internal)

```
agent-descriptor.ts
  ├── agent-lifecycle.ts (AgentLifecycleState)
  ├── ../vocabulary/pools.ts (PoolId)
  └── ../utilities/nft-id.ts (NftId)

transfer-spec.ts
  ├── agent-lifecycle.ts (AgentLifecycleState)
  └── conversation.ts (ConversationSealingPolicy reference)

billing-entry.ts
  ├── invoke-response.ts (Usage — legacy compat)
  └── ../vocabulary/pools.ts (PoolId)

conversation.ts
  └── (standalone)

domain-event.ts
  └── (standalone, generic)

tool-registration.ts (v2.1.0)
  ├── ../vocabulary/pools.ts (PoolId, Tier)
  └── ../schemas/jwt-claims.ts (Tier)

agent-message.ts (v2.2.0)
  └── ../utilities/nft-id.ts (NftId)
```

---

## 3. Technology Stack

| Component | Choice | Justification |
|-----------|--------|---------------|
| **Language** | TypeScript 5.7+ strict | Consistent with v1.1.0; strict mode is the product |
| **Schema library** | @sinclair/typebox ^0.34 | Existing dependency; compile-time + runtime validation |
| **Build** | tsc (ESM output) | Existing build pipeline; zero bundler complexity |
| **Test framework** | vitest | Existing test framework; golden vector pattern |
| **Node.js** | >=22 | Consistent with v1.1.0; LTS alignment |
| **Package format** | ESM only | Tree-shakeable; consistent with v1.1.0 |

No new dependencies required. TypeBox and jose are already installed.

---

## 4. Component Design

### 4.1 Schema File Pattern

Every schema file follows the v1.1.0 established pattern:

```typescript
// src/schemas/{name}.ts
import { Type, Static } from '@sinclair/typebox';

// 1. Define TypeBox schema
export const FooSchema = Type.Object({
  field: Type.String(),
  // ...
});

// 2. Export companion TypeScript type
export type Foo = Static<typeof FooSchema>;
```

This pattern is mandatory for consistency with existing schemas.

### 4.2 NftId Utility (`src/utilities/nft-id.ts`)

Canonical NFT identification used across all agent-related schemas.

```typescript
// Format: "eip155:{chainId}/{collectionAddress}/{tokenId}"
// Example: "eip155:80094/0xAbCdEf1234567890AbCdEf1234567890AbCdEf12/4269"

export const NFT_ID_PATTERN = /^eip155:(\d+)\/0x([a-fA-F0-9]{40})\/(\d+)$/;

export const NftIdSchema = Type.String({
  pattern: '^eip155:\\d+\\/0x[a-fA-F0-9]{40}\\/\\d+$',
});

export type NftId = Static<typeof NftIdSchema>;

export function parseNftId(id: string): {
  chainId: number;
  collection: string;
  tokenId: string;
} {
  const match = NFT_ID_PATTERN.exec(id);
  if (!match) throw new Error(`Invalid NftId: ${id}`);
  return {
    chainId: Number(match[1]),
    collection: checksumCollection(`0x${match[2]}`),
    tokenId: match[3],
  };
}

export function formatNftId(
  chainId: number,
  collection: string,
  tokenId: string,
): NftId {
  return `eip155:${chainId}/${checksumCollection(collection)}/${tokenId}`;
}

// EIP-55 mixed-case checksum encoding
export function checksumCollection(address: string): string {
  // Implementation: keccak256 hash of lowercase address,
  // then uppercase hex chars where hash nibble >= 8
  // Note: Use a minimal keccak256 implementation to avoid
  // adding viem/ethers as dependency. ~30 lines.
}

export function isValidNftId(id: string): boolean {
  return NFT_ID_PATTERN.test(id);
}
```

**Design decision:** EIP-55 checksum requires **Keccak-256** (the original Keccak submission, NOT NIST SHA3-256 — they differ in padding). Node.js `crypto.createHash('sha3-256')` implements NIST SHA3-256 and will produce **wrong checksums**. Rather than adding `viem` or `ethers` (~500KB+), use `@noble/hashes/sha3` (`keccak_256` export, ~3KB tree-shaken, audited, zero-dependency) as a **devDependency bundled at build time**, or a vendored ~50-line Keccak-256 permutation. Validate implementation against canonical EIP-55 test vectors from [EIP-55 specification](https://eips.ethereum.org/EIPS/eip-55) and at least 5 known checksum addresses.

### 4.3 Agent Descriptor Schema (`src/schemas/agent-descriptor.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
import { AgentLifecycleStateSchema } from './agent-lifecycle.js';
import { PoolIdSchema } from '../vocabulary/pools.js';

const AgentStatsSchema = Type.Optional(Type.Object({
  interactions: Type.Integer({ minimum: 0 }),
  uptime: Type.Number({ minimum: 0, maximum: 1 }),
  created_at: Type.String({ format: 'date-time' }),
  last_active: Type.Optional(Type.String({ format: 'date-time' })),
}));

export const AgentDescriptorSchema = Type.Object({
  '@context': Type.Literal('https://schema.honeyjar.xyz/agent/v1'),
  id: NftIdSchema,
  name: Type.String({ minLength: 1 }),
  chain_id: Type.Integer({ minimum: 1 }),
  collection: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  token_id: Type.String({ pattern: '^\\d+$' }),
  personality: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  avatar_url: Type.Optional(Type.String({ format: 'uri' })),
  capabilities: Type.Array(Type.String(), { minItems: 1 }),
  models: Type.Record(Type.String(), PoolIdSchema),
  tools: Type.Optional(Type.Array(Type.String())),
  tba: Type.Optional(Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' })),
  owner: Type.Optional(Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' })),
  homepage: Type.String({ format: 'uri' }),
  inbox: Type.Optional(Type.String({ format: 'uri' })),
  llms_txt: Type.Optional(Type.String({ format: 'uri' })),
  stats: AgentStatsSchema,
  lifecycle_state: AgentLifecycleStateSchema,
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type AgentDescriptor = Static<typeof AgentDescriptorSchema>;
```

### 4.4 Agent Lifecycle (`src/schemas/agent-lifecycle.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';

export const AGENT_LIFECYCLE_STATES = [
  'DORMANT', 'PROVISIONING', 'ACTIVE',
  'SUSPENDED', 'TRANSFERRED', 'ARCHIVED',
] as const;

export const AgentLifecycleStateSchema = Type.Union([
  Type.Literal('DORMANT'),
  Type.Literal('PROVISIONING'),
  Type.Literal('ACTIVE'),
  Type.Literal('SUSPENDED'),
  Type.Literal('TRANSFERRED'),
  Type.Literal('ARCHIVED'),
]);

export type AgentLifecycleState = Static<typeof AgentLifecycleStateSchema>;

export const AGENT_LIFECYCLE_TRANSITIONS: Record<
  AgentLifecycleState,
  readonly AgentLifecycleState[]
> = {
  DORMANT: ['PROVISIONING'],
  PROVISIONING: ['ACTIVE', 'DORMANT'],
  ACTIVE: ['SUSPENDED', 'TRANSFERRED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  TRANSFERRED: ['PROVISIONING', 'ARCHIVED'],
  ARCHIVED: [],
} as const;

export function isValidTransition(
  from: AgentLifecycleState,
  to: AgentLifecycleState,
): boolean {
  return AGENT_LIFECYCLE_TRANSITIONS[from].includes(to);
}
```

### 4.5 Billing Entry (`src/schemas/billing-entry.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';
import { UsageSchema } from './invoke-response.js';

const MicroUsdSchema = Type.String({ pattern: '^[0-9]+$' });

export const CostTypeSchema = Type.Union([
  Type.Literal('model_inference'),
  Type.Literal('tool_call'),
  Type.Literal('platform_fee'),
  Type.Literal('byok_subscription'),
  Type.Literal('agent_setup'),
]);

export type CostType = Static<typeof CostTypeSchema>;

export const BillingRecipientSchema = Type.Object({
  address: Type.String({ minLength: 1 }),
  role: Type.Union([
    Type.Literal('provider'),
    Type.Literal('platform'),
    Type.Literal('producer'),
    Type.Literal('agent_tba'),
  ]),
  share_bps: Type.Integer({ minimum: 0, maximum: 10000 }),
  amount_micro: MicroUsdSchema,
});

export type BillingRecipient = Static<typeof BillingRecipientSchema>;

export const BillingEntrySchema = Type.Object({
  id: Type.String({ minLength: 1 }),  // ULID — canonical billing entry identifier
  trace_id: Type.String({ minLength: 1 }),
  tenant_id: Type.String({ minLength: 1 }),
  nft_id: Type.Optional(Type.String()),
  cost_type: CostTypeSchema,
  provider: Type.String({ minLength: 1 }),
  model: Type.Optional(Type.String()),
  pool_id: Type.Optional(Type.String()),
  tool_id: Type.Optional(Type.String()),
  currency: Type.Literal('USD'),
  precision: Type.Literal(6),
  raw_cost_micro: MicroUsdSchema,
  multiplier_bps: Type.Integer({ minimum: 10000, maximum: 100000 }),
  total_cost_micro: MicroUsdSchema,
  rounding_policy: Type.Literal('largest_remainder'),
  recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
  idempotency_key: Type.String({ minLength: 1 }),
  timestamp: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  usage: Type.Optional(UsageSchema),
});

export type BillingEntry = Static<typeof BillingEntrySchema>;

export const CreditNoteSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  references_billing_entry: Type.String({ minLength: 1 }),
  reason: Type.Union([
    Type.Literal('refund'),
    Type.Literal('dispute'),
    Type.Literal('partial_failure'),
    Type.Literal('adjustment'),
  ]),
  amount_micro: MicroUsdSchema,
  recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
  issued_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type CreditNote = Static<typeof CreditNoteSchema>;
```

### 4.6 Billing Utilities (`src/utilities/billing.ts`)

```typescript
export function validateBillingRecipients(
  recipients: BillingRecipient[],
  totalCostMicro: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check share_bps sum to 10000
  const bpsSum = recipients.reduce((acc, r) => acc + r.share_bps, 0);
  if (bpsSum !== 10000) {
    errors.push(`share_bps sum ${bpsSum} !== 10000`);
  }

  // Check amount_micro sum matches total
  const amountSum = recipients.reduce(
    (acc, r) => acc + BigInt(r.amount_micro), 0n
  );
  if (amountSum !== BigInt(totalCostMicro)) {
    errors.push(`amount_micro sum ${amountSum} !== ${totalCostMicro}`);
  }

  return { valid: errors.length === 0, errors };
}

// Largest-remainder allocation (deterministic)
export function allocateRecipients(
  recipients: Array<{ address: string; role: string; share_bps: number }>,
  totalCostMicro: string,
): BillingRecipient[] {
  const total = BigInt(totalCostMicro);

  // Step 1: Truncate individual shares
  const allocated = recipients.map(r => ({
    ...r,
    amount_micro: String((total * BigInt(r.share_bps)) / 10000n),
    remainder: Number((total * BigInt(r.share_bps)) % 10000n),
  }));

  // Step 2: Distribute remainder to largest remainders
  const currentSum = allocated.reduce(
    (acc, r) => acc + BigInt(r.amount_micro), 0n
  );
  let remaining = total - currentSum;

  const sorted = [...allocated].sort((a, b) => b.remainder - a.remainder);
  for (const r of sorted) {
    if (remaining <= 0n) break;
    r.amount_micro = String(BigInt(r.amount_micro) + 1n);
    remaining -= 1n;
  }

  return allocated.map(({ remainder, ...r }) => r as BillingRecipient);
}
```

### 4.6b Conversation & Message Schemas (`src/schemas/conversation.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';

export const ConversationStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('paused'),
  Type.Literal('sealed'),
  Type.Literal('archived'),
]);

export type ConversationStatus = Static<typeof ConversationStatusSchema>;

export const ConversationSealingPolicySchema = Type.Object({
  encryption_scheme: Type.Union([
    Type.Literal('aes-256-gcm'),
    Type.Literal('none'),
  ]),
  key_derivation: Type.Union([
    Type.Literal('hkdf-sha256'),
    Type.Literal('none'),
  ]),
  key_reference: Type.Optional(Type.String({ minLength: 1 })),
  access_audit: Type.Boolean(),
  previous_owner_access: Type.Union([
    Type.Literal('none'),
    Type.Literal('read_only_24h'),
  ]),
});

export type ConversationSealingPolicy = Static<typeof ConversationSealingPolicySchema>;

export const ConversationSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  nft_id: NftIdSchema,
  title: Type.Optional(Type.String()),
  status: ConversationStatusSchema,
  sealing_policy: Type.Optional(ConversationSealingPolicySchema),
  message_count: Type.Integer({ minimum: 0 }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  sealed_at: Type.Optional(Type.String({ format: 'date-time' })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type Conversation = Static<typeof ConversationSchema>;

export const MessageRoleSchema = Type.Union([
  Type.Literal('user'),
  Type.Literal('assistant'),
  Type.Literal('system'),
  Type.Literal('tool'),
]);

export const MessageSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  conversation_id: Type.String({ minLength: 1 }),
  role: MessageRoleSchema,
  content: Type.String(),
  model: Type.Optional(Type.String()),
  pool_id: Type.Optional(Type.String()),
  billing_entry_id: Type.Optional(Type.String()),
  tool_calls: Type.Optional(Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    arguments: Type.String(),
  }))),
  created_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type Message = Static<typeof MessageSchema>;
```

**Design note:** Conversations belong to the NFT (`nft_id`), not the user. This is a fundamental architectural decision — when an NFT transfers, its conversations transfer with it. The `sealing_policy` governs what happens to conversation data on transfer.

### 4.6c Transfer Spec & Events (`src/schemas/transfer-spec.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
import { ConversationSealingPolicySchema } from './conversation.js';

export const TransferScenarioSchema = Type.Union([
  Type.Literal('sale'),
  Type.Literal('gift'),
  Type.Literal('admin_recovery'),
  Type.Literal('custody_change'),
]);

export type TransferScenario = Static<typeof TransferScenarioSchema>;

export const TransferResultSchema = Type.Union([
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('rolled_back'),
]);

export type TransferResult = Static<typeof TransferResultSchema>;

export const TransferSpecSchema = Type.Object({
  transfer_id: Type.String({ minLength: 1 }),
  nft_id: NftIdSchema,
  from_owner: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  to_owner: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  scenario: TransferScenarioSchema,
  sealing_policy: ConversationSealingPolicySchema,
  initiated_at: Type.String({ format: 'date-time' }),
  initiated_by: Type.String({ minLength: 1 }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type TransferSpec = Static<typeof TransferSpecSchema>;

export const TransferEventSchema = Type.Object({
  transfer_id: Type.String({ minLength: 1 }),
  nft_id: NftIdSchema,
  from_owner: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  to_owner: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  scenario: TransferScenarioSchema,
  result: TransferResultSchema,
  sealing_policy: ConversationSealingPolicySchema,
  conversations_sealed: Type.Integer({ minimum: 0 }),
  conversations_migrated: Type.Integer({ minimum: 0 }),
  initiated_at: Type.String({ format: 'date-time' }),
  completed_at: Type.Optional(Type.String({ format: 'date-time' })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

export type TransferEventRecord = Static<typeof TransferEventSchema>;
```

### 4.7 Domain Event Envelope (`src/schemas/domain-event.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox';

const AggregateTypeSchema = Type.Union([
  Type.Literal('agent'),
  Type.Literal('conversation'),
  Type.Literal('billing'),
  Type.Literal('tool'),
  Type.Literal('transfer'),
  Type.Literal('message'),
]);

export const DomainEventSchema = Type.Object({
  event_id: Type.String({ minLength: 1 }),
  aggregate_id: Type.String({ minLength: 1 }),
  aggregate_type: AggregateTypeSchema,
  type: Type.String({ pattern: '^[a-z]+\\.[a-z_]+\\.[a-z_]+$' }),
  version: Type.Integer({ minimum: 1 }),
  occurred_at: Type.String({ format: 'date-time' }),
  actor: Type.String({ minLength: 1 }),
  correlation_id: Type.Optional(Type.String()),
  causation_id: Type.Optional(Type.String()),
  payload: Type.Unknown(),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
});

// Generic type helper — TypeBox validates the envelope; payload typing is TS-only
export type DomainEvent<T = unknown> = Omit<
  Static<typeof DomainEventSchema>, 'payload'
> & { payload: T };

// Typed event constructors per aggregate (convenience wrappers)
export type AgentEvent = DomainEvent<{ agent_id: string; [k: string]: unknown }>;
export type BillingEvent = DomainEvent<{ billing_entry_id: string; [k: string]: unknown }>;
export type ConversationEvent = DomainEvent<{ conversation_id: string; [k: string]: unknown }>;
export type TransferEvent = DomainEvent<{ transfer_id: string; from_owner: string; to_owner: string; [k: string]: unknown }>;
```

**Note:** At runtime, `DomainEventSchema` validates structure with `Type.Unknown()` payload. The generic `DomainEvent<T>` and typed wrappers (`AgentEvent`, `BillingEvent`, etc.) are compile-time-only TypeScript refinements — they do not create separate validators.

### 4.8 Breaking Changes to Existing Files

#### `src/schemas/invoke-response.ts` — MODIFIED

```typescript
// BEFORE (v1.1.0)
export const InvokeResponseSchema = Type.Object({
  // ...
  cost: CostBreakdownSchema,
  // ...
});

// AFTER (v2.0.0)
export const InvokeResponseSchema = Type.Object({
  // ...
  billing_entry_id: Type.String({ minLength: 1 }),
  // ...
});
```

Remove `CostBreakdownSchema` and `CostBreakdown` type exports. Keep `UsageSchema` and `Usage` (still used by `BillingEntry.usage`).

#### `src/schemas/invoke-response.ts` — UsageReport MODIFIED

```typescript
// BEFORE (v1.1.0)
export const UsageReportSchema = Type.Object({
  // ...
  cost: CostBreakdownSchema,
  // ...
});

// AFTER (v2.0.0)
export const UsageReportSchema = Type.Object({
  // ...
  billing_entry_id: Type.String({ minLength: 1 }), // References BillingEntry.id (ULID)
  // ...
});
```

`billing_entry_id` references `BillingEntry.id` (ULID), **not** `trace_id`. The `trace_id` on BillingEntry is a separate field for distributed tracing correlation.

#### `src/version.ts` — MODIFIED

```typescript
export const CONTRACT_VERSION = '2.0.0' as const;
export const MIN_SUPPORTED_VERSION = '2.0.0' as const;
```

#### `src/vocabulary/errors.ts` — EXTENDED

Add 7 new error codes to the existing `ERROR_CODES` object and `ERROR_HTTP_STATUS` mapping:

```typescript
// v2.0.0 additions
AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',              // 404
AGENT_NOT_ACTIVE: 'AGENT_NOT_ACTIVE',            // 403
AGENT_TRANSFER_IN_PROGRESS: 'AGENT_TRANSFER_IN_PROGRESS', // 409
CONVERSATION_SEALED: 'CONVERSATION_SEALED',       // 403
CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND', // 404
OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',         // 403
BILLING_RECIPIENTS_INVALID: 'BILLING_RECIPIENTS_INVALID', // 400
```

#### `src/validators/index.ts` — EXTENDED

Add lazy-compiled validators for all new schemas:

```typescript
export const validators = {
  // Existing (v1.1.0)
  jwtClaims: () => ...,
  s2sJwtClaims: () => ...,
  invokeResponse: () => ...,
  usageReport: () => ...,
  streamEvent: () => ...,
  routingPolicy: () => ...,

  // New (v2.0.0)
  agentDescriptor: () => TypeCompiler.Compile(AgentDescriptorSchema),
  billingEntry: () => TypeCompiler.Compile(BillingEntrySchema),
  creditNote: () => TypeCompiler.Compile(CreditNoteSchema),
  conversation: () => TypeCompiler.Compile(ConversationSchema),
  message: () => TypeCompiler.Compile(MessageSchema),
  transferSpec: () => TypeCompiler.Compile(TransferSpecSchema),
  transferEvent: () => TypeCompiler.Compile(TransferEventSchema),
  conversationSealingPolicy: () => TypeCompiler.Compile(ConversationSealingPolicySchema),
  domainEvent: () => TypeCompiler.Compile(DomainEventSchema),
} as const;
```

---

## 5. Data Architecture

### 5.1 Schema Relationships

```
NftId (canonical identifier)
  │
  ├── AgentDescriptor
  │   ├── AgentLifecycleState
  │   └── PoolId (models mapping)
  │
  ├── Conversation ──── Message
  │   └── ConversationStatus    └── BillingEntry ref
  │
  ├── TransferEvent
  │   ├── ConversationSealingPolicy
  │   └── TransferResult
  │
  └── BillingEntry
      ├── BillingRecipient[]
      ├── CostType
      └── CreditNote (reverse ref)

DomainEvent<T> (cross-cutting envelope)
  └── wraps any of the above as payload
```

### 5.2 Shared Patterns

| Pattern | Usage | Existing Example |
|---------|-------|-----------------|
| String-encoded micro-USD | `amount_micro`, `total_cost_micro`, `raw_cost_micro` | `CostBreakdown.total_cost_micro` |
| ISO datetime strings | All `*_at` timestamps | `UsageReport.timestamp` |
| ULID identifiers | `id` fields on Conversation, Message, DomainEvent | (new pattern, chosen for sortability) |
| Contract version field | `contract_version` on every root schema | `InvokeResponse.contract_version` |
| Basis points (0-10000) | `share_bps`, `multiplier_bps` | (new, extends bps concept from tiers) |

---

## 6. API Design

loa-hounfour does not expose HTTP APIs. It defines the **contract types** that downstream APIs consume.

### 6.1 Type Export Contract

```typescript
// Downstream import pattern (loa-finn)
import {
  type AgentDescriptor,
  type BillingEntry,
  type Conversation,
  type Message,
  AgentDescriptorSchema,
  validators,
  isValidTransition,
  parseNftId,
  allocateRecipients,
} from '@0xhoneyjar/loa-hounfour';

// Validate incoming data
const result = validators.agentDescriptor().Check(data);
```

### 6.2 JSON Schema Export Contract

Non-TypeScript consumers (Python, Go, Rust services) consume JSON Schema files.

**File layout:**
```
schemas/
├── agent-descriptor.schema.json
├── agent-lifecycle-state.schema.json
├── billing-entry.schema.json
├── credit-note.schema.json
├── conversation.schema.json
├── message.schema.json
├── transfer-spec.schema.json
├── transfer-event.schema.json
├── domain-event.schema.json
├── invoke-response.schema.json    # ✓ Existing (updated)
├── jwt-claims.schema.json         # ✓ Existing
└── index.json                     # ★ Schema registry manifest
```

**Generation:** `pnpm run schema:generate` calls `scripts/generate-schemas.ts` which uses TypeBox `Type.Strict()` to emit Draft 2020-12 JSON Schema. All `$ref` references are resolved inline (no external `$ref`) to ensure each schema file is self-contained.

**Registry manifest (`schemas/index.json`):**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "@0xhoneyjar/loa-hounfour Schema Registry",
  "version": "2.0.0",
  "schemas": {
    "agent-descriptor": "./agent-descriptor.schema.json",
    "billing-entry": "./billing-entry.schema.json",
    "conversation": "./conversation.schema.json"
  }
}
```

**Build step:** JSON Schema files are generated during `pnpm run build` and committed to the repo (not gitignored). This ensures non-TS consumers can reference schemas without running TypeScript tooling.

**Import patterns:**
```typescript
// Node.js ESM
import agentSchema from '@0xhoneyjar/loa-hounfour/schemas/agent-descriptor.schema.json' with { type: 'json' };

// Python
# pip install jsonschema
import json, jsonschema
schema = json.load(open('node_modules/@0xhoneyjar/loa-hounfour/schemas/agent-descriptor.schema.json'))
jsonschema.validate(instance=data, schema=schema)
```

---

## 7. Security Architecture

### 7.1 Conversation Sealing

The `ConversationSealingPolicy` defines security properties that loa-finn must implement:

| Property | Defined in hounfour | Implemented in loa-finn |
|----------|--------------------|-----------------------|
| `encryption_scheme` | Type definition (e.g., "aes-256-gcm") | Actual encryption |
| `key_derivation` | Type definition (e.g., "hkdf-sha256") | Key management |
| `key_reference` | Opaque string type | Key storage/retrieval |
| `access_audit` | Boolean flag | Audit log implementation |
| `previous_owner_access` | Enum ("none" / "read_only_24h") | Access control enforcement |

### 7.2 NftId Integrity

- EIP-55 checksum on collection address prevents address confusion attacks
- Chain ID prevents cross-chain replay of agent identifiers
- `parseNftId()` validates format before any downstream usage

### 7.3 Billing Integrity

- `recipients[].share_bps` must sum to 10000 (enforced by `validateBillingRecipients`)
- `allocateRecipients()` uses deterministic largest-remainder to prevent rounding exploits
- String-encoded micro-USD prevents floating-point precision loss
- `CreditNote` prevents negative BillingEntry (separate audit trail for reversals)
- `idempotency_key` prevents double-billing (existing pattern from v1.1.0)

---

## 8. Testing Strategy

### 8.1 Golden Test Vectors

Extend the existing `vectors/` directory:

```
vectors/
├── budget/                      # ✓ Existing (v1.1.0)
│   └── *.json
├── jwt/                         # ✓ Existing (v1.1.0)
│   └── *.json
├── agent/                       # ★ NEW (v2.0.0)
│   ├── descriptor-valid.json
│   ├── descriptor-invalid.json
│   ├── lifecycle-transitions.json
│   └── nft-id-parsing.json
├── billing/                     # ★ NEW (v2.0.0)
│   ├── entry-valid.json
│   ├── entry-invalid.json
│   ├── credit-note-valid.json
│   ├── recipient-allocation.json
│   └── migration-from-v1.json
├── conversation/                # ★ NEW (v2.0.0)
│   ├── conversation-valid.json
│   ├── message-valid.json
│   └── sealing-scenarios.json
├── transfer/                    # ★ NEW (v2.0.0)
│   ├── events-valid.json
│   ├── scenarios.json
│   └── results.json
└── domain-event/                # ★ NEW (v2.0.0)
    ├── event-valid.json
    └── naming-conventions.json
```

### 8.2 Test File Structure

```
tests/vectors/
├── budget.test.ts               # ✓ Existing
├── idempotency.test.ts          # ✓ Existing
├── req-hash.test.ts             # ✓ Existing
├── agent-descriptor.test.ts     # ★ NEW
├── agent-lifecycle.test.ts      # ★ NEW
├── billing-entry.test.ts        # ★ NEW
├── conversation.test.ts         # ★ NEW
├── transfer-spec.test.ts        # ★ NEW
├── domain-event.test.ts         # ★ NEW
├── nft-id.test.ts               # ★ NEW
└── billing-allocation.test.ts   # ★ NEW
```

### 8.3 Test Categories per Schema

| Category | Description | Count per schema |
|----------|-------------|-----------------|
| **Valid** | Happy path, all fields populated | 2-3 |
| **Valid minimal** | Only required fields | 1 |
| **Invalid field** | Each required field missing | 1 per required field |
| **Invalid value** | Each validation rule violated | 1 per rule |
| **Edge case** | Boundary values, empty arrays | 2-3 |
| **Migration** | v1.1.0 → v2.0.0 before/after | 1-2 (billing only) |

**Target: ~60-80 total vectors across all new schemas.**

---

## 9. Build & CI Pipeline

### 9.1 Build Steps (unchanged from v1.1.0)

```bash
pnpm run typecheck    # tsc --noEmit (strict mode)
pnpm run build        # tsc (emit to dist/)
pnpm run test         # vitest run
pnpm run schema:generate  # Generate JSON Schema files
pnpm run schema:check     # Validate generated schemas
pnpm run semver:check     # Validate version bump
```

### 9.2 Schema Generation Script

Extend `scripts/generate-schemas.ts` to include new schemas:

```typescript
const schemasToGenerate = [
  // Existing
  { name: 'invoke-response', schema: InvokeResponseSchema },
  { name: 'jwt-claims', schema: JwtClaimsSchema },
  // ...

  // New (v2.0.0)
  { name: 'agent-descriptor', schema: AgentDescriptorSchema },
  { name: 'agent-lifecycle-state', schema: AgentLifecycleStateSchema },
  { name: 'transfer-event', schema: TransferEventSchema },
  { name: 'billing-entry', schema: BillingEntrySchema },
  { name: 'credit-note', schema: CreditNoteSchema },
  { name: 'conversation', schema: ConversationSchema },
  { name: 'message', schema: MessageSchema },
  { name: 'domain-event', schema: DomainEventSchema },
];
```

### 9.3 Package.json Updates

```json
{
  "name": "@0xhoneyjar/loa-hounfour",
  "version": "2.0.0",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schemas/*": "./schemas/*"
  }
}
```

---

## 10. Rollout Plan

### 10.1 Phased Rollout Strategy

Hard cutover across 4+ repos is a delivery risk. The following phased approach minimizes blast radius:

| Phase | Action | Duration | Rollback |
|-------|--------|----------|----------|
| **Phase A** | Publish `@0xhoneyjar/loa-hounfour@2.0.0-rc.1` to npm (prerelease tag) | Day 0 | Unpublish prerelease |
| **Phase B** | Upgrade loa-finn to rc.1 on a feature branch, run full test suite | Day 1-2 | Revert branch |
| **Phase C** | Upgrade arrakis to rc.1 on a feature branch, validate gateway contract | Day 2-3 | Revert branch |
| **Phase D** | Publish `@0xhoneyjar/loa-hounfour@2.0.0` (release tag) | Day 4 | Deprecate + publish 2.0.1 patch |
| **Phase E** | Merge all downstream feature branches, deploy staging | Day 4-5 | Revert deploys |
| **Phase F** | Production deploy (loa-finn → arrakis → mibera-freeside) | Day 5-6 | Standard rollback |

### 10.2 Coordination Requirements

- **Slack channel**: `#hounfour-v2-migration` for real-time coordination
- **Lock period**: No unrelated deploys during Phase E-F
- **Feature flag**: Downstream repos may use `HOUNFOUR_V2=true` env var to toggle between v1/v2 billing paths during transition (optional, not required)

---

## 11. Migration Guide (v1.1.0 → v2.0.0)

### 11.1 Breaking Changes Summary

| Change | v1.1.0 | v2.0.0 | Action |
|--------|--------|--------|--------|
| Cost tracking | `CostBreakdown` | `BillingEntry` | Replace all references |
| Invoke response | `cost: CostBreakdown` | `billing_entry_id: string` | Update field access |
| Usage report | `cost: CostBreakdown` | `billing_entry_id: string` | Update field access; references BillingEntry.id (ULID) |
| BillingEntry | (new) | `id: ULID` + `trace_id: string` | `id` is canonical identifier; `trace_id` is for distributed tracing |
| Contract version | `"1.1.0"` | `"2.0.0"` | Update version checks |
| Min supported | `"1.0.0"` | `"2.0.0"` | Update compat validation |

### 11.2 Migration Examples

**Before (v1.1.0):**
```typescript
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
// Step 1: Create BillingEntry
const entry: BillingEntry = {
  id: ulid(),                    // Canonical billing entry identifier
  trace_id: response.id,        // Distributed tracing correlation
  tenant_id: tenantId,
  cost_type: 'model_inference',
  provider: response.provider,
  model: response.model,
  pool_id: response.pool_id,
  currency: 'USD',
  precision: 6,
  raw_cost_micro: '4500',
  multiplier_bps: 25000, // 2.5x
  total_cost_micro: '11250',
  rounding_policy: 'largest_remainder',
  recipients: allocateRecipients([
    { address: 'provider-addr', role: 'provider', share_bps: 4000 },
    { address: 'platform-addr', role: 'platform', share_bps: 6000 },
  ], '11250'),
  idempotency_key: deriveIdempotencyKey(...),
  timestamp: new Date().toISOString(),
  contract_version: '2.0.0',
  usage: response.usage,
};

// Step 2: Response references the entry
const response: InvokeResponse = {
  // ...
  billing_entry_id: entry.id,     // References BillingEntry.id (ULID)
};
```

---

## 12. File Inventory

### New Files (v2.0.0)

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `src/schemas/agent-descriptor.ts` | ~80 | AgentDescriptor TypeBox schema |
| `src/schemas/agent-lifecycle.ts` | ~50 | Lifecycle state enum + transitions |
| `src/schemas/transfer-spec.ts` | ~90 | Transfer scenarios + sealing policy |
| `src/schemas/billing-entry.ts` | ~120 | BillingEntry + CreditNote schemas |
| `src/schemas/conversation.ts` | ~100 | Conversation + Message schemas |
| `src/schemas/domain-event.ts` | ~40 | Generic event envelope |
| `src/utilities/nft-id.ts` | ~80 | NftId parsing/formatting + EIP-55 |
| `src/utilities/lifecycle.ts` | ~30 | Transition validator (shared by agent + tool) |
| `src/utilities/billing.ts` | ~60 | Recipient allocation + validation |
| **Total new source** | **~650** | |

### Modified Files (v2.0.0)

| File | Change |
|------|--------|
| `src/index.ts` | Add ~40 new exports |
| `src/version.ts` | Bump to 2.0.0 |
| `src/schemas/invoke-response.ts` | `cost` → `billing_entry_id` |
| `src/vocabulary/errors.ts` | Add 7 error codes |
| `src/validators/index.ts` | Add 7 lazy validators |
| `scripts/generate-schemas.ts` | Add 8 new schema entries |
| `package.json` | Version bump to 2.0.0 |

### New Test Files (v2.0.0)

| File | Vectors (est.) |
|------|---------------|
| `tests/vectors/agent-descriptor.test.ts` | ~10 |
| `tests/vectors/agent-lifecycle.test.ts` | ~8 |
| `tests/vectors/billing-entry.test.ts` | ~15 |
| `tests/vectors/conversation.test.ts` | ~10 |
| `tests/vectors/transfer-spec.test.ts` | ~8 |
| `tests/vectors/domain-event.test.ts` | ~5 |
| `tests/vectors/nft-id.test.ts` | ~8 |
| `tests/vectors/billing-allocation.test.ts` | ~6 |
| **Total new vectors** | **~70** |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| EIP-55 keccak256 without viem | Bundle size vs dependency | Use `@noble/hashes/sha3` keccak_256 (~3KB, audited) or vendored pure-JS Keccak-256. **NOT** `node:crypto` SHA3-256 (wrong algorithm). |
| TypeBox `@context` field | JSON-LD `@` prefix may need special handling | TypeBox supports arbitrary string keys via `Type.Object({'@context': ...})` — verified |
| Generic `DomainEvent<T>` | TypeBox doesn't directly support generics at runtime | Define base schema with `Type.Unknown()` payload; typed wrappers per aggregate |
| Test vector count | ~70 new vectors is significant effort | Prioritize billing + lifecycle (highest financial/safety impact) |
| Downstream migration timing | loa-finn/arrakis must coordinate | Publish v2.0.0 to npm, then coordinate same-week upgrades |

---

## 14. Sprint Estimation

| Sprint | Deliverables | Effort |
|--------|-------------|--------|
| **Sprint 1** | NftId utility, AgentLifecycleState, AgentDescriptor schema, lifecycle utility | ~1 day |
| **Sprint 2** | BillingEntry, CreditNote, billing utilities, migration of InvokeResponse/UsageReport | ~1.5 days |
| **Sprint 3** | Conversation, Message, TransferSpec, ConversationSealingPolicy, DomainEvent | ~1.5 days |
| **Sprint 4** | Error codes, validators, index.ts exports, JSON Schema generation, package.json | ~0.5 day |
| **Sprint 5** | Golden test vectors (~70), migration guide, semver check | ~1.5 days |
| **Total** | v2.0.0 complete | ~6 days |

---

## 15. Future Considerations (v2.1.0, v2.2.0)

### v2.1.0 — Tool Marketplace Types

New files:
- `src/schemas/tool-registration.ts` — ToolRegistration, ToolLifecycleState, ToolListResponse
- `src/utilities/lifecycle.ts` — Extended with tool transition map (shared module)
- 3 new error codes
- ~15 golden test vectors

### v2.2.0 — Agent Messaging Types

New files:
- `src/schemas/agent-message.ts` — AgentMessage, AgentAddress, AgentInbox
- `src/utilities/agent-address.ts` — parseAgentAddress, formatAgentAddress
- 2 new error codes
- ~10 golden test vectors

---

## 16. Flatline Review Decisions

### HIGH_CONSENSUS (Auto-Integrated)

| ID | Finding | Integration |
|----|---------|-------------|
| IMP-001 (935) | Conversation/Message schemas referenced but undefined | Added Section 4.6b with full TypeBox schemas for Conversation, ConversationStatus, Message, MessageRole |
| IMP-002 (885) | TransferSpec/TransferEvent/ConversationSealingPolicy unspecified | Added Section 4.6c with TransferSpec, TransferEvent, TransferScenario, TransferResult, ConversationSealingPolicy schemas |
| IMP-003 (895) | keccak256 vs SHA3-256 mismatch — node:crypto is wrong algorithm | Fixed Section 4.2: recommends @noble/hashes/sha3 keccak_256 (~3KB). Updated Section 13 risks. |
| IMP-004 (840) | Hard cutover across repos needs rollout plan | Added Section 10: 6-phase rollout (rc.1 prerelease → feature branches → release → staged deploy) |
| IMP-005 (835) | DomainEvent generic type needs concrete wrappers | Added typed event constructors: AgentEvent, BillingEvent, ConversationEvent, TransferEvent in Section 4.7 |
| IMP-008 (720) | JSON Schema export format/generation unspecified | Expanded Section 6.2: file layout, $ref inline resolution, registry manifest, Python import example |

### BLOCKERS (Human Decisions)

| ID | Concern | Decision | Rationale |
|----|---------|----------|-----------|
| SKP-001 (950) | DomainEvent<T> template artifacts | **OVERRIDDEN** — false positive | Flatline saw orchestrator template injection, not actual SDD content. Type is valid TypeScript. |
| SKP-002 (900) | Keccak/EIP-55 Node crypto risk | **OVERRIDDEN** — resolved by IMP-003 | SDD now correctly specifies keccak_256 from @noble/hashes, not node:crypto SHA3-256 |
| SKP-003 (760) | Node.js >=22 blocks browser/edge | **OVERRIDDEN** — Node >=22 only | Package is consumed by Node.js backend services only. Browser/edge is not a current requirement. |
| SKP-004 (740) | billing_entry_id uses trace_id, UsageReport missing | **ACCEPTED** | Added explicit `id` (ULID) field to BillingEntry, specified UsageReport breaking change, fixed migration example to use `entry.id` |
