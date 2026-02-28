# PRD: Hounfour v9 Cross-Repo Extraction — Dixie's Contribution

**Version**: 17.0.0
**Date**: 2026-02-28
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-017
**Status**: Approved
**Predecessor**: cycle-016 PRD v16.1.0 (Staging Deployment — Docker Build Fix)

> Sources: hounfour PR #39 (RFC: v9 Cross-Repo Extraction), loa-finn #66 (Launch Readiness RFC),
> loa-dixie #45 (Propose-Learning patterns L-021 through L-026), loa-dixie #57 (hounfour dependency
> update — closed by PR #58), Bridgebuilder reviews across cycles 001–016 (112 sprints, 25+ bridge
> iterations), finn cycle-037 PRD (posted on hounfour #39)

---

## 1. Problem Statement

Hounfour PR #39 identifies 21 extraction candidates across loa-finn, loa-dixie, and loa-freeside
for upstream consolidation into hounfour v9. Finn has already posted their full PRD for cycle-037
addressing all 6 P0 items from their perspective. Dixie needs to contribute its own perspective:
which patterns Dixie has matured through 16 cycles (112 sprints) of production development, which
ones are ready for extraction, and what migration work Dixie will need when hounfour v9 lands.

### Why This Matters

Dixie has independently developed several patterns that are now production-proven across multiple
implementations (the "three-witness" standard). Without upstream extraction:
- Each repo reinvents these patterns independently (divergence risk)
- Protocol conformance validation requires comparing local implementations manually
- Breaking changes in one repo's pattern don't propagate to others
- New repos joining the ecosystem must discover and reimplement from scratch

### What Dixie Brings to the Table

Through 16 development cycles, Dixie has:
- **3 production witnesses** for the GovernedResource pattern (ReputationService, ScoringPathTracker, KnowledgeGovernor)
- **EMA feedback dampening** preventing autopoietic loop oscillation (invented in cycle-007, production since)
- **Chain-bound hashing** with TOCTOU prevention and genesis race safeguards
- **Dual-track audit trails** with cross-chain verification (Certificate Transparency parallel)
- **Governance mutation attribution** with actor type discrimination (human/system/autonomous)
- **5-tier conviction-gated access** based on Ostrom's commons principles

---

## 2. Dixie's Response to the 21 RFC Extraction Candidates

### P0 Items (6 — must-have before closed main)

#### P0-1: Model Performance Feedback Loop (hounfour#38)
**Dixie status**: CONSUMER + CONTRIBUTOR
- Dixie imports `ModelPerformanceEvent`, `QualityObservation` from hounfour/governance (v8.2.0)
- Dixie ADDS: EMA feedback dampening layer (`computeDampenedScore()`) preventing oscillation
- **Contribution**: Export EMA constants + `computeDampenedScore()` to hounfour/governance
- **Evidence**: `app/src/services/reputation-scoring-engine.ts` — 5 tuning constants, pure function
- **Extraction complexity**: TRIVIAL (pure math, zero external deps)

#### P0-2: GovernedResource\<T\> Protocol Verification
**Dixie status**: PRIMARY CONTRIBUTOR — strongest evidence of the isomorphism
- Dixie has **3 production witnesses** proving the pattern:
  1. `ReputationService` implements GovernedResource\<ReputationState, ReputationEvent, ReputationInvariant\>
  2. `ScoringPathTracker` implements GovernedResource\<ScoringPath, ScoringPathEvent, ScoringPathInvariant\>
  3. `KnowledgeGovernor` implements GovernedResource\<KnowledgeState, KnowledgeEvent, KnowledgeInvariant\>
- Full TypeScript interface + `GovernedResourceBase` abstract class at `app/src/services/governed-resource.ts`
- ADR-015 ("The Kubernetes CRD Moment") documents the isomorphism proof with Ostrom mapping
- INV-008 declares the invariant formally
- **Contribution**: Export `GovernedResource<T>` interface + `GovernedResourceBase` + ADR-015
- **Extraction complexity**: MODERATE (needs TypeBox schemas, documentation)

#### P0-3: Audit Trail Genesis Hash + Domain Separation
**Dixie status**: CONSUMER + EXTENSION
- Imports `AUDIT_TRAIL_GENESIS_HASH`, `computeAuditEntryHash()`, verification functions from hounfour
- ADDS: chain-bound hashing (`entryHash = sha256(contentHash + ":" + previousHash)`)
- ADDS: `hash_domain_tag` (resource_type + contract_version) for domain separation
- ADDS: TOCTOU prevention via `FOR UPDATE` serialization
- ADDS: genesis race prevention via `UNIQUE(resource_type, previous_hash)` constraint
- **Contribution**: Export `computeChainBoundHash()`, TOCTOU pattern docs, genesis race pattern
- **Evidence**: `app/src/services/audit-trail-store.ts`, ADR (dual-track hash chain)
- **Extraction complexity**: MODERATE (pattern documentation + safety utilities)

#### P0-4: x402 Payment Schema Verification
**Dixie status**: CONSUMER (no extension to contribute)
- Dixie's payment integration uses hounfour x402 schemas as-is
- No local extensions that warrant extraction
- **Contribution**: None — defer to freeside

#### P0-5: Economic Boundary Evaluation Gaps
**Dixie status**: CONSUMER + THIN WRAPPER
- Imports `evaluateEconomicBoundary()` from hounfour
- Wraps with conviction tier context mapping
- The 7 semantic gaps identified by freeside don't affect Dixie's usage
- **Contribution**: Validate freeside's gap analysis from Dixie's perspective (confirm which gaps are real)

#### P0-6: Proper Git Tag / Release
**Dixie status**: AFFECTED — actively consuming via commit pin
- Currently pinned: `github:0xHoneyJar/loa-hounfour#b6e0027a`
- Would benefit enormously from proper semver releases
- PR #58 (this cycle) fixed the `file:` → `github:` migration
- **Contribution**: Confirm readiness to consume semver tags, validate npm registry publish works

---

### P1 Items — Dixie Perspective (9 items)

#### P1-7: DynamicContract Monotonic Expansion
**Dixie status**: CONSUMER — imports `verifyMonotonicExpansion()` from hounfour
- Uses for capability ratchet enforcement in governance
- No local extensions to contribute
- **Contribution**: Consumer validation (confirm API works for governance use case)

#### P1-8: Reputation Type Barrel
**Dixie status**: CONSUMER — already uses hounfour's canonical types
- `app/src/types/reputation-evolution.ts` re-exports from hounfour
- **Contribution**: Confirm barrel structure works for BFF consumption pattern

#### P1-9: Conservation Law Factories
**Dixie status**: CONSUMER — imports factory functions
- Uses for economic conservation validation
- **Contribution**: Consumer validation

#### P1-10: Feedback Dampening (DIXIE ORIGIN)
**Dixie status**: PRIMARY CONTRIBUTOR — Dixie invented this pattern
- EMA alpha ramp: `ALPHA_MIN=0.1` → `ALPHA_MAX=0.5` over `RAMP_SAMPLES=50`
- `computeDampenedScore(oldScore, newScore, sampleCount)` — pure function
- Prevents runaway feedback in autopoietic loop (Nyquist stability criterion)
- Bayesian pseudo-count prior (`DEFAULT_PSEUDO_COUNT=10`)
- **Contribution**: Full function + constants + unit tests
- **Evidence**: Bridgebuilder Finding F1 (cycle-007), production since cycle-007
- **Extraction complexity**: TRIVIAL

#### P1-11: Governance Mutation Attribution
**Dixie status**: CONTRIBUTOR
- Actor type discrimination: `human | system | autonomous`
- `resolveActorId(type, identifier)` — factory function
- `MutationLog` — session-scoped append-only log
- **Contribution**: Actor type enum + resolveActorId() + MutationLog interface
- **Question**: Should actor types be library convention or protocol-level schema?

#### P1-12 through P1-15: (Finn/Freeside-primary items)
**Dixie status**: Consumer or N/A — defer to finn/freeside for these

---

### P2 Items — Dixie Perspective (6 items)

#### P2-16: EvaluationGap (Zone of Proximal Development)
**Dixie status**: PROPOSER — ADR-004 defines the pattern
- Novel: Vygotsky's ZPD applied to agent governance denial responses
- When admission denied, response includes what the agent needs to achieve
- **Contribution**: Type definition + ADR-004 + example implementation
- **Status**: PROPOSED (needs ecosystem validation before extraction)

#### P2-17: Conviction-Gated Access (Ostrom's Commons)
**Dixie status**: PRIMARY IMPLEMENTOR
- 5-tier model with capability maps
- BGT-coupled thresholds (may need abstraction for non-THJ use)
- **Contribution**: Tier model + capabilities pattern (abstracting from BGT specifics)
- **Status**: Production but ecosystem-specific — Tier 3 extraction

#### P2-18 through P2-21: (Future patterns — design phase needed)

---

## 3. Dixie's Extraction Readiness by Tier

### TIER 1: READY NOW (v9.0.0 candidates) — 3 patterns

| # | Pattern | Source File | Scope | Complexity | Dependencies |
|---|---------|------------|-------|-----------|--------------|
| 1 | **GovernedResource\<T\>** | `governed-resource.ts` | Interface + abstract base + ADR-015 | Moderate | TypeBox |
| 2 | **EMA Feedback Dampening** | `reputation-scoring-engine.ts` | 5 constants + `computeDampenedScore()` | Trivial | None |
| 3 | **Chain-Bound Hash** | `audit-trail-store.ts` | Hash function + TOCTOU/genesis docs | Moderate | `computeAuditEntryHash()` |

**Evidence standard**: Each Tier 1 pattern has:
- Production usage across multiple cycles
- Unit test coverage
- At least one ADR or Bridgebuilder finding documenting the rationale
- No external dependencies beyond hounfour itself

**Estimated effort**: ~2 sprints to extract and validate

### TIER 2: VALIDATE FIRST (v9.1.0 candidates) — 4 patterns

| # | Pattern | Source File | Question to Resolve |
|---|---------|------------|---------------------|
| 4 | **Governance Mutation Attribution** | `governance-mutation.ts` | Library convention vs protocol-level? |
| 5 | **Audit Trail Persistence Adapter** | `audit-trail-store.ts` | Core library vs adapter pattern? |
| 6 | **ReputationStore Interface** | `reputation-service.ts` | How much persistence in core? |
| 7 | **Dual-Track State Management** | `scoring-path-tracker.ts` | Generalizable to other systems? |

**Estimated effort**: ~4-6 sprints (includes validation)

### TIER 3: DESIGN PHASE (v10+ candidates) — 3 patterns

| # | Pattern | Status | Blocker |
|---|---------|--------|---------|
| 8 | **EvaluationGap (ZPD)** | ADR-004 proposed | Needs ecosystem validation |
| 9 | **Conviction-Gated Access** | Production but BGT-coupled | Needs abstraction layer |
| 10 | **Autonomy Governance** | Production (SovereigntyEngine) | Dixie-specific or general? |

---

## 4. Migration Plan — When Hounfour v9 Lands

### Phase A: Pin Update (immediate)
1. Update `package.json` from `github:0xHoneyJar/loa-hounfour#b6e0027a` to `@0xhoneyjar/loa-hounfour@9.0.0`
2. Run `npm install` to update lockfile
3. Verify all existing imports resolve

### Phase B: Consume Extracted Patterns (1 sprint)
1. Replace local `GovernedResource` with hounfour export
2. Replace local `computeDampenedScore()` with hounfour export
3. Replace local chain-bound hash utilities with hounfour exports
4. Run full test suite — expect zero behavior changes

### Phase C: Remove Local Duplicates (1 sprint)
1. Delete local implementations superseded by hounfour
2. Update ADRs to reference hounfour as canonical source
3. Update type barrels to re-export from new hounfour paths

### Phase D: Bridge Review (automatic)
1. Run bridge to validate no regressions
2. Bridgebuilder verifies protocol conformance against v9 schema

---

## 5. Cross-Repo Coordination Points

### With Finn (cycle-037)
- Finn addresses P0-1 (model performance loop) from inference perspective
- Dixie addresses P0-1 from reputation/dampening perspective
- **Coordination**: EMA dampening should compose with finn's scoring pipeline
- **Risk**: If finn changes scoring schema, Dixie's dampening input may need adaptation

### With Freeside
- Freeside addresses P0-4 (x402 schemas) and P0-5 (economic boundary gaps)
- Dixie is a consumer of both — no conflict expected
- **Coordination**: Validate freeside's gap analysis doesn't break Dixie's thin wrapper

### With Hounfour (upstream)
- Dixie contributes Tier 1 patterns as PRs to hounfour
- Hounfour decides placement (governance/, commons/, or new subpackage)
- **Risk**: Hounfour may want different TypeBox schema structure than Dixie uses
- **Mitigation**: Adapter pattern — Dixie wraps whatever hounfour exports

---

## 6. Success Criteria

| Criterion | Metric |
|-----------|--------|
| Tier 1 patterns extracted to hounfour | 3/3 merged |
| Dixie migration to v9 completes | Zero test failures |
| Local duplicate code removed | >200 lines deleted |
| ADRs updated with upstream references | 3 ADRs revised |
| Cross-repo conformance passes | Bridgebuilder score < flatline threshold |
| npm registry publish verified | `npm install @0xhoneyjar/loa-hounfour@9.0.0` works |

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| GovernedResource interface too rigid for other repos | HIGH | LOW | Three-witness proof validates abstraction |
| EMA constants tuned to Dixie's workload | MEDIUM | MEDIUM | Export as configurable, document tuning methodology |
| Chain-bound hash adds complexity for simple use cases | MEDIUM | LOW | Export as opt-in pattern, not required |
| v9 breaks existing imports | HIGH | MEDIUM | Maintain v8 compatibility layer during transition |
| Hounfour version decision (v8.3.0 vs v9.0.0) affects timeline | LOW | HIGH | Dixie's contributions are additive — work either way |

---

## 8. Versioning Recommendation

Based on Dixie's analysis:
- **GovernedResource\<T\>**: NEW EXPORT — additive, non-breaking → supports v8.3.0
- **EMA Feedback Dampening**: NEW EXPORT — additive, non-breaking → supports v8.3.0
- **Chain-Bound Hash**: NEW EXPORT — additive, non-breaking → supports v8.3.0
- **Git tag/release infrastructure**: Prerequisite for any version → P0

**Recommendation**: v8.3.0 MINOR release for Tier 1 extractions. Reserve v9.0.0 for
Tier 2+ patterns that may require reorganizing the module structure (governance/ vs commons/ split).

This aligns with the RFC's own criteria: "v9.0.0 MAJOR if breaking, v8.3.0 MINOR if additive-only."
All Dixie Tier 1 contributions are purely additive.

---

## 9. References

| Reference | URL/Path |
|-----------|----------|
| Hounfour PR #39 (RFC) | `https://github.com/0xHoneyJar/loa-hounfour/pull/39` |
| Finn #66 (Launch Readiness) | `https://github.com/0xHoneyJar/loa-finn/issues/66` |
| Dixie #45 (Propose-Learning) | `https://github.com/0xHoneyJar/loa-dixie/issues/45` |
| Dixie #57 (Dependency Update) | `https://github.com/0xHoneyJar/loa-dixie/issues/57` |
| Dixie PR #58 (Docker Build Fix) | `https://github.com/0xHoneyJar/loa-dixie/pull/58` |
| ADR-015 GovernedResource | `grimoires/loa/context/adr-governed-resource.md` |
| ADR Dual-Track Hash Chain | `grimoires/loa/context/adr-dual-track-hash-chain.md` |
| ADR-004 EvaluationGap | `docs/adr/004-governance-denial-response.md` |
| GovernedResource source | `app/src/services/governed-resource.ts` |
| EMA Dampening source | `app/src/services/reputation-scoring-engine.ts` |
| Chain-Bound Hash source | `app/src/services/audit-trail-store.ts` |
| Mutation Attribution source | `app/src/services/governance-mutation.ts` |
