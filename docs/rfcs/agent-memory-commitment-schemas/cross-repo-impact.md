# Cross-Repo Impact Map — Agent Memory & Commitment Schemas

**Status:** DRAFT — pending @deep-name review and per-repo issue confirmation.
**Date:** 2026-04-27

Per playbook §0.2, every Hounfour proposal must include a cross-repo impact map. This document enumerates the ripple effects across loa-finn, loa-dixie, loa-freeside, and loa-main, and proposes the dependency order for any eventual implementation.

## Hounfour parent

- [0xHoneyJar/loa-hounfour#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57) — protocol/schema proposal (this packet)

## Downstream issue map

| Repo | Issue | Role | Required at v1? |
|---|---|---|---|
| **loa-finn** | [#155](https://github.com/0xHoneyJar/loa-finn/issues/155) (RFC) + [#156](https://github.com/0xHoneyJar/loa-finn/pull/156) (PR in flight) | Producer of `MemoryCommitment`; consumer for replay/audit; owner of distillation pipeline, storage adapters, chain anchor submission | **Yes** |
| **loa-dixie** | [#89](https://github.com/0xHoneyJar/loa-dixie/issues/89) (parent product/context proposal) — needs a runtime ingestion follow-up issue | Consumer of public `MemoryCommitment` for oracle/knowledge work; producer of research-derived memory artifacts | Shadow-mode v1, enforce later |
| **loa-freeside** | (no issue yet — needs to be opened) | Consumer for community-facing memory transparency UI; access-policy gate UX; reputation display | Shadow-mode v1, enforce later |
| **loa-main** | (no issue yet — open only if eval harness needs it) | Consumer in eval harness for replay-based evaluation | Optional |

@deep-name should confirm the loa-freeside and loa-main issue requirement before any draft PR opens.

## Per-repo impact

### loa-finn (Required, v1)

**Producer responsibilities:**
- Memory distillation pipeline: raw event → episode → reflection → skill / policy.
- Storage adapter layer: at minimum private-DB and IPFS at v1; Arweave / Ceramic / Tableland in later phases.
- Chain anchor submitter: chain-agnostic, driven by `chain_id` (CAIP-2). At v1, likely one EVM target only — but the schema must support more from day one.
- WAL integration: `MemoryCommitment.commitment_id` recorded in Finn's write-ahead log so replay reconstructs memory state.

**Consumer responsibilities:**
- Memory recall: read `MemoryCommitment` records from the storage layer, dereference `StoragePointer`, decrypt if `AccessPolicy` allows.
- Replay/audit: cross-check `payload_digest` between artifact and anchor.

**Risks if Hounfour and Finn drift:**
- Finn's PR #156 may already define ad-hoc local types. Hounfour must own the wire shape; Finn must adopt it. The shadow-mode rollout exists exactly to give Finn time to refactor.

**Open question:** does Finn's existing `model_performance` ReputationEvent variant (RFC v9, §1.1) need to reference `MemoryCommitment.commitment_id` to attribute quality observations to specific memory versions? Likely yes; flag for the v9.0.0 RFC author.

### loa-dixie (Shadow-mode v1)

**Consumer responsibilities:**
- Ingest public `MemoryCommitment` records into the knowledge graph.
- Filter by `visibility` — Dixie must NOT attempt to ingest private content.
- Honor `AccessPolicy` for gated content (e.g., DAO-gated research notes).

**Producer responsibilities:**
- Research-derived memory: long-form Dixie reports (like the parent product-context document) MAY be wrapped in `MemoryArtifact` envelopes once the pipeline stabilizes.

**Risks:**
- Schema mismatch between Dixie's existing oracle/knowledge schemas and the Hounfour `MemoryArtifact` envelope. Open question: do Dixie's knowledge entries need to extend `MemoryArtifact`, or stay distinct?

### loa-freeside (Shadow-mode v1)

**Consumer responsibilities:**
- Render memory transparency UI: "this daemon remembered X on chain Y at commitment Z."
- Gate UI based on `AccessPolicy` evaluation against the viewing user's wallet/DID.
- Surface trust labels (per the report's §22 trust-label model) — but trust labels are likely a Freeside-only concern, NOT a Hounfour schema.

**Risks:**
- Freeside has historically been tempted to define local schemas. Playbook §0.4 explicitly warns against this. The shadow-mode phase gives Freeside time to consume the Hounfour wire shape directly.

### loa-main (Optional)

**Consumer responsibilities (only if needed):**
- Eval harness MAY use `MemoryCommitment` records as test inputs to verify agent behavior reproduces from a fixed memory state.
- Bridgebuilder / Flatline / Spiral integrations are out of scope for v1.

**Verdict:** open a loa-main issue only if @deep-name confirms eval-harness coupling is desired. Otherwise leave it untouched.

## Dependency order (per playbook §10)

1. **Hounfour protocol approved** by @deep-name (this packet).
2. **Hounfour schema/constraints/vectors implemented** behind compatibility rules — additive only, MINOR cut (or bundled into v9.0.0 per Q4).
3. **Finn shadow-mode producer/consumer added** — Finn writes `MemoryCommitment` records in parallel with existing storage; logs compatibility mismatches.
4. **Dixie/Freeside shadow-mode consumers added** — read `MemoryCommitment` records but do not depend on them for production decisions.
5. **Eval/Loa-main updates** only if needed.
6. **Enforce mode** after downstream tests pass and @deep-name approves.

## Coordination with v9.0.0 cross-repo-extraction RFC

`docs/RFC-v9-cross-repo-extraction.md` is the in-flight major-version RFC. Two coordination questions:

1. Should agent-memory-commitment-schemas land **independently as v8.4.0** (additive, MINOR) before v9.0.0?
2. Or should it **bundle into v9.0.0** so the cross-repo cutover happens once?

The playbook §10 dependency order argues for **independent landing** — Finn's shadow-mode rollout for memory commitments does not require any of the v9.0.0 cohort changes. But @deep-name may have a different read on release ergonomics.

Flagged as Q4 in [`open-questions-for-deep-name.md`](./open-questions-for-deep-name.md).
