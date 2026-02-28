# Project Notes

## Current Focus
- **Task:** v8.3.0 pre-launch protocol hardening (8 FRs, 43 ACs)
- **Status:** v8.3.0 IMPLEMENTED and pushed to PR #39 — bridge-validated (2 iterations, flatline achieved)
- **Blockers:** None
- **Next Action:** Merge PR #39, tag v8.3.0 release

## Session Log
- 2026-02-27: Created RFC PR #39 (21 extraction candidates from cross-repo staging)
- 2026-02-27: Received finn cycle-037 PRD as PR #39 comment
- 2026-02-27: Drafted hounfour v8.3.0 PRD (7 FRs, all additive, no breaking changes)
- 2026-02-27: Enabled flatline protocol (Opus + GPT-5.3-codex + Gemini 2.5 Pro)
- 2026-02-27: Enabled run mode, run bridge, beads, visions in .loa.config.yaml
- 2026-02-27: Updated model-permissions.yaml (GPT-5.2 → GPT-5.3-codex)
- 2026-02-27: Received dixie cycle-017 PRD as PR #39 comment (3 Tier 1, 4 Tier 2, 3 Tier 3)
- 2026-02-27: Updated PRD to 8 FRs — added FR-8 (GovernedResource<T> runtime interface), updated FR-3 (EMA details), updated FR-5 (chain-bound hash)
- 2026-02-27: Revised D-004 — GovernedResource<T> runtime interface IN SCOPE (3-witness evidence from dixie)
- 2026-02-27: Researched deployment PRs across finn (5 PRs), dixie (5 PRs), freeside (5 PRs) for Bridgebuilder visions
- 2026-02-27: Captured 7 visions (V-001 through V-007) from cross-repo deployment Bridgebuilder reviews
- 2026-02-27: Updated PRD with deployment visions triage — 3 actionable for v8.3.0, 4 deferred
- 2026-02-28: Received freeside cycle-045 feedback as PR #39 comment (3 GovernedResource witnesses, 2 new extraction candidates)
- 2026-02-28: Updated PRD with freeside contributions — 6 total GovernedResource witnesses, `validateAuditTimestamp()`, `computeAdvisoryLockKey()`, `MutationContext` interface
- 2026-02-28: V-002 and V-003 promoted from visions to FR-5 ACs (freeside confirmed both independently)
- 2026-02-28: PRD now feature-complete — all 3 consumer repos have provided feedback, unanimous v8.3.0 MINOR consensus
- 2026-02-28: Started simstim workflow — preflight OK, discovery skipped (PRD exists)
- 2026-02-28: Flatline PRD skipped — model-adapter.sh path mismatch (PRD already validated by 3 consumer repos)
- 2026-02-28: Created SDD (grimoires/loa/sdd.md) — 8 new source files, 8 constraint files, 53 vectors, 4 sprints
- 2026-02-28: Flatline SDD skipped — same model-adapter.sh issue
- 2026-02-28: Created sprint plan (grimoires/loa/sprint.md) — 4 sprints, 25 tasks, 43 ACs
- 2026-02-28: Registered 4 sprints in ledger (global IDs 1-4)
- 2026-02-28: Created 29 beads (4 epics + 25 tasks) with sprint labels and dependencies
- 2026-02-28: Flatline sprint + beads loop skipped — same model-adapter.sh issue
- 2026-02-28: Fixed flatline orchestrator SCRIPT_DIR bug (context-isolation-lib.sh overwrote SCRIPT_DIR → MODEL_ADAPTER pointed to wrong path)
- 2026-02-28: Flatline PRD review completed — 90% agreement, 6 HIGH_CONSENSUS auto-integrated, 1 DISPUTED accepted, 5 BLOCKERS overridden
- 2026-02-28: Flatline SDD review completed — 100% agreement, 7 HIGH_CONSENSUS auto-integrated, 5 BLOCKERS (4 codex-applied, 4 addressed)
- 2026-02-28: Flatline sprint review completed — 90% agreement, 7 HIGH_CONSENSUS auto-integrated, 1 DISPUTED deferred, 6 BLOCKERS (3 codex-applied, 3 overridden)
- 2026-02-28: Key SDD improvements: typed ChainBoundHashError, injectable `now` for timestamps, two-layer address validation, single-writer contract on GovernedResourceBase, abstract audit hooks (onTransitionSuccess/onTransitionFailure), byte-level hash framing spec, MicroUSD maxLength:20, canonical contract checksum algorithm
- 2026-02-28: Flatline beads review completed — 3 HIGH_CONSENSUS (inter-epic deps, exit criteria, task ACs), 9 BLOCKERS overridden (expected pre-implementation state)
- 2026-02-28: All 4 flatline phases complete — ready for `/implement sprint-1`
- 2026-02-28: v8.3.0 fully implemented across 4 sprints (333 files, 7750+/1019-, 6620 tests)
- 2026-02-28: Bridge review completed — iteration 1 (16 findings), iteration 2 (9 fixed, 0 new), flatline achieved
- 2026-02-28: Committed and pushed to PR #39 (`feat(v8.3.0): pre-launch protocol hardening — 8 FRs, bridge-validated`)
- 2026-02-28: Posted deep Bridgebuilder architectural review to PR #39 (2 comments — Ostrom mapping, v8.4.0 priorities)
- 2026-02-28: Reviewed freeside PR #39 comment (issuecomment-3975042767) — already fully incorporated in PRD
- 2026-02-28: Captured freeside governance substrate PRD (cycle-043) to context — 10 FRs, 78+ symbols, protocol barrel pattern
- 2026-02-28: Updated PRD status to "Implemented" with §9 Implementation Status + forward-looking v8.4.0 inputs
- 2026-02-28: v8.3.0 ready to merge and tag

## Decisions
- **D-001:** Version will be v8.3.0 (MINOR) — all 8 FRs are additive-only, no breaking changes (confirmed by all 3 consumer repos)
- **D-002:** x402 schemas added to economy module (not new module) — follows existing pattern
- **D-003:** Conditional constraints use optional `condition` field — all existing constraints remain valid
- **D-004:** ~~GovernedResource<T> runtime changes deferred~~ → **REVISED**: GovernedResource<T> runtime interface IN SCOPE (FR-8) — dixie provides 3 production witnesses validating the abstraction. Interface + abstract base class are additive exports.
- **D-005:** EMA feedback dampening constants exported as configurable defaults — consumers can tune via FeedbackDampeningConfigSchema
- **D-006:** Chain-bound hash (`computeChainBoundHash()`) is opt-in — existing `computeAuditEntryHash()` remains for simple use cases
- **D-007:** Dixie Tier 2/3 patterns deferred to v8.4.0 or v9.0.0 — need design decisions first
- **D-008:** GovernedResourceBase gets `MutationContext` as generic parameter — freeside's CreditMutationContext validates the pattern
- **D-009:** `validateAuditTimestamp()` and `computeAdvisoryLockKey()` extracted to hounfour — both independently validated by dixie + freeside
- **D-010:** Fail-closed default convention deferred — document as protocol guidance post-launch
- **D-011:** Deployment group orchestration deferred — cross-service health check schema for post-launch

## Blockers
- [x] Finn feedback on PR #39 — RECEIVED (cycle-037 PRD)
- [x] Dixie feedback on PR #39 — RECEIVED (cycle-017 PRD, 3 Tier 1 patterns)
- [x] Freeside feedback on PR #39 — RECEIVED (cycle-045, 3 GovernedResource witnesses, 2 new extraction candidates)

## Learnings
- L-001: All three repos independently discovered the governance isomorphism (GovernedResource<T> pattern) — validation that the v8.0.0 commons protocol design was correct
- L-002: model_performance (Issue #38) was already fully resolved in v8.2.0 — finn can implement against existing schema without protocol changes
- L-003: x402 payment schemas are the biggest gap — billing/escrow exist but HTTP payment flow types do not
- L-004: Dixie's GovernedResource<T> has 3 production witnesses (ReputationService, ScoringPathTracker, KnowledgeGovernor) — this crosses the "three-witness" threshold for upstream extraction
- L-005: EMA dampening is TRIVIAL extraction — pure math, zero external deps, production-proven since dixie cycle-007
- L-006: Chain-bound hashing extends (not replaces) existing audit trail infrastructure — backward compatible by design
- L-007: Bridgebuilder independently identified the "five-repo conservation stack" across finn PR #108, dixie PR #8 — each repo conserves a distinct quantity (Trust, Money, Governance, Law, Agency)
- L-008: Advisory lock 32-bit hashCode() birthday paradox flagged by BOTH dixie and freeside independently — phantom contention at O(10K) domain tags
- L-009: Timestamp validation at audit I/O boundary is a HIGH severity gap — once invalid timestamps enter the hash chain, they're permanently embedded (chain immutability)
- L-010: Finn's graduation protocol and hounfour's `computeDecayedConfidence()` are in tension — permanent vs temporal trust models need reconciliation post-launch
- L-011: GovernedResource<T> now has 6 production witnesses across 2 repos (dixie: 3, freeside: 3) — the pattern is definitively stable
- L-012: Freeside's CreditMutationContext validates the need for a `MutationContext` generic parameter on GovernedResourceBase — every governed resource needs typed mutation context
- L-013: Broken commit pin (`addb0bf` → `b6e0027a`) caused 70% of freeside's CI failures — strongest possible argument for formal semver releases (FR-7)

## Observations
- Finn's PRD is exceptionally well-structured — 24 acceptance criteria, each traceable to hounfour P0 items
- Dixie's PRD contributes runtime interfaces that complement finn's schema-level consumption — different layers, no conflict
- Freeside's feedback closes the loop — production witnesses, new utility candidates, and operational evidence (broken pin → need for semver releases)
- **All 3 consumer repos independently recommend v8.3.0 MINOR** — unanimous consensus on additive-only approach
- The consumer-driven contract pattern (freeside's contract.json) should be standardized across all consumers
- Dixie's Tier 2 items raise good design questions (library convention vs protocol-level for actor types) — defer to post-launch
- Freeside proposes fail-closed as protocol convention and deployment group orchestration — both are valuable but defer to post-launch
- The 6-witness GovernedResource<T> evidence is the strongest validation of any pattern in the ecosystem — the isomorphism proof is now conclusive
