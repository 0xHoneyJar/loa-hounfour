<!-- docs-version: 7.0.0 -->

# SDD: loa-hounfour v7.0.0 — The Coordination-Aware Protocol

**Status:** Draft
**Author:** Bridgebuilder (Field Report #42)
**Date:** 2026-02-17
**PRD:** `grimoires/loa/prd.md` (v7.0.0)
**Cycle:** cycle-016
**Sources:**
- PRD section 4 (FR-1 through FR-7)
- Existing codebase: `src/economy/registry-composition.ts`, `src/governance/delegation-tree.ts`, `src/constraints/evaluator.ts`
- v6.0.0 SDD (archived)

---

## 0. Executive Summary

v7.0.0 is the coordination release. It takes the composition primitives built in v6.0.0 and adds the operational verbs: transfer, resolve, couple, permit, propose.

**Breaking changes** (see section 6 Migration Guide):
- `RegistryBridge` gains required `transfer_protocol` field

**New schemas:** BridgeTransferSaga, BridgeTransferStep, SagaParticipant, SagaError, DelegationOutcome, DelegationVote, DissentRecord, MonetaryPolicy, ReviewTrigger, PermissionBoundary, ReportingRequirement, RevocationPolicy, GovernanceProposal, ProposedChange, VotingRecord, GovernanceVote

**New capabilities:** Saga state machine validation, conflict resolution recording, minting-conservation coupling, MAY permission semantics, governance voting

**Code quality:** 3 deferred type safety issues resolved (F-007, F-008, F-020)

**FAANG Parallel:** Temporal (formerly Uber Cadence) — adding saga orchestration and compensation logic to what was previously just a workflow definition format. The saga definition is the specification; runtimes implement the state machine.

---

## 1. System Architecture

### 1.1 Module Map

```
src/
├── economy/                                # FR-2, FR-4: Saga + MonetaryPolicy
│   ├── registry-composition.ts             # MODIFIED: F-007, F-008 fixes
│   ├── bridge-transfer-saga.ts             # NEW: BridgeTransferSaga, Step, Participant
│   ├── monetary-policy.ts                  # NEW: MonetaryPolicy, ReviewTrigger
│   ├── minting-policy.ts                   # (existing — no changes)
│   ├── branded-types.ts                    # (existing — no changes)
│   ├── jwt-boundary.ts                     # (existing — no changes)
│   ├── index.ts                            # barrel (extend with new exports)
│   └── ... (existing files)
├── governance/                             # FR-3, FR-5, FR-6
│   ├── delegation-tree.ts                  # MODIFIED: optional last_outcome field
│   ├── delegation-outcome.ts               # NEW: DelegationOutcome, Vote, Dissent
│   ├── permission-boundary.ts              # NEW: PermissionBoundary, Reporting, Revocation
│   ├── governance-proposal.ts              # NEW: GovernanceProposal, ProposedChange, Voting
│   ├── index.ts                            # barrel (extend with new exports)
│   └── ... (existing governance schemas)
├── constraints/                            # FR-1 (F-020), FR-2–FR-6 builtins
│   ├── evaluator.ts                        # MODIFIED: F-020 AST typing + 4 new builtins
│   ├── evaluator-spec.ts                   # MODIFIED: specs for new builtins
│   ├── constraint-types.ts                 # MODIFIED: ConstraintASTNode union type
│   ├── type-checker.ts                     # (existing — validates new constraint files)
│   ├── index.ts                            # barrel (extend)
│   └── ... (existing)
├── composition/                            # Barrel (extend)
│   └── index.ts                            # Add saga, outcome, permission exports
└── index.ts                                # top-level barrel (extend)

constraints/                                # New constraint files
├── BridgeTransferSaga.constraints.json     # NEW (FR-2)
├── DelegationOutcome.constraints.json      # NEW (FR-3)
├── MonetaryPolicy.constraints.json         # NEW (FR-4)
├── PermissionBoundary.constraints.json     # NEW (FR-5)
├── GovernanceProposal.constraints.json     # NEW (FR-6)
├── RegistryBridge.constraints.json         # MODIFIED (add transfer_protocol)
└── ... (existing — unchanged)

vectors/conformance/
├── bridge-transfer-saga/                   # NEW directory (4 vectors)
├── delegation-outcome/                     # NEW directory (4 vectors)
├── monetary-policy/                        # NEW directory (3 vectors)
├── permission-boundary/                    # NEW directory (3 vectors)
├── governance-proposal/                    # NEW directory (4 vectors)
└── ... (existing — unchanged)
```

### 1.2 Schema Dependency Graph (v7.0.0 additions)

```
                    RegistryBridge (MODIFIED)
                    ├── transfer_protocol (NEW required)
                    │
                    ▼
            BridgeTransferSaga (NEW)
            ├── bridge_id → RegistryBridge.bridge_id
            ├── steps: BridgeTransferStep[]
            ├── compensation_steps: BridgeTransferStep[]
            ├── participants: SagaParticipant[]
            │   └── trust_scopes → CapabilityScopedTrust
            └── saga_amount_conserved (builtin)

            DelegationTreeNode (MODIFIED)
            ├── last_outcome?: DelegationOutcome (NEW optional)
            │
            ▼
            DelegationOutcome (NEW)
            ├── votes: DelegationVote[]
            ├── dissent_records: DissentRecord[]
            └── outcome_consensus_valid (builtin)

            MintingPolicyConfig (existing)
            ├── ←── MonetaryPolicy (NEW)
            │       ├── minting_policy → MintingPolicyConfig.policy_id
            │       ├── registry_id → ConservationPropertyRegistry.registry_id
            │       ├── review_trigger: ReviewTrigger
            │       └── monetary_policy_solvent (builtin)
            ▼
            ConservationPropertyRegistry (existing)

            PermissionBoundary (NEW)
            ├── reporting: ReportingRequirement
            ├── revocation: RevocationPolicy
            └── permission_granted / within_boundary (builtins)

            GovernanceProposal (NEW)
            ├── registry_id → ConservationPropertyRegistry.registry_id
            ├── changes: ProposedChange[]
            └── voting: VotingRecord
                └── votes: GovernanceVote[]
```

### 1.3 Subpath Exports (v7.0.0)

| Subpath | Content | Change |
|---------|---------|--------|
| `@0xhoneyjar/loa-hounfour/economy` | JWT + branded + registry + saga + monetary | Extend (BridgeTransferSaga, MonetaryPolicy) |
| `@0xhoneyjar/loa-hounfour/governance` | Sanctions + disputes + delegation + outcome + permission + proposal | Extend (DelegationOutcome, PermissionBoundary, GovernanceProposal) |
| `@0xhoneyjar/loa-hounfour/constraints` | Evaluator + type checker + builtins | Extend (4 new builtins, AST types) |
| `@0xhoneyjar/loa-hounfour/composition` | Cross-domain composition types | Extend (saga, outcome, permission) |

---

## 2. Schema Design

### 2.1 FR-1: Deferred Finding Resolution (P0)

#### 2.1.1 F-007: TypeBox Cross-Field Annotation Type Safety

**File:** `src/economy/registry-composition.ts`

Replace `as any` cast with TypeBox-native annotation approach:

```typescript
// BEFORE (F-007):
const schema = Type.Object({...}, { 'x-cross-field-validated': true } as any);

// AFTER: Use Type.Unsafe() wrapper to add custom annotations without cast
function withAnnotation<T extends TSchema>(
  schema: T,
  annotations: Record<string, unknown>,
): T {
  return { ...schema, ...annotations } as T;
}

// Usage:
const schema = withAnnotation(
  Type.Object({...}),
  { 'x-cross-field-validated': true },
);
```

This preserves the annotation in generated JSON Schema without suppressing type safety. The `withAnnotation` utility is generic and reusable for any custom JSON Schema extension property.

**Tests:**
- Verify `'x-cross-field-validated'` appears in JSON Schema output
- Verify TypeScript compiler accepts the result without `as any`
- Verify existing schema validation still passes

#### 2.1.2 F-008: BridgeInvariant ID Pattern Expansion

**File:** `src/economy/registry-composition.ts:36`

```typescript
// BEFORE:
invariant_id: Type.String({ pattern: '^B-\\d{1,2}$' })

// AFTER:
invariant_id: Type.String({ pattern: '^B-\\d{1,4}$' })
```

**Tests:**
- `B-1`: valid
- `B-99`: valid
- `B-100`: valid (was previously rejected)
- `B-9999`: valid
- `B-10000`: rejected
- `B-0`: valid (single digit)

#### 2.1.3 F-020: parseExpr() Return Type Safety

**File:** `src/constraints/constraint-types.ts` (extend), `src/constraints/evaluator.ts`

Define a discriminated union for AST nodes:

```typescript
// In constraint-types.ts:
export type ConstraintASTNode =
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'identifier'; name: string }
  | { kind: 'member_access'; object: ConstraintASTNode; property: string }
  | { kind: 'function_call'; name: string; args: ConstraintASTNode[] }
  | { kind: 'binary_op'; op: string; left: ConstraintASTNode; right: ConstraintASTNode }
  | { kind: 'unary_op'; op: string; operand: ConstraintASTNode }
  | { kind: 'array_literal'; elements: ConstraintASTNode[] }
  | { kind: 'every'; array: ConstraintASTNode; predicate: ConstraintASTNode };
```

**Implementation strategy:** The current evaluator uses a recursive descent parser that evaluates inline (parse and evaluate are interleaved). F-020 requires typing the intermediate representation without rewriting the evaluator. The approach:

1. Add `ConstraintASTNode` type to `constraint-types.ts`
2. Add type annotation to `parseExpr()` return: `parseExpr(): unknown` becomes `parseExpr(): ConstraintASTNode | unknown`
3. Gradually narrow: top-level `evaluateConstraint()` wraps result in type guard
4. This is NOT a full AST rewrite — it types the boundary without changing evaluation semantics

**Tests:**
- All 23 existing builtin tests continue to pass
- New test: `typeof parseExpr(...)` is not `any` (compile-time assertion)
- New test: evaluator handles all AST node kinds correctly

---

### 2.2 FR-2: BridgeTransferSaga (P0)

**File:** `src/economy/bridge-transfer-saga.ts` (NEW)

#### 2.2.1 SagaStatus State Machine

```typescript
export const SagaStatusSchema = Type.Union(
  [
    Type.Literal('initiated'),
    Type.Literal('reserving'),
    Type.Literal('transferring'),
    Type.Literal('settling'),
    Type.Literal('settled'),
    Type.Literal('compensating'),
    Type.Literal('reversed'),
    Type.Literal('failed'),
  ],
  {
    $id: 'SagaStatus',
    description: 'State machine for bridge transfer sagas.',
  },
);
export type SagaStatus = Static<typeof SagaStatusSchema>;

export const SAGA_TRANSITIONS: Record<SagaStatus, readonly SagaStatus[]> = {
  initiated: ['reserving', 'failed'],
  reserving: ['transferring', 'compensating', 'failed'],
  transferring: ['settling', 'compensating', 'failed'],
  settling: ['settled', 'compensating', 'failed'],
  settled: [],                    // terminal
  compensating: ['reversed', 'failed'],
  reversed: [],                   // terminal
  failed: [],                     // terminal
};
```

#### 2.2.2 BridgeTransferStep Schema

```typescript
export const StepTypeSchema = Type.Union(
  [
    Type.Literal('reserve'),
    Type.Literal('validate'),
    Type.Literal('transfer'),
    Type.Literal('confirm'),
    Type.Literal('settle'),
  ],
  { $id: 'StepType' },
);

export const StepStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('in_progress'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('compensated'),
  ],
  { $id: 'StepStatus' },
);

export const BridgeTransferStepSchema = Type.Object(
  {
    step_id: Type.String({ minLength: 1 }),
    step_type: StepTypeSchema,
    participant: Type.String({ minLength: 1, description: 'agent_id of responsible party' }),
    status: StepStatusSchema,
    amount_micro: Type.String({ pattern: '^[0-9]+$', description: 'BigInt micro-USD' }),
    exchange_rate: Type.Optional(ExchangeRateSpecSchema),
    started_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    completed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    error: Type.Optional(Type.String()),
  },
  {
    $id: 'BridgeTransferStep',
    additionalProperties: false,
  },
);
export type BridgeTransferStep = Static<typeof BridgeTransferStepSchema>;
```

#### 2.2.3 SagaParticipant Schema

```typescript
export const ParticipantRoleSchema = Type.Union(
  [
    Type.Literal('initiator'),
    Type.Literal('counterparty'),
    Type.Literal('observer'),
    Type.Literal('arbiter'),
  ],
  { $id: 'ParticipantRole' },
);

export const SagaParticipantSchema = Type.Object(
  {
    agent_id: Type.String({ minLength: 1 }),
    role: ParticipantRoleSchema,
    registry_id: Type.String({ format: 'uuid' }),
    trust_scopes: CapabilityScopedTrustSchema,
  },
  {
    $id: 'SagaParticipant',
    additionalProperties: false,
  },
);
export type SagaParticipant = Static<typeof SagaParticipantSchema>;
```

#### 2.2.4 SagaError Schema

```typescript
export const SagaErrorSchema = Type.Object(
  {
    error_code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    failed_step_id: Type.Optional(Type.String()),
    recoverable: Type.Boolean(),
  },
  {
    $id: 'SagaError',
    additionalProperties: false,
  },
);
export type SagaError = Static<typeof SagaErrorSchema>;
```

#### 2.2.5 BridgeTransferSaga Schema

```typescript
export const BridgeTransferSagaSchema = Type.Object(
  {
    saga_id: Type.String({ format: 'uuid' }),
    bridge_id: Type.String({ format: 'uuid', description: 'References RegistryBridge.bridge_id' }),
    source_registry: Type.String({ format: 'uuid' }),
    target_registry: Type.String({ format: 'uuid' }),
    saga_type: Type.Union([Type.Literal('atomic'), Type.Literal('choreography')]),
    status: SagaStatusSchema,
    steps: Type.Array(BridgeTransferStepSchema, { minItems: 1 }),
    compensation_steps: Type.Array(BridgeTransferStepSchema),
    timeout: Type.Object({
      total_seconds: Type.Integer({ minimum: 1 }),
      per_step_seconds: Type.Integer({ minimum: 1 }),
    }),
    participants: Type.Array(SagaParticipantSchema, { minItems: 1 }),
    initiated_at: Type.String({ format: 'date-time' }),
    settled_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    error: Type.Optional(SagaErrorSchema),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'BridgeTransferSaga',
    additionalProperties: false,
    description: 'Saga-patterned operation protocol for cross-registry value transfer.',
  },
);
export type BridgeTransferSaga = Static<typeof BridgeTransferSagaSchema>;
```

#### 2.2.6 RegistryBridge Extension (BREAKING)

**File:** `src/economy/registry-composition.ts`

Add required `transfer_protocol` field:

```typescript
// Add to RegistryBridgeSchema:
transfer_protocol: Type.Object({
  saga_type: Type.Union([Type.Literal('atomic'), Type.Literal('choreography')]),
  timeout_seconds: Type.Integer({ minimum: 1 }),
  max_retries: Type.Integer({ minimum: 0, maximum: 10 }),
}),
```

#### 2.2.7 Constraints

**File:** `constraints/BridgeTransferSaga.constraints.json`

```json
{
  "schema_id": "BridgeTransferSaga",
  "contract_version": "7.0.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "saga-steps-ordered",
      "description": "Steps must have sequential step_ids",
      "expression": "steps.every(s => s.step_id != '')",
      "severity": "error",
      "category": "structural",
      "type_signature": { "steps": "array" }
    },
    {
      "id": "saga-amount-conserved",
      "description": "Source debit equals target credit after exchange rate",
      "expression": "saga_amount_conserved(saga)",
      "severity": "error",
      "category": "economic",
      "type_signature": { "saga": "BridgeTransferSaga" }
    },
    {
      "id": "saga-timeout-positive",
      "description": "Timeout values must be positive",
      "expression": "timeout.total_seconds > 0 && timeout.per_step_seconds > 0",
      "severity": "error",
      "category": "structural",
      "type_signature": { "timeout": "object" }
    },
    {
      "id": "saga-participants-include-initiator",
      "description": "At least one participant must have role initiator",
      "expression": "participants.length > 0",
      "severity": "error",
      "category": "structural",
      "type_signature": { "participants": "array" }
    },
    {
      "id": "saga-settled-has-timestamp",
      "description": "Settled sagas must have settled_at timestamp",
      "expression": "status != 'settled' || settled_at != null",
      "severity": "error",
      "category": "temporal",
      "type_signature": { "status": "string", "settled_at": "string_or_null" }
    }
  ]
}
```

#### 2.2.8 Evaluator Builtins

**`saga_amount_conserved(saga)`:**
- Iterates all completed steps
- Sums `amount_micro` for source-side steps (debits)
- Sums `amount_micro` for target-side steps (credits), adjusting by exchange rate
- Returns `true` if `source_total == target_total` (BigInt comparison)
- Returns `false` if any step has a non-numeric `amount_micro`
- Resource limit: max 100 steps (fail-closed)

**`saga_steps_sequential(saga)`:**
- Verifies step_id values are unique
- Returns `true` if no duplicates, `false` otherwise
- Resource limit: max 100 steps

---

### 2.3 FR-3: DelegationOutcome (P1)

**File:** `src/governance/delegation-outcome.ts` (NEW)

#### 2.3.1 OutcomeType Vocabulary

```typescript
export const OutcomeTypeSchema = Type.Union(
  [
    Type.Literal('unanimous'),
    Type.Literal('majority'),
    Type.Literal('deadlock'),
    Type.Literal('escalation'),
  ],
  {
    $id: 'OutcomeType',
    description: 'How a delegation decision was reached.',
  },
);
export type OutcomeType = Static<typeof OutcomeTypeSchema>;
```

#### 2.3.2 DelegationVote Schema

```typescript
export const VoteChoiceSchema = Type.Union(
  [Type.Literal('agree'), Type.Literal('disagree'), Type.Literal('abstain')],
  { $id: 'VoteChoice' },
);

export const DelegationVoteSchema = Type.Object(
  {
    voter_id: Type.String({ minLength: 1 }),
    vote: VoteChoiceSchema,
    result: Type.Unknown({ description: 'This voter\'s proposed result.' }),
    confidence: Type.Number({ minimum: 0, maximum: 1 }),
    reasoning: Type.Optional(Type.String()),
  },
  {
    $id: 'DelegationVote',
    additionalProperties: false,
  },
);
export type DelegationVote = Static<typeof DelegationVoteSchema>;
```

#### 2.3.3 DissentRecord Schema

```typescript
export const DissentTypeSchema = Type.Union(
  [Type.Literal('minority_report'), Type.Literal('abstention'), Type.Literal('timeout')],
  { $id: 'DissentType' },
);

export const DissentSeveritySchema = Type.Union(
  [Type.Literal('informational'), Type.Literal('warning'), Type.Literal('blocking')],
  { $id: 'DissentSeverity' },
);

export const DissentRecordSchema = Type.Object(
  {
    dissenter_id: Type.String({ minLength: 1 }),
    dissent_type: DissentTypeSchema,
    proposed_alternative: Type.Unknown(),
    reasoning: Type.String({ minLength: 1 }),
    severity: DissentSeveritySchema,
    acknowledged: Type.Boolean(),
  },
  {
    $id: 'DissentRecord',
    additionalProperties: false,
    description: 'Record of minority dissent in a delegation decision.',
  },
);
export type DissentRecord = Static<typeof DissentRecordSchema>;
```

#### 2.3.4 DelegationOutcome Schema

```typescript
export const DelegationOutcomeSchema = Type.Object(
  {
    outcome_id: Type.String({ format: 'uuid' }),
    tree_node_id: Type.String({ minLength: 1, description: 'References DelegationTreeNode.node_id' }),
    outcome_type: OutcomeTypeSchema,
    result: Type.Union([Type.Unknown(), Type.Null()]),
    votes: Type.Array(DelegationVoteSchema, { minItems: 1 }),
    consensus_achieved: Type.Boolean(),
    consensus_threshold: Type.Number({ minimum: 0, maximum: 1 }),
    dissent_records: Type.Array(DissentRecordSchema),
    escalated_to: Type.Optional(Type.String({ minLength: 1 })),
    escalation_reason: Type.Optional(Type.String({ minLength: 1 })),
    resolved_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'DelegationOutcome',
    additionalProperties: false,
    description: 'Recorded outcome of a delegation tree decision, preserving dissent.',
  },
);
export type DelegationOutcome = Static<typeof DelegationOutcomeSchema>;
```

#### 2.3.5 DelegationTreeNode Extension

**File:** `src/governance/delegation-tree.ts`

Add optional `last_outcome` field:

```typescript
// Add to DelegationTreeNodeSchema (inside the Recursive callback):
last_outcome: Type.Optional(DelegationOutcomeSchema),
```

This is a non-breaking additive change. Existing trees without `last_outcome` remain valid.

#### 2.3.6 Constraints

**File:** `constraints/DelegationOutcome.constraints.json`

```json
{
  "schema_id": "DelegationOutcome",
  "contract_version": "7.0.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "outcome-consensus-consistent",
      "description": "Unanimous outcomes must have all votes as agree",
      "expression": "outcome_type != 'unanimous' || votes.every(v => v.vote == 'agree')",
      "severity": "error",
      "category": "governance",
      "type_signature": { "outcome_type": "string", "votes": "array" }
    },
    {
      "id": "outcome-deadlock-no-result",
      "description": "Deadlocked outcomes must have null result",
      "expression": "outcome_type != 'deadlock' || result == null",
      "severity": "error",
      "category": "governance",
      "type_signature": { "outcome_type": "string", "result": "unknown" }
    },
    {
      "id": "outcome-escalation-has-target",
      "description": "Escalated outcomes must specify escalation target",
      "expression": "outcome_type != 'escalation' || escalated_to != null",
      "severity": "error",
      "category": "governance",
      "type_signature": { "outcome_type": "string", "escalated_to": "string_or_null" }
    },
    {
      "id": "outcome-dissent-has-reasoning",
      "description": "Every dissent record must have non-empty reasoning",
      "expression": "dissent_records.every(d => d.reasoning != '')",
      "severity": "error",
      "category": "governance",
      "type_signature": { "dissent_records": "array" }
    }
  ]
}
```

#### 2.3.7 Evaluator Builtin

**`outcome_consensus_valid(outcome)`:**
- Counts agree/disagree/abstain votes
- For `unanimous`: all votes must be `agree`
- For `majority`: agree count >= votes.length * consensus_threshold
- For `deadlock`: agree count < votes.length * consensus_threshold
- For `escalation`: any configuration valid (escalation can happen regardless)
- Returns boolean
- Resource limit: max 1000 votes

---

### 2.4 FR-4: MonetaryPolicy (P1)

**File:** `src/economy/monetary-policy.ts` (NEW)

#### 2.4.1 ReviewTrigger Schema

```typescript
export const ReviewTriggerTypeSchema = Type.Union(
  [
    Type.Literal('epoch_boundary'),
    Type.Literal('supply_threshold'),
    Type.Literal('manual'),
    Type.Literal('governance_vote'),
  ],
  { $id: 'ReviewTriggerType' },
);

export const ReviewTriggerSchema = Type.Object(
  {
    trigger_type: ReviewTriggerTypeSchema,
    threshold_pct: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    epoch_interval: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  {
    $id: 'ReviewTrigger',
    additionalProperties: false,
    description: 'When governance should re-evaluate the monetary policy.',
  },
);
export type ReviewTrigger = Static<typeof ReviewTriggerSchema>;
```

#### 2.4.2 MonetaryPolicy Schema

```typescript
export const MonetaryPolicySchema = Type.Object(
  {
    policy_id: Type.String({ format: 'uuid' }),
    registry_id: Type.String({ format: 'uuid', description: 'Conservation registry this governs' }),
    minting_policy: Type.String({ format: 'uuid', description: 'References MintingPolicyConfig.policy_id' }),
    conservation_ceiling: Type.String({ pattern: '^[0-9]+$', description: 'BigInt: maximum total supply' }),
    coupling_invariant: Type.String({ minLength: 1, description: 'Constraint expression binding minting to conservation' }),
    collateral_ratio_bps: Type.Integer({ minimum: 10000, description: 'Minimum 100% collateralization (10000 bps)' }),
    review_trigger: ReviewTriggerSchema,
    last_reviewed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'MonetaryPolicy',
    additionalProperties: false,
    description: 'Coupling between minting policy and conservation invariants.',
  },
);
export type MonetaryPolicy = Static<typeof MonetaryPolicySchema>;
```

#### 2.4.3 Constraints

**File:** `constraints/MonetaryPolicy.constraints.json`

```json
{
  "schema_id": "MonetaryPolicy",
  "contract_version": "7.0.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "monetary-policy-ceiling-positive",
      "description": "Conservation ceiling must be positive",
      "expression": "bigint_gt(conservation_ceiling, '0')",
      "severity": "error",
      "category": "economic",
      "type_signature": { "conservation_ceiling": "bigint_coercible" }
    },
    {
      "id": "monetary-policy-collateral-minimum",
      "description": "Collateral ratio must be at least 100% (10000 bps)",
      "expression": "collateral_ratio_bps >= 10000",
      "severity": "error",
      "category": "economic",
      "type_signature": { "collateral_ratio_bps": "number" }
    },
    {
      "id": "monetary-policy-coupling-non-empty",
      "description": "Coupling invariant expression must be non-empty",
      "expression": "coupling_invariant != ''",
      "severity": "error",
      "category": "structural",
      "type_signature": { "coupling_invariant": "string" }
    }
  ]
}
```

#### 2.4.4 Evaluator Builtin

**`monetary_policy_solvent(policy, current_supply)`:**
- Parses `policy.conservation_ceiling` and `current_supply` as BigInt
- Returns `true` if `current_supply <= conservation_ceiling`
- Returns `false` if `current_supply > conservation_ceiling`
- Returns `false` for non-numeric inputs (fail-closed)

---

### 2.5 FR-5: PermissionBoundary (P1)

**File:** `src/governance/permission-boundary.ts` (NEW)

#### 2.5.1 ReportingRequirement Schema

```typescript
export const ReportFrequencySchema = Type.Union(
  [Type.Literal('per_action'), Type.Literal('per_epoch'), Type.Literal('on_violation')],
  { $id: 'ReportFrequency' },
);

export const ReportFormatSchema = Type.Union(
  [Type.Literal('audit_trail'), Type.Literal('summary'), Type.Literal('detailed')],
  { $id: 'ReportFormat' },
);

export const ReportingRequirementSchema = Type.Object(
  {
    required: Type.Boolean(),
    report_to: Type.String({ minLength: 1 }),
    frequency: ReportFrequencySchema,
    format: ReportFormatSchema,
  },
  {
    $id: 'ReportingRequirement',
    additionalProperties: false,
  },
);
export type ReportingRequirement = Static<typeof ReportingRequirementSchema>;
```

#### 2.5.2 RevocationPolicy Schema

```typescript
export const RevocationTriggerSchema = Type.Union(
  [
    Type.Literal('violation_count'),
    Type.Literal('governance_vote'),
    Type.Literal('manual'),
    Type.Literal('timeout'),
  ],
  { $id: 'RevocationTrigger' },
);

export const RevocationPolicySchema = Type.Object(
  {
    trigger: RevocationTriggerSchema,
    violation_threshold: Type.Optional(Type.Integer({ minimum: 1 })),
    timeout_seconds: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  {
    $id: 'RevocationPolicy',
    additionalProperties: false,
  },
);
export type RevocationPolicy = Static<typeof RevocationPolicySchema>;
```

#### 2.5.3 PermissionBoundary Schema

```typescript
export const PermissionSeveritySchema = Type.Union(
  [Type.Literal('advisory'), Type.Literal('monitored')],
  { $id: 'PermissionSeverity' },
);

export const PermissionBoundarySchema = Type.Object(
  {
    boundary_id: Type.String({ format: 'uuid' }),
    scope: Type.String({ minLength: 1, description: 'Domain of permitted action' }),
    permitted_if: Type.String({ minLength: 1, description: 'Constraint expression that ENABLES' }),
    reporting: ReportingRequirementSchema,
    revocation: RevocationPolicySchema,
    severity: PermissionSeveritySchema,
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'PermissionBoundary',
    additionalProperties: false,
    description: 'Explicit permission semantic — what is MAY rather than MUST or MUST NOT.',
  },
);
export type PermissionBoundary = Static<typeof PermissionBoundarySchema>;
```

#### 2.5.4 Constraint File Extension

Add optional `permission_boundaries` array to the constraint file JSON schema. This is additive — existing constraint files without `permission_boundaries` remain valid.

#### 2.5.5 Evaluator Builtins

**`permission_granted(context, boundary_id)`:**
- Looks up PermissionBoundary by boundary_id in context
- Evaluates the `permitted_if` expression against context
- Returns `true` if expression evaluates to truthy
- Returns `false` if expression evaluates to falsy or boundary not found

**`within_boundary(context, boundary_id)`:**
- Checks permission_granted AND reporting requirements met
- Returns `true` if both conditions satisfied
- Returns `false` otherwise

---

### 2.6 FR-6: GovernanceProposal (P2)

**File:** `src/governance/governance-proposal.ts` (NEW)

#### 2.6.1 ProposalStatus State Machine

```typescript
export const ProposalStatusSchema = Type.Union(
  [
    Type.Literal('proposed'),
    Type.Literal('voting'),
    Type.Literal('ratified'),
    Type.Literal('rejected'),
    Type.Literal('expired'),
    Type.Literal('withdrawn'),
  ],
  { $id: 'ProposalStatus' },
);

export const PROPOSAL_TRANSITIONS: Record<string, readonly string[]> = {
  proposed: ['voting', 'withdrawn'],
  voting: ['ratified', 'rejected', 'expired'],
  ratified: [],     // terminal
  rejected: [],     // terminal
  expired: [],      // terminal
  withdrawn: [],    // terminal
};
```

#### 2.6.2 ProposedChange Schema

```typescript
export const ProposedChangeSchema = Type.Object(
  {
    target_field: Type.String({ minLength: 1, description: 'JSON path to field being changed' }),
    current_value: Type.Unknown(),
    proposed_value: Type.Unknown(),
    rationale: Type.String({ minLength: 1 }),
  },
  {
    $id: 'ProposedChange',
    additionalProperties: false,
  },
);
export type ProposedChange = Static<typeof ProposedChangeSchema>;
```

#### 2.6.3 GovernanceVote Schema

```typescript
export const GovernanceVoteChoiceSchema = Type.Union(
  [Type.Literal('approve'), Type.Literal('reject'), Type.Literal('abstain')],
  { $id: 'GovernanceVoteChoice' },
);

export const GovernanceVoteSchema = Type.Object(
  {
    voter_id: Type.String({ minLength: 1 }),
    vote: GovernanceVoteChoiceSchema,
    weight: Type.Number({ minimum: 0 }),
    reasoning: Type.Optional(Type.String()),
    voted_at: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'GovernanceVote',
    additionalProperties: false,
  },
);
export type GovernanceVote = Static<typeof GovernanceVoteSchema>;
```

#### 2.6.4 VotingRecord Schema

```typescript
export const VotingRecordSchema = Type.Object(
  {
    total_weight: Type.Number({ minimum: 0 }),
    participating_weight: Type.Number({ minimum: 0 }),
    approve_weight: Type.Number({ minimum: 0 }),
    reject_weight: Type.Number({ minimum: 0 }),
    abstain_weight: Type.Number({ minimum: 0 }),
    votes: Type.Array(GovernanceVoteSchema),
  },
  {
    $id: 'VotingRecord',
    additionalProperties: false,
  },
);
export type VotingRecord = Static<typeof VotingRecordSchema>;
```

#### 2.6.5 GovernanceProposal Schema

```typescript
export const GovernanceProposalSchema = Type.Object(
  {
    proposal_id: Type.String({ format: 'uuid' }),
    proposer_id: Type.String({ minLength: 1 }),
    registry_id: Type.String({ format: 'uuid' }),
    proposal_type: Type.Union([
      Type.Literal('parameter_change'),
      Type.Literal('policy_change'),
      Type.Literal('boundary_change'),
      Type.Literal('emergency'),
    ]),
    title: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.String({ minLength: 1 }),
    changes: Type.Array(ProposedChangeSchema, { minItems: 1 }),
    status: ProposalStatusSchema,
    voting: VotingRecordSchema,
    quorum_threshold_bps: Type.Integer({ minimum: 0, maximum: 10000 }),
    approval_threshold_bps: Type.Integer({ minimum: 0, maximum: 10000 }),
    voting_period_seconds: Type.Integer({ minimum: 1 }),
    proposed_at: Type.String({ format: 'date-time' }),
    resolved_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'GovernanceProposal',
    additionalProperties: false,
    description: 'Mechanism for governed agents to propose and vote on changes.',
  },
);
export type GovernanceProposal = Static<typeof GovernanceProposalSchema>;
```

#### 2.6.6 Constraints

**File:** `constraints/GovernanceProposal.constraints.json`

Constraints as specified in PRD section FR-6: quorum-met, approval-met, rejection-consistent, voting-period-positive, changes-non-empty.

---

## 3. Evaluator Changes

### 3.1 New Builtins Summary

| Builtin | FR | Signature | Return |
|---------|----|-----------|----|
| `saga_amount_conserved` | FR-2 | `(saga: BridgeTransferSaga)` | boolean |
| `saga_steps_sequential` | FR-2 | `(saga: BridgeTransferSaga)` | boolean |
| `outcome_consensus_valid` | FR-3 | `(outcome: DelegationOutcome)` | boolean |
| `monetary_policy_solvent` | FR-4 | `(policy: MonetaryPolicy, current_supply: string)` | boolean |
| `permission_granted` | FR-5 | `(context: object, boundary_id: string)` | boolean |
| `within_boundary` | FR-5 | `(context: object, boundary_id: string)` | boolean |

**Total builtins after v7.0.0:** 23 + 6 = **29**

### 3.2 Registration Pattern

Follow existing pattern in `evaluator.ts`:
```typescript
fns.set('saga_amount_conserved', () => {
  // ... parse args, validate, compute
});
```

Each builtin gets a corresponding spec in `evaluator-spec.ts` with examples.

### 3.3 Resource Limits

All new builtins enforce resource limits consistent with existing tree builtins:
- Max array size: 1000 elements (steps, votes, etc.)
- Fail-closed on limit breach: return `false`
- No recursion in new builtins (saga and outcome are flat structures)

---

## 4. Conformance Vectors

### 4.1 New Vector Directories

| Directory | Vectors | Total |
|-----------|---------|-------|
| `vectors/conformance/bridge-transfer-saga/` | 4 | vector-NNNN through vector-NNNN+3 |
| `vectors/conformance/delegation-outcome/` | 4 | vector-NNNN+4 through vector-NNNN+7 |
| `vectors/conformance/monetary-policy/` | 3 | vector-NNNN+8 through vector-NNNN+10 |
| `vectors/conformance/permission-boundary/` | 3 | vector-NNNN+11 through vector-NNNN+13 |
| `vectors/conformance/governance-proposal/` | 4 | vector-NNNN+14 through vector-NNNN+17 |

### 4.2 Vector ID Assignment

Vector IDs continue from existing sequence. Exact IDs assigned during implementation.

---

## 5. Version Constants

**File:** `src/version.ts`

```typescript
export const CONTRACT_VERSION = '7.0.0';
export const MIN_SUPPORTED_VERSION = '7.0.0';
```

**File:** `schemas/index.json`

Regenerated with all new schemas. Schema count target: 87 + ~16 = ~103.

---

## 6. Migration Guide

### 6.1 Breaking: RegistryBridge.transfer_protocol

**Before (v6.0.0):**
```json
{ "bridge_id": "...", "source_registry": "...", ... }
```

**After (v7.0.0):**
```json
{
  "bridge_id": "...",
  "source_registry": "...",
  "transfer_protocol": {
    "saga_type": "atomic",
    "timeout_seconds": 3600,
    "max_retries": 3
  },
  ...
}
```

All existing RegistryBridge instances must add the `transfer_protocol` field.

### 6.2 Non-Breaking Additions

All other changes are additive:
- New optional `last_outcome` on DelegationTreeNode
- New schemas (BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, PermissionBoundary, GovernanceProposal)
- New evaluator builtins (6 new, 23 existing unchanged)
- New constraint files (5 new, existing unchanged)
- Optional `permission_boundaries` in constraint file schema

---

## 7. Test Strategy

### 7.1 Test Targets

| Category | Target |
|----------|--------|
| Schema validation (new schemas) | ~60 tests |
| Constraint evaluation (new builtins) | ~40 tests |
| Constraint file validation (new files) | ~30 tests |
| Conformance vectors (new) | ~18 tests |
| F-007, F-008, F-020 fixes | ~15 tests |
| Property-based tests (fast-check) | ~20 tests |
| State machine transition tests | ~20 tests |
| **Total new tests** | **~200** |

### 7.2 Property-Based Tests

Using fast-check for:
- Saga amount conservation: `forAll(saga, amount_in == amount_out)`
- Outcome consensus validity: `forAll(outcome, votes_consistent_with_type)`
- Monetary policy solvency: `forAll(policy, supply <= ceiling)`
- Vote weight arithmetic: `forAll(votes, sum(approve + reject + abstain) == participating)`

---

*— Bridgebuilder*
*SDD v7.0.0 — The Coordination-Aware Protocol*
