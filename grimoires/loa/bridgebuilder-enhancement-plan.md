# Implementation Plan: Bridgebuilder Excellence Enhancements for PR #6

## Context

PR #6 (`feature/v5.0.0-multi-model`) completed the v5.0.0 Multi-Model Release across 5 sprints (151 files, 1,322 tests passing). The Bridgebuilder review identified 4 medium/low fixes and proposed 4 visionary features. This plan implements ALL of them on the same branch, appending to PR #6.

## Sprint Organization (3 sprints)

---

### Sprint 6: Quick Fixes + Billing Provenance Chain

**S6-T1: Add `session_id` to CompletionRequest** (Medium fix)
- File: `src/schemas/model/completion-request.ts:11`
- Add `session_id: Type.Optional(Type.String({ minLength: 1 }))` after `trace_id`
- Update cross-field validator in `src/validators/index.ts:403` — no new constraint, just schema
- Add `session_id` to `CompletionRequest.constraints.json` (new constraint: `execution_mode == 'native_runtime' => session_id != null` — native runtime sessions need session tracking)
- Update round-trip test in `tests/constraints/round-trip.test.ts` with session_id test cases
- Regenerate JSON schema

**S6-T2: EnsembleResult cost conservation completeness** (Medium fix)
- File: `constraints/EnsembleResult.constraints.json:6`
- Add new constraint: `ensemble-result-total-cost-equals-sum`
  - Expression: `bigint_sum(candidates, 'usage.cost_micro') == total_cost_micro`
  - Note: The evaluator's `bigint_sum(array, fieldPath)` already handles nested field extraction via `parseBigintSum()` in `src/constraints/evaluator.ts:493`, but the field path argument resolves a flat key on each item. `cost_micro` is nested under `usage.cost_micro`. Need to check: the evaluator resolves `fieldName` as a flat key `(item as Record<string, unknown>)[fieldName]` at line 515. For nested paths like `usage.cost_micro`, we need either:
    - (a) Extend `bigint_sum` to support dot-path field resolution (reuse `resolve()` function), OR
    - (b) Use a different expression pattern
  - **Decision**: Extend `bigint_sum` form 2 to resolve dot-paths using the existing `resolve()` function. This is the minimal change — replace `(item as Record<string, unknown>)[fieldName]` with `resolve(item as Record<string, unknown>, fieldName as string)` in evaluator.ts:515
  - Also update grammar.ts `parseBigintSumCall` to accept string args with dots
- Update TS cross-field validator in `src/validators/index.ts:481` to add the sum check
- Add round-trip test for cost conservation completeness
- Update cross-ecosystem vectors if needed

**S6-T3: Billing provenance chain metadata keys** (Low fix + Feature)
- File: `src/vocabulary/metadata.ts:89`
- Add keys to `BILLING_METADATA_KEYS`:
  ```typescript
  PAYMENT_TX: 'billing.payment_tx',      // On-chain payment transaction hash
  CREDIT_LOT_ID: 'billing.credit_lot_id', // Credit lot identifier for prepaid billing
  ```
- Add `BillingMetadataKey` type already auto-derives from const object — no extra work
- Update barrel export in `src/model/index.ts:76` — already exports `BILLING_METADATA_KEYS` via metadata.ts? **Check**: No, `src/model/index.ts` only exports from `../vocabulary/metadata.js` which exports `BILLING_METADATA_KEYS` — but only `MODEL_METADATA_KEYS` and `ModelMetadataKey` type. Need to add `BILLING_METADATA_KEYS` and `BillingMetadataKey` to model barrel.
- Add billing provenance chain cross-ecosystem vector: `vectors/cross-ecosystem/billing-provenance.json` — multi-event vector where `billing.payment_tx` → `billing.credit_lot_id` → `billing.cost_micro` trace through DomainEvent metadata
- Add metadata tests for new keys

**S6-T4: Decision trail $comment annotations** (Low fix)
- File: `src/schemas/model/ensemble/ensemble-strategy.ts:6` — add `$comment` linking to RFC #31
- File: `src/schemas/model/routing/provider-type.ts:7` — add `$comment` linking to RFC #31
- These propagate to JSON Schema output automatically via TypeBox spread

---

### Sprint 7: Multi-Model Dialogue Protocol

**S7-T1: Extend EnsembleStrategy with `sequential` and `dialogue`**
- File: `src/schemas/model/ensemble/ensemble-strategy.ts`
- Add `Type.Literal('sequential')` and `Type.Literal('dialogue')` to the union
- `sequential`: Each model receives previous model's response (chain)
- `dialogue`: Each model receives previous model's response + thinking trace (debate)

**S7-T2: Add dialogue-specific fields to EnsembleRequest**
- File: `src/schemas/model/ensemble/ensemble-request.ts`
- Add optional fields:
  ```typescript
  dialogue_config: Type.Optional(Type.Object({
    max_rounds: Type.Integer({ minimum: 1, maximum: 10 }),
    pass_thinking_traces: Type.Boolean(),
    termination: Type.Union([
      Type.Literal('fixed_rounds'),
      Type.Literal('consensus_reached'),
      Type.Literal('no_new_insights'),
    ]),
    seed_prompt: Type.Optional(Type.String()),
  }))
  ```
- Update cross-field validator: `strategy === 'dialogue' => dialogue_config != null`
- Update constraint file `constraints/EnsembleRequest.constraints.json` with new constraint

**S7-T3: Add dialogue-specific fields to EnsembleResult**
- File: `src/schemas/model/ensemble/ensemble-result.ts`
- Add optional fields:
  ```typescript
  rounds: Type.Optional(Type.Array(
    Type.Object({
      round: Type.Integer({ minimum: 1 }),
      model: Type.String({ minLength: 1 }),
      response: CompletionResultSchema,
      thinking_trace: Type.Optional(Type.String()),
    })
  )),
  termination_reason: Type.Optional(Type.Union([
    Type.Literal('fixed_rounds'),
    Type.Literal('consensus_reached'),
    Type.Literal('no_new_insights'),
    Type.Literal('timeout'),
    Type.Literal('budget_exhausted'),
  ])),
  ```
- Update cross-field validator: `strategy === 'dialogue' => rounds != null && rounds.length > 0`
- Add constraint for rounds cost conservation: total_cost_micro >= sum of all round costs

**S7-T4: Dialogue cross-ecosystem vectors**
- File: `vectors/cross-ecosystem/ensemble-dialogue.json`
- Create test vectors:
  - `dialogue-001`: 2-round Claude→GPT dialogue with thinking traces
  - `dialogue-002`: 3-round consensus-termination dialogue
  - `dialogue-003`: Budget-exhausted early termination

**S7-T5: Round-trip tests for dialogue constraints**
- Update `tests/constraints/round-trip.test.ts` with EnsembleRequest dialogue config constraint tests
- Update `tests/constraints/round-trip.test.ts` with EnsembleResult rounds constraint tests
- Existing ensemble tests remain unchanged (backward compatible)

---

### Sprint 8: Constraint Evolution + Agent-Authored Constraints

**S8-T1: Grammar v2.0 — Temporal operators**
- File: `src/constraints/grammar.ts`
  - Bump `EXPRESSION_VERSION` to `'2.0'`
  - Add token support for new built-in functions: `changed()`, `previous()`, `delta()`
  - Grammar additions (PEG):
    ```
    TemporalCall  ← 'changed' LPAREN FieldPath RPAREN
                   / 'previous' LPAREN FieldPath RPAREN
                   / 'delta' LPAREN FieldPath RPAREN
    ```
  - `changed(field)`: Returns true if field value differs between `_previous` and current context
  - `previous(field)`: Returns the value of field from `_previous` context
  - `delta(field)`: Returns numeric difference `current - previous` (BigInt-aware)
  - These require a `_previous` key in the evaluation data context (provided by saga/workflow consumers)
- File: `src/constraints/evaluator.ts`
  - Add `changed()`, `previous()`, `delta()` built-in function evaluation
  - `changed(path)`: `resolve(data, path) !== resolve(data._previous, path)`
  - `previous(path)`: `resolve(data._previous, path)` (where `_previous` is a nested data context)
  - `delta(path)`: `BigInt(resolve(data, path)) - BigInt(resolve(data._previous, path))`
- File: `constraints/GRAMMAR.md` — update PEG grammar spec for v2.0

**S8-T2: Temporal constraint files**
- Create `constraints/SagaContext.constraints.json` with temporal constraints:
  - `saga-step-monotonic`: `_previous == null || changed(step) => delta(step) > 0 || direction == 'compensation'`
  - `saga-direction-valid-transition`: `_previous == null || !changed(direction) || (previous(direction) == 'forward' && direction == 'compensation')`
- These demonstrate the grammar extension and connect to existing saga vectors

**S8-T3: Expression version compatibility in constraint loading**
- File: `src/constraints/types.ts` — add `expressionVersionSupported(version: string): boolean` utility
- Logic: version `1.x` expressions work in v2.0 evaluator (backward compatible), `2.x` expressions require v2.0+ evaluator
- Add version check to `evaluateConstraintDetailed()` in `src/constraints/detailed-evaluator.ts`

**S8-T4: Agent-authored constraint proposal schema**
- New file: `src/schemas/model/constraint-proposal.ts`
  ```typescript
  export const ConstraintProposalSchema = Type.Object({
    proposal_id: Type.String({ format: 'uuid' }),
    agent_id: Type.String({ minLength: 1 }),
    target_schema_id: Type.String({ minLength: 1 }),
    proposed_constraints: Type.Array(Type.Object({
      id: Type.String({ minLength: 1, pattern: '^[a-z][a-z0-9-]*$' }),
      expression: Type.String({ minLength: 1 }),
      severity: Type.Union([Type.Literal('error'), Type.Literal('warning')]),
      message: Type.String({ minLength: 1 }),
      fields: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    }), { minItems: 1 }),
    rationale: Type.String({ minLength: 1 }),
    expression_version: Type.String({ pattern: '^\\d+\\.\\d+$' }),
    review_status: Type.Optional(Type.Union([
      Type.Literal('proposed'),
      Type.Literal('under_review'),
      Type.Literal('accepted'),
      Type.Literal('rejected'),
    ])),
    review_scores: Type.Optional(Type.Array(Type.Object({
      reviewer_model: Type.String({ minLength: 1 }),
      score: Type.Integer({ minimum: 0, maximum: 1000 }),
      rationale: Type.Optional(Type.String()),
    }))),
    consensus_category: Type.Optional(Type.Union([
      Type.Literal('HIGH_CONSENSUS'),
      Type.Literal('DISPUTED'),
      Type.Literal('LOW_VALUE'),
      Type.Literal('BLOCKER'),
    ])),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  }, {
    $id: 'ConstraintProposal',
    additionalProperties: false,
    'x-cross-field-validated': true,
  });
  ```
- Register cross-field validator: `review_status === 'accepted' => consensus_category == 'HIGH_CONSENSUS'`
- Create constraint file: `constraints/ConstraintProposal.constraints.json`
- Add to model barrel, validator registry, schema generation, and JSON schema output

**S8-T5: Temporal operator round-trip tests**
- Add tests in `tests/constraints/round-trip.test.ts` for SagaContext temporal constraints
- Test `changed()`, `previous()`, `delta()` with `_previous` data context
- Grammar fuzz tests updated for v2.0 tokens

**S8-T6: ConstraintProposal tests and vectors**
- Unit tests for the ConstraintProposal schema and cross-field validator
- Cross-ecosystem vector: `vectors/cross-ecosystem/constraint-proposal.json`
- Round-trip test for ConstraintProposal constraints

**S8-T7: Regenerate all JSON schemas and update README**
- Run `scripts/generate-schemas.ts` — now produces 48+ schemas (new: constraint-proposal)
- Update `schemas/README.md` (auto-generated)

---

## Critical Files Summary

| File | Changes |
|------|---------|
| `src/schemas/model/completion-request.ts` | Add `session_id` |
| `src/schemas/model/ensemble/ensemble-strategy.ts` | Add `sequential`, `dialogue` |
| `src/schemas/model/ensemble/ensemble-request.ts` | Add `dialogue_config` |
| `src/schemas/model/ensemble/ensemble-result.ts` | Add `rounds`, `termination_reason` |
| `src/schemas/model/constraint-proposal.ts` | **NEW** — agent-authored constraint schema |
| `src/vocabulary/metadata.ts` | Add `PAYMENT_TX`, `CREDIT_LOT_ID` |
| `src/constraints/grammar.ts` | Bump to v2.0, add temporal tokens |
| `src/constraints/evaluator.ts` | Add `changed()`, `previous()`, `delta()` |
| `src/constraints/types.ts` | Add `expressionVersionSupported()` |
| `src/constraints/detailed-evaluator.ts` | Add version check |
| `constraints/GRAMMAR.md` | Update PEG spec to v2.0 |
| `src/validators/index.ts` | New validators + updated ensemble validators |
| `src/model/index.ts` | Export new types + billing keys |
| `constraints/EnsembleResult.constraints.json` | Add cost sum constraint |
| `constraints/EnsembleRequest.constraints.json` | Add dialogue config constraint |
| `constraints/CompletionRequest.constraints.json` | Add session_id constraint |
| `constraints/SagaContext.constraints.json` | **NEW** — temporal constraints |
| `constraints/ConstraintProposal.constraints.json` | **NEW** |
| `scripts/generate-schemas.ts` | Add new schema imports |
| `tests/constraints/round-trip.test.ts` | New test sections |
| `vectors/cross-ecosystem/billing-provenance.json` | **NEW** |
| `vectors/cross-ecosystem/ensemble-dialogue.json` | **NEW** |
| `vectors/cross-ecosystem/constraint-proposal.json` | **NEW** |

## Key Design Decisions

1. **`bigint_sum` dot-path extension**: Instead of a new function, extend form 2 to resolve nested field paths via the existing `resolve()` helper. Backward compatible — flat keys still work.

2. **Temporal operators via `_previous` context**: Rather than building saga-aware infrastructure into the evaluator, temporal operators read from a `_previous` key in the data context. Consumers (saga orchestrators) populate `_previous` with the prior state. This keeps the evaluator pure and stateless.

3. **Dialogue vs Sequential**: Two strategies, not one. `sequential` is a simple chain (output→input), `dialogue` adds thinking trace passing and multi-round termination logic. Both are additive — existing strategies unchanged.

4. **ConstraintProposal as schema, not runtime**: The proposal schema captures the *data contract* for agent-authored constraints. The actual Flatline Protocol review pipeline is a runtime concern — this PR provides the wire format that the pipeline operates on.

5. **Expression version backward compatibility**: v2.0 evaluator runs v1.0 expressions unchanged. Only new temporal functions require v2.0. The `expressionVersionSupported()` utility lets consumers gate acceptance.

## Verification

```bash
# 1. Run full test suite
npm test

# 2. Regenerate JSON schemas
npx tsx scripts/generate-schemas.ts

# 3. Verify schema count increased (was 47, expect 48+)
ls schemas/*.schema.json | wc -l

# 4. Verify constraint files parse
npx tsx -e "
  import { validateExpression } from './src/constraints/grammar.js';
  import { readFileSync, readdirSync } from 'fs';
  const files = readdirSync('constraints').filter(f => f.endsWith('.json'));
  for (const f of files) {
    const data = JSON.parse(readFileSync('constraints/' + f, 'utf-8'));
    for (const c of data.constraints) {
      const r = validateExpression(c.expression);
      if (!r.valid) console.error(f, c.id, r.error);
    }
  }
  console.log('All constraint expressions valid');
"

# 5. Verify no regressions in existing 1,322 tests
npm test -- --reporter=verbose 2>&1 | tail -5
```
