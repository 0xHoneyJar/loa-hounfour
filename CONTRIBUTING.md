# Contributing to @0xhoneyjar/loa-hounfour

Thank you for your interest in contributing to `loa-hounfour`, a TypeScript protocol schema library that uses [TypeBox](https://github.com/sinclairzx81/typebox) to produce JSON Schema 2020-12 definitions with cross-field constraint validation.

## Table of Contents

- [What This Project Is](#what-this-project-is)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [How to Add a New Schema](#how-to-add-a-new-schema)
- [How to Add Constraints](#how-to-add-constraints)
- [Testing](#testing)
- [Code Style](#code-style)
- [Scripts Reference](#scripts-reference)
- [Versioning](#versioning)
- [Pull Request Process](#pull-request-process)
- [License](#license)

## What This Project Is

`loa-hounfour` is a TypeScript protocol schema library. It defines domain schemas using TypeBox and compiles them to JSON Schema 2020-12. Cross-field invariants are expressed as constraint files that live alongside the schemas and are validated at test time. The library ships with golden test vectors to ensure schema correctness across versions.

## Prerequisites

- **Node.js 18+**
- **pnpm** (package manager)
- **TypeScript** knowledge (strict mode)

## Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/loa-hounfour.git
   cd loa-hounfour
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Run the test suite** to verify everything works
   ```bash
   pnpm run test
   ```

5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Add a New Schema

Follow these steps when adding a new schema to the library:

### 1. Create the schema file

Create a new TypeScript file in `src/schemas/` using TypeBox to define the schema:

```typescript
import { Type, Static } from '@sinclair/typebox';

export const MyNewSchema = Type.Object({
  id: Type.String(),
  value: Type.Number({ minimum: 0 }),
  // ... fields
});

export type MyNewSchema = Static<typeof MyNewSchema>;
```

### 2. Export from the module barrel

Add the export to the appropriate module barrel file (`src/{module}/index.ts`):

```typescript
export { MyNewSchema } from '../schemas/MyNewSchema';
```

### 3. Re-export from root barrel (if needed)

If the schema should be part of the public API, add it to `src/index.ts`:

```typescript
export { MyNewSchema } from './schemas/MyNewSchema';
```

### 4. Add constraint file (if cross-field invariants exist)

If the schema has cross-field validation rules (e.g., "endDate must be after startDate"), create a constraint file at `constraints/{SchemaName}.constraints.json`. See [How to Add Constraints](#how-to-add-constraints) below.

### 5. Add golden test vectors

Add test vectors in `vectors/` that cover valid and invalid instances of your schema. These serve as golden tests that guard against regressions.

### 6. Register in the schema generator

Add your schema to `scripts/generate-schemas.ts` so it is included in the JSON Schema output.

### 7. Generate and verify

```bash
pnpm run schema:generate
pnpm run schema:check
```

Ensure both commands pass without errors before submitting.

## How to Add Constraints

Constraints express cross-field invariants that cannot be captured by JSON Schema alone.

### 1. Create the constraint file

Create `constraints/{SchemaName}.constraints.json` following the constraint grammar documented in `constraints/GRAMMAR.md`.

### 2. Follow the constraint grammar

Refer to `constraints/GRAMMAR.md` for the full specification of supported operators, predicates, and composition rules.

### 3. Add evaluator builtins (if needed)

If your constraint requires a new builtin function for the evaluator, implement it and add corresponding tests.

### 4. Verify

Run the full test suite to confirm your constraints are valid and all existing tests still pass:

```bash
pnpm run test
```

## Testing

This project uses [vitest](https://vitest.dev/) as its test framework.

```bash
# Run all tests
pnpm run test
```

All **3,908 tests** must pass before a PR can be merged. Do not submit a PR with failing tests.

When adding a new schema:
- Add unit tests for the TypeBox schema definition
- Add constraint evaluation tests if constraints exist
- Add vector-based golden tests for valid/invalid instances

## Code Style

- **TypeScript strict mode** is enabled and enforced
- **TypeBox** is the sole mechanism for schema definitions -- do not hand-write JSON Schema
- **No runtime dependencies** -- this is a pure schema library
- Keep schema files focused: one schema per file
- Use descriptive field names and include JSDoc comments for non-obvious fields
- Run `pnpm run typecheck` before submitting to ensure type safety

## Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| Build | `pnpm run build` | Compile TypeScript and produce distribution artifacts |
| Test | `pnpm run test` | Run the full vitest suite |
| Typecheck | `pnpm run typecheck` | Run the TypeScript compiler in check mode |
| Schema Generate | `pnpm run schema:generate` | Generate JSON Schema 2020-12 files from TypeBox definitions |
| Schema Check | `pnpm run schema:check` | Validate generated schemas for correctness |
| Semver Check | `pnpm run semver:check` | Verify no unintended breaking changes in the public API |

## Versioning

This project follows **strict semver**:

- **Major** bump: breaking changes to any public schema, constraint grammar, or exported type
- **Minor** bump: new schemas, new constraint operators, backwards-compatible additions
- **Patch** bump: bug fixes, documentation, internal refactoring with no API surface change

The library supports **N/N-1 compatibility** -- consumers on the previous major version must have a documented migration path.

Run `pnpm run semver:check` to verify your changes do not introduce unintended breaking changes.

## Pull Request Process

1. **Use conventional commits** for all commit messages:
   ```
   feat(schemas): add TokenTransfer schema
   fix(constraints): correct range evaluation for negative values
   test(vectors): add edge-case vectors for Proposal schema
   docs: update constraint grammar examples
   ```

2. **One concern per PR** -- a single schema addition, a single bug fix, or a single documentation update.

3. **Link related issues** using keywords (`Closes #123`, `Fixes #456`).

4. **CI must pass** -- all tests, typecheck, schema generation, and semver checks must be green.

5. **Request review** -- at least one maintainer approval is required before merge.

## License

By contributing to this project, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
