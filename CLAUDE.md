<!-- docs-version: 7.0.0 -->

# @0xhoneyjar/loa-hounfour

Shared protocol contracts for the loa-finn <-> arrakis integration layer.

## Project Overview

This is a TypeScript schema library defining the canonical wire format between AI coordination services. It is consumed as an npm package by loa-finn and arrakis.

- **87+ TypeBox schemas** across 8 modules (core, economy, model, governance, constraints, integrity, utilities, validators)
- **147 constraint files** with a custom constraint DSL and evaluator
- **3,908+ tests** with conformance vectors for cross-language validation
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

## Loa Framework (Optional)

This project can optionally use the [Loa](https://github.com/0xHoneyJar/loa) development framework for structured planning, review, and deployment workflows.

```bash
# Mount the framework for a development session
./scripts/mount-loa.sh

# Update the framework
./scripts/mount-loa.sh --update

# Remove after session
./scripts/mount-loa.sh --clean
```

When Loa is mounted, its instructions load automatically via the import below.

@.claude/loa/CLAUDE.loa.md
