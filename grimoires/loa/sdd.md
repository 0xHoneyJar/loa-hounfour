# SDD: loa-hounfour v5.0.0 — The Multi-Model Release

**Status:** Draft
**Author:** Agent (Simstim Phase 3: Architecture)
**Date:** 2026-02-15
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Cycle:** cycle-010
**Sources:**
- PRD v5.0.0 — The Multi-Model Release
- Existing codebase: 60+ TypeScript source files, ~12,000 lines, 1,097 tests
- Previous SDD: v4.6.0 (cycle-009)
- loa-finn RFC #31 (Hounfour Multi-Model Provider Abstraction)
- loa-finn RFC #66 (Launch Readiness)
- arrakis PR #63 (Revenue Rules)
- Bridgebuilder findings across 9 cycles, 13+ iterations

---

## 1. Executive Summary

This SDD defines the architecture for extending `@0xhoneyjar/loa-hounfour` from v4.6.0 (Level 4: Formalization) to v5.0.0 (Level 4+: Multi-Model Formalization). The package remains a zero-runtime-dependency TypeScript library (runtime: `@sinclair/typebox`, `@noble/hashes`, `jose`).

**Architecture philosophy:** Extend, decompose, formalize. The monolithic barrel (`src/index.ts`, 486 lines) is factored into domain-aligned sub-packages. New ModelPort schemas define the adapter boundary contract. The constraint language gains a formal grammar. Cross-ecosystem vectors are published for consumer validation.

**Key architectural decisions:**

1. **Barrel decomposition via sub-package index files** — `src/core/index.ts`, `src/economy/index.ts`, `src/model/index.ts`, `src/governance/index.ts`, `src/constraints/index.ts` — with root barrel re-exporting everything for backward compatibility
2. **ModelPort schemas as a new `model` domain** — completion, ensemble, routing, and budget contracts live in `src/schemas/model/`
3. **Constraint grammar formalized as PEG** — `constraints/GRAMMAR.md` specifies the expression language, expression versioning via `expression_version` field, fuzz tests via fast-check
4. **Cross-ecosystem vectors in `vectors/cross-ecosystem/`** — JSON fixtures with schema-version-tagged validity, consumed by loa-finn, arrakis, mibera-freeside
5. **Metadata namespace enforcement** — `billing.*` namespace added, `isValidMetadataKey()` extended, vocabulary becomes exhaustive

---

## 2. Module Architecture

### 2.1 Current Structure (v4.6.0)

```
src/
├── schemas/             # 29 TypeBox schema files
├── validators/          # Cross-field registry + validate() + compatibility
├── vocabulary/          # 18 domain vocabulary modules
├── utilities/           # 4 helper modules (nft-id, lifecycle, billing, reputation)
├── integrity/           # 2 modules (req-hash, idempotency)
├── constraints/         # 2 modules (evaluator.ts, types.ts)
├── test-infrastructure/ # ProtocolStateTracker
├── version.ts           # CONTRACT_VERSION = '4.6.0'
└── index.ts             # 486-line monolithic barrel
```

### 2.2 Target Structure (v5.0.0)

```
src/
├── core/
│   └── index.ts              # Sub-package barrel: agent, conversation, event, transfer, health
├── economy/
│   └── index.ts              # Sub-package barrel: billing, escrow, stake, credit, dividend, currency
├── model/
│   └── index.ts              # Sub-package barrel: completion, ensemble, routing, budget, stream
├── governance/
│   └── index.ts              # Sub-package barrel: reputation, sanction, dispute, escalation
├── constraints/
│   ├── index.ts              # Sub-package barrel: evaluator, types, grammar utils
│   ├── evaluator.ts          # Extended with error positions, expression versioning
│   ├── types.ts              # Extended with expression_version field
│   └── grammar.ts            # NEW: PEG grammar definition + validation
├── schemas/
│   ├── model/                # NEW: ModelPort adapter boundary schemas
│   │   ├── completion-request.ts
│   │   ├── completion-result.ts
│   │   ├── model-capabilities.ts
│   │   ├── provider-wire-message.ts
│   │   ├── tool-definition.ts
│   │   └── tool-result.ts
│   ├── model/ensemble/       # NEW: Ensemble orchestration schemas
│   │   ├── ensemble-strategy.ts
│   │   ├── ensemble-request.ts
│   │   └── ensemble-result.ts
│   ├── model/routing/        # NEW: Routing & budget schemas
│   │   ├── execution-mode.ts
│   │   ├── provider-type.ts
│   │   ├── agent-requirements.ts
│   │   ├── budget-scope.ts
│   │   └── routing-resolution.ts
│   └── [existing schemas unchanged]
├── validators/
│   └── index.ts              # Extended with new schema validators
├── vocabulary/
│   ├── metadata.ts           # Extended with billing.* namespace enforcement
│   └── [existing vocabulary unchanged]
├── utilities/                # Unchanged
├── integrity/                # Unchanged
├── test-infrastructure/      # Unchanged
├── version.ts                # CONTRACT_VERSION = '5.0.0'
└── index.ts                  # Root barrel: re-exports all sub-packages
```

### 2.3 New Files Summary

| Category | Files | Purpose |
|----------|-------|---------|
| ModelPort schemas | 6 | `completion-request.ts`, `completion-result.ts`, `model-capabilities.ts`, `provider-wire-message.ts`, `tool-definition.ts`, `tool-result.ts` |
| Ensemble schemas | 3 | `ensemble-strategy.ts`, `ensemble-request.ts`, `ensemble-result.ts` |
| Routing schemas | 5 | `execution-mode.ts`, `provider-type.ts`, `agent-requirements.ts`, `budget-scope.ts`, `routing-resolution.ts` |
| Sub-package barrels | 5 | `core/index.ts`, `economy/index.ts`, `model/index.ts`, `governance/index.ts`, `constraints/index.ts` |
| Grammar | 2 | `constraints/grammar.ts`, `constraints/GRAMMAR.md` |
| Cross-ecosystem vectors | 3+ | `vectors/cross-ecosystem/*.json` |
| Constraint files | 5+ | New constraint files for ModelPort schemas |

---

## 3. Component Design

### 3.1 FR-1: ModelPort Adapter Boundary Contracts

These schemas define the canonical wire format for the five-layer provider abstraction (Agent → Routing → Adapter → Infrastructure → Distribution). They are the contracts that `cheval.py` (loa-finn) normalizes to and that arrakis constructs billing from.

#### 3.1.1 CompletionRequest

**File:** `src/schemas/model/completion-request.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { ProviderWireMessageSchema } from './provider-wire-message.js';
import { ToolDefinitionSchema } from './tool-definition.js';
import { MicroUSDUnsigned } from '../../vocabulary/currency.js';

export const CompletionRequestSchema = Type.Object(
  {
    // Identity & routing
    request_id: Type.String({ format: 'uuid' }),
    agent_id: Type.String({ minLength: 1 }),
    tenant_id: Type.String({ minLength: 1 }),
    nft_id: Type.Optional(Type.String({ minLength: 1 })),
    trace_id: Type.Optional(Type.String({ minLength: 1 })),

    // Model selection
    model: Type.String({ minLength: 1 }),
    provider: Type.Optional(Type.String({ minLength: 1 })),
    execution_mode: Type.Optional(Type.Union([
      Type.Literal('native_runtime'),
      Type.Literal('remote_model'),
    ])),

    // Messages (wire format, not persisted)
    messages: Type.Array(ProviderWireMessageSchema, { minItems: 1 }),

    // Tool calling
    tools: Type.Optional(Type.Array(ToolDefinitionSchema)),
    tool_choice: Type.Optional(Type.Union([
      Type.Literal('auto'),
      Type.Literal('none'),
      Type.Literal('required'),
      Type.Object({
        type: Type.Literal('function'),
        function: Type.Object({ name: Type.String({ minLength: 1 }) }),
      }),
    ])),

    // Model options
    temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
    max_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    top_p: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    stop_sequences: Type.Optional(Type.Array(Type.String())),

    // Thinking/reasoning
    thinking: Type.Optional(Type.Object({
      enabled: Type.Boolean(),
      budget_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    })),

    // Budget enforcement
    budget_limit_micro: Type.Optional(MicroUSDUnsigned),

    // Metadata
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'CompletionRequest',
    description: 'Canonical wire-format request for model completion — the adapter port contract',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type CompletionRequest = Static<typeof CompletionRequestSchema>;
```

**Cross-field validations:**
- `tools` present → `tool_choice` required
- `execution_mode === 'native_runtime'` → `provider` must be set
- `thinking.enabled === true` → model must support thinking (validated at runtime by consumer, documented as constraint)
- `budget_limit_micro` present → must be > 0

#### 3.1.2 CompletionResult

**File:** `src/schemas/model/completion-result.ts`

```typescript
export const CompletionResultSchema = Type.Object(
  {
    request_id: Type.String({ format: 'uuid' }),
    model: Type.String({ minLength: 1 }),
    provider: Type.String({ minLength: 1 }),

    // Content
    content: Type.Optional(Type.String()),
    thinking: Type.Optional(Type.String()),
    tool_calls: Type.Optional(Type.Array(Type.Object({
      id: Type.String({ minLength: 1 }),
      type: Type.Literal('function'),
      function: Type.Object({
        name: Type.String({ minLength: 1 }),
        arguments: Type.String(),
      }),
    }))),

    // Termination
    finish_reason: Type.Union([
      Type.Literal('stop'),
      Type.Literal('tool_calls'),
      Type.Literal('length'),
      Type.Literal('content_filter'),
    ]),

    // Usage (for billing)
    usage: Type.Object({
      prompt_tokens: Type.Integer({ minimum: 0 }),
      completion_tokens: Type.Integer({ minimum: 0 }),
      reasoning_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
      total_tokens: Type.Integer({ minimum: 0 }),
      cost_micro: MicroUSDUnsigned,
    }),

    // Timing
    latency_ms: Type.Integer({ minimum: 0 }),

    // Metadata
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'CompletionResult',
    description: 'Canonical wire-format result from model completion — the adapter response contract',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type CompletionResult = Static<typeof CompletionResultSchema>;
```

**Cross-field validations:**
- `finish_reason === 'tool_calls'` → `tool_calls` must be non-empty
- `finish_reason === 'stop'` → `content` should be present (warning)
- `usage.total_tokens === usage.prompt_tokens + usage.completion_tokens + (usage.reasoning_tokens ?? 0)`
- `usage.cost_micro` must be >= 0 (guaranteed by MicroUSDUnsigned)

#### 3.1.3 ModelCapabilities

**File:** `src/schemas/model/model-capabilities.ts`

```typescript
export const ModelCapabilitiesSchema = Type.Object(
  {
    model_id: Type.String({ minLength: 1 }),
    provider: Type.String({ minLength: 1 }),
    capabilities: Type.Object({
      thinking_traces: Type.Boolean(),
      vision: Type.Boolean(),
      tool_calling: Type.Boolean(),
      streaming: Type.Boolean(),
      json_mode: Type.Boolean(),
      native_runtime: Type.Boolean(),
    }),
    limits: Type.Object({
      max_context_tokens: Type.Integer({ minimum: 1 }),
      max_output_tokens: Type.Integer({ minimum: 1 }),
      max_thinking_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
    pricing: Type.Optional(Type.Object({
      input_per_million_micro: MicroUSDUnsigned,
      output_per_million_micro: MicroUSDUnsigned,
      thinking_per_million_micro: Type.Optional(MicroUSDUnsigned),
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ModelCapabilities',
    description: 'Declared capabilities and limits for a model provider',
    additionalProperties: false,
  },
);

export type ModelCapabilities = Static<typeof ModelCapabilitiesSchema>;
```

#### 3.1.4 ProviderWireMessage

**File:** `src/schemas/model/provider-wire-message.ts`

Distinct from the persisted `Message` schema (conversation context). This is the lean wire format sent to model APIs.

```typescript
export const ProviderWireMessageSchema = Type.Object(
  {
    role: Type.Union([
      Type.Literal('system'),
      Type.Literal('user'),
      Type.Literal('assistant'),
      Type.Literal('tool'),
    ]),
    content: Type.Optional(Type.Union([
      Type.String(),
      Type.Array(Type.Object({
        type: Type.String({ minLength: 1 }),
        text: Type.Optional(Type.String()),
        source: Type.Optional(Type.Unknown()),
      })),
    ])),
    thinking: Type.Optional(Type.String()),
    tool_calls: Type.Optional(Type.Array(Type.Object({
      id: Type.String({ minLength: 1 }),
      type: Type.Literal('function'),
      function: Type.Object({
        name: Type.String({ minLength: 1 }),
        arguments: Type.String(),
      }),
    }))),
    tool_call_id: Type.Optional(Type.String({ minLength: 1 })),
  },
  {
    $id: 'ProviderWireMessage',
    description: 'Lean wire-format message for model API calls — distinct from persisted Message',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type ProviderWireMessage = Static<typeof ProviderWireMessageSchema>;
```

**Cross-field validations:**
- `role === 'tool'` → `tool_call_id` required
- `role === 'assistant'` with `tool_calls` → `content` or `tool_calls` present (not both empty)

#### 3.1.5 ToolDefinition + ToolResult

**File:** `src/schemas/model/tool-definition.ts`

```typescript
export const ToolDefinitionSchema = Type.Object(
  {
    type: Type.Literal('function'),
    function: Type.Object({
      name: Type.String({ minLength: 1, pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$' }),
      description: Type.String(),
      parameters: Type.Optional(Type.Unknown()), // JSON Schema object
    }),
  },
  {
    $id: 'ToolDefinition',
    description: 'Canonical tool definition shape for model function calling',
    additionalProperties: false,
  },
);
```

**File:** `src/schemas/model/tool-result.ts`

```typescript
export const ToolResultSchema = Type.Object(
  {
    role: Type.Literal('tool'),
    tool_call_id: Type.String({ minLength: 1 }),
    content: Type.String(),
  },
  {
    $id: 'ToolResult',
    description: 'Tool execution response for function calling',
    additionalProperties: false,
  },
);
```

### 3.2 FR-2: Ensemble Orchestration Contracts

#### 3.2.1 EnsembleStrategy

**File:** `src/schemas/model/ensemble/ensemble-strategy.ts`

```typescript
export const ENSEMBLE_STRATEGIES = ['first_complete', 'best_of_n', 'consensus'] as const;

export const EnsembleStrategySchema = Type.Union(
  ENSEMBLE_STRATEGIES.map(s => Type.Literal(s)),
  { $id: 'EnsembleStrategy', description: 'Multi-model dispatch strategy' },
);

export type EnsembleStrategy = Static<typeof EnsembleStrategySchema>;
```

#### 3.2.2 EnsembleRequest

**File:** `src/schemas/model/ensemble/ensemble-request.ts`

```typescript
export const EnsembleRequestSchema = Type.Object(
  {
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    models: Type.Array(Type.String({ minLength: 1 }), { minItems: 2 }),
    timeout_ms: Type.Integer({ minimum: 1000 }),
    task_type: Type.Optional(Type.String({ minLength: 1 })),
    request: CompletionRequestSchema,
    consensus_threshold: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'EnsembleRequest',
    description: 'Multi-model dispatch request with strategy and timeout',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

**Cross-field validations:**
- `strategy === 'consensus'` → `consensus_threshold` required
- `strategy === 'best_of_n'` → `models.length >= 2` (enforced by minItems)
- `timeout_ms` >= 1000 (enforced by minimum)

#### 3.2.3 EnsembleResult

**File:** `src/schemas/model/ensemble/ensemble-result.ts`

```typescript
export const EnsembleResultSchema = Type.Object(
  {
    ensemble_id: Type.String({ format: 'uuid' }),
    strategy: EnsembleStrategySchema,
    selected: CompletionResultSchema,
    candidates: Type.Array(Type.Object({
      model: Type.String({ minLength: 1 }),
      result: Type.Optional(CompletionResultSchema),
      error: Type.Optional(Type.String()),
      latency_ms: Type.Integer({ minimum: 0 }),
    })),
    consensus_score: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    total_cost_micro: MicroUSDUnsigned,
    total_latency_ms: Type.Integer({ minimum: 0 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'EnsembleResult',
    description: 'Result of multi-model ensemble dispatch with candidate details',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

**Cross-field validations:**
- `strategy === 'consensus'` → `consensus_score` required
- `total_cost_micro >= selected.usage.cost_micro`
- `candidates.length >= 1`

### 3.3 FR-3: Open Finding Resolution — Financial Safety

All changes are `Type.Optional` for backward compatibility.

#### 3.3.1 BB-V4-DEEP-001: Sybil Resistance

**File:** `src/schemas/reputation-score.ts` (modified)

Add two optional fields:

```typescript
// Add to ReputationScoreSchema:
min_unique_validators: Type.Optional(Type.Integer({ minimum: 0 })),
validation_graph_hash: Type.Optional(Type.String({ minLength: 1 })),
```

**Cross-field validator update:** When `min_unique_validators` is present, `sample_size` must be >= `min_unique_validators`. When `validation_graph_hash` is present, it indicates a cryptographic commitment to the validation graph (opaque to the protocol, meaningful to consumers).

**Constraint file update:** `constraints/ReputationScore.constraints.json` gains:
```json
{
  "id": "reputation-sybil-validator-count",
  "expression": "min_unique_validators == null || sample_size >= min_unique_validators",
  "severity": "error",
  "message": "sample_size must be >= min_unique_validators when min_unique_validators is set",
  "fields": ["sample_size", "min_unique_validators"]
}
```

#### 3.3.2 BB-V4-DEEP-002 / CF-4: Escrow Timeout

Already resolved in v4.6.0 — `expires_at` field exists on `EscrowEntrySchema`. Cross-field validators enforce temporal ordering. **No additional schema changes needed.** Status: CLOSED.

#### 3.3.3 BB-V4-DEEP-003: Dividend Audit Trail

Already resolved in v4.6.0 — `source_performance_ids` field exists on `CommonsDividendSchema`. Cross-field validator warns when missing. **No additional schema changes needed.** Status: CLOSED.

#### 3.3.4 BB-V4-DEEP-004: Escalation Linkage

**File:** `src/schemas/sanction.ts` (modified)

Add optional field linking to the applied escalation rule:

```typescript
// Add to SanctionSchema:
escalation_rule_applied: Type.Optional(Type.String({ minLength: 1 })),
```

**Cross-field validator update:** When `escalation_rule_applied` is present, it must match a key in `ESCALATION_RULES`. This closes the policy/enforcement gap.

**Constraint file update:** `constraints/Sanction.constraints.json` gains:
```json
{
  "id": "sanction-escalation-rule-linkage",
  "expression": "escalation_rule_applied == null || escalation_rule_applied == trigger.violation_type",
  "severity": "warning",
  "message": "escalation_rule_applied should match trigger.violation_type",
  "fields": ["escalation_rule_applied", "trigger.violation_type"]
}
```

### 3.4 FR-4: Barrel Decomposition

#### Design Approach

Factor the monolithic `src/index.ts` (486 lines) into 5 domain-aligned sub-package barrels. The root barrel becomes a thin re-export layer.

**Sub-package barrel design:**

Each sub-package barrel (`src/{domain}/index.ts`) contains:
1. All `export` statements for that domain
2. No logic — pure re-exports
3. Target ≤150 lines each

**Root barrel design:**

`src/index.ts` becomes:
```typescript
// Root barrel — backward-compatible re-export of all sub-packages
export * from './core/index.js';
export * from './economy/index.js';
export * from './model/index.js';
export * from './governance/index.js';
export * from './constraints/index.js';

// Integrity (cross-cutting, stays in root)
export { computeReqHash, verifyReqHash, /* ... */ } from './integrity/req-hash.js';
export { deriveIdempotencyKey } from './integrity/idempotency.js';

// Version (cross-cutting, stays in root)
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, parseSemver } from './version.js';

// Validators (cross-cutting, stays in root)
export { validate, validators, /* ... */ } from './validators/index.js';
export { validateCompatibility, type CompatibilityResult } from './validators/compatibility.js';
export { validateBillingEntryFull } from './validators/billing.js';
```

#### Sub-Package Mapping

**`src/core/index.ts` (~120 exports):**
- Agent: `AgentDescriptorSchema`, `AgentLifecycleStateSchema`, lifecycle constants
- Conversation: `ConversationSchema`, `MessageSchema`, sealing/access policy
- Transfer: `TransferSpecSchema`, `TransferEventSchema`
- Domain Event: `DomainEventSchema`, `DomainEventBatchSchema`, all event types/guards
- Saga: `SagaContextSchema`
- Lifecycle: `LifecycleTransitionPayloadSchema`, reason codes
- Discovery: `ProtocolDiscoverySchema`, `CapabilitySchema`
- Health: `HealthStatusSchema`
- NFT: `NftIdSchema`, utilities
- Lifecycle utilities: `createTransitionValidator`, guards
- Errors: `ERROR_CODES`
- Patterns: `UUID_V4_PATTERN`
- Schema stability: `SCHEMA_STABILITY_LEVELS`
- Deprecation: `DEPRECATION_REGISTRY`

**`src/economy/index.ts` (~80 exports):**
- JWT: `JwtClaimsSchema`, `S2SJwtClaimsSchema`, `ByokClaimsSchema`
- Invoke: `InvokeResponseSchema`, `UsageReportSchema`
- Billing: `BillingEntrySchema`, `CreditNoteSchema`, billing utilities
- Escrow: `EscrowEntrySchema`, transitions
- Stake: `StakePositionSchema`
- Credit: `MutualCreditSchema`
- Dividend: `CommonsDividendSchema`
- Currency: `MicroUSD`, all arithmetic functions
- Economy flow: `ECONOMY_FLOW`, `verifyEconomyFlow`
- Transfer choreography: `TRANSFER_CHOREOGRAPHY`, `TRANSFER_INVARIANTS`
- Economic choreography: `ECONOMIC_CHOREOGRAPHY`

**`src/model/index.ts` (~60 exports):**
- Completion: `CompletionRequestSchema`, `CompletionResultSchema`
- Capabilities: `ModelCapabilitiesSchema`
- Wire message: `ProviderWireMessageSchema`
- Tool: `ToolDefinitionSchema`, `ToolResultSchema`
- Ensemble: `EnsembleStrategySchema`, `EnsembleRequestSchema`, `EnsembleResultSchema`
- Routing: `ExecutionModeSchema`, `ProviderTypeSchema`, `AgentRequirementsSchema`, `BudgetScopeSchema`, `RoutingResolutionSchema`
- Stream events: `StreamEventSchema` and all sub-types
- Pools: `POOL_IDS`, `PoolIdSchema`
- Thinking: `ThinkingTraceSchema`
- Tool call: `ToolCallSchema`
- Routing policy: `RoutingPolicySchema`
- Routing constraint: `RoutingConstraintSchema`
- Metadata: `METADATA_NAMESPACES`, `MODEL_METADATA_KEYS`

**`src/governance/index.ts` (~50 exports):**
- Reputation: `ReputationScoreSchema`, `REPUTATION_WEIGHTS`, `REPUTATION_DECAY`
- Sanctions: `SanctionSchema`, `SANCTION_SEVERITY_LEVELS`, `ESCALATION_RULES`
- Disputes: `DisputeRecordSchema`
- Validated outcomes: `ValidatedOutcomeSchema`
- Performance: `PerformanceRecordSchema`, `ContributionRecordSchema`
- Reputation utility: `isReliableReputation`
- Sanction guard: `requiresSanctionEvidence`

**`src/constraints/index.ts` (~40 exports):**
- Evaluator: `evaluateConstraint`, `MAX_EXPRESSION_DEPTH`
- Types: `ConstraintFile`, `Constraint`
- Grammar: `validateExpression`, `EXPRESSION_VERSION`
- State machines: `STATE_MACHINES`, `getValidTransitions`, `isTerminalState`, `isValidStateMachineTransition`
- Aggregate boundaries: `AGGREGATE_BOUNDARIES`
- Temporal properties: `TEMPORAL_PROPERTIES`

#### package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./core": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js"
    },
    "./economy": {
      "types": "./dist/economy/index.d.ts",
      "import": "./dist/economy/index.js"
    },
    "./model": {
      "types": "./dist/model/index.d.ts",
      "import": "./dist/model/index.js"
    },
    "./governance": {
      "types": "./dist/governance/index.d.ts",
      "import": "./dist/governance/index.js"
    },
    "./constraints": {
      "types": "./dist/constraints/index.d.ts",
      "import": "./dist/constraints/index.js"
    },
    "./schemas/*": "./schemas/*"
  }
}
```

**Backward compatibility:** `import { CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour'` continues to work. New consumers can use `import { CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour/model'` for tree-shaking.

### 3.5 FR-5: Constraint Language Formalization

#### 3.5.1 PEG Grammar Specification

**File:** `constraints/GRAMMAR.md`

```peg
# Constraint Expression Language — PEG Grammar v1.0
#
# Used by cross-language constraint files (constraints/*.constraints.json).
# This grammar defines the expression language that constraint evaluators
# must implement to validate cross-field invariants.

Expression     ← Implication
Implication    ← OrExpr (ARROW OrExpr)?
OrExpr         ← AndExpr (OR AndExpr)*
AndExpr        ← Comparison (AND Comparison)*
Comparison     ← Unary ((EQ / NEQ / LTE / GTE / LT / GT) Unary)?
Unary          ← NOT Unary / Primary

Primary        ← LPAREN Expression RPAREN
               / BracketArray
               / NumberLiteral
               / StringLiteral
               / NullLiteral
               / BoolLiteral
               / BigintSum
               / FieldPath

FieldPath      ← IDENT (DOT IDENT)* (DOT LengthAccess / DOT EveryCall)?
LengthAccess   ← 'length'
EveryCall      ← 'every' LPAREN IDENT ARROW Expression RPAREN

BracketArray   ← LBRACKET (FieldPath (COMMA FieldPath)*)? RBRACKET
BigintSum      ← 'bigint_sum' LPAREN Primary (COMMA Primary)? RPAREN

# Terminals
NumberLiteral  ← [0-9]+ ('.' [0-9]+)?
StringLiteral  ← "'" [^']* "'"
NullLiteral    ← 'null'
BoolLiteral    ← 'true' / 'false'
IDENT          ← [a-zA-Z_] [a-zA-Z0-9_]*

# Operators
ARROW          ← '=>'
OR             ← '||'
AND            ← '&&'
NOT            ← '!'
EQ             ← '=='
NEQ            ← '!='
LTE            ← '<='
GTE            ← '>='
LT             ← '<'
GT             ← '>'

# Delimiters
LPAREN         ← '('
RPAREN         ← ')'
LBRACKET       ← '['
RBRACKET       ← ']'
COMMA          ← ','
DOT            ← '.'

# Whitespace (ignored between tokens)
_              ← [ \t\n\r]*
```

#### 3.5.2 Expression Versioning

**File:** `src/constraints/types.ts` (extended)

```typescript
export interface ConstraintFile {
  $schema: string;
  schema_id: string;
  contract_version: string;
  expression_version: string;  // NEW: "1.0" — grammar version
  constraints: Constraint[];
}
```

All existing constraint files are updated to include `"expression_version": "1.0"`. New expressions added in v5.0.0 are also version `"1.0"` (the grammar is backward-compatible).

#### 3.5.3 Grammar Validation

**File:** `src/constraints/grammar.ts`

```typescript
export const EXPRESSION_VERSION = '1.0' as const;

/**
 * Validate that an expression string conforms to the PEG grammar.
 * Does NOT evaluate the expression — only checks syntactic validity.
 *
 * @returns { valid: true } or { valid: false, error: string, position: number }
 */
export function validateExpression(expression: string): {
  valid: boolean;
  error?: string;
  position?: number;
};
```

The `validateExpression` function is a lightweight parser that checks syntax without evaluation. It reports the exact character position of errors.

#### 3.5.4 Evaluator Error Reporting

**File:** `src/constraints/evaluator.ts` (extended)

The evaluator gains position tracking:

```typescript
/**
 * Extended evaluation result with position information.
 */
export interface EvaluationResult {
  value: boolean;
  error?: {
    message: string;
    position: number;    // Character offset in expression
    token?: string;      // The problematic token
  };
}

export function evaluateConstraintDetailed(
  data: Record<string, unknown>,
  expression: string,
): EvaluationResult;
```

The existing `evaluateConstraint()` API is preserved unchanged.

#### 3.5.5 Fuzz Testing

**File:** `tests/properties/constraint-grammar-fuzz.test.ts`

```typescript
// Property: any expression accepted by validateExpression() can be evaluated
fc.assert(
  fc.property(
    validExpressionArbitrary(),
    (expr) => {
      const validation = validateExpression(expr);
      if (validation.valid) {
        // Must not throw
        evaluateConstraint({}, expr);
        return true;
      }
      return true; // Invalid expressions are fine to reject
    },
  ),
  { numRuns: 1000 },
);

// Property: every expression in shipped constraint files is valid
fc.assert(
  fc.property(
    fc.constantFrom(...allConstraintExpressions),
    (expr) => {
      return validateExpression(expr).valid;
    },
  ),
);
```

Target: ≥10 property-based fuzz tests covering:
1. Valid expression acceptance
2. Invalid expression rejection with position
3. Grammar version validation
4. Expression depth limits
5. BigInt overflow handling
6. Null coercion correctness
7. Boolean short-circuit evaluation
8. Implication truth table
9. Every-quantifier with empty arrays
10. Bracket array evaluation

### 3.6 FR-6: Cross-Ecosystem Shared Vectors

#### Vector Structure

**Directory:** `vectors/cross-ecosystem/`

```
vectors/cross-ecosystem/
├── completion-valid.json      # Valid CompletionRequest/Result pairs
├── completion-invalid.json    # Invalid pairs with expected errors
├── billing-ensemble.json      # Multi-party billing with ensemble
├── billing-attribution.json   # Cost attribution across providers
├── event-economy-flow.json    # Economy flow event batches
├── event-saga.json            # Saga context event sequences
└── README.md                  # Consumer integration guide
```

#### Vector Format

Each vector file follows the existing pattern:

```json
{
  "$schema": "https://schemas.0xhoneyjar.com/loa-hounfour/5.0.0/vector-suite",
  "schema_id": "CompletionRequest",
  "contract_version": "5.0.0",
  "vectors": [
    {
      "id": "completion-basic-text",
      "description": "Simple text completion request",
      "valid": true,
      "data": { /* full CompletionRequest object */ },
      "expected_cross_field": { "valid": true }
    },
    {
      "id": "completion-tools-no-choice",
      "description": "Tools present without tool_choice — cross-field error",
      "valid": true,
      "data": { /* object passes schema but fails cross-field */ },
      "expected_cross_field": {
        "valid": false,
        "errors": ["tool_choice is required when tools are provided"]
      }
    }
  ]
}
```

#### Vector Categories

| Category | Vector Count | Key Scenarios |
|----------|-------------|---------------|
| Completion (valid) | 4+ | Basic text, with tools, with thinking, with budget |
| Completion (invalid) | 4+ | Missing tool_choice, self-referencing, exceeded budget |
| Billing (ensemble) | 3+ | Multi-model cost split, consensus billing, failed candidate billing |
| Billing (attribution) | 3+ | Provider-reported, observed-chunks, prompt-only |
| Event (economy flow) | 3+ | Performance→Reputation, Escrow→Billing, Sanction→Routing |
| Event (saga) | 3+ | Complete saga, compensated saga, timeout saga |

**Total target:** ≥20 vectors.

#### Consumer Integration

Vectors ship as part of the npm package (`"files"` includes `"vectors"`). Consumers validate:

```typescript
// loa-finn consumer test
import vectors from '@0xhoneyjar/loa-hounfour/vectors/cross-ecosystem/completion-valid.json';
import { validate, CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour';

for (const vector of vectors.vectors) {
  const result = validate(CompletionRequestSchema, vector.data);
  assert(result.valid === vector.valid);
}
```

### 3.7 FR-7: Routing & Budget Contracts

#### 3.7.1 ExecutionMode Vocabulary

**File:** `src/schemas/model/routing/execution-mode.ts`

```typescript
export const EXECUTION_MODES = ['native_runtime', 'remote_model'] as const;

export const ExecutionModeSchema = Type.Union(
  EXECUTION_MODES.map(m => Type.Literal(m)),
  { $id: 'ExecutionMode', description: 'Whether the model runs in native runtime or as a remote API call' },
);

export type ExecutionMode = Static<typeof ExecutionModeSchema>;
```

#### 3.7.2 ProviderType Vocabulary

**File:** `src/schemas/model/routing/provider-type.ts`

```typescript
export const PROVIDER_TYPES = ['claude-code', 'openai', 'openai-compatible'] as const;

export const ProviderTypeSchema = Type.Union(
  PROVIDER_TYPES.map(p => Type.Literal(p)),
  { $id: 'ProviderType', description: 'Model provider classification for routing' },
);

export type ProviderType = Static<typeof ProviderTypeSchema>;
```

#### 3.7.3 AgentRequirements

**File:** `src/schemas/model/routing/agent-requirements.ts`

```typescript
export const AgentRequirementsSchema = Type.Object(
  {
    agent_id: Type.String({ minLength: 1 }),
    requires_native_runtime: Type.Optional(Type.Boolean()),
    requires_tool_calling: Type.Optional(Type.Boolean()),
    requires_thinking_traces: Type.Optional(Type.Boolean()),
    requires_vision: Type.Optional(Type.Boolean()),
    preferred_models: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    min_context_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'AgentRequirements',
    description: 'Per-agent model requirements for routing validation',
    additionalProperties: false,
  },
);

export type AgentRequirements = Static<typeof AgentRequirementsSchema>;
```

#### 3.7.4 BudgetScope

**File:** `src/schemas/model/routing/budget-scope.ts`

```typescript
export const BudgetScopeSchema = Type.Object(
  {
    scope: Type.Union([
      Type.Literal('project'),
      Type.Literal('sprint'),
      Type.Literal('phase'),
      Type.Literal('conversation'),
    ]),
    scope_id: Type.String({ minLength: 1 }),
    limit_micro: MicroUSDUnsigned,
    spent_micro: MicroUSDUnsigned,
    action_on_exceed: Type.Union([
      Type.Literal('block'),
      Type.Literal('warn'),
      Type.Literal('downgrade'),
    ]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'BudgetScope',
    description: 'Budget envelope with spending limits and exceed actions',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type BudgetScope = Static<typeof BudgetScopeSchema>;
```

**Cross-field validations:**
- `spent_micro <= limit_micro` when `action_on_exceed === 'block'` (warning when close to limit)

#### 3.7.5 RoutingResolution

**File:** `src/schemas/model/routing/routing-resolution.ts`

```typescript
export const RoutingResolutionSchema = Type.Object(
  {
    resolved_model: Type.String({ minLength: 1 }),
    original_request_model: Type.String({ minLength: 1 }),
    resolution_type: Type.Union([
      Type.Literal('exact'),
      Type.Literal('fallback'),
      Type.Literal('budget_downgrade'),
      Type.Literal('capability_match'),
    ]),
    reason: Type.String({ minLength: 1 }),
    latency_ms: Type.Optional(Type.Integer({ minimum: 0 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'RoutingResolution',
    description: 'Result of model routing decision',
    additionalProperties: false,
  },
);

export type RoutingResolution = Static<typeof RoutingResolutionSchema>;
```

### 3.8 FR-8: Metadata Namespace Convention

#### Extended Namespace Registry

**File:** `src/vocabulary/metadata.ts` (modified)

```typescript
export const METADATA_NAMESPACES = {
  PROTOCOL: 'loa.',
  TRACE: 'trace.',
  MODEL: 'model.',
  BILLING: 'billing.',    // NEW
  CONSUMER: 'x-',
} as const;
```

**New namespace: `billing.*`**

| Key | Type | Description |
|-----|------|-------------|
| `billing.cost_micro` | string | Total cost in micro-USD |
| `billing.provider` | string | Provider that produced the charge |
| `billing.ensemble_id` | string | Ensemble request that produced this charge |
| `billing.attribution` | string | How cost was attributed (provider_reported, observed_chunks, prompt_only) |

**Updated `isValidMetadataKey()`:** Now checks against 5 namespaces including `billing.*`.

**Updated `getNamespaceOwner()`:** Returns `'economy'` for `billing.*` keys.

---

## 4. Data Architecture

### 4.1 Schema Summary (v5.0.0)

| Domain | Existing Schemas | New Schemas | Total |
|--------|-----------------|-------------|-------|
| Core | 18 | 0 | 18 |
| Economy | 11 | 0 | 11 |
| Model | 7 | 14 | 21 |
| Governance | 6 | 0 | 6 |
| **Total** | **42** | **14** | **56** |

### 4.2 Cross-Field Validator Registry

New validators to register:

| Schema $id | Validation Rules |
|-----------|-----------------|
| `CompletionRequest` | tools→tool_choice, execution_mode→provider, budget_limit>0 |
| `CompletionResult` | finish_reason→tool_calls co-presence, usage.total_tokens conservation |
| `ProviderWireMessage` | role=tool→tool_call_id, role=assistant→content/tool_calls |
| `EnsembleRequest` | strategy=consensus→threshold, models.length≥2 |
| `EnsembleResult` | strategy=consensus→score, total_cost≥selected.cost |
| `BudgetScope` | spent_micro vs limit_micro warning |
| `ReputationScore` | min_unique_validators≤sample_size (extended) |
| `Sanction` | escalation_rule_applied matches violation_type (extended) |

### 4.3 Constraint Files (New)

| File | Constraint Count | Schemas Covered |
|------|-----------------|-----------------|
| `CompletionRequest.constraints.json` | 3+ | tools→tool_choice, execution_mode→provider |
| `CompletionResult.constraints.json` | 3+ | finish_reason→tool_calls, usage conservation |
| `ProviderWireMessage.constraints.json` | 2+ | role→tool_call_id, content presence |
| `EnsembleRequest.constraints.json` | 2+ | strategy→threshold |
| `EnsembleResult.constraints.json` | 2+ | strategy→score, cost conservation |
| `BudgetScope.constraints.json` | 1+ | spent vs limit |
| `ReputationScore.constraints.json` | (updated) | +1 sybil constraint |
| `Sanction.constraints.json` | (updated) | +1 escalation linkage |

### 4.4 npm Package Contents

```json
{
  "files": ["dist", "schemas", "vectors", "constraints"]
}
```

Updated `schemas/index.json` includes all 14 new schemas.

---

## 5. Version & Compatibility

### 5.1 Breaking Change Analysis

**Why v5.0.0 (major bump):**

The ModelPort schemas (`CompletionRequest`, `CompletionResult`) define the canonical wire format for model interactions. Consumers that previously used ad-hoc types must migrate to these contracts. The barrel decomposition adds new package exports (`./core`, `./model`, etc.) which is additive but represents a structural shift.

**What is NOT breaking:**
- All existing 42 schemas retain their exact shapes
- All existing exports remain in the root barrel
- New fields on existing schemas are `Type.Optional`
- The root import path continues to work identically

**What is breaking (conceptually):**
- Consumers should adopt `CompletionRequest`/`CompletionResult` as the canonical model wire format
- New constraint files use `expression_version: "1.0"` (backward-compatible for evaluators that ignore the field)

### 5.2 Version Constants

```typescript
export const CONTRACT_VERSION = '5.0.0' as const;
export const MIN_SUPPORTED_VERSION = '4.0.0' as const;
```

### 5.3 Migration Guide

**MIGRATION.md** will include:

| Consumer | v4.6.0 → v5.0.0 Action | Breaking? |
|----------|----------------------|-----------|
| loa-finn | Adopt `CompletionRequest`/`CompletionResult` in cheval adapters | No (can adopt incrementally) |
| arrakis | Use `CompletionResult.usage` for billing attribution | No (new field path, old still works) |
| mibera-freeside | Validate new constraint files with `expression_version` | No (field is additive) |
| All | Import from sub-packages for tree-shaking (optional) | No |

---

## 6. Testing Strategy

### 6.1 Test Categories

| Category | Count | Purpose |
|----------|-------|---------|
| ModelPort schema unit tests | ~40 | Valid/invalid CompletionRequest, CompletionResult, ProviderWireMessage |
| ModelPort cross-field tests | ~25 | tools→tool_choice, usage conservation, role→field co-presence |
| Ensemble schema tests | ~20 | Strategy-specific validation, cost conservation |
| Routing/budget tests | ~15 | AgentRequirements, BudgetScope, RoutingResolution |
| Finding resolution tests | ~10 | Sybil resistance, escalation linkage |
| Barrel decomposition tests | ~15 | Sub-package imports work, root barrel backward-compatible |
| Grammar fuzz tests | ~10 | Property-based constraint grammar testing |
| Cross-ecosystem vector tests | ~20 | All vectors validate correctly |
| Constraint round-trip tests | ~15 | New constraint files agree with TypeScript validators |
| JSON Schema generation tests | ~14 | All new schemas produce valid JSON Schema |
| Metadata namespace tests | ~5 | billing.* namespace, enforcement |
| Regression tests | 1,097 | Existing tests pass unchanged |

**Target:** 1,097 + ~189 = ~1,286 new tests (actual count depends on implementation detail)

### 6.2 Property-Based Testing Extensions

New fast-check arbitraries:

```typescript
// CompletionRequest arbitrary
const completionRequestArbitrary = fc.record({
  request_id: fc.uuid(),
  agent_id: fc.string({ minLength: 1, maxLength: 50 }),
  tenant_id: fc.string({ minLength: 1, maxLength: 50 }),
  model: fc.string({ minLength: 1, maxLength: 50 }),
  messages: fc.array(providerWireMessageArbitrary(), { minLength: 1, maxLength: 10 }),
  contract_version: fc.constant('5.0.0'),
});

// Usage conservation property
fc.assert(
  fc.property(
    completionResultArbitrary(),
    (result) => {
      const { prompt_tokens, completion_tokens, reasoning_tokens, total_tokens } = result.usage;
      return total_tokens === prompt_tokens + completion_tokens + (reasoning_tokens ?? 0);
    },
  ),
);
```

### 6.3 Vector Validation Tests

```typescript
// Test each cross-ecosystem vector
describe('cross-ecosystem vectors', () => {
  for (const file of vectorFiles) {
    for (const vector of file.vectors) {
      it(`${file.schema_id}/${vector.id}`, () => {
        const schema = getSchemaById(file.schema_id);
        const result = validate(schema, vector.data);
        expect(result.valid).toBe(vector.valid);
        if (vector.expected_cross_field) {
          const crossResult = validate(schema, vector.data, { crossField: true });
          expect(crossResult.valid).toBe(vector.expected_cross_field.valid);
        }
      });
    }
  }
});
```

---

## 7. Sprint Sequence Recommendation

| Sprint | Theme | FRs | New Files | Est. Tests |
|--------|-------|-----|-----------|-----------|
| 1 | ModelPort Foundation | FR-1 (6 schemas) + FR-3 (finding resolution) | 6 schema files + 2 modified schemas | ~55 |
| 2 | Ensemble & Routing | FR-2 (3 schemas) + FR-7 (5 schemas) | 8 schema files | ~40 |
| 3 | Architecture — Barrel + Grammar | FR-4 (barrel decomposition) + FR-5 (grammar formalization) | 5 barrel files + 2 grammar files | ~35 |
| 4 | Vectors, Namespace & Polish | FR-6 (vectors) + FR-8 (metadata) + JSON Schema generation + MIGRATION.md | ~8 vector files + version bump | ~35 |
| 5 | Integration — Constraint Files + Final Release | New constraint files + round-trip tests + v5.0.0 release | ~8 constraint files | ~25 |

**Dependency chain:** Sprint 1 → Sprint 2 (ensemble references completion) → Sprint 3 (barrel organizes all schemas) → Sprint 4 (vectors test all schemas) → Sprint 5 (constraints reference all validators).

**Critical path:** Sprint 1 defines the ModelPort schemas that everything else depends on. Sprint 3 is the riskiest (barrel refactoring touches every import path).

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Barrel decomposition breaks TypeScript resolution | Consumer build failures | Test with `moduleResolution: "NodeNext"` in CI. Root barrel re-exports everything. |
| CompletionRequest shape diverges from loa-finn's actual needs | Wasted protocol work | Cross-reference with loa-finn RFC #31 implementation. Schema fields are Optional where unsure. |
| Constraint grammar PEG spec reveals evaluator bugs | Regression in constraint evaluation | Fuzz tests run before and after. Existing constraint files are the ground truth. |
| Sub-package imports increase bundle size for consumers | Performance regression | Each sub-package is independently importable. Root barrel adds no new runtime code. |
| Vector format changes between v5.0.0 and consumer adoption | Consumer test breakage | Vectors are read-only fixtures. Consumers pin to specific vector file versions. |

---

## 9. Architecture Decision Records

**ADR-004: Sub-package barrels instead of TypeScript path aliases**
- Decision: Physical `src/{domain}/index.ts` files with `package.json` `exports` map
- Rationale: Path aliases require consumer tsconfig changes. Physical files work with any TypeScript configuration and any bundler.
- Alternative rejected: `exports` map to deep paths (e.g., `"./model": "./dist/schemas/model/index.js"`) — too fragile, breaks on directory restructuring.

**ADR-005: ProviderWireMessage as a separate schema from Message**
- Decision: `ProviderWireMessage` is a lean wire-format type, distinct from the persisted `Message` schema
- Rationale: Persisted messages carry conversation context (id, timestamp, metadata). Wire messages are the minimal payload sent to model APIs. Conflating them forces either over-sending fields or losing context.
- Alternative rejected: Extending `MessageSchema` with optional wire-format fields — violates single responsibility, makes validation ambiguous.

**ADR-006: ModelCapabilities as a static declaration, not runtime negotiation**
- Decision: `ModelCapabilities` is a static document describing what a provider supports, not a negotiation protocol
- Rationale: Runtime capability negotiation (like IETF content negotiation) requires round-trips. Static declaration is sufficient for the five-layer provider abstraction where capabilities are known at configuration time.
- Alternative rejected: Capability negotiation protocol (CapabilityAttestation) — deferred to v6.0.0 per PRD out-of-scope.

**ADR-007: PEG grammar over BNF for constraint language**
- Decision: PEG (Parsing Expression Grammar) specification
- Rationale: PEG has no ambiguity by construction (ordered choice). BNF can be ambiguous and requires disambiguation rules. PEG maps directly to recursive descent parsers, which is what our evaluator already is.
- Alternative rejected: BNF with disambiguation rules — more familiar but adds complexity for non-TS implementers.

**ADR-008: Cross-ecosystem vectors as JSON fixtures, not executable tests**
- Decision: JSON data files with expected outcomes, not language-specific test files
- Rationale: Vectors must be consumable by TypeScript (loa-finn, arrakis), Python (mibera-freeside runners), and Go (future). JSON is the universal interchange format. Consumers write their own test harnesses.
- Alternative rejected: Shared test harness package — tight coupling between repos, language-specific.
