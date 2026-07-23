# RFC Packet — Agent Memory & Commitment Schemas (Hounfour)

**Status:** DRAFT — pending @deep-name review. Do not implement schemas, constraints, vectors, or generated artifacts before approval.
**Date:** 2026-04-27
**Author:** Eileen C (eileen@0xhoneyjar.xyz)
**Branch:** `draft/proposal-agent-memory-commitment-schemas`

## Purpose

This packet asks @deep-name to decide whether (and how) Hounfour should own a small family of shared contracts for agent memory artifacts, off-chain storage pointers, and chain-agnostic commitments — derived from the parent product-context report in loa-dixie and the runtime RFC/PR work in loa-finn.

This is a **planning-only** packet. It contains no TypeBox source, no JSON Schema generation, no constraint files, no golden vectors, and no version bump. It follows the Jani-style draft-first playbook for Hounfour proposals.

## Linked work

| Source | Link | Role |
|---|---|---|
| Parent product/context proposal | [0xHoneyJar/loa-dixie#89](https://github.com/0xHoneyJar/loa-dixie/issues/89) | Research + product framing for agent memory & decentralized storage |
| Hounfour protocol issue | [0xHoneyJar/loa-hounfour#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57) | This RFC's tracking issue |
| Finn runtime RFC | [0xHoneyJar/loa-finn#155](https://github.com/0xHoneyJar/loa-finn/issues/155) | Memory distillation / storage adapter runtime design |
| Finn runtime PR (in flight) | [0xHoneyJar/loa-finn#156](https://github.com/0xHoneyJar/loa-finn/pull/156) | Implementation candidate for Finn-side adapters |
| Local context (do not commit) | `JANI_STYLE_HOUNFOUR_PLAYBOOK.md`, `agent_memory_decentralized_storage_loa_context_report.md` | Source materials at repo root, kept locally for this draft pass |

## Files in this packet

| File | Purpose |
|---|---|
| `README.md` | This index. |
| `proposal.md` | Main draft Hounfour protocol proposal (playbook §6 structure). |
| `existing-surface-audit.md` | Audit of overlapping existing schemas — most candidate names already exist. |
| `candidate-schemas.md` | Hypothetical candidate shapes, names, and module placement. Illustrative only. |
| `cross-repo-impact.md` | Impact map across loa-finn, loa-dixie, loa-freeside, loa-main. |
| `compatibility-and-semver.md` | First-pass MAJOR/MINOR/PATCH analysis with rationale. |
| `migration-rollout.md` | Legacy → shadow → enforce plan. |
| `open-questions-for-deep-name.md` | Specific questions blocking implementation. |
| `draft-issue-body.md` | Body to paste into loa-hounfour#57 when the protocol question is opened formally. |
| `draft-pr-body.md` | Body for the eventual `[DRAFT][PROTOCOL PROPOSAL]` PR that wraps these planning artifacts. |

## What this packet does NOT do

- Does **not** add or modify any file under `src/`, `schemas/`, `constraints/`, `vectors/`, `dist/`, `tests/`, `package.json`, lockfiles, `SCHEMA-CHANGELOG.md`, `MIGRATION.md`, `RELEASE-INTEGRITY.json`, or `src/version.ts`.
- Does **not** propose a `CONTRACT_VERSION` or `MIN_SUPPORTED_VERSION` change. A version bump requires @deep-name review of the eventual implementation, not this draft.
- Does **not** commit `JANI_STYLE_HOUNFOUR_PLAYBOOK.md` or `agent_memory_decentralized_storage_loa_context_report.md` from the repo root — those are temporary source material for this pass.
- Does **not** define product behavior in Finn, Dixie, or Freeside. Hounfour owns only the shared contract surface.

## Top-line recommendation (subject to @deep-name)

The product-context report names eleven candidate schemas. **Six already exist** in Hounfour with mature definitions and constraint files: `AgentIdentity`, `AccessPolicy`, `ReputationEvent`, `ReputationCredential` (≈ "AgentCredential"), `ReputationAggregate`, and a chain-internal hash primitive (`ChainBoundHash`). The genuinely new surface is much smaller than the report suggests:

1. `MemoryArtifact` (envelope around any tier of distilled memory)
2. `StoragePointer` (off-chain content address — IPFS / Arweave / Ceramic / Tableland / private-DB)
3. `ChainCommitment` (chain-agnostic external anchor, **distinct** from the existing intra-audit `ChainBoundHash`)
4. Possibly `MemoryCommitment` as the binding object that carries `MemoryArtifact` + `StoragePointer` + optional `ChainCommitment` + reuse of `AccessPolicy`

`MemorySummary` / `MemoryReflection` / `MemorySkill` are likely **discriminator variants** of `MemoryArtifact`, not separate top-level schemas.

`ValidationRecord` is likely subsumed by the existing reputation/governance event surface — flagged as an open question for @deep-name.

See `existing-surface-audit.md` and `candidate-schemas.md` for the full breakdown.
