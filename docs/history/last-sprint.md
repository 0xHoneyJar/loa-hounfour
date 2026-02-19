# Sprint Plan: v7.0.0 Stabilization — Pre-Merge Hygiene

**Status:** Draft
**Cycle:** cycle-016 (continued)
**Source:** [PR #14 — Bridgebuilder Reviews I–VIII](https://github.com/0xHoneyJar/loa-hounfour/pull/14)
**Branch:** `feature/v5.0.0-multi-model`
**Goal:** Resolve all remaining pre-merge issues to deliver a stable v7.0.0 for downstream consumption. Zero actionable code findings remain — this is build hygiene, consumer documentation, and deferred LOW findings.

---

## Overview

| Metric | Value |
|--------|-------|
| Sprints | 2 |
| Total Tasks | 13 |
| Current State | 3,902 tests passing, 153 files, 31 builtins, 3 TypeScript errors |
| Target State | 0 TypeScript errors, all barrels wired, CHANGELOG + MIGRATION complete |
| Risk Level | Low — all changes are additive or corrective, no architectural work |

### Issue Source Mapping

| Issue | Source | Severity | Sprint |
|-------|--------|----------|--------|
| 3 TypeScript errors in `signature.ts` | Build output | P0 | Sprint 1 |
| Stale test description strings (26/29 → 31) | Bridge Review VI | P1 | Sprint 1 |
| Composition barrel not in top-level exports | Bridge Review VIII | P1 | Sprint 1 |
| Composition barrel missing v7.0.0 types | Code audit | P1 | Sprint 1 |
| F-009: Property test missing budget assertion | Bridge v6.0.0 iter 1 | LOW | Sprint 1 |
| CHANGELOG.md stale (stuck at v1.1.0) | Bridge Review VIII | P1 | Sprint 2 |
| No MIGRATION.md for breaking changes | Bridge Review VIII | P1 | Sprint 2 |
| No conformance vector consumer docs | Bridge Review VIII | LOW | Sprint 2 |
| F-010: MintingPolicy single-constraint gap | Bridge v6.0.0 iter 1 | LOW | Sprint 2 |

### Inter-Sprint Gates

| Gate | Condition |
|------|-----------|
| **Green Suite** | All 3,902+ tests pass |
| **Type Check Clean** | `tsc --noEmit` produces 0 errors |
| **Schema Check** | `npm run schema:check` passes |
| **Constraint Validation** | `npm run check:constraints` passes |

---

## Sprint 1: Build Hygiene & Type Safety (P0)

**Goal:** Achieve a clean `tsc --noEmit` build, fix all stale test metadata, wire all barrels correctly, and close the last deferred property test gap.

**Global Sprint ID:** 68
**Depends on:** Nothing (all v7.0.0 feature work complete)
**Estimated New Tests:** ~5

### S1-T1: Fix `jose` Import Types in `signature.ts`

**Source:** `tsc --noEmit` errors (lines 43, 113)
**File:** `src/utilities/signature.ts`

**Description:** The `jose` v6 library restructured its exports. `jose.KeyLike` is no longer accessible as a namespace member. Import `KeyLike` as a named type import instead.

**Acceptance Criteria:**
- `import type { KeyLike } from 'jose'` (or equivalent correct import) replaces `jose.KeyLike`
- Both `KeyResolver` type (line 43) and `key` variable (line 113) use the correct type
- `tsc --noEmit` produces no errors for these two locations
- Existing signature tests continue to pass

### S1-T2: Fix `canonicalize` Import in `signature.ts`

**Source:** `tsc --noEmit` error (line 56)
**File:** `src/utilities/signature.ts`

**Description:** The `canonicalize` package's default export doesn't match the expected call signature under the current TypeScript module resolution. Fix the import to use the correct ESM import pattern for the `canonicalize` package.

**Acceptance Criteria:**
- `canonicalize(rest)` call compiles without error
- `tsc --noEmit` produces no errors for line 56
- `canonicalizeProviderSpec()` function continues to work correctly
- Existing signature tests continue to pass

### S1-T3: Update Stale Test Description Strings

**Source:** Bridge Review VI audit
**Files:** 5 test files with 9 stale `it('...')` description strings

**Description:** Test assertion values were updated from 26/29 → 31 when builtins were added, but the human-readable `it()` description strings were not updated. Fix all 9 occurrences across 5 files.

**Acceptance Criteria:**
- `tests/constraints/tree-builtins.test.ts` — 2 descriptions updated (26 → 31)
- `tests/constraints/coordination-builtins.test.ts` — 2 descriptions updated (26 → 31)
- `tests/constraints/governance-builtins.test.ts` — 2 descriptions updated (29 → 31)
- `tests/constraints/evaluator-spec.test.ts` — 1 description updated (26 → 31)
- `tests/constraints/constraint-ast-node.test.ts` — 2 descriptions updated (26 → 31)
- All 3,902 tests continue to pass

### S1-T4: Wire Composition Barrel into Top-Level Exports

**Source:** Bridge Review VIII, code audit
**File:** `src/index.ts`

**Description:** `src/composition/index.ts` exists as a well-structured barrel but is not re-exported from `src/index.ts`. This means `import { RegistryBridgeSchema } from '@0xhoneyjar/loa-hounfour'` works (via economy barrel) but the composition sub-package is invisible from the main entry point. Add the re-export.

**Acceptance Criteria:**
- `src/index.ts` includes `export * from './composition/index.js'`
- No duplicate export conflicts (composition barrel re-exports a subset of economy + governance)
- NOTE: If duplicate exports arise, use explicit named re-export to avoid conflicts
- `tsc --noEmit` clean after addition

### S1-T5: Extend Composition Barrel with v7.0.0 Types

**Source:** SDD §1.3 — Subpath Exports
**File:** `src/composition/index.ts`

**Description:** The composition barrel was created in v6.0.0 and includes registry bridges, minting policies, and delegation trees. v7.0.0 added saga, outcome, permission, and proposal types that are cross-domain composition primitives. Extend the barrel.

**Acceptance Criteria:**
- BridgeTransferSaga types re-exported from economy domain
- DelegationOutcome types re-exported from governance domain
- PermissionBoundary types re-exported from governance domain
- GovernanceProposal types re-exported from governance domain
- MonetaryPolicy types re-exported from economy domain
- No import cycle introduced
- `tsc --noEmit` clean

### S1-T6: F-009 — Property Test Budget Preservation Assertion

**Source:** Bridge v6.0.0 iteration 1, deferred LOW finding
**File:** `tests/governance/delegation-tree.test.ts` (or nearest property test file)

**Description:** The property test for delegation tree roundtrip (`chainToTree → treeToChain`) validates structural integrity but does not assert budget preservation across the roundtrip. Add a `budget_allocated_micro` conservation check.

**Acceptance Criteria:**
- Property test asserts that sum of child budgets is preserved through roundtrip
- At least 1 new test case
- All existing tests pass

### S1-T7: Verify Clean Build

**Source:** Gate requirement
**Commands:** `tsc --noEmit`, `vitest run`

**Description:** After all Sprint 1 tasks, verify the build is completely clean.

**Acceptance Criteria:**
- `tsc --noEmit` exits 0 with no errors
- All tests pass (3,902+)
- No new warnings introduced

---

## Sprint 2: Consumer Documentation & Release Readiness (P1)

**Goal:** Ensure downstream consumers (arrakis, loa-finn) can adopt v7.0.0 with full understanding of breaking changes, migration paths, and how to use conformance vectors. Close the last deferred constraint gap.

**Global Sprint ID:** 69
**Depends on:** Sprint 1 (clean build)
**Estimated New Tests:** ~3

### S2-T1: Update CHANGELOG.md

**Source:** Bridge Review VIII
**File:** `CHANGELOG.md`

**Description:** CHANGELOG.md is stuck at v1.1.0 (from Feb 13). It needs entries for v5.5.0 (Conservation-Aware), v6.0.0 (Composition-Aware), and v7.0.0 (Coordination-Aware). Use conventional changelog format with Added/Changed/Fixed/Breaking sections.

**Acceptance Criteria:**
- `## [7.0.0]` section with all v7.0.0 additions (16 new schemas, 8 new builtins, saga/outcome/permission/proposal)
- `## [6.0.0]` section with composition primitives (registry bridges, delegation trees, constraint type system, schema graph)
- `## [5.5.0]` section with conservation foundation (branded types, JWT boundary, evaluator specs, agent identity)
- Breaking changes clearly marked in each section
- Source references to PR #14 and relevant issues

### S2-T2: Create MIGRATION.md

**Source:** Bridge Review VIII, SDD §6
**File:** `MIGRATION.md`

**Description:** No migration guide exists for the v5.5.0 → v7.0.0 breaking changes. Downstream consumers need step-by-step instructions for:
- `trust_level` → `trust_scopes` migration (v6.0.0)
- `RegistryBridge` + required `transfer_protocol` field (v7.0.0)
- New constraint file schema additions
- Evaluator builtin count changes (23 → 31)

**Acceptance Criteria:**
- Clear before/after code examples for each breaking change
- `trust_level` → `trust_scopes` migration with TypeScript code snippet
- `RegistryBridge.transfer_protocol` addition with minimal valid example
- Version-by-version migration path (v5.4.0 → v5.5.0 → v6.0.0 → v7.0.0)
- Links to relevant SDD sections and PR #14 for context

### S2-T3: Add Conformance Vector Consumer README

**Source:** Bridge Review VIII
**File:** `vectors/conformance/README.md`

**Description:** The `vectors/conformance/` directory contains 21 subdirectories with JSON test vectors but no documentation explaining how to use them. Cross-language consumers (Python, Go, Rust) need to understand the vector format, validation approach, and how to write a conformance runner.

**Acceptance Criteria:**
- Vector format documented (JSON structure, field semantics)
- Example of running vectors in TypeScript (reference to existing `test:vectors` script)
- Example schema for a cross-language runner (pseudocode or schema)
- List of all 21 vector categories with brief description
- Instructions for adding new vectors

### S2-T4: F-010 — MintingPolicy Constraint Strengthening

**Source:** Bridge v6.0.0 iteration 1, deferred LOW finding
**File:** `constraints/MintingPolicy.constraints.json`

**Description:** MintingPolicy constraints file has only one constraint. MonetaryPolicy (v7.0.0) partially addresses this by coupling minting to conservation, but MintingPolicy itself should validate that `max_supply_micro` is non-negative and that `policy_id` follows the expected pattern.

**Acceptance Criteria:**
- At least 1 additional constraint added to `MintingPolicy.constraints.json`
- Constraint validates `max_supply_micro` is a valid non-negative BigInt string
- Constraint file passes `check:constraints` validation
- Tests verify the new constraint evaluates correctly

### S2-T5: Pre-Merge Verification Suite

**Source:** Gate requirement
**Commands:** All check scripts

**Description:** Run the complete verification suite to confirm merge readiness.

**Acceptance Criteria:**
- `npm run typecheck` — 0 errors
- `npm run test` — all pass
- `npm run schema:check` — all pass
- `npm run vectors:check` — all pass
- `npm run check:constraints` — all pass (or document known limitations)
- `npm run check:all` — clean exit

### S2-T6: Update PR #14 Description for Merge

**Source:** Final step
**Target:** PR #14 body

**Description:** Update the PR description with a comprehensive summary of everything delivered across v5.5.0 → v7.0.0, including test counts, schema counts, builtin counts, and a link to MIGRATION.md for reviewers.

**Acceptance Criteria:**
- PR body includes version summary table (v5.5.0, v6.0.0, v7.0.0)
- Test count (3,900+), schema count (92+), builtin count (31)
- Link to MIGRATION.md for breaking change review
- Bridge iteration summary (flatline achieved at iteration 2)
- Ready for merge approval
