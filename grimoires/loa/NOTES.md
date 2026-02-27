# Project Notes

## Current Focus
- **Task:** v8.3.0 pre-launch protocol hardening (7 FRs, 29 ACs)
- **Status:** PRD drafted, awaiting dixie/freeside feedback on PR #39
- **Blockers:** None — finn feedback received, dixie/freeside feedback pending but non-blocking
- **Next Action:** /architect → SDD for v8.3.0 implementation

## Session Log
- 2026-02-27: Created RFC PR #39 (21 extraction candidates from cross-repo staging)
- 2026-02-27: Received finn cycle-037 PRD as PR #39 comment
- 2026-02-27: Drafted hounfour v8.3.0 PRD (7 FRs, all additive, no breaking changes)
- 2026-02-27: Enabled flatline protocol (Opus + GPT-5.3-codex + Gemini 2.5 Pro)
- 2026-02-27: Enabled run mode, run bridge, beads, visions in .loa.config.yaml
- 2026-02-27: Updated model-permissions.yaml (GPT-5.2 → GPT-5.3-codex)

## Decisions
- **D-001:** Version will be v8.3.0 (MINOR) — all 7 FRs are additive-only, no breaking changes
- **D-002:** x402 schemas added to economy module (not new module) — follows existing pattern
- **D-003:** Conditional constraints use optional `condition` field — all existing constraints remain valid
- **D-004:** GovernedResource<T> runtime changes deferred — v8.0.0 schema sufficient for launch

## Blockers
- [ ] Dixie feedback on PR #39 (requested, not received)
- [ ] Freeside feedback on PR #39 (requested, not received)

## Learnings
- L-001: All three repos independently discovered the governance isomorphism (GovernedResource<T> pattern) — validation that the v8.0.0 commons protocol design was correct
- L-002: model_performance (Issue #38) was already fully resolved in v8.2.0 — finn can implement against existing schema without protocol changes
- L-003: x402 payment schemas are the biggest gap — billing/escrow exist but HTTP payment flow types do not

## Observations
- Finn's PRD is exceptionally well-structured — 24 acceptance criteria, each traceable to hounfour P0 items
- Dixie and freeside are still consolidating v8.2.0 adoption (Docker build fixes, CI pipeline rehab)
- The consumer-driven contract pattern (freeside's contract.json) should be standardized across all consumers
