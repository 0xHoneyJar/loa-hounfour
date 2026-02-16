# Sprint Plan: Bridgebuilder Field Report #37 — Polish & Merge

**Status:** Draft
**Cycle:** cycle-013 (continued)
**Source:** [Bridgebuilder Field Report #37](https://github.com/0xHoneyJar/loa-hounfour/pull/12#issuecomment-3910553974)
**Branch:** `feature/v5.0.0-multi-model`
**Goal:** Implement ALL findings from the Bridgebuilder review, regardless of severity level, then prepare PR #12 for merge.

---

## Overview

| Metric | Value |
|--------|-------|
| Sprints | 2 |
| Total Tasks | 8 |
| Findings Addressed | 5 actionable findings (+ 3 praises, 1 observation) |
| Version | Remains 5.4.0 (pre-merge polish, no bump needed) |
| Backward Compatibility | 100% — all 2,469 existing tests unchanged |

### Findings to Task Mapping

| Finding # | Severity | Description | Task |
|-----------|----------|-------------|------|
| 4 | INFO | conservation_check tristate asymmetry | S1-T2 |
| 5 | INFO | Model identifiers as plain strings | S1-T3 |
| 6 | LOW | mission_alignment as free-text | S1-T4 |
| 8 | INFO | Evaluator parsePrimary 15+ functions | S2-T1, S2-T2 |
| 9 | INFO | revocation_policy not constraint-enforced | S1-T1 |

---

## Sprint 1: Constraint Completeness & Schema Hardening

**Goal:** Close all constraint gaps and harden schema types identified by the Bridgebuilder review.

### S1-T1: DelegationChain Revocation Policy Constraint

**Finding:** #9 — `revocation_policy` field declared but not enforced by constraints.

**Description:** Add a constraint to `constraints/DelegationChain.constraints.json` that validates revocation semantics: if the chain status is `revoked` and `revocation_policy` is `cascade`, then all link outcomes must be `failed` or the chain status itself expresses the revocation. Since runtime revocation isn't implemented yet, add a lighter consistency constraint: if status is `revoked`, revocation_policy must be present.

**Acceptance Criteria:**
- New constraint `delegation-chain-revocation-requires-policy` in `DelegationChain.constraints.json`
- Expression: `status != 'revoked' || revocation_policy != null`
- Severity: error
- Message: "Revoked chain must declare a revocation_policy"
- Total DelegationChain constraints: 7
- All existing tests still pass
- 2+ new tests covering: revoked chain with policy (pass), revoked chain without policy (fail)

**Testing:** Extend `tests/constraints/delegation-chain-constraints.test.ts`

---

### S1-T2: InterAgentTransactionAudit Conservation Tristate Completeness

**Finding:** #4 — `violated` and `unverifiable` states have no constraints.

**Description:** Add constraints that give semantic meaning to the `violated` and `unverifiable` conservation states. When `conservation_check == 'violated'`, the balances should demonstrably NOT conserve (otherwise why claim violation?). When `conservation_check == 'unverifiable'`, no balance conservation assertion is made (already the case), but add an advisory constraint noting the epistemological gap.

**Acceptance Criteria:**
- New constraint `transaction-audit-violated-means-violated` (severity: error)
  - Expression: when conservation_check is 'violated', at least one of sender or receiver conservation must fail
  - This prevents falsely claiming violation when balances actually conserve
- New constraint `transaction-audit-unverifiable-advisory` (severity: warning)
  - Expression: advisory when conservation_check is 'unverifiable' AND both balance checks pass (could be marked conserved instead)
  - Message: "Transaction passes conservation checks but is marked unverifiable — consider upgrading to 'conserved'"
- Total InterAgentTransactionAudit constraints: 7
- All existing tests still pass
- 4+ new tests: violated-with-real-violation (pass), violated-but-balances-conserve (fail), unverifiable-with-passing-checks (warning), unverifiable-with-failing-checks (pass)

**Testing:** Extend `tests/constraints/inter-agent-transaction-audit-constraints.test.ts`

---

### S1-T3: EnsembleCapabilityProfile Model Identifier Format

**Finding:** #5 — Model identifiers as plain strings, no format constraint.

**Description:** Add a `pattern` constraint to model identifiers in EnsembleCapabilityProfile to enforce a minimum structure. Use a lightweight pattern: identifiers must be lowercase alphanumeric with hyphens and optional `/` separator for namespacing (e.g., `openai/gpt-4`, `anthropic/claude-opus`, `local-model-1`). This matches the `model-provider-spec` naming convention already in the index.

**Acceptance Criteria:**
- Update `models` array items in `EnsembleCapabilityProfileSchema` to include pattern: `^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)?$`
- Update `individual_capabilities` record key to use the same pattern constraint
- All existing conformance vectors still pass (update any that use uppercase model names)
- 3+ new tests: valid namespaced identifier, valid simple identifier, invalid identifier with spaces or uppercase

**Testing:** Extend `tests/schemas/ensemble-capability-profile.test.ts`

---

### S1-T4: GovernanceConfig Mission Alignment Structured Type

**Finding:** #6 — `mission_alignment` as free-text string.

**Description:** Replace the free-text `mission_alignment` with a structured `MissionAlignmentSchema` that has a `statement` (the text), a `category` (enum of broad alignment categories), and an optional `url` for reference. Keep the change backward-compatible by making all fields optional except `statement`.

**Acceptance Criteria:**
- New `MissionAlignmentSchema` with:
  - `statement: Type.String({ minLength: 1 })` (the mission text)
  - `category: Type.Optional(Type.Union([...]))` — enum: 'research' | 'commerce' | 'public_good' | 'education' | 'infrastructure'
  - `url: Type.Optional(Type.String({ format: 'uri' }))` (reference URL)
- `mission_alignment` field type changed from `Type.Optional(Type.String())` to `Type.Optional(MissionAlignmentSchema)`
- Type export: `MissionAlignment`
- All existing GovernanceConfig tests updated if needed
- 4+ new tests: valid with full fields, valid with statement only, invalid with empty statement, valid without mission_alignment (backward compat)

**Testing:** Extend `tests/schemas/governance-config.test.ts`

---

## Sprint 2: Evaluator Registry & Merge Preparation

**Goal:** Refactor the evaluator to a function registry pattern and prepare the PR for merge.

### S2-T1: Evaluator Function Registry Architecture

**Finding:** #8 — parsePrimary at 15+ functions in an if-chain, consider registry pattern.

**Description:** Refactor `src/constraints/evaluator.ts` to use a `Map<string, FunctionHandler>` registry instead of the current if-chain in `parsePrimary`. Each built-in function becomes a registered handler. The registry is populated at module initialization. This is a pure refactor — no behavior changes.

**Acceptance Criteria:**
- New type: `type FunctionHandler = (parser: ParserContext) => unknown`
- New `FUNCTION_REGISTRY: Map<string, FunctionHandler>` initialized with all 15+ handlers
- `parsePrimary` reduces to: check registry, call handler if found, fall through to field path
- All existing evaluator tests pass unchanged (zero behavior change)
- `MAX_EXPRESSION_DEPTH` preserved
- Each handler is a named function (not anonymous) for stack trace readability
- Registry is frozen after initialization (Object.freeze or readonly Map)

**Testing:** All existing tests in `tests/constraints/` pass unchanged. Add `tests/constraints/evaluator-registry.test.ts` with:
- Registry contains expected function names
- Unknown function names fall through to field path resolution
- Registry cannot be mutated after initialization

---

### S2-T2: Evaluator Registry Tests & Documentation

**Description:** Verify the evaluator refactor via comprehensive round-trip testing and add inline documentation.

**Acceptance Criteria:**
- All 2,469+ existing tests pass (the ultimate refactor safety net)
- JSDoc on FUNCTION_REGISTRY explaining extension pattern
- JSDoc on FunctionHandler type
- Each registered handler has a one-line JSDoc
- `npm run typecheck` passes

**Testing:** Full test suite run

---

### S2-T3: Merge Preparation

**Description:** Final checks, test suite verification, and PR update for merge readiness.

**Acceptance Criteria:**
- Full test suite passes (`npm run test`)
- TypeScript type check passes (`npm run typecheck`)
- `BUTTERFREEZONE.md` updated with final schema/test counts
- `schemas/index.json` schema count still accurate (63)
- No untracked files that should be committed
- PR #12 description updated if needed to reflect polish sprint
- PR marked ready for review (remove draft status)

**Testing:** Full test suite + manual verification

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| MissionAlignmentSchema is breaking for existing consumers | Medium | The field was Optional before and remains Optional — only the inner type changes. Consumers not using mission_alignment are unaffected. |
| Evaluator registry refactor introduces subtle behavior change | High | 2,469 existing tests act as comprehensive regression net. Zero behavior change is the acceptance criterion. |
| Model identifier pattern rejects existing valid identifiers | Low | Pattern is permissive (lowercase alphanumeric + hyphen + dot + underscore + optional namespace). Update any vectors that don't match. |
| conservation_check violated constraint is too strict | Medium | The constraint only fires when conservation_check == 'violated' — existing 'conserved' and 'unverifiable' paths unchanged. |

---

## Dependencies

```
Sprint 1 ─── Sprint 2
  S1-T1        S2-T1 (evaluator refactor independent of S1 constraints
  S1-T2         but should run after to include new constraint expressions
  S1-T3         in the registry)
  S1-T4        S2-T2 (verification)
               S2-T3 (merge prep — runs last)
```

Sprint 2 depends on Sprint 1 completion for the final test count and constraint coverage.
