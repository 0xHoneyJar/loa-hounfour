# Open Questions for @deep-name — Agent Memory & Commitment Schemas

**Status:** DRAFT — these questions block implementation.
**Date:** 2026-04-27
**Reviewer:** @deep-name

These are the specific decisions blocking any move from this draft packet into a draft PR or implementation branch. Each question lists the proposal's current best guess and the reason it requires reviewer authority.

---

## Q1 — Variant vs. separate schema for memory kinds

**Question:** Should `MemorySummary`, `MemoryReflection`, and `MemorySkill` be:
- **(A)** discriminator variants of a single `MemoryArtifact` schema with a `kind` field, or
- **(B)** separate top-level schemas, each `extends`ing a `MemoryArtifactBase`?

**Proposal's guess:** (A) for v1.

**Why I cannot decide alone:** This is the single largest shape decision. It cascades into how many constraint files exist, whether the storage layer dispatches on a union or a single type, and whether kind-specific invariants live in one constraint or many. Reversing the choice later costs a MAJOR.

---

## Q2 — Is `ValidationRecord` needed at all?

**Question:** The product-context report names `ValidationRecord` as a candidate schema (§24.4). Today, Hounfour has:
- `ReputationEvent` (`src/governance/reputation-event.ts`)
- `proposal-outcome-event.ts`
- `delegation-outcome.ts` / `delegation-quality.ts`
- `quality-observation.ts`
- The forthcoming `model_performance` ReputationEvent variant in v9.0.0 RFC §1.1.

**Proposal's guess:** `ValidationRecord` is **already covered** by the existing reputation/governance event surface. It should NOT be added.

**Why I cannot decide alone:** The v9.0.0 RFC author may have a specific use case in mind that requires a distinct shape. If so, this RFC must coordinate with that one.

---

## Q3 — Module placement

**Question:** Where should the new schemas live?
- **(A)** `src/memory/` — new module barrel; new export `@0xhoneyjar/loa-hounfour/memory`.
- **(B)** `src/integrity/` — extends existing integrity primitives.
- **(C)** `src/core/` — agent-memory is core agent state.
- **(D)** `src/commons/` — alongside `chain-bound-hash`, `audit-trail`, `governed-reputation`.

**Proposal's guess:** (A) — clearest naming, matches the report's framing, parallels the established `core / economy / governance / integrity` pattern.

**Why I cannot decide alone:** A new top-level export is a permanent commitment. @deep-name has historical context on which existing modules are converging vs. growing.

---

## Q4 — Independent v8.4.0 or bundle into v9.0.0?

**Question:** Should this RFC land independently as v8.4.0 (additive MINOR), or bundle into the in-flight v9.0.0 cross-repo-extraction RFC?

**Proposal's guess:** Independent v8.4.0. The shadow-mode rollout for memory commitments does not depend on any v9.0.0 cohort change.

**Why I cannot decide alone:** Release ergonomics — @deep-name knows whether downstream repos prefer one big cutover or a sequence of MINORs. Also: if v9.0.0 §1.1 (`model_performance` ReputationEvent) ends up referencing `MemoryCommitment.commitment_id`, bundling becomes more attractive.

---

## Q5 — Constraint evaluator builtin reuse

**Question:** Do the following validators already exist as evaluator builtins, or do they need to be added?
- CAIP-2 chain-id syntax validator.
- Per-scheme storage URI validator (IPFS CIDv0/v1, `ar://`, `ceramic://`, etc.).
- ISO-8601 timestamp comparator (for `produced_at <= committed_at`).
- Cross-object digest equality assertion.

**Proposal's guess:** ISO-8601 comparators almost certainly exist (the AuditTimestamp surface implies them). CAIP-2 and per-scheme URI validators likely do NOT exist. Cross-object digest equality is a new pattern — but the constraint DSL supports cross-field constraints today, so this should be expressible without a new builtin.

**Why I cannot decide alone:** I would need to enumerate `src/constraints/evaluator.ts` and `constraints/GRAMMAR.md` exhaustively. Faster for @deep-name to confirm directly. Adding a new builtin is a MINOR by playbook §9; adding the wrong number of them is wasted work.

---

## Q6 — `BridgeTransferSaga` composition

**Question:** When a memory commitment accompanies an asset transfer (e.g., daemon NFT transfer carries memory pointer transfer), should `ChainCommitment` participate in the `BridgeTransferSaga` event timeline, or remain orthogonal?

**Proposal's guess:** orthogonal at v1. Cross-saga composition is best deferred to a separate RFC once the basic `MemoryCommitment` surface is stable.

**Why I cannot decide alone:** Bridge sagas have specific event-ordering and idempotency semantics. Coupling memory commitments into them prematurely could break either invariant. @deep-name has the saga-design context.

---

## Q7 — Should `MemoryArtifact.kind` be a closed enum or open string?

**Question:** `MemoryArtifact.kind` currently proposed as a closed enum of six values. Should it be:
- **(A)** closed enum — strict, additions are MINOR.
- **(B)** open string with documented well-known values — forward-compatible, additions are PATCH.

**Proposal's guess:** (A) for v1, per playbook §9.1 (security-sensitive surfaces stay strict).

**Why I cannot decide alone:** Some Hounfour event envelopes elsewhere use open strings (e.g., for plugin extensibility). @deep-name knows the house style.

---

## Q8 — `additionalProperties: false` everywhere?

**Question:** Should all four candidate schemas set `additionalProperties: false`?

**Proposal's guess:** Yes, per playbook §9.1.

**Why I cannot decide alone:** Some schemas in the existing surface relax this for forward compatibility. @deep-name knows which.

---

## Q9 — Naming: `ChainCommitment` vs. `ExternalChainAnchor`

**Question:** The name `ChainCommitment` risks confusion with the existing `ChainBoundHash` (which is intra-audit hash chaining, not external anchoring). Alternatives:
- `ChainCommitment` (proposal default)
- `ExternalChainAnchor`
- `OnChainAnchor`
- `ChainAnchor`

**Proposal's guess:** `ChainCommitment` — matches the report's naming.

**Why I cannot decide alone:** @deep-name has historical naming context. Worth getting right before the schema is exported, since renaming after publish is MAJOR.

---

## Q10 — Do we need a draft PR at all?

**Question:** Per playbook §0.7, unapproved Hounfour work is normally a `[DRAFT][PROTOCOL PROPOSAL]` PR. Given the size of this packet and the number of open questions, should:
- **(A)** Open a draft PR now with these planning artifacts, request @deep-name review there.
- **(B)** Stop at this packet, request @deep-name review on the issue (loa-hounfour#57), defer the draft PR until questions Q1–Q9 are resolved.

**Proposal's guess:** (B) — fewer questions answered means a noisier draft PR.

**Why I cannot decide alone:** @deep-name's review preferences. If issue-level review is sufficient, Option (B). If a PR-shaped artifact is easier to review, Option (A).

---

## How to respond

@deep-name: please reply on loa-hounfour#57 with answers (or counter-proposals) to Q1–Q10. The author will update this packet in-place and re-request review. No implementation work begins until all ten are resolved.
