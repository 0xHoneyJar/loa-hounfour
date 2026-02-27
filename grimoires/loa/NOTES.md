# Project Notes

## Current Focus
- **Task:** v8.3.0 pre-launch protocol hardening (8 FRs, 36 ACs)
- **Status:** PRD updated with finn + dixie feedback, awaiting freeside feedback on PR #39
- **Blockers:** None — finn + dixie feedback received, freeside expected soon
- **Next Action:** Integrate freeside feedback → /architect → SDD for v8.3.0 implementation

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

## Decisions
- **D-001:** Version will be v8.3.0 (MINOR) — all 8 FRs are additive-only, no breaking changes (confirmed by finn + dixie)
- **D-002:** x402 schemas added to economy module (not new module) — follows existing pattern
- **D-003:** Conditional constraints use optional `condition` field — all existing constraints remain valid
- **D-004:** ~~GovernedResource<T> runtime changes deferred~~ → **REVISED**: GovernedResource<T> runtime interface IN SCOPE (FR-8) — dixie provides 3 production witnesses validating the abstraction. Interface + abstract base class are additive exports.
- **D-005:** EMA feedback dampening constants exported as configurable defaults — consumers can tune via FeedbackDampeningConfigSchema
- **D-006:** Chain-bound hash (`computeChainBoundHash()`) is opt-in — existing `computeAuditEntryHash()` remains for simple use cases
- **D-007:** Dixie Tier 2/3 patterns deferred to v8.4.0 or v9.0.0 — need design decisions first

## Blockers
- [x] Finn feedback on PR #39 — RECEIVED (cycle-037 PRD)
- [x] Dixie feedback on PR #39 — RECEIVED (cycle-017 PRD, 3 Tier 1 patterns)
- [ ] Freeside feedback on PR #39 (requested, expected soon)

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

## Observations
- Finn's PRD is exceptionally well-structured — 24 acceptance criteria, each traceable to hounfour P0 items
- Dixie's PRD contributes runtime interfaces that complement finn's schema-level consumption — different layers, no conflict
- Both finn and dixie independently recommend v8.3.0 MINOR — strong consensus on additive-only approach
- The consumer-driven contract pattern (freeside's contract.json) should be standardized across all consumers
- Dixie's Tier 2 items raise good design questions (library convention vs protocol-level for actor types) — defer to post-launch
