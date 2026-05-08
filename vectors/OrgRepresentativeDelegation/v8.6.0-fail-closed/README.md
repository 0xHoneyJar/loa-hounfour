# FR-A4 fail-closed cross-product fixtures

> **Scope boundary:** these fixtures exercise the `validate()`
> `failClosed` opt-in branching (FR-A4) only. They do **not** exercise
> chain-DAG coherence — `org_id` / `granted_by` / `delegation_id`
> linkage between the record under validation and the chain-context
> records is intentionally unconstrained here because `validate()`
> defers chain-DSL evaluation (the `is_valid_dag` builtin / ORD-3
> traversal) to `npm run check:constraints` and to consumer-side runtime
> per ADR-010. A fixture in this directory may exhibit `org_id`
> mismatches between the record and its chain ancestor — that is by
> design for fail-closed branching coverage, NOT a bug in the fixture.

## What these fixtures test

The 12 fixtures form a 2 × 3 × 2 cross-product:

- **Mode** (2): default (`failClosed` unset/false) vs. opt-in (`failClosed: true`)
- **Chain context** (3): absent / present / malformed
- **Record kind** (2): genesis-rooted (`granted_by: "genesis:org-public-key"`) vs. chained (`granted_by: <prior delegation_id>`)

Each fixture asserts one branch of `validate()`'s decision tree:

| Mode | Context | Result |
|---|---|---|
| default | absent / malformed | `valid:true` with ORD-3 manifest reason `context_absent` |
| default | present | `valid:true` with ORD-3 manifest reason `pattern_matching` |
| opt-in | absent / malformed | `valid:false` with `CHAIN_CONTEXT_DEFERRED:` error |
| opt-in | present | `valid:true` with ORD-3 manifest reason `chain_context_provided` |

## What these fixtures do NOT test

- **Chain DAG validity.** `is_valid_dag` evaluation (ORD-3 chain
  traversal, genesis-sentinel termination, depth ≤ 20) lives at
  `npm run check:constraints` time and is not invoked by `validate()`.
  Chain DAG coverage lives in the constraint-test suite at
  `tests/constraints/org-representative-delegation.constraints.test.ts`,
  not here.
- **Cross-record `org_id` linkage.** Whether a chained record's
  `org_id` matches its parent's `org_id` is an ORD-3 concern, not an
  FR-A4 concern. Fixtures in this directory may use canonical record
  payloads without re-aligning every cross-record field; the
  fail-closed branching is what's under test.
- **Signature verification.** ORD-1 (Ed25519 signature verification)
  is consumer-side per NF-1; fixtures use placeholder signature bytes
  that satisfy the schema regex but no cryptographic check.
- **Append-only revocation.** ORD-2 is runtime-deferred and not
  exercised here.

## Fixture format

Each `case-NN-mode-context-record-kind.json` file is self-describing:

```json
{
  "case_id": "case-09-optin-present-genesis",
  "description": "Opt-in (failClosed:true), chain context supplied, genesis record. Expected: valid:true with ORD-3 manifest reason chain_context_provided.",
  "validate_options": {
    "failClosed": true,
    "chainContext": { "granted_by_chain_records": [...] }
  },
  "data": { /* OrgRepresentativeDelegation record */ },
  "expected": {
    "valid": true,
    "ord3_reason": "chain_context_provided"
  }
}
```

The runner at
[`tests/governance/fr-a4-fail-closed-vectors.test.ts`](../../../tests/governance/fr-a4-fail-closed-vectors.test.ts)
walks this directory, asserts the count is exactly 12, and runs
`validate(OrgRepresentativeDelegationSchema, c.data, c.validate_options)`
against each `expected` outcome.

## Adding new cases

This directory's contract is **local to FR-A4**: the `_inflight_`-style
matrix is not a generalized cross-runner convention. If a future FR
needs a similar branching matrix, mint its own subdirectory (e.g.
`vectors/<Schema>/v8.7.0-some-feature/`) with the same self-describing
JSON shape rather than overloading this one.

When adding cases, update the runner's `expect(cases.length).toBe(12)`
assertion to the new total so accidental fixture loss is caught.

## Cross-references

- [`MIGRATION.md`](../../../MIGRATION.md) — `### FR-A4` section: full
  consumer migration path, manifest-reason matrix, v9.0.0 default-flip
  forward-pointer.
- [`src/validators/index.ts`](../../../src/validators/index.ts) — the
  `failClosed?: boolean` option and the `x-chain-bearing` metadata
  dispatch block.
- [`src/governance/org-representative-delegation.ts`](../../../src/governance/org-representative-delegation.ts) —
  the schema declaring `'x-chain-bearing': true`.
