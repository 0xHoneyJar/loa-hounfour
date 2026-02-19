<!-- docs-version: 7.0.0 -->

# @0xhoneyjar/loa-hounfour

> Documentation current as of v7.0.0

Typed, validated protocol contracts for AI agent coordination. TypeBox schemas with dual JSON Schema 2020-12 output.

## What This Is

loa-hounfour is a **schema-only** protocol library. It defines the wire format for services that need typed, validated contracts between AI agents, gateways, and runtimes. Every TypeBox schema compiles to a standalone JSON Schema 2020-12 file, enabling cross-language validation in Python, Go, Rust, or any JSON Schema-compliant environment.

**What it does**: Typed schemas, runtime validation, cross-field invariant checks, constraint DSL with evaluator builtins, formal conservation properties, governance layer.

**What it does NOT do**: No runtime, no transport, no HTTP server, no model invocation. Schemas and validation only.

Reference consumers include [loa-finn](https://github.com/0xHoneyJar/loa-finn) (runtime) and [loa-freeside](https://github.com/0xHoneyJar/loa-freeside) (gateway). Any service needing typed AI coordination contracts can consume this package independently.

## Why

- **Schema drift**: Without a shared contract, services diverge silently.
- **Protocol divergence**: Typed schemas catch incompatibilities at build time, not in production.
- **Cross-language validation**: JSON Schema 2020-12 output works in any language ecosystem.
- **Constraint DSL**: Formal rules (conservation laws, temporal ordering, state machine transitions) enforced by an evaluator with 31 builtins.

## Inventory

| Metric | Value | Source |
|--------|-------|--------|
| Schema files | 53 | `src/schemas/**/*.ts` |
| Module barrels | 9 | `src/*/index.ts` (core, economy, model, governance, constraints, integrity, graph, composition, validators) |
| Package export paths | 10 | `package.json` exports field |
| Constraint files | 40 | `constraints/` (39 `.constraints.json` + 1 `GRAMMAR.md`) |
| Evaluator builtins | 31 | `src/constraints/evaluator.ts:1399-1446` |
| Tests | 3,908 | `pnpm run test` |
| CONTRACT_VERSION | 7.0.0 | `src/version.ts:13` |
| MIN_SUPPORTED_VERSION | 6.0.0 | `src/version.ts:14` |
| Golden test vector dirs | 15 | `vectors/` (excluding VERSION) |

## Installation

```bash
# npm
npm install @0xhoneyjar/loa-hounfour

# pnpm
pnpm add @0xhoneyjar/loa-hounfour
```

## Module Map

All 10 package export paths and what they contain:

| Export Path | Description | Key Exports |
|-------------|-------------|-------------|
| `.` | Root barrel — re-exports all modules | Everything below, plus `CONTRACT_VERSION`, `validate`, `validators`, `validateCompatibility` |
| `./core` | Agent lifecycle, conversation, transfer, events, discovery | `AgentDescriptorSchema`, `ConversationSchema`, `TransferSpecSchema`, `DomainEventSchema`, `HealthStatusSchema`, `ProtocolDiscoverySchema`, `StreamEventSchema`, `AgentIdentitySchema`, `CapabilitySchema` |
| `./economy` | Billing, escrow, staking, credit, dividends, conservation | `JwtClaimsSchema`, `InvokeResponseSchema`, `BillingEntrySchema`, `EscrowEntrySchema`, `StakePositionSchema`, `CommonsDividendSchema`, `MutualCreditSchema`, `RegistryBridgeSchema`, `BridgeTransferSagaSchema`, `MonetaryPolicySchema` |
| `./model` | Completion, ensemble, routing, capabilities, providers | `CompletionRequestSchema`, `CompletionResultSchema`, `ModelCapabilitiesSchema`, `EnsembleRequestSchema`, `RoutingResolutionSchema`, `ModelProviderSpecSchema`, `DelegationChainSchema`, `ConformanceVectorSchema` |
| `./governance` | Sanctions, disputes, reputation, performance, proposals | `SanctionSchema`, `DisputeRecordSchema`, `ReputationScoreSchema`, `PerformanceRecordSchema`, `GovernanceConfigSchema`, `DelegationTreeSchema`, `DelegationOutcomeSchema`, `PermissionBoundarySchema`, `GovernanceProposalSchema` |
| `./constraints` | Constraint grammar, rule definitions, evaluator, DDD vocabulary | `evaluateConstraint`, `EVALUATOR_BUILTINS`, `typeCheckConstraintFile`, `STATE_MACHINES`, `AGGREGATE_BOUNDARIES`, `TEMPORAL_PROPERTIES` |
| `./integrity` | Request hashing, decompression, idempotency, conservation properties | `computeReqHash`, `verifyReqHash`, `decompressBody`, `deriveIdempotencyKey`, `CANONICAL_CONSERVATION_PROPERTIES`, `CANONICAL_LIVENESS_PROPERTIES` |
| `./graph` | Schema graph operations | `extractReferences`, `buildSchemaGraph` (cycle detection, reachability, impact analysis) |
| `./composition` | Cross-module composition types (v7.0.0 coordination schemas) | `RegistryBridgeSchema`, `MintingPolicySchema`, `BridgeTransferSagaSchema`, `DelegationTreeSchema`, `DelegationOutcomeSchema`, `PermissionBoundarySchema`, `GovernanceProposalSchema`, `MonetaryPolicySchema` |
| `./schemas/*` | Pre-generated JSON Schema 2020-12 files | Static `.schema.json` files for cross-language consumption |

Source: `package.json` exports field, `src/*/index.ts` barrel files.

## Usage

### Import from Sub-Packages

```typescript
// Targeted imports — tree-shakeable
import { AgentDescriptorSchema, ConversationSchema } from '@0xhoneyjar/loa-hounfour/core';
import { BillingEntrySchema, EscrowEntrySchema } from '@0xhoneyjar/loa-hounfour/economy';
import { CompletionRequestSchema, EnsembleRequestSchema } from '@0xhoneyjar/loa-hounfour/model';
import { SanctionSchema, GovernanceProposalSchema } from '@0xhoneyjar/loa-hounfour/governance';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '@0xhoneyjar/loa-hounfour/constraints';
import { computeReqHash, deriveIdempotencyKey } from '@0xhoneyjar/loa-hounfour/integrity';
import { buildSchemaGraph } from '@0xhoneyjar/loa-hounfour/graph';
import { BridgeTransferSagaSchema } from '@0xhoneyjar/loa-hounfour/composition';

// Or import everything from the root
import { validate, validators, CONTRACT_VERSION } from '@0xhoneyjar/loa-hounfour';
```

### Validation

```typescript
import { validate } from '@0xhoneyjar/loa-hounfour';
import { BillingEntrySchema } from '@0xhoneyjar/loa-hounfour/economy';

const result = validate(BillingEntrySchema, data);

if (result.valid) {
  // result.warnings may contain advisory messages
  console.log('Valid', result.warnings ?? []);
} else {
  // result.errors contains validation failures
  // Cross-field invariants (e.g., conservation checks) are included automatically
  console.error('Invalid', result.errors);
}
```

### Constraint Evaluation

Constraint files in `constraints/*.constraints.json` define cross-field rules using a PEG-based expression language (see `constraints/GRAMMAR.md`). The evaluator runs these against data objects:

```typescript
import { evaluateConstraint } from '@0xhoneyjar/loa-hounfour/constraints';

// Evaluate a constraint expression against a data object
const satisfied = evaluateConstraint(data, 'bigint_gte(limit_micro, spent_micro)');
// Returns true if the constraint passes, false if violated
```

The constraint DSL supports 31 evaluator builtins (`src/constraints/evaluator.ts:1399-1446`): BigInt arithmetic (`bigint_sum`, `bigint_add`, `bigint_sub`, `bigint_gte`, `bigint_gt`, `bigint_eq`), delegation chain validation (`all_links_subset_authority`, `delegation_budget_conserved`, `links_temporally_ordered`, `links_form_chain`), ensemble capability checks, temporal operators (`changed`, `previous`, `delta`), type introspection (`type_of`, `is_bigint_coercible`), and v7.0.0 coordination/governance builtins (`saga_amount_conserved`, `saga_steps_sequential`, `outcome_consensus_valid`, `monetary_policy_solvent`, `permission_boundary_active`, `proposal_quorum_met`, `saga_timeout_valid`, `proposal_weights_normalized`).

### Cross-Language JSON Schema Usage

Pre-generated JSON Schema 2020-12 files enable validation from any language:

```typescript
// TypeScript — import static schema
import schema from '@0xhoneyjar/loa-hounfour/schemas/billing-entry.schema.json';
```

```python
# Python — load the schema file
import json
from jsonschema import validate

with open("node_modules/@0xhoneyjar/loa-hounfour/schemas/billing-entry.schema.json") as f:
    schema = json.load(f)

validate(instance=data, schema=schema)
```

```go
// Go — load and validate with any JSON Schema library
schemaBytes, _ := os.ReadFile("schemas/billing-entry.schema.json")
```

## Golden Test Vectors

Cross-language conformance vectors live in `vectors/`. Each file contains valid and/or invalid test cases with expected outcomes.

| Directory | Coverage |
|-----------|----------|
| `vectors/budget/` | Budget calculation (basic pricing, streaming cancel, extreme tokens, price changes, provider corrections) |
| `vectors/jwt/` | JWT conformance |
| `vectors/agent/` | Agent lifecycle transitions, NFT ID parsing |
| `vectors/billing/` | Billing allocation |
| `vectors/conversation/` | Conversation schema vectors |
| `vectors/domain-event/` | Domain event batches and events |
| `vectors/transfer/` | Transfer choreography and specs |
| `vectors/cross-ecosystem/` | Cross-module vectors (completion, billing-ensemble, event-saga, constraint-proposal) |
| `vectors/capability/` | Capability schema vectors |
| `vectors/discovery/` | Protocol discovery vectors |
| `vectors/health/` | Health status vectors |
| `vectors/reputation-score/` | Reputation score vectors |
| `vectors/thinking/` | Thinking trace vectors |
| `vectors/conformance/` | Provider normalization, pricing calculation, thinking traces, tool call roundtrip, ensemble position, reservation enforcement, delegation chain, inter-agent transaction, conservation properties, JWT boundary, agent identity, capability-scoped trust, liveness properties, registry bridge |
| `vectors/runners/` | Reference runners for Go, Python, and Rust |

Vector runners validate that non-TypeScript implementations produce identical results:

- `vectors/runners/go/` — Go test runner
- `vectors/runners/python/` — Python test runner
- `vectors/runners/rust/` — Rust test runner

## Scripts

```bash
pnpm run build              # Compile TypeScript (tsc)
pnpm run test               # Run all 3,908 tests (vitest)
pnpm run typecheck           # Type-only check (tsc --noEmit)
pnpm run schema:generate     # Regenerate JSON schemas from TypeBox
pnpm run schema:check        # Validate schema integrity
pnpm run semver:check        # Check for breaking changes
pnpm run vectors:check       # Validate golden test vectors
pnpm run schemas:validate    # Validate all schema files
pnpm run check:constraints   # Validate constraint files
pnpm run check:all           # Run all integrity checks
```

## Versioning Policy

Strict semver with N/N-1 support window. Source: `src/version.ts:13-14`.

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Bug fixes, documentation | PATCH | Fix typo in error code description |
| New optional fields, new schemas | MINOR | Add `reasoning_tokens` to usage report |
| Required field additions, field removals | MAJOR | Make `req_hash` mandatory, trust_level to trust_scopes |

### Compatibility

| Relationship | Result | Action |
|-------------|--------|--------|
| Same major + minor | COMPATIBLE | None |
| Same major, minor +/-1 | COMPATIBLE_WITH_WARNING | `X-Contract-Version-Warning` header |
| Different major | INCOMPATIBLE | 400 `CONTRACT_VERSION_MISMATCH` |

Consumers must support versions N and N-1 minor for a 30-day overlap window.

### Breaking Change Process

1. Open RFC issue with proposed change
2. Update schemas in loa-hounfour with version bump
3. Add conformance vectors for new behavior
4. CI: `semver:check` validates no accidental breaks
5. Both consumers update within overlap window

## Further Documentation

| Topic | Location |
|-------|----------|
| Architecture decisions | `docs/architecture/decision-lineage.md` |
| Separation of concerns | `docs/architecture/separation-of-concerns.md` |
| System design document | `docs/architecture/sdd.md` |
| Transfer choreography | `docs/choreography/` |
| Epistemic tristate pattern | `docs/patterns/epistemic-tristate.md` |
| Capability schema design | `docs/architecture/capability-schema.md` |
| JAM geometry | `docs/architecture/jam-geometry.md` |
| Runtime contract | `docs/integration/runtime-contract.md` |
| Product requirements | `docs/requirements/prd.md` |
| Contributing | `CONTRIBUTING.md` |

## Maintainer

[@janitooor](https://github.com/janitooor)

## License

[AGPL-3.0](LICENSE.md) — Use, modify, distribute freely. Network service deployments must release source code.

Commercial licenses are available for organizations that wish to use Loa without AGPL obligations.


Ridden with [Loa](https://github.com/0xHoneyJar/loa)

