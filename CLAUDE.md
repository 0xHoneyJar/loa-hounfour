# @0xhoneyjar/loa-hounfour

Constitutional protocol contracts for an AI agent economy — loa-finn <-> arrakis integration layer.

## Project Overview

Constitutional protocol framework for multi-agent economic coordination. Defines schemas, constraints, governance structures, and economic primitives that form the foundational law of the loa ecosystem. Consumed as an npm package by loa-finn and arrakis.

- **157 TypeBox schemas** across 9 modules (core, economy, model, governance, constraints, integrity, graph, composition, validators)
- **72 constraint files** with a custom constraint DSL and 42 evaluator builtins
- **5,000+ tests** with conformance vectors for cross-language validation
- **JSON Schema 2020-12** generation for Python/Go/Rust consumers

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | TypeBox schema definitions and validators |
| `tests/` | Vitest test suites |
| `schemas/` | Generated JSON Schema files |
| `vectors/` | Conformance test vectors |
| `constraints/` | Protocol constraint files |
| `docs/` | Protocol documentation, architecture, requirements, history |
| `scripts/` | Build and utility scripts |

## Coding Standards

- **TypeScript** (ES2022+, ESM modules)
- **TypeBox** for all schema definitions (runtime + JSON Schema generation)
- **Vitest** for testing
- String-encoded micro-USD (`^[0-9]+$`) for financial values — no floating point
- `@noble/hashes` for cryptographic operations (Keccak-256 for EIP-55)
- Strict semver: MAJOR for required field additions, MINOR for additive-only

## Package Exports

```typescript
import { ... } from '@0xhoneyjar/loa-hounfour';           // Everything
import { ... } from '@0xhoneyjar/loa-hounfour/core';      // Agents, messages
import { ... } from '@0xhoneyjar/loa-hounfour/economy';   // Billing, JWT, escrow
import { ... } from '@0xhoneyjar/loa-hounfour/governance'; // Delegation, permissions
import { ... } from '@0xhoneyjar/loa-hounfour/constraints'; // Constraint DSL
```

## Development

```bash
npm run build          # TypeScript compilation
npm run test           # Run all tests
npm run schema:generate # Generate JSON Schema files
```

## Architecture Decision Records

ADRs live under `docs/adr/`. The class-vs-policy boundary that constrains
what `loa-hounfour` ships (shape, not authority) is in
[ADR-010](docs/adr/ADR-010-class-vs-policy-boundary.md); ADR-007 / ADR-008
are its predecessors. The v8.5.0 three-layer authority cascade composes
under that boundary —
[authority-cascade.md](docs/architecture/authority-cascade.md) covers
the consumer-side verification trace, vocabulary harmonization, and
import surface. The v8.5.0 forgetting primitive (PR-A2.3) is documented
in [forget-record-semantics.md](docs/architecture/forget-record-semantics.md)
— four-variant `forget_scope` discriminator, H1 mandatory
`legal_mandate_reference` on `crypto_full_destruction`, and the
verifiability truth table that records which audit-non-repudiation
properties each scope preserves.
