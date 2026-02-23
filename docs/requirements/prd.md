# PRD: Documentation Overhaul — Grounded Truth for v7.0.0

**Status:** Draft
**Author:** Human (issue #15) + Claude (audit + synthesis)
**Date:** 2026-02-19
**Cycle:** cycle-018
**Version:** v7.0.1 (non-breaking — documentation only)
**Source:** [#15 — [DOCS] improving documentation](https://github.com/0xHoneyJar/loa-hounfour/issues/15)

---

## 0. The Problem

> "The README describes a v1.0.0 library with 5 schemas and 90 tests. The reality is a v7.0.0 protocol with 87+ schemas, 3,908 tests, a constraint DSL, governance layer, and formal invariants."

The documentation is frozen at the project's origin point. A developer discovering hounfour today would see a small integration shim between two internal services — not the coordination-aware protocol library it has become across 16 development cycles.

Specific failures (all grounded in file reads):

| Finding | File | Evidence |
|---------|------|----------|
| VERSION shows `1.0.0` | `README.md:63` | `CONTRACT_VERSION` listed as `1.0.0` |
| Only 5 schemas listed | `README.md:24-31` | Missing 82+ schemas (economy, governance, constraints, etc.) |
| "90 tests" claim | `README.md:175` | Actually 3,908 (`npm run test` output) |
| Framed only as arrakis/loa-finn glue | `README.md:3-5` | No abstract value prop for external consumers |
| MIGRATION.md says v5.1.0 is current | `MIGRATION.md:110-114` | package.json shows 7.0.0 |
| SECURITY.md says v0.2.x supported | `SECURITY.md:5-9` | 35 major versions behind |
| SCHEMA-CHANGELOG stops at v3.2.0 | `SCHEMA-CHANGELOG.md:9` | Missing v4.0-v7.0 entries |
| CONTRIBUTING.md says "Template Repository" | `CONTRIBUTING.md:2-9` | Loa framework boilerplate, not protocol-specific |
| docs/MAINTAINER_GUIDE.md is Loa framework doc | `docs/MAINTAINER_GUIDE.md:1-3` | About framework learning system, not protocol |
| V4-PLANNING.md at top level | `V4-PLANNING.md:2-4` | Obsolete planning doc from 4 versions ago |

## 1. Vision

**Documentation that is grounded in code truth.** Every claim has provenance. Every number is verified against the source. The README sells the protocol to ANY consumer — not just the two internal services that happened to be first.

From issue #15: *"the source of truth for changes should ofc be the code. but the changelog should be exhaustive and a good place to get highlevel overview of all changes."*

## 2. Goals

| Goal | Metric |
|------|--------|
| README reflects v7.0.0 reality | All numbers verifiable against source code |
| Abstract value proposition | README answers: what, who, why, competitors, what we DON'T do |
| All docs version-tagged | Every doc states which version it's current for |
| Stale docs fixed or removed | Zero files referencing pre-v7.0.0 as "current" |
| BUTTERFREEZONE current | Regenerated against latest codebase state |
| CHANGELOG exhaustive | Complete from v1.0.0 through v7.0.0 |

## 3. Functional Requirements

### FR-1: README Rewrite — Grounded in Truth

Complete rewrite of `README.md`. Must include:

**Identity & Value Prop (abstracted, not arrakis/loa-finn specific):**
- What problems does hounfour solve? (schema drift, protocol divergence, cross-language validation)
- Who is it for? (any service needing typed, validated AI coordination contracts)
- What makes it different? (TypeBox→JSON Schema dual output, constraint DSL, formal invariants)
- What do we NOT do? (no runtime, no transport, no model invocation — schemas only)
- loa-finn and arrakis as reference consumers, not the entire framing

**Accurate inventory (all numbers from code):**
- Schema count from `src/schemas/` + module barrel exports
- Module listing from `src/*/index.ts`
- Test count from `npm run test`
- Constraint file count from `constraints/`
- CONTRACT_VERSION and MIN_SUPPORTED_VERSION from `src/core/version.ts`
- Package exports from `package.json` exports field

**Usage examples:**
- Import patterns for each module
- Validation example
- Constraint evaluation example
- Cross-language JSON Schema usage

**Version tag:** State "Documentation current as of v7.0.0" at top.

**Provenance rule:** Every numeric claim must cite `file:line` in a comment or be derivable from a listed command.

**Acceptance Criteria:**
- [ ] Zero references to `1.0.0` as current version
- [ ] All schema/test counts match `npm run test` and source file counts
- [ ] Value proposition understandable without knowing arrakis or loa-finn
- [ ] "What we don't do" section present
- [ ] Version tag at top of file

### FR-2: Fix Stale Version References

| File | Fix |
|------|-----|
| `MIGRATION.md:110-114` | Update version matrix: current=7.0.0, min=6.0.0 |
| `MIGRATION.md:131-139` | Update consumer upgrade matrix for v7.0.0 |
| `SECURITY.md:5-9` | Update supported versions: 7.x, 6.x |

**Acceptance Criteria:**
- [ ] `grep -rn '0\.2\|1\.0\.0\|5\.1\.0' *.md` returns zero hits in version context

### FR-3: SCHEMA-CHANGELOG Catch-Up

Add entries for v4.0.0 through v7.0.0 following the existing per-schema format. Source material: `CHANGELOG.md` entries + actual schema files in `src/`.

Key additions:
- v7.0.0: BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, PermissionBoundary, GovernanceProposal
- v6.0.0: LivenessProperty, CapabilityScopedTrust, RegistryBridge, DelegationTree, SchemaGraph
- v5.x: AgentIdentity, ConservationInvariant, JwsBoundary, AuditTrailEntry, etc.
- v4.x: AgentEconomy schemas, governance layer, reputation system

**Acceptance Criteria:**
- [ ] Every schema in `src/schemas/` has an entry in SCHEMA-CHANGELOG
- [ ] Entries include version introduced, breaking changes if any

### FR-4: Remove/Replace Framework Boilerplate

| File | Action |
|------|--------|
| `CONTRIBUTING.md` | Replace with protocol-specific contribution guide (TypeScript conventions, how to add a schema, how to add constraints, test requirements) |
| `docs/MAINTAINER_GUIDE.md` | Delete (Loa framework doc, not protocol-related) |

**Acceptance Criteria:**
- [ ] CONTRIBUTING.md references TypeScript, TypeBox, vitest — not Loa skills
- [ ] No references to "Template Repository" or `.claude/skills/`
- [ ] docs/MAINTAINER_GUIDE.md removed

### FR-5: Relocate Obsolete Docs

| File | Action |
|------|--------|
| `V4-PLANNING.md` | `git mv` to `docs/history/v4-planning.md` |

**Acceptance Criteria:**
- [ ] Top level contains no planning docs from previous versions

### FR-6: BUTTERFREEZONE Regeneration

Regenerate `BUTTERFREEZONE.md` to reflect post-lean-residency structure (no .claude/ in tree, docs/ as primary knowledge location).

**Acceptance Criteria:**
- [ ] BUTTERFREEZONE reflects current directory structure
- [ ] No references to grimoires/loa/ (migrated to docs/)
- [ ] Module map accurate for v7.0.0

### FR-7: Version-Tag All Docs

Add a version tag to every documentation file:

```markdown
<!-- docs-version: 7.0.0 -->
```

This makes it mechanically verifiable which version each doc was last audited against.

**Acceptance Criteria:**
- [ ] Every .md file in docs/ and top-level has a version tag
- [ ] Version tags match the content they describe

## 4. Scope

### In Scope
- README.md rewrite
- MIGRATION.md, SECURITY.md version fixes
- SCHEMA-CHANGELOG.md catch-up (v4.0-v7.0)
- CONTRIBUTING.md rewrite
- V4-PLANNING.md relocation
- BUTTERFREEZONE.md regeneration
- docs/MAINTAINER_GUIDE.md removal
- Version tagging all docs

### Out of Scope
- Source code changes (zero)
- New schemas or features
- CHANGELOG.md (already current)
- SCHEMA-EVOLUTION.md (already evergreen)
- Package version bump (documentation-only changes)

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Claims become stale again | Version tags + "run `npm run test` to verify" pattern |
| README too long | Keep it scannable — tables over prose, link to docs/ for depth |
| Missing schema in SCHEMA-CHANGELOG | Cross-reference against `ls src/schemas/` during review |

## 6. Grounding Rule

**Every numeric claim in any documentation file must be verifiable via one of:**
1. Direct source file citation (`src/core/version.ts:3`)
2. A listed command (`npm run test` → "3,908 passing")
3. A file count command (`ls src/schemas/*.ts | wc -l`)

Claims that cannot be grounded must be marked with `<!-- unverified -->` for future audit.
