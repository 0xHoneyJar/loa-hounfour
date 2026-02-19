<!-- docs-version: 7.0.0 -->

# Sprint Plan — Documentation Overhaul: Grounded Truth for v7.0.0

**Cycle:** cycle-018
**PRD:** docs/requirements/prd.md
**Version:** v7.0.1 (documentation-only, non-breaking)
**Source:** [#15 — [DOCS] improving documentation](https://github.com/0xHoneyJar/loa-hounfour/issues/15)
**Date:** 2026-02-19

---

## Sprint 1: Documentation Overhaul (Global ID: 71)

**Goal:** Bring all documentation into alignment with v7.0.0 codebase reality.

### Ground Truth (verified 2026-02-19)

| Metric | Value | Source |
|--------|-------|--------|
| CONTRACT_VERSION | 7.0.0 | `src/version.ts:13` |
| MIN_SUPPORTED_VERSION | 6.0.0 | `src/version.ts:14` |
| package.json version | 7.0.0 | `package.json:3` |
| Schema files | 53 | `ls src/schemas/**/*.ts` |
| Module barrels | 9 | `ls src/*/index.ts` |
| Package exports | 10 | `package.json exports field` |
| Constraint files | 40 | `ls constraints/` (39 .json + 1 GRAMMAR.md) |
| Tests | 3,908 | `npm run test` |

---

### S1-T1: README Rewrite — Grounded in Truth (FR-1)

**What:** Complete rewrite of `README.md` with abstract value proposition, accurate inventory, usage examples, and version tag.

**Acceptance Criteria:**
- [ ] Version tag at top: "Documentation current as of v7.0.0"
- [ ] Zero references to `1.0.0` as current version
- [ ] Abstract value prop: what, who, why, competitors, what we DON'T do
- [ ] Schema count matches source (53 schema files across 9 modules)
- [ ] Test count matches `npm run test` (3,908)
- [ ] Constraint count matches `constraints/` (40 files)
- [ ] Module listing from `src/*/index.ts` (9 modules)
- [ ] Package exports from `package.json` (10 export paths)
- [ ] Usage examples: import patterns, validation, constraint evaluation, cross-language JSON Schema
- [ ] loa-finn and arrakis as reference consumers, not entire framing
- [ ] "What we don't do" section present
- [ ] Every numeric claim cites `file:line` or verifiable command

### S1-T2: Fix Stale Version References (FR-2)

**What:** Update MIGRATION.md and SECURITY.md to reflect v7.0.0 reality.

**Targets:**
- `MIGRATION.md:110-139` — Duplicate version matrix from v5.1.0 era (stale — v7.0.0 matrix is at top)
- `SECURITY.md:5-9` — Supported versions show v0.2.x and v0.1.x

**Acceptance Criteria:**
- [ ] MIGRATION.md stale v5.1.0 version matrix and consumer upgrade matrix removed (v7.0.0 matrix at line 110 is the correct one)
- [ ] SECURITY.md supported versions: 7.x supported, 6.x supported, <6.0 unsupported
- [ ] `grep -n '0\.2\|0\.1\.x' SECURITY.md` returns zero hits in version context

### S1-T3: SCHEMA-CHANGELOG Catch-Up (FR-3)

**What:** Add entries for v4.0.0 through v7.0.0 to SCHEMA-CHANGELOG.md following existing per-schema format.

**Source material:** MIGRATION.md entries + CHANGELOG.md + actual schema files in `src/`.

**Key additions:**
- v7.0.0: BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, PermissionBoundary, GovernanceProposal, typed constraint AST
- v6.0.0: LivenessProperty, CapabilityScopedTrust, RegistryBridge, DelegationTree, SchemaGraph, 23 evaluator builtins
- v5.5.0: Conservation invariants (14 LTL-formalized), JwsBoundarySpec, branded arithmetic, AgentIdentity with trust levels
- v5.4.0: DelegationChain, InterAgentTransactionAudit, EnsembleCapabilityProfile, GovernanceConfig sandbox
- v5.3.0: EpistemicTristate, ConstraintProposal, conformance surface
- v5.2.0: Agent rights schemas, capacity reservations, audit trail
- v5.1.0: ModelProviderSpec, ConformanceLevel, ConformanceVector, SanctionSeverity, ReconciliationMode, ProviderSummary
- v5.0.0: CompletionRequest/Result, ModelCapabilities, Ensemble*, Routing*, ProviderType, constraint grammar
- v4.4.0: EscrowEntry, StakePosition, CommonsDividend, MutualCredit
- v4.3.0: ReputationScore
- v4.2.0: Sanction, DisputeRecord, ValidatedOutcome
- v4.1.0: PerformanceRecord, ContributionRecord
- v4.0.0: Signed MicroUSD default, envelope relaxation, routing constraints

**Acceptance Criteria:**
- [ ] Entries for every version from v4.0.0 through v7.0.0
- [ ] Every schema in `src/schemas/` represented somewhere in the changelog
- [ ] Entries include version introduced, breaking changes if any

### S1-T4: Remove/Replace Framework Boilerplate (FR-4)

**What:**
1. Replace CONTRIBUTING.md with protocol-specific contribution guide
2. Delete docs/MAINTAINER_GUIDE.md (Loa framework doc, not protocol-related)

**Acceptance Criteria:**
- [ ] CONTRIBUTING.md references TypeScript, TypeBox, vitest — not Loa skills
- [ ] CONTRIBUTING.md explains: how to add a schema, how to add constraints, test requirements
- [ ] No references to "Template Repository" or `.claude/skills/`
- [ ] docs/MAINTAINER_GUIDE.md removed

### S1-T5: Relocate Obsolete Docs (FR-5)

**What:** `git mv V4-PLANNING.md docs/history/v4-planning.md`

**Acceptance Criteria:**
- [ ] Top level contains no planning docs from previous versions
- [ ] V4-PLANNING.md accessible at docs/history/v4-planning.md

### S1-T6: BUTTERFREEZONE Regeneration (FR-6)

**What:** Regenerate BUTTERFREEZONE.md to reflect post-lean-residency structure.

**Acceptance Criteria:**
- [ ] BUTTERFREEZONE reflects current directory structure
- [ ] No references to grimoires/loa/ (migrated to docs/)
- [ ] Module map accurate for v7.0.0 (9 modules, 53 schemas, 40 constraint files)
- [ ] AGENT-CONTEXT metadata blocks current

### S1-T7: Version-Tag All Docs (FR-7)

**What:** Add `<!-- docs-version: 7.0.0 -->` to every documentation file.

**Targets:** All .md files in docs/ and top-level that are documentation.

**Acceptance Criteria:**
- [ ] Every .md doc file has version tag
- [ ] Version tags match the content they describe

### S1-T8: Verify & Commit

**What:** Final verification pass and commit.

**Acceptance Criteria:**
- [ ] `pnpm run build` passes (no source changes)
- [ ] `pnpm run test` passes (3,908 tests)
- [ ] Zero references to `1.0.0` as current version in any .md file
- [ ] All version tags present

---

## Task Dependencies

```
S1-T1 (README)           → independent
S1-T2 (Stale versions)   → independent
S1-T3 (SCHEMA-CHANGELOG) → independent
S1-T4 (Boilerplate)      → independent
S1-T5 (Relocate)         → independent
S1-T6 (BUTTERFREEZONE)   → depends on T1-T5 (needs final structure)
S1-T7 (Version tags)     → depends on T1-T6 (tag final content)
S1-T8 (Verify)           → depends on all
```

Tasks T1-T5 can run in parallel. T6 needs T1-T5 done. T7 needs T6 done. T8 is the final gate.
