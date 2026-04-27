# Migration & Rollout Plan — Agent Memory & Commitment Schemas

**Status:** DRAFT — pending @deep-name review.
**Date:** 2026-04-27

Per playbook §13, this document describes the legacy → shadow → enforce rollout. The intent is that no downstream consumer breaks, and that Finn/Dixie/Freeside have time to adopt the new contract in shadow mode before enforcement.

## Phase 0 — Approval (this packet)

**State:** existing v8.3.1 surface; no schemas added.

**Goal:** @deep-name reviews this packet and answers the questions in `open-questions-for-deep-name.md`. Decision: proceed to Phase 1, revise, or stop.

**Exit criteria:**
- Existing-surface audit confirmed.
- Variant-vs-separate-schema decision made (Q1).
- `ValidationRecord` necessity decided (Q2).
- Module placement chosen (Q3).
- v8.4.0-vs-v9.0.0 bundling decided (Q4).
- Constraint-evaluator builtin reuse vs. new decided (Q5).
- BridgeTransferSaga composition decided (Q6).

## Phase 1 — Hounfour implementation (legacy)

**State:** Hounfour ships the new schemas, constraints, vectors, generated JSON Schema 2020-12 output, and module barrel. No downstream repo is yet using them.

**Hounfour scope (assuming approval):**
- Add `src/memory/` (or chosen module) with `MemoryArtifact`, `StoragePointer`, `ChainCommitment`, `MemoryCommitment`.
- Add 4 constraint files in `constraints/`.
- Add new builtins to `src/constraints/evaluator.ts` if reuse is not possible (subject to Q5).
- Add golden vectors in `vectors/memory-commitment/{valid,invalid}/`.
- Update `SCHEMA-CHANGELOG.md` with v8.4.0 (or v9.0.0) section.
- Update `MIGRATION.md` with the additive-migration note.
- Update `README.md` module map.
- Run `npm run check:all` — must pass clean.
- Generate `RELEASE-INTEGRITY.json`.

**Downstream scope:** none. No breaking changes.

**Exit criteria:** Hounfour PR merges to main; package publishes to npm; downstream `package.json`s can opt in to the new version at their own pace.

## Phase 2 — Shadow mode

**State:** Finn writes `MemoryCommitment` records in parallel with its existing storage. Dixie/Freeside read them but do not depend on them for production decisions.

### loa-finn shadow tasks (issue #155 / PR #156)

- Wire memory distillation output through the new `MemoryCommitment` envelope.
- Storage adapter layer: at minimum private-DB and IPFS at v1.
- Optional: anchor selected commitments on one EVM chain (CAIP-2 `eip155:*`).
- Log all `MemoryCommitment` writes. Compatibility mismatches (digest miscomputation, anchor failures, schema-validation errors) MUST be logged and surfaced — do NOT silently fail.
- WAL integration: record `commitment_id` so replay reconstructs memory state.

### loa-dixie shadow tasks

- Read public `MemoryCommitment` records from Finn's storage layer.
- Surface them as a "preview" data source in the knowledge ingestion pipeline.
- Log filter rate (visibility-rejected vs. accepted).

### loa-freeside shadow tasks

- Render the new memory transparency UI behind a feature flag.
- Gate display via `AccessPolicy` evaluation.
- Use existing trust-label rendering; do NOT push trust labels into Hounfour.

**Exit criteria:**
- 14+ days of shadow-mode telemetry from Finn.
- Zero unexplained schema-validation failures in Finn's logs.
- Dixie ingestion handles the new envelope without ingest pipeline regressions.
- Freeside UI smoke-tests pass for at least three communities.
- @deep-name reviews the shadow-mode telemetry and approves enforcement.

## Phase 3 — Enforce

**State:** New memory writes MUST use `MemoryCommitment`. Old in-flight memory writes remain readable via dual-read shims if needed (TBD — depends on whether any pre-existing memory format exists in Finn).

### Hounfour enforcement scope

- Tighten consumer-contract assertions if any existed for memory-shaped data.
- Document the enforcement boundary in `MIGRATION.md`.

### Downstream enforcement scope

- Finn: remove the legacy non-`MemoryCommitment` write path (if any existed). Keep the read path for backward compatibility for one minor cycle.
- Dixie: promote the "preview" data source to primary.
- Freeside: remove the feature flag.

**Exit criteria:**
- Enforcement is a separate PR per repo.
- @deep-name approves.
- Rollback plan documented (revert Hounfour minor; downstream feature-flag flip).

## Coordination with v9.0.0

If Q4 lands as "bundle into v9.0.0":

- Phase 1 Hounfour cut shifts to v9.0.0.
- Phase 2 shadow-mode telemetry runs against the v9.0.0 release-candidate package.
- Enforce phase coordinates with the broader v9.0.0 cross-repo cutover.
- Cross-repo issue map (`cross-repo-impact.md`) merges into the v9.0.0 issue cohort.

If Q4 lands as "independent v8.4.0":

- This RFC progresses on its own track.
- Shadow-mode runs against v8.4.0.
- Enforce can land before v9.0.0 cuts, reducing v9.0.0 scope.

## What does NOT happen at any phase

Per playbook §0.5 / §0.6:

- No on-chain LLM storage. Hounfour does not define this; the report is explicit.
- No raw memory bytes on-chain. Only digests / CIDs / Merkle roots / proofs.
- No automatic migration of existing private user memory into the public commitment layer. Visibility is per-artifact and explicit.
- No silent re-shaping of `AgentIdentity`, `AccessPolicy`, or `ReputationEvent`.

## Rollback strategy

Per playbook safety rules, the rollback path must exist before enforcement:

1. **Hounfour rollback:** revert the v8.4.0/v9.0.0 minor; consumers pin to the previous version.
2. **Finn rollback:** disable the `MemoryCommitment` write path via feature flag; existing legacy storage continues to work.
3. **Dixie rollback:** demote the new ingest source.
4. **Freeside rollback:** flip the feature flag.

The shadow-mode phase exists exactly so that rollback is never necessary in production. If telemetry shows it might be, halt enforcement and return to Phase 0 / Phase 1.
