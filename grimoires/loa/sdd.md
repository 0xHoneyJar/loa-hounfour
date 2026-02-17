# SDD: loa-hounfour v6.0.0 — The Composition-Aware Protocol

**Status:** Draft
**Author:** Bridgebuilder (Field Report #40)
**Date:** 2026-02-17
**PRD:** `grimoires/loa/prd.md` (v6.0.0)
**Cycle:** cycle-015
**Sources:**
- PRD §4 (FR-1 through FR-7)
- Existing codebase: `src/integrity/`, `src/schemas/agent-identity.ts`, `src/constraints/evaluator.ts`, `src/utilities/schema-graph.ts`
- v5.5.0 SDD (archived at `grimoires/loa/archive/2026-02-17-conservation-aware-v5.5.0/sdd.md`)

---

## 0. Executive Summary

v6.0.0 is the composition release. It takes the conservation kernel built in v5.5.0 and makes it composable across economies, trust scopes, and concurrent delegation paths.

**Breaking changes** (see §6 Migration Guide):
- `AgentIdentity.trust_level` (flat `TrustLevel`) → `AgentIdentity.trust_scopes` (`CapabilityScopedTrust`)
- `ConservationPropertyRegistry` gains required `liveness_properties` and `liveness_count` fields
- All 31+ constraint files gain required `type_signature` field

**New schemas:** LivenessProperty, CapabilityScopedTrust, ConstraintTypeSignature, RegistryBridge, BridgeInvariant, MintingPolicy, ExchangeRateSpec, DelegationTree, DelegationTreeNode

**New capabilities:** Schema graph operations (reachability, cycles, impact, topological sort), constraint type checker, delegation tree builtins

**FAANG Parallel:** Google's proto2→proto3 transition — breaking changes to the protocol definition format before the ecosystem was too large to migrate, resulting in a cleaner foundation that scaled to billions of daily RPCs.

---

## 1. System Architecture

### 1.1 Module Map

```
src/
├── integrity/                              # FR-1: Conservation + Liveness
│   ├── conservation-properties.ts          # (existing — MODIFIED: registry gains liveness)
│   ├── liveness-properties.ts              # NEW: LivenessProperty schema + CANONICAL_LIVENESS_PROPERTIES
│   ├── idempotency.ts                      # (existing)
│   ├── req-hash.ts                         # (existing)
│   └── index.ts                            # barrel (extend)
├── economy/                                # FR-5: Registry Composition
│   ├── jwt-boundary.ts                     # (existing — no changes)
│   ├── branded-types.ts                    # (existing — no changes)
│   ├── registry-composition.ts             # NEW: RegistryBridge, BridgeInvariant
│   ├── minting-policy.ts                   # NEW: MintingPolicy, ExchangeRateSpec
│   ├── index.ts                            # barrel (extend)
│   └── ... (existing files)
├── schemas/
│   ├── agent-identity.ts                   # FR-2: BREAKING — CapabilityScopedTrust
│   └── ... (existing schemas)
├── governance/
│   ├── delegation-tree.ts                  # FR-6: NEW — DelegationTree + DelegationTreeNode
│   ├── index.ts                            # barrel (extend)
│   └── ... (existing governance schemas)
├── constraints/
│   ├── evaluator.ts                        # (extend — new tree builtins)
│   ├── evaluator-spec.ts                   # (extend — new builtin specs)
│   ├── type-checker.ts                     # FR-3: NEW — static constraint type checker
│   ├── constraint-types.ts                 # FR-3: NEW — ConstraintTypeSignature schema
│   ├── index.ts                            # barrel (extend)
│   └── ... (existing)
├── utilities/
│   ├── schema-graph.ts                     # FR-4: EXTENDED — graph operations
│   └── ... (existing)
└── index.ts                                # top-level barrel (extend)

constraints/                                # All files modified (type_signature added)
├── ConservationPropertyRegistry.constraints.json  # (extend — liveness constraints)
├── AgentIdentity.constraints.json                 # (MODIFIED — scoped trust constraints)
├── DelegationTree.constraints.json                # NEW
├── RegistryBridge.constraints.json                # NEW
├── MintingPolicy.constraints.json                 # NEW
├── LivenessProperty.constraints.json              # NEW
└── ... (existing — all gain type_signature)

vectors/conformance/
├── liveness-properties/                    # NEW directory (3 vectors)
├── capability-scoped-trust/                # NEW directory (3 vectors)
├── delegation-tree/                        # NEW directory (3 vectors)
├── registry-bridge/                        # NEW directory (3 vectors)
└── ... (existing — vectors updated for breaking changes)
```

### 1.2 Schema Dependency Graph (v6.0.0)

```
                    AgentIdentity (MODIFIED)
                    ├── trust_scopes: CapabilityScopedTrust (NEW)
                    │
           ┌────────┼────────────────────────┐
           │        │                        │
           ▼        ▼                        ▼
    DelegationTree  DelegationChain    RegistryBridge (NEW)
    (NEW)           (existing)         ├── source_registry → ConservationPropertyRegistry
    ├── nodes[].agent_id → AgentIdentity    ├── target_registry → ConservationPropertyRegistry
    ├── tree_budget_conserved (builtin)     ├── bridge_invariants: BridgeInvariant[]
    │                                       └── exchange_rate: ExchangeRateSpec
    ▼
    ConservationPropertyRegistry (MODIFIED)
    ├── properties: ConservationProperty[] (existing)
    ├── liveness_properties: LivenessProperty[] (NEW)
    ├── liveness_count (NEW)
    │
    └── (all constraint files gain type_signature)
         └── ConstraintTypeSignature (NEW)
             ├── input_schema
             ├── output_type
             └── field_types
```

### 1.3 Subpath Exports (v6.0.0)

| Subpath | Content | Change |
|---------|---------|--------|
| `@0xhoneyjar/loa-hounfour/integrity` | Conservation + liveness | Extend (LivenessProperty) |
| `@0xhoneyjar/loa-hounfour/economy` | JWT + branded + registry composition | Extend (RegistryBridge, MintingPolicy) |
| `@0xhoneyjar/loa-hounfour/governance` | Sanctions + disputes + delegation tree | Extend (DelegationTree) |
| `@0xhoneyjar/loa-hounfour/constraints` | Evaluator + type checker + builtins | Extend (type checker) |
| `@0xhoneyjar/loa-hounfour/graph` | Schema graph + operations | **NEW** subpath |

---

## 2. Schema Design

### 2.1 FR-1: Conservation Liveness Properties (P0)

**File:** `src/integrity/liveness-properties.ts` (NEW)
**Modifies:** `src/integrity/conservation-properties.ts` (ConservationPropertyRegistry)

#### 2.1.1 TimeoutBehavior Vocabulary

```typescript
export const TimeoutBehaviorSchema = Type.Union(
  [
    Type.Literal('reaper'),          // automated cleanup process
    Type.Literal('escalation'),      // escalate to higher authority
    Type.Literal('reconciliation'),  // batch reconciliation process
    Type.Literal('manual'),          // human intervention required
  ],
  {
    $id: 'TimeoutBehavior',
    description: 'What happens when a liveness property timeout expires.',
  },
);

export type TimeoutBehavior = Static<typeof TimeoutBehaviorSchema>;
```

#### 2.1.2 LivenessProperty Schema

```typescript
export const LivenessPropertySchema = Type.Object(
  {
    liveness_id: Type.String({
      pattern: '^L-\\d{1,2}$',
      description: 'Canonical liveness identifier (L-1 through L-N).',
    }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    ltl_formula: Type.String({
      minLength: 1,
      description: 'LTL formula containing F (eventually) or F_t (bounded eventually).',
    }),
    companion_safety: Type.String({
      pattern: '^I-\\d{1,2}$',
      description: 'Invariant ID of the safety property this liveness complements.',
    }),
    universe: InvariantUniverseSchema,
    timeout_behavior: TimeoutBehaviorSchema,
    timeout_seconds: Type.Integer({
      minimum: 1,
      description: 'Maximum time before liveness check fires. Advisory — runtime chooses enforcement.',
    }),
    error_codes: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    severity: Type.Union([
      Type.Literal('critical'),
      Type.Literal('error'),
      Type.Literal('warning'),
    ]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'LivenessProperty',
    additionalProperties: false,
    description: 'Liveness invariant guaranteeing forward progress with bounded temporal logic.',
  },
);
```

#### 2.1.3 Canonical Liveness Properties

```typescript
export const CANONICAL_LIVENESS_PROPERTIES: readonly LivenessProperty[] = [
  {
    liveness_id: 'L-1',
    name: 'Reservation resolution liveness',
    description: 'A pending reservation must reach a terminal state within timeout.',
    ltl_formula: 'G(reservation.pending => F_t(reservation.terminal))',
    companion_safety: 'I-11',
    universe: 'single_lot',
    timeout_behavior: 'reaper',
    timeout_seconds: 3600,   // 1 hour
    error_codes: ['RESERVATION_TIMEOUT'],
    severity: 'warning',
    contract_version: '6.0.0',
  },
  // L-2 through L-6 as specified in PRD §FR-1
] as const;
```

#### 2.1.4 ConservationPropertyRegistry Extension (BREAKING)

```typescript
// MODIFIED: Add required liveness fields to existing schema
export const ConservationPropertyRegistrySchema = Type.Object(
  {
    registry_id: Type.String({ format: 'uuid' }),
    properties: Type.Array(ConservationPropertySchema, { minItems: 1 }),
    total_count: Type.Integer({ minimum: 1 }),
    coverage: Type.Record(Type.String(), Type.Integer({ minimum: 0 })),
    liveness_properties: Type.Array(LivenessPropertySchema, {  // NEW required
      description: 'Liveness companions for safety properties.',
    }),
    liveness_count: Type.Integer({  // NEW required
      minimum: 0,
      description: 'Must equal liveness_properties.length — drift guard.',
    }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ConservationPropertyRegistry',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

#### 2.1.5 Constraints

**File:** `constraints/LivenessProperty.constraints.json` (NEW)

```json
{
  "schema_id": "LivenessProperty",
  "contract_version": "6.0.0",
  "constraints": [
    {
      "id": "liveness-formula-has-eventually",
      "expression": "ltl_formula.length > 0",
      "severity": "error",
      "message": "Liveness formula must be non-empty (and should contain F operator)",
      "type_signature": {
        "input_schema": "LivenessProperty",
        "output_type": "boolean",
        "field_types": { "ltl_formula": "string" }
      }
    }
  ]
}
```

**Additions to** `constraints/ConservationPropertyRegistry.constraints.json`:

```json
{
  "id": "conservation-registry-liveness-count-matches",
  "expression": "liveness_count == len(liveness_properties)",
  "severity": "error",
  "message": "liveness_count must equal liveness_properties array length",
  "type_signature": {
    "input_schema": "ConservationPropertyRegistry",
    "output_type": "boolean",
    "field_types": { "liveness_count": "number", "liveness_properties": "array" }
  }
},
{
  "id": "conservation-liveness-unique-ids",
  "expression": "liveness_properties.every(l => !liveness_properties.some(m => eq(m.liveness_id, l.liveness_id) && m !== l))",
  "severity": "error",
  "message": "All liveness_id values must be unique",
  "type_signature": {
    "input_schema": "ConservationPropertyRegistry",
    "output_type": "boolean",
    "field_types": { "liveness_properties": "array" }
  }
}
```

#### 2.1.6 Conformance Vectors

| Vector | Description | Expected |
|--------|-------------|----------|
| `liveness-properties/complete-safety-liveness-pairs.json` | Registry with 14 safety + 6 liveness, correct counts | PASS |
| `liveness-properties/liveness-without-companion.json` | Liveness L-99 with companion_safety referencing non-existent I-99 | FAIL |
| `liveness-properties/liveness-empty-formula.json` | Liveness with empty ltl_formula | FAIL |

---

### 2.2 FR-2: Capability-Scoped Trust Model (P0, BREAKING)

**File:** `src/schemas/agent-identity.ts` (MODIFIED)

#### 2.2.1 CapabilityScope Vocabulary

```typescript
export const CapabilityScopeSchema = Type.Union(
  [
    Type.Literal('billing'),
    Type.Literal('governance'),
    Type.Literal('inference'),
    Type.Literal('delegation'),
    Type.Literal('audit'),
    Type.Literal('composition'),
  ],
  {
    $id: 'CapabilityScope',
    description: 'Domain in which trust is independently assessed.',
  },
);

export type CapabilityScope = Static<typeof CapabilityScopeSchema>;

export const CAPABILITY_SCOPES = [
  'billing', 'governance', 'inference', 'delegation', 'audit', 'composition',
] as const;
```

#### 2.2.2 CapabilityScopedTrust Schema

```typescript
export const CapabilityScopedTrustSchema = Type.Object(
  {
    scopes: Type.Record(
      CapabilityScopeSchema,
      TrustLevelSchema,
      { description: 'Trust level per capability scope.' }
    ),
    default_level: TrustLevelSchema,
  },
  {
    $id: 'CapabilityScopedTrust',
    additionalProperties: false,
    description: 'Capability-scoped trust model. Each scope has independent trust level.',
  },
);

export type CapabilityScopedTrust = Static<typeof CapabilityScopedTrustSchema>;
```

#### 2.2.3 AgentIdentity Schema (BREAKING CHANGES)

```typescript
export const AgentIdentitySchema = Type.Object(
  {
    agent_id: Type.String({
      pattern: '^[a-z][a-z0-9_-]{2,63}$',
      description: 'Unique agent identifier.',
    }),
    display_name: Type.String({ minLength: 1, maxLength: 128 }),
    agent_type: AgentTypeSchema,
    capabilities: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    // BREAKING: trust_level removed, trust_scopes replaces it
    trust_scopes: CapabilityScopedTrustSchema,
    delegation_authority: Type.Array(Type.String({ minLength: 1 })),
    max_delegation_depth: Type.Integer({ minimum: 0, maximum: 10 }),
    governance_weight: Type.Number({ minimum: 0, maximum: 1 }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'AgentIdentity',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

#### 2.2.4 Helper Functions

```typescript
// TrustLevel and TRUST_LEVELS remain unchanged (used as values within scopes)

/**
 * Get trust level for a specific capability scope.
 * Falls back to default_level if scope not explicitly set.
 */
export function trustLevelForScope(
  trust: CapabilityScopedTrust,
  scope: CapabilityScope
): TrustLevel {
  return trust.scopes[scope] ?? trust.default_level;
}

/**
 * Check if trust meets threshold for a specific scope.
 */
export function meetsThresholdForScope(
  trust: CapabilityScopedTrust,
  scope: CapabilityScope,
  threshold: TrustLevel
): boolean {
  const level = trustLevelForScope(trust, scope);
  return trustLevelIndex(level) >= trustLevelIndex(threshold);
}

/**
 * Compute effective trust level (minimum across all scopes).
 * Used for backward-compatible comparisons.
 */
export function effectiveTrustLevel(trust: CapabilityScopedTrust): TrustLevel {
  let minIdx = TRUST_LEVELS.length - 1;
  for (const scope of CAPABILITY_SCOPES) {
    const level = trustLevelForScope(trust, scope);
    const idx = trustLevelIndex(level);
    if (idx < minIdx) minIdx = idx;
  }
  return TRUST_LEVELS[minIdx];
}

/**
 * Migration helper: convert flat TrustLevel to CapabilityScopedTrust.
 * Sets all scopes to the same level (backward-compatible).
 */
export function flatTrustToScoped(level: TrustLevel): CapabilityScopedTrust {
  const scopes: Record<string, TrustLevel> = {};
  for (const scope of CAPABILITY_SCOPES) {
    scopes[scope] = level;
  }
  return { scopes, default_level: level } as CapabilityScopedTrust;
}
```

#### 2.2.5 Updated Constraints

**File:** `constraints/AgentIdentity.constraints.json` (MODIFIED)

```json
{
  "id": "agent-identity-delegation-requires-trust",
  "expression": "delegation_authority.length == 0 || trust_scopes.scopes.delegation == 'verified' || trust_scopes.scopes.delegation == 'trusted' || trust_scopes.scopes.delegation == 'sovereign'",
  "severity": "error",
  "message": "Delegation authority requires delegation scope trust >= verified",
  "type_signature": {
    "input_schema": "AgentIdentity",
    "output_type": "boolean",
    "field_types": {
      "delegation_authority": "array",
      "trust_scopes.scopes.delegation": "string"
    }
  }
},
{
  "id": "agent-identity-scope-coverage",
  "expression": "trust_scopes.scopes.billing != null && trust_scopes.scopes.inference != null",
  "severity": "error",
  "message": "At least billing and inference scopes must be specified",
  "type_signature": {
    "input_schema": "AgentIdentity",
    "output_type": "boolean",
    "field_types": {
      "trust_scopes.scopes.billing": "string",
      "trust_scopes.scopes.inference": "string"
    }
  }
}
```

#### 2.2.6 Conformance Vectors

| Vector | Description | Expected |
|--------|-------------|----------|
| `capability-scoped-trust/multi-scope-agent.json` | Agent with billing=trusted, governance=basic, inference=verified | PASS |
| `capability-scoped-trust/delegation-scope-untrusted.json` | Agent with delegation=untrusted but delegation_authority non-empty | FAIL |
| `capability-scoped-trust/missing-required-scopes.json` | Agent missing billing scope | FAIL |

---

### 2.3 FR-3: Constraint Type System (P0)

**Files:** `src/constraints/constraint-types.ts` (NEW), `src/constraints/type-checker.ts` (NEW)

#### 2.3.1 ConstraintTypeSignature Schema

```typescript
export const ConstraintTypeSchema = Type.Union([
  Type.Literal('boolean'),
  Type.Literal('bigint'),
  Type.Literal('bigint_coercible'),
  Type.Literal('string'),
  Type.Literal('number'),
  Type.Literal('array'),
  Type.Literal('object'),
  Type.Literal('unknown'),
], { $id: 'ConstraintType' });

export type ConstraintType = Static<typeof ConstraintTypeSchema>;

export const ConstraintTypeSignatureSchema = Type.Object(
  {
    input_schema: Type.String({
      minLength: 1,
      description: 'Schema name that this constraint targets. Must exist in registry.',
    }),
    output_type: ConstraintTypeSchema,
    field_types: Type.Record(Type.String(), ConstraintTypeSchema, {
      description: 'Map of dotted field paths to their expected types.',
    }),
  },
  {
    $id: 'ConstraintTypeSignature',
    additionalProperties: false,
  },
);

export type ConstraintTypeSignature = Static<typeof ConstraintTypeSignatureSchema>;
```

#### 2.3.2 Constraint File Schema Extension

Every constraint in every `.constraints.json` file gains a required `type_signature` field:

```json
{
  "id": "conservation-registry-count-matches",
  "expression": "total_count == len(properties)",
  "severity": "error",
  "message": "total_count must equal properties array length",
  "fields": ["total_count", "properties"],
  "type_signature": {
    "input_schema": "ConservationPropertyRegistry",
    "output_type": "boolean",
    "field_types": {
      "total_count": "number",
      "properties": "array"
    }
  }
}
```

#### 2.3.3 Static Type Checker

**File:** `src/constraints/type-checker.ts`

```typescript
export interface TypeCheckError {
  constraint_id: string;
  expression_fragment: string;
  expected_type: ConstraintType;
  actual_type: ConstraintType;
  message: string;
}

export interface TypeCheckWarning {
  constraint_id: string;
  message: string;
}

export interface TypeCheckResult {
  valid: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckWarning[];
}

/**
 * Type-check a constraint file against the schema registry.
 *
 * Validates:
 * 1. input_schema exists in registry
 * 2. All field_types paths resolve to real fields
 * 3. Function argument types match evaluator builtin signatures
 * 4. No implicit coercions that could produce wrong results
 */
export function typeCheckConstraintFile(
  constraintFile: ConstraintFileContent,
  schemaRegistry: Map<string, TObject>
): TypeCheckResult {
  // Implementation: for each constraint in the file:
  //   1. Resolve input_schema from registry
  //   2. Walk field_types, verify each path exists in schema
  //   3. Parse expression tokens, check function arg types
  //   4. Verify output_type matches expression result type
}
```

#### 2.3.3a Constraint Expression Grammar (FL-SDD-003)

The constraint language is defined by this EBNF grammar. The type checker and evaluator must both parse according to these rules:

```ebnf
expression     = or_expr ;
or_expr        = and_expr { "||" and_expr } ;
and_expr       = comparison { "&&" comparison } ;
comparison     = addition { ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) addition } ;
addition       = multiplication { ( "+" | "-" ) multiplication } ;
multiplication = unary { ( "*" | "/" | "%" ) unary } ;
unary          = [ "!" ] primary ;
primary        = function_call | field_path | literal | "(" expression ")" ;
function_call  = IDENTIFIER "(" [ expression { "," expression } ] ")" ;
field_path     = IDENTIFIER { "." IDENTIFIER } [ "[]" ] [ "?" ] ;
literal        = NUMBER | STRING | "true" | "false" | "null" ;
```

**Operator precedence** (lowest to highest): `||`, `&&`, comparisons, `+`/`-`, `*`/`/`/`%`, `!`

**Path resolution rules:**
- Dotted paths resolve left-to-right: `trust_scopes.scopes.billing` → `obj.trust_scopes.scopes.billing`
- Array indexing via `[]` operates on array fields: `properties[].id` maps over array elements
- Optional `?` returns `null` for missing fields instead of error: `optional_field?.nested`
- Recursion limit: 10 levels of nesting (enforced by type checker)

**Builtin function signatures** (v6.0.0 — type checker validates arity and argument types):

| Function | Signature | Returns |
|----------|-----------|---------|
| `len(x)` | `array → number` | Array length |
| `bigint_eq(a, b)` | `bigint_coercible, bigint_coercible → boolean` | BigInt equality |
| `bigint_gt(a, b)` | `bigint_coercible, bigint_coercible → boolean` | BigInt greater-than |
| `bigint_gte(a, b)` | `bigint_coercible, bigint_coercible → boolean` | BigInt greater-or-equal |
| `bigint_add(a, b)` | `bigint_coercible, bigint_coercible → bigint_coercible` | BigInt addition |
| `bigint_sub(a, b)` | `bigint_coercible, bigint_coercible → bigint_coercible` | BigInt subtraction |
| `type_of(x)` | `unknown → string` | Runtime type name |
| `is_bigint_coercible(x)` | `unknown → boolean` | Can convert to BigInt |
| `tree_budget_conserved(node)` | `object → boolean` | Tree budget invariant |
| `tree_authority_narrowing(node)` | `object → boolean` | Tree authority invariant |
| `eq(a, b)` | `unknown, unknown → boolean` | Deep equality |

**v6.0.0 type checker scope** (conservative — per FL-SDD-B07):
1. Path existence: All `field_types` paths resolve to real schema fields
2. Builtin arity: Function calls have correct number of arguments
3. Builtin arg types: Arguments match expected types from signature table
4. No implicit coercions: `string` fields used in `bigint_*` functions must be declared `bigint_coercible`

Full expression type inference (tracking types through operators and nested expressions) is deferred to v6.1.0.

#### 2.3.4 New Evaluator Builtins

```typescript
// Add to evaluator.ts function registry:

['type_of', () => this.parseTypeOf()],
['is_bigint_coercible', () => this.parseIsBigintCoercible()],

// type_of(value) → string ('boolean'|'bigint'|'string'|'number'|'array'|'object'|'null')
// is_bigint_coercible(value) → boolean (can be converted to BigInt without error)
```

#### 2.3.5 Constraint File Migration

All 31 existing constraint files must be updated with `type_signature`. This is mechanical — each constraint's `fields` array maps directly to `field_types`:

| File | Constraints | Migration Complexity |
|------|------------|---------------------|
| `AgentIdentity.constraints.json` | 3 | Low — rewrite for scoped trust |
| `DelegationChain.constraints.json` | 7 | Low — add type_signature |
| `JwtBoundarySpec.constraints.json` | 3 | Low — add type_signature |
| `ConservationPropertyRegistry.constraints.json` | 4 + 2 new | Medium — extend for liveness |
| Other 27 files | ~50 constraints | Low — mechanical type_signature addition |

---

### 2.4 FR-4: Schema Graph Operations (P1)

**File:** `src/utilities/schema-graph.ts` (EXTENDED)

#### 2.4.1 Reachability

```typescript
/**
 * Check if target is reachable from source via directed edges.
 * Uses BFS to avoid stack overflow on large graphs.
 */
export function isReachable(
  graph: SchemaGraphNode[],
  from: string,
  to: string
): boolean;

/**
 * Find all schemas reachable from a source (transitive closure).
 */
export function reachableFrom(
  graph: SchemaGraphNode[],
  source: string
): Set<string>;
```

#### 2.4.2 Cycle Detection

```typescript
export interface CycleInfo {
  has_cycles: boolean;
  cycles: string[][];  // Each inner array is a cycle path [A, B, C, A]
}

/**
 * Detect cycles in the schema reference graph using DFS with coloring.
 * White=unvisited, Gray=in-progress, Black=complete.
 */
export function detectCycles(graph: SchemaGraphNode[]): CycleInfo;
```

#### 2.4.3 Impact Analysis

```typescript
export interface ImpactReport {
  schema_id: string;
  directly_affected: string[];
  transitively_affected: string[];
  affected_constraints: string[];
  total_impact_radius: number;
}

/**
 * Analyze the blast radius of changing a schema.
 * Follows incoming references (who references me?) transitively.
 */
export function analyzeImpact(
  graph: SchemaGraphNode[],
  schemaId: string,
  constraintFiles?: Array<{ schema_id: string; constraints: Array<{ id: string }> }>
): ImpactReport;
```

#### 2.4.4 Topological Sort

```typescript
/**
 * Topological ordering of schemas (dependency-first).
 * Returns null if cycles exist (not a DAG).
 * Uses Kahn's algorithm.
 */
export function topologicalSort(graph: SchemaGraphNode[]): string[] | null;
```

#### 2.4.5 Tests

- `isReachable(graph, 'DelegationChain', 'InterAgentTransactionAudit')` → true
- `analyzeImpact(graph, 'AgentIdentity')` → includes DelegationChain, DelegationTree, etc.
- `topologicalSort(graph)` → produces valid ordering of all 70+ schemas
- `detectCycles(graph)` → `has_cycles: false` on production graph
- `detectCycles(testGraphWithCycle)` → `has_cycles: true` with cycle path

---

### 2.5 FR-5: Registry Composition Protocol (P1)

**Files:** `src/economy/registry-composition.ts` (NEW), `src/economy/minting-policy.ts` (NEW)

#### 2.5.1 RegistryBridge Schema

```typescript
export const BridgeEnforcementSchema = Type.Union([
  Type.Literal('atomic'),     // both sides or neither
  Type.Literal('eventual'),   // eventual consistency
  Type.Literal('manual'),     // human resolution
]);

export const BridgeInvariantSchema = Type.Object(
  {
    invariant_id: Type.String({ pattern: '^B-\\d{1,2}$' }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    ltl_formula: Type.String({ minLength: 1 }),
    enforcement: BridgeEnforcementSchema,
  },
  { additionalProperties: false },
);

export const ExchangeRateTypeSchema = Type.Union([
  Type.Literal('fixed'),
  Type.Literal('oracle'),
  Type.Literal('governance'),
]);

export const ExchangeRateSpecSchema = Type.Object(
  {
    rate_type: ExchangeRateTypeSchema,
    value: Type.Optional(Type.String({ description: 'Fixed rate as MicroUSD ratio.' })),
    oracle_endpoint: Type.Optional(Type.String({ description: 'Oracle URL for dynamic rates.' })),
    governance_proposal_required: Type.Boolean(),
    staleness_threshold_seconds: Type.Integer({ minimum: 1 }),
  },
  { $id: 'ExchangeRateSpec', additionalProperties: false },
);

export const SettlementPolicySchema = Type.Union([
  Type.Literal('immediate'),   // settle on each transaction
  Type.Literal('batched'),     // settle periodically
  Type.Literal('netting'),     // net offsetting transactions
]);

export const RegistryBridgeSchema = Type.Object(
  {
    bridge_id: Type.String({ format: 'uuid' }),
    source_registry_id: Type.String({ format: 'uuid' }),
    target_registry_id: Type.String({ format: 'uuid' }),
    bridge_invariants: Type.Array(BridgeInvariantSchema, { minItems: 1 }),
    exchange_rate: ExchangeRateSpecSchema,
    settlement: SettlementPolicySchema,
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'RegistryBridge',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

#### 2.5.1a ExchangeRateSpec Conditional Validation (FL-SDD-004)

**Conditional required fields by rate_type:**

| `rate_type` | `value` required? | `oracle_endpoint` required? | `governance_proposal_required` |
|-------------|------------------|-----------------------------|-------------------------------|
| `fixed` | YES (MicroUSD ratio) | NO | `false` |
| `oracle` | NO (fetched at runtime) | YES | `false` |
| `governance` | NO (set by governance) | NO | `true` |

**Constraint** (added to `RegistryBridge.constraints.json`):
```json
{
  "id": "exchange-rate-conditional-fields",
  "expression": "(exchange_rate.rate_type != 'fixed' || exchange_rate.value != null) && (exchange_rate.rate_type != 'oracle' || exchange_rate.oracle_endpoint != null) && (exchange_rate.rate_type != 'governance' || exchange_rate.governance_proposal_required == true)",
  "severity": "error",
  "message": "Exchange rate fields must match rate_type requirements"
}
```

**Staleness behavior:**
- `staleness_threshold_seconds` applies to `oracle` and `governance` rate types
- For `oracle`: if last-fetched rate is older than threshold, bridge operations MUST reject with `EXCHANGE_RATE_STALE` error (fail-closed)
- For `governance`: if last governance vote is older than threshold, bridge logs a `RATE_GOVERNANCE_STALE` warning but proceeds with last-approved rate (fail-open with audit trail)
- For `fixed`: `staleness_threshold_seconds` is informational only (ignored by enforcement)

**Schema-vs-runtime boundary:** The `oracle_endpoint` field defines the configuration surface — what oracle to query and how fresh rates must be. Actual oracle integration (authentication, response parsing, caching, signed payloads) is an implementation concern for the runtime layer consuming these schemas. B-1 atomicity with oracle rates requires the rate to be **locked before** the transaction begins (rate fetched → escrowed → settled at locked rate).

#### 2.5.2 Canonical Bridge Invariants

```typescript
export const CANONICAL_BRIDGE_INVARIANTS: readonly BridgeInvariant[] = [
  {
    invariant_id: 'B-1',
    name: 'Cross-registry conservation',
    description: 'Source debit equals target credit times exchange rate.',
    ltl_formula: 'G(source.debit == target.credit * exchange_rate)',
    enforcement: 'atomic',
  },
  {
    invariant_id: 'B-2',
    name: 'Bridge idempotency',
    description: 'Every bridge transaction has a unique ID.',
    ltl_formula: 'G(unique(bridge_transaction.id))',
    enforcement: 'atomic',
  },
  {
    invariant_id: 'B-3',
    name: 'Settlement completeness',
    description: 'Initiated bridge transactions must settle within timeout.',
    ltl_formula: 'G(bridge_transaction.initiated => F_t(bridge_transaction.settled))',
    enforcement: 'eventual',
  },
  {
    invariant_id: 'B-4',
    name: 'Exchange rate consistency',
    description: 'Exchange rate must be effective before transaction timestamp.',
    ltl_formula: 'G(exchange_rate.effective_at <= transaction.timestamp)',
    enforcement: 'atomic',
  },
] as const;
```

#### 2.5.2a Bridge Failure-Mode Matrix (FL-SDD-001)

Each enforcement mode defines explicit failure semantics:

| Enforcement | Failure Mode | Timeout | Retry | Compensation | Idempotency |
|-------------|-------------|---------|-------|--------------|-------------|
| `atomic` | Both-or-neither via escrow | 30s default | Idempotent replay with same `tx_id` | Automatic rollback on timeout | Required `tx_id` (UUID) deduplicates |
| `eventual` | Source commits first, target follows | Configurable via `staleness_threshold_seconds` | Exponential backoff (max 3 retries) | Compensating debit on target failure | `tx_id` + `sequence_number` |
| `manual` | Flagged for human resolution | None (operator SLA) | N/A | Operator-initiated reversal | Audit trail with `tx_id` |

**Atomic settlement lifecycle:**
1. `INITIATED` — escrow created, source debited into escrow
2. `ESCROWED` — source confirmed, target credit pending
3. `SETTLED` — target credited, escrow released
4. `FAILED` — timeout or validation failure, escrow returned to source
5. `COMPENSATING` — partial failure detected, compensation in progress

**Required transaction fields** (added to bridge operations, not schema):
- `tx_id: string (UUID)` — idempotency key
- `nonce: integer` — replay protection (monotonically increasing per bridge)
- `effective_at: string (date-time)` — exchange rate lock timestamp
- `settlement_deadline: string (date-time)` — timeout for ESCROWED → SETTLED transition

**Reconciliation:** Periodic reconciliation job compares source debits against target credits for `eventual` mode. Discrepancies flagged as `RECONCILIATION_DRIFT` events with automatic compensation if drift < 1% of epoch volume.

#### 2.5.3 MintingPolicy Schema

```typescript
export const MintingPolicySchema = Type.Object(
  {
    policy_id: Type.String({ format: 'uuid' }),
    registry_id: Type.String({ format: 'uuid' }),
    mint_authority: Type.String({ minLength: 1, description: 'Agent ID authorized to mint.' }),
    mint_constraints: Type.Array(Type.String({ minLength: 1 }), {
      description: 'Constraint expression IDs that must pass before minting.',
    }),
    max_mint_per_epoch: Type.String({
      pattern: '^[0-9]+$',
      description: 'Maximum MicroUSD mintable per epoch.',
    }),
    epoch_seconds: Type.Integer({ minimum: 1 }),
    requires_governance_approval: Type.Boolean(),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'MintingPolicy',
    additionalProperties: false,
  },
);
```

#### 2.5.4 Constraints

**File:** `constraints/RegistryBridge.constraints.json` (NEW)

```json
{
  "schema_id": "RegistryBridge",
  "contract_version": "6.0.0",
  "constraints": [
    {
      "id": "registry-bridge-distinct-registries",
      "expression": "source_registry_id != target_registry_id",
      "severity": "error",
      "message": "Source and target registries must be different",
      "type_signature": {
        "input_schema": "RegistryBridge",
        "output_type": "boolean",
        "field_types": {
          "source_registry_id": "string",
          "target_registry_id": "string"
        }
      }
    },
    {
      "id": "registry-bridge-invariant-unique-ids",
      "expression": "bridge_invariants.every(b => !bridge_invariants.some(c => eq(c.invariant_id, b.invariant_id) && c !== b))",
      "severity": "error",
      "message": "All bridge invariant IDs must be unique",
      "type_signature": {
        "input_schema": "RegistryBridge",
        "output_type": "boolean",
        "field_types": { "bridge_invariants": "array" }
      }
    }
  ]
}
```

**File:** `constraints/MintingPolicy.constraints.json` (NEW)

```json
{
  "schema_id": "MintingPolicy",
  "contract_version": "6.0.0",
  "constraints": [
    {
      "id": "minting-policy-max-positive",
      "expression": "bigint_gt(max_mint_per_epoch, 0)",
      "severity": "error",
      "message": "Maximum mint per epoch must be positive",
      "type_signature": {
        "input_schema": "MintingPolicy",
        "output_type": "boolean",
        "field_types": { "max_mint_per_epoch": "bigint_coercible" }
      }
    }
  ]
}
```

---

### 2.6 FR-6: DelegationTree (P1)

**File:** `src/governance/delegation-tree.ts` (NEW)

#### 2.6.1 DelegationTreeNode Schema

```typescript
export const ForkTypeSchema = Type.Union([
  Type.Literal('parallel'),     // all children execute concurrently
  Type.Literal('sequential'),   // children execute in order
  Type.Literal('conditional'),  // children execute based on condition
]);

export const TreeNodeStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('active'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancelled'),
]);

export const DelegationTreeNodeSchema: TObject = Type.Object(
  {
    node_id: Type.String({ minLength: 1 }),
    agent_id: Type.String({ minLength: 1, description: 'References AgentIdentity.agent_id.' }),
    authority_scope: Type.Array(Type.String({ minLength: 1 })),
    budget_allocated_micro: Type.String({
      pattern: '^[0-9]+$',
      description: 'MicroUSD budget for this node.',
    }),
    children: Type.Array(Type.Ref('DelegationTreeNode'), {
      description: 'Child delegation nodes (empty for leaves).',
    }),
    fork_type: ForkTypeSchema,
    join_condition: Type.Optional(Type.String({
      description: 'Constraint expression for join point evaluation.',
    })),
    status: TreeNodeStatusSchema,
    timestamp: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'DelegationTreeNode',
    additionalProperties: false,
  },
);
```

#### 2.6.2 DelegationTree Schema

```typescript
export const TreeStrategySchema = Type.Union([
  Type.Literal('first_complete'),  // first child result wins
  Type.Literal('best_of_n'),      // best result selected
  Type.Literal('consensus'),       // majority agreement required
  Type.Literal('pipeline'),        // output flows through sequential stages
]);

export const BudgetAllocationSchema = Type.Union([
  Type.Literal('equal_split'),    // divide equally among children
  Type.Literal('weighted'),       // allocate by weight
  Type.Literal('on_demand'),      // allocate as children request
]);

export const DelegationTreeSchema = Type.Object(
  {
    tree_id: Type.String({ format: 'uuid' }),
    root: DelegationTreeNodeSchema,
    strategy: TreeStrategySchema,
    total_budget_micro: Type.String({ pattern: '^[0-9]+$' }),
    budget_allocation: BudgetAllocationSchema,
    max_depth: Type.Integer({ minimum: 1, maximum: 10, default: 10,
      description: 'Hard cap on tree depth. Prevents DoS via deeply nested trees.' }),
    max_total_nodes: Type.Integer({ minimum: 1, maximum: 1000, default: 100,
      description: 'Hard cap on total node count. Prevents DoS via wide trees.' }),
    created_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'DelegationTree',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);
```

#### 2.6.3 New Evaluator Builtins for Tree Validation

```typescript
// tree_budget_conserved(root): Recursively validate that sum of children
// budget_allocated_micro <= parent budget_allocated_micro at every node.
['tree_budget_conserved', () => this.parseTreeBudgetConserved()],

// tree_authority_narrowing(root): Recursively validate that each child's
// authority_scope is a subset of its parent's authority_scope.
['tree_authority_narrowing', () => this.parseTreeAuthorityNarrowing()],
```

**Implementation approach (FL-SDD-002):** Both builtins use **iterative traversal** with an explicit stack (not recursion) to prevent stack overflow on deep trees. A `visited: Set<string>` tracks node_ids to detect reference cycles in deserialized JSON. Traversal enforces `max_depth` and `max_total_nodes` from the parent DelegationTree, returning a `TREE_DEPTH_EXCEEDED` or `TREE_SIZE_EXCEEDED` error if limits are breached. Short-circuits on first invariant violation.

**Evaluator budget:** Tree builtins are subject to a per-evaluation node visit budget of `max_total_nodes * 2` (accounting for both builtins). Exceeding the budget returns `EVALUATOR_BUDGET_EXHAUSTED`.

#### 2.6.4 Constraints

**File:** `constraints/DelegationTree.constraints.json` (NEW)

```json
{
  "schema_id": "DelegationTree",
  "contract_version": "6.0.0",
  "constraints": [
    {
      "id": "delegation-tree-budget-conservation",
      "expression": "tree_budget_conserved(root)",
      "severity": "error",
      "message": "Children cannot spend more than parent allocated",
      "type_signature": {
        "input_schema": "DelegationTree",
        "output_type": "boolean",
        "field_types": { "root": "object" }
      }
    },
    {
      "id": "delegation-tree-authority-narrowing",
      "expression": "tree_authority_narrowing(root)",
      "severity": "error",
      "message": "Authority can only narrow, never widen",
      "type_signature": {
        "input_schema": "DelegationTree",
        "output_type": "boolean",
        "field_types": { "root": "object" }
      }
    },
    {
      "id": "delegation-tree-consensus-minimum",
      "expression": "strategy != 'consensus' || len(root.children) >= 3",
      "severity": "error",
      "message": "Consensus strategy requires at least 3 child nodes",
      "type_signature": {
        "input_schema": "DelegationTree",
        "output_type": "boolean",
        "field_types": { "strategy": "string", "root.children": "array" }
      }
    },
    {
      "id": "delegation-tree-root-budget-match",
      "expression": "bigint_eq(root.budget_allocated_micro, total_budget_micro)",
      "severity": "error",
      "message": "Root node budget must equal tree total budget",
      "type_signature": {
        "input_schema": "DelegationTree",
        "output_type": "boolean",
        "field_types": {
          "root.budget_allocated_micro": "bigint_coercible",
          "total_budget_micro": "bigint_coercible"
        }
      }
    }
  ]
}
```

#### 2.6.5 Conversion Utilities

```typescript
/**
 * Convert a DelegationChain to a DelegationTree (linear tree — no branching).
 */
export function chainToTree(chain: DelegationChain): DelegationTree;

/**
 * Convert a DelegationTree to a DelegationChain.
 * Returns null if the tree has any branching (multiple children at any node).
 */
export function treeToChain(tree: DelegationTree): DelegationChain | null;
```

#### 2.6.6 Conformance Vectors

| Vector | Description | Expected |
|--------|-------------|----------|
| `delegation-tree/parallel-ensemble.json` | Root with 3 parallel children, budget conserved | PASS |
| `delegation-tree/budget-overflow.json` | Children sum exceeds parent budget | FAIL |
| `delegation-tree/consensus-too-few.json` | Consensus strategy with 2 children | FAIL |

---

### 2.7 FR-7: Version Bump & Release (P0)

1. `src/version.ts`: `CONTRACT_VERSION = '6.0.0'`, `MIN_SUPPORTED_VERSION = '6.0.0'`
2. `package.json`: `"version": "6.0.0"`
3. `schemas/index.json`: Add LivenessProperty, CapabilityScopedTrust, ConstraintTypeSignature, RegistryBridge, BridgeInvariant, MintingPolicy, ExchangeRateSpec, DelegationTree, DelegationTreeNode (68 → ~77 schemas)
4. Barrel exports: Update all domain barrels
5. New subpath: `"./graph": "./dist/utilities/schema-graph.js"`
6. New subpath: `"./composition": "./dist/economy/registry-composition.js"`

---

## 3. Testing Strategy

### 3.1 Test Breakdown

| Feature | Test File | Unit | Property | Vector | Compile | Total |
|---------|-----------|------|----------|--------|---------|-------|
| FR-1: Liveness Properties | `tests/integrity/liveness-properties.test.ts` | 12 | 5 | 3 | 0 | 20 |
| FR-1: Registry Extension | `tests/integrity/conservation-registry-liveness.test.ts` | 8 | 0 | 0 | 0 | 8 |
| FR-2: Scoped Trust | `tests/schemas/capability-scoped-trust.test.ts` | 15 | 5 | 3 | 3 | 26 |
| FR-3: Type Checker | `tests/constraints/type-checker.test.ts` | 20 | 0 | 0 | 0 | 20 |
| FR-3: Existing File Migration | `tests/constraints/type-signature-migration.test.ts` | 31 | 0 | 0 | 0 | 31 |
| FR-4: Graph Operations | `tests/utilities/schema-graph-operations.test.ts` | 20 | 0 | 0 | 0 | 20 |
| FR-5: Registry Composition | `tests/economy/registry-composition.test.ts` | 12 | 5 | 3 | 0 | 20 |
| FR-5: Minting Policy | `tests/economy/minting-policy.test.ts` | 8 | 3 | 0 | 0 | 11 |
| FR-6: DelegationTree | `tests/governance/delegation-tree.test.ts` | 15 | 8 | 3 | 0 | 26 |
| FR-6: Tree Builtins | `tests/constraints/tree-builtins.test.ts` | 10 | 5 | 0 | 0 | 15 |
| FR-7: Version + Migration | `tests/version.test.ts` + migration tests | 5 | 0 | 0 | 0 | 5 |
| **Total** | | **156** | **31** | **12** | **3** | **~202** |

### 3.2 Property-Based Tests

- **Liveness**: Random liveness properties with valid companion_safety always pass validation
- **Scoped Trust**: `effectiveTrustLevel(flatTrustToScoped(level)) == level` for all levels
- **Tree Budget**: Random tree where children sum ≤ parent → tree_budget_conserved returns true
- **Tree Authority**: Random tree where children scope ⊆ parent scope → tree_authority_narrowing returns true
- **Bridge Conservation**: source.debit == target.credit * rate for random amounts and rates

### 3.3 Compile-Time Type Tests

```typescript
// @ts-expect-error — Cannot assign TrustLevel to CapabilityScopedTrust
const bad1: CapabilityScopedTrust = 'verified';

// @ts-expect-error — Cannot access removed trust_level field
const bad2 = agentIdentity.trust_level;

// @ts-expect-error — Cannot pass DelegationTree where DelegationChain expected
const bad3: DelegationChain = delegationTree;
```

---

## 4. Sprint Plan

### Sprint 1: Foundation — Liveness + Scoped Trust (P0)
- **S1-T1**: LivenessProperty schema + TimeoutBehavior vocabulary
- **S1-T2**: CANONICAL_LIVENESS_PROPERTIES constant (6 properties)
- **S1-T3**: ConservationPropertyRegistry extension (liveness_properties, liveness_count)
- **S1-T4**: Liveness constraint file + conformance vectors
- **S1-T5**: CapabilityScope vocabulary + CapabilityScopedTrust schema
- **S1-T6**: AgentIdentity breaking change (trust_level → trust_scopes)
- **S1-T7**: Helper functions (trustLevelForScope, meetsThresholdForScope, effectiveTrustLevel, flatTrustToScoped)
- **S1-T8**: Updated AgentIdentity constraints + conformance vectors
- **S1-T9**: Update existing tests referencing trust_level

### Sprint 2: Verification — Type System + Graph Operations (P0/P1)
- **S2-T1**: ConstraintTypeSignature schema + ConstraintType vocabulary
- **S2-T2**: Static type checker (typeCheckConstraintFile)
- **S2-T3**: New evaluator builtins (type_of, is_bigint_coercible)
- **S2-T4**: Migrate all 31 existing constraint files (add type_signature)
- **S2-T5**: Type checker tests + migration verification tests
- **S2-T6**: Schema graph reachability + cycle detection
- **S2-T7**: Schema graph impact analysis + topological sort
- **S2-T8**: Graph operation tests

### Sprint 3: Composition — Registry Bridge + DelegationTree (P1)
- **S3-T1**: RegistryBridge + BridgeInvariant schemas
- **S3-T2**: CANONICAL_BRIDGE_INVARIANTS constant
- **S3-T3**: ExchangeRateSpec + MintingPolicy + SettlementPolicy schemas
- **S3-T4**: Bridge + minting constraint files + conformance vectors
- **S3-T5**: DelegationTree + DelegationTreeNode schemas
- **S3-T6**: New evaluator builtins (tree_budget_conserved, tree_authority_narrowing)
- **S3-T7**: chainToTree / treeToChain conversion utilities
- **S3-T8**: DelegationTree constraint file + conformance vectors
- **S3-T9**: Composition + tree tests

### Sprint 4: Release — Version Bump + Migration (P0)
- **S4-T1**: Version bump (6.0.0), MIN_SUPPORTED_VERSION update
- **S4-T2**: schemas/index.json update (register all new schemas)
- **S4-T3**: Barrel exports + new subpaths (./graph, ./composition)
- **S4-T4**: Update all existing conformance vectors for breaking changes
- **S4-T5**: Full backward-compatibility verification (all 2,824 tests updated and passing)
- **S4-T6**: Migration guide documentation

---

## 5. Security Considerations

| Threat | Mitigation | Schema |
|--------|------------|--------|
| Liveness timeout gaming | Bounded liveness (F_t) with enforced timeout; reaper is application-layer | LivenessProperty.timeout_seconds |
| Trust scope escalation | Scopes are independent; delegation checks delegation scope specifically | CapabilityScopedTrust |
| Type signature spoofing | Type checker validates against actual schema registry | typeCheckConstraintFile |
| Cross-registry double-spend | B-1 bridge invariant requires atomic enforcement | RegistryBridge.bridge_invariants |
| Tree budget inflation | tree_budget_conserved checks sum recursively at every node | DelegationTree constraints |
| Schema graph cycle injection | detectCycles runs as CI gate | schema-graph-acyclic constraint |

---

## 6. Migration Guide (v5.5.0 → v6.0.0)

### 6.1 AgentIdentity (BREAKING)

**Before (v5.5.0):**
```typescript
const agent: AgentIdentity = {
  agent_id: 'gpt-4o',
  trust_level: 'verified',
  // ...
};
```

**After (v6.0.0):**
```typescript
import { flatTrustToScoped } from '@0xhoneyjar/loa-hounfour';

const agent: AgentIdentity = {
  agent_id: 'gpt-4o',
  trust_scopes: flatTrustToScoped('verified'),
  // OR explicit scopes:
  trust_scopes: {
    scopes: {
      billing: 'trusted',
      governance: 'basic',
      inference: 'verified',
      delegation: 'basic',
      audit: 'verified',
      composition: 'basic',
    },
    default_level: 'basic',
  },
  // ...
};
```

**Helper:** `flatTrustToScoped(level)` converts a flat trust level to scoped trust with all scopes set to the same level, providing a mechanical migration path.

### 6.2 ConservationPropertyRegistry (BREAKING)

**Before (v5.5.0):**
```typescript
const registry: ConservationPropertyRegistry = {
  properties: [...],
  total_count: 14,
  coverage: { ... },
  // ...
};
```

**After (v6.0.0):**
```typescript
const registry: ConservationPropertyRegistry = {
  properties: [...],
  total_count: 14,
  coverage: { ... },
  liveness_properties: [],  // NEW required (can be empty)
  liveness_count: 0,        // NEW required
  // ...
};
```

### 6.3 Constraint Files (BREAKING)

Every constraint gains `type_signature`. Existing constraints without it will fail validation.

**Migration script:** A `scripts/migrate-constraints-v6.sh` script will be provided that:
1. Reads each constraint file
2. Infers `input_schema` from `schema_id`
3. Infers `field_types` from `fields` array
4. Defaults `output_type` to `"boolean"`
5. Writes updated file
