<!-- AGENT-CONTEXT
name: @0xhoneyjar/loa-hounfour
type: protocol-library
purpose: Typed, validated protocol contracts for AI agent coordination — TypeBox schemas with JSON Schema 2020-12 dual output
key_files: [CLAUDE.md, package.json, src/version.ts, src/index.ts, constraints/GRAMMAR.md]
interfaces: [core, economy, model, governance, constraints, integrity, graph, composition, validators]
dependencies: [node, pnpm, typescript]
capability_requirements:
  - filesystem: read
  - filesystem: write (scope: src, tests, docs)
  - git: read_write
  - shell: execute
version: 7.0.0
contract_version: 7.0.0
min_supported_version: 6.0.0
trust_level: L3-hardened
-->

<!-- docs-version: 7.0.0 -->

# @0xhoneyjar/loa-hounfour

<!-- provenance: DERIVED -->
Typed, validated protocol contracts for AI agent coordination. TypeBox schemas with JSON Schema 2020-12 dual output, constraint DSL with 31 evaluator builtins, and formal conservation invariants.

## At a Glance
<!-- provenance: CODE-FACTUAL -->

| Metric | Value | Source |
|--------|-------|--------|
| CONTRACT_VERSION | 7.0.0 | `src/version.ts:13` |
| MIN_SUPPORTED_VERSION | 6.0.0 | `src/version.ts:14` |
| Schema files | 53 | `src/schemas/**/*.ts` |
| Module barrels | 9 | `src/*/index.ts` |
| Package exports | 10 | `package.json` exports field |
| Constraint files | 40 | `constraints/` (39 .json + 1 GRAMMAR.md) |
| Evaluator builtins | 31 | `src/constraints/evaluator.ts` |
| Tests | 3,908 | `pnpm run test` |
| Source files | 125 | `src/**/*.ts` |
| Test files | 156 | `tests/**/*.ts` |
| Golden vectors | 111 | `vectors/**/*.json` |

## Architecture
<!-- provenance: DERIVED -->

```
.
├── constraints/        # 40 constraint files (JSON DSL + GRAMMAR.md)
├── docs/               # Protocol documentation
│   ├── architecture/   # Design decisions, capability schemas
│   ├── choreography/   # Interaction patterns (sale, gift, custody, recovery)
│   ├── context/        # Context docs for planning
│   ├── history/        # Development ledger, notes, cycle archives
│   ├── integration/    # Runtime contracts
│   ├── patterns/       # Reusable patterns (epistemic tristate)
│   ├── requirements/   # PRD
│   └── visions/        # Forward-looking ideas
├── evals/              # 122 eval framework files
├── schemas/            # 94 pre-generated JSON Schema 2020-12 files
├── scripts/            # 12 utility scripts (mount-loa.sh, generate-schemas.ts)
├── specs/              # OpenAPI specs
├── src/                # 125 TypeScript source files
│   ├── composition/    # Cross-module coordination types (v7.0.0)
│   ├── constraints/    # Constraint grammar, evaluator, builtins
│   ├── core/           # Agent, Conversation, Transfer, JWT, Health, Discovery
│   ├── economy/        # Billing, Escrow, Stake, Credit, Dividend, Conservation
│   ├── governance/     # Sanction, Dispute, Reputation, Performance, Governance
│   ├── graph/          # Schema graph operations, cycle detection, reachability
│   ├── integrity/      # req-hash, decompression, idempotency
│   ├── model/          # Completion, Ensemble, Routing, Provider, Capabilities
│   ├── schemas/        # 53 TypeBox schema definitions
│   ├── validators/     # Validation pipeline, cross-field validators
│   ├── vocabulary/     # Error codes, pool IDs, event types, metadata
│   └── utilities/      # Shared utilities (arithmetic, lifecycle, NftId)
├── tests/              # 156 test files (3,908 tests)
└── vectors/            # 111 golden test vectors across 15 categories
```

## Module Map
<!-- provenance: CODE-FACTUAL -->

| Module | Import Path | Files | Purpose |
|--------|-------------|-------|---------|
| `core` | `@0xhoneyjar/loa-hounfour/core` | Agent, Conversation, Transfer, JWT, Health, Discovery |
| `economy` | `@0xhoneyjar/loa-hounfour/economy` | Billing, Escrow, Stake, Credit, Dividend, Conservation |
| `model` | `@0xhoneyjar/loa-hounfour/model` | Completion, Ensemble, Routing, Provider, Capabilities |
| `governance` | `@0xhoneyjar/loa-hounfour/governance` | Sanction, Dispute, Reputation, Performance, Governance |
| `constraints` | `@0xhoneyjar/loa-hounfour/constraints` | Constraint grammar, evaluator builtins, rule definitions |
| `integrity` | `@0xhoneyjar/loa-hounfour/integrity` | req-hash, decompression, idempotency |
| `graph` | `@0xhoneyjar/loa-hounfour/graph` | Schema graph operations, cycle detection, reachability |
| `composition` | `@0xhoneyjar/loa-hounfour/composition` | Cross-module coordination (saga, delegation, monetary) |
| `validators` | `@0xhoneyjar/loa-hounfour` (root) | Validation pipeline, cross-field validators |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L3 — Property-Based**
- 156 test files, 3,908 tests (`pnpm run test`)
- CI/CD: GitHub Actions
- Type safety: TypeScript strict mode
- Schema integrity: `pnpm run schema:check`
- Constraint validation: `pnpm run check:constraints`
- Semver enforcement: `pnpm run semver:check`

## Ecosystem
<!-- provenance: OPERATIONAL -->
### Runtime Dependencies
- `@sinclair/typebox` — Schema definition and validation
- `@noble/hashes` — Cryptographic hashing (SHA-256, Keccak-256)
- `canonicalize` — JSON canonicalization (RFC 8785)
- `jose` — JWT/JWS operations

### Dev Dependencies
- `typescript` — Type checking and compilation
- `vitest` — Test framework
- `fast-check` — Property-based testing
- `tsx` — TypeScript execution for scripts

## Quick Start
<!-- provenance: OPERATIONAL -->

```bash
pnpm add @0xhoneyjar/loa-hounfour
```

```typescript
import { validate, validators, CONTRACT_VERSION } from '@0xhoneyjar/loa-hounfour';
import { CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour/model';
import { BillingEntrySchema } from '@0xhoneyjar/loa-hounfour/economy';
```

## Development Framework

This repository optionally uses the [Loa Framework](https://github.com/0xHoneyJar/loa) for agent-driven development. The framework mounts ephemerally — it is NOT checked into git.

```bash
# Mount Loa for development (optional)
./scripts/mount-loa.sh

# Update Loa framework
./scripts/mount-loa.sh --update

# Clean Loa artifacts
./scripts/mount-loa.sh --clean
```

<!-- ground-truth-meta
generated_at: 2026-02-19T14:00:00Z
generator: manual (cycle-018 documentation overhaul)
contract_version: 7.0.0
-->
