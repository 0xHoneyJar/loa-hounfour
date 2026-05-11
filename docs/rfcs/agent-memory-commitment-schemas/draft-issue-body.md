# Draft Issue Body — loa-hounfour#57

This is the body to paste into [0xHoneyJar/loa-hounfour#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57) (or to use as the basis for that issue if it is not yet populated). Format follows the playbook §2.3 template.

---

# [DRAFT][PROTOCOL QUESTION] Agent memory & chain-agnostic commitment schemas

## Status

Draft only. Do not implement before @deep-name review. Planning artifacts live in `docs/rfcs/agent-memory-commitment-schemas/` on branch `draft/proposal-agent-memory-commitment-schemas`.

## Why this exists

Loa needs a shared envelope for agent memory artifacts (episodic summaries, reflections, skills, policies), the off-chain storage pointers that hold them (IPFS / Arweave / Ceramic / Tableland / private-DB / vector-DB), and the chain-agnostic commitments that anchor them (CAIP-2 chain ids — eip155, solana, cosmos, custom rollups). Without a shared contract, Finn, Dixie, and Freeside will each invent local schemas and silently diverge.

## Research packet

- Parent product/context proposal: 0xHoneyJar/loa-dixie#89
- Finn runtime RFC: 0xHoneyJar/loa-finn#155
- Finn runtime PR (in flight): 0xHoneyJar/loa-finn#156
- Local context (not committed): root `agent_memory_decentralized_storage_loa_context_report.md` and `JANI_STYLE_HOUNFOUR_PLAYBOOK.md`
- Planning packet (this branch): `docs/rfcs/agent-memory-commitment-schemas/`

## My interpretation

Agents need tiered memory (working / semantic / episodic / reflective / procedural / constitutional). Raw events distill into structured artifacts. Artifacts live in heterogeneous off-chain storage layers. Compact proofs anchor to any suitable chain. Hounfour owns the wire shape that makes all of that interoperable.

## Proposed shared contract

Candidate schemas (illustrative; see `candidate-schemas.md`):

- `MemoryArtifact` — base envelope, `kind` discriminator
- `StoragePointer` — scheme-tagged off-chain content address
- `ChainCommitment` — chain-agnostic external anchor (distinct from existing `ChainBoundHash`)
- `MemoryCommitment` — binding object (`artifact + storage + anchor + AccessPolicy`)

Reuse-only: `AgentIdentity`, `AccessPolicy`, `ReputationEvent`, `ReputationCredential`, `ReputationAggregate`, `AuditTrail`, `ChainBoundHash`, `BridgeTransferSaga`, `x402Payment`.

## Existing Hounfour surface checked

- [x] `src/schemas/` — `agent-identity.ts`, `conversation.ts` (AccessPolicy)
- [x] `src/governance/` — full reputation suite, governance proposal, permission boundary
- [x] `src/commons/` — `chain-bound-hash`, `audit-trail`, `governed-reputation`
- [x] `src/economy/` — `bridge-transfer-saga`, `x402-payment`
- [x] `src/integrity/` — adjacent integrity primitives
- [x] `constraints/` — 94 constraint files reviewed for naming overlap
- [x] `docs/RFC-v9-cross-repo-extraction.md` — coordination check

Existing candidates found:

- `AgentIdentity` (v6.0.0+, capability-scoped trust)
- `AccessPolicy` (v7.2.0)
- `ReputationEvent` / `ReputationCredential` / `ReputationAggregate` (full suite)
- `ChainBoundHash` (intra-audit, distinct from external chain anchoring)
- `AuditTrail` / `AuditTrailEntry` / `AuditTimestamp`
- `BridgeTransferSaga` (cross-chain asset transfer; adjacent)

Potential duplication risk: six of the report's eleven candidates already exist. The genuinely new surface is four schemas, not eleven. Full audit: `existing-surface-audit.md`.

## Cross-repo impact map

| Repo | Impact | Required? | Notes |
|---|---|---:|---|
| loa-hounfour | Schema/constraint source of truth | Yes | This issue. |
| loa-finn | Runtime producer/consumer; storage adapters; chain anchor | Yes | #155, #156 |
| loa-freeside | Memory transparency UI; AccessPolicy gating | Maybe | Shadow-mode v1, enforce later |
| loa-dixie | Knowledge/oracle ingestion of public memory artifacts; producer of research-derived memory | Maybe | Shadow-mode v1, parent proposal #89 |
| loa-main | Eval harness consumer | Optional | Open only if eval coupling is desired |

Full map: `cross-repo-impact.md`.

## Compatibility concern

- [x] New optional fields only (within new schemas)
- [x] New schema only (4 schemas)
- [ ] New required field
- [ ] Field removal
- [ ] Field rename
- [ ] Constraint behavior change on existing payloads
- [ ] Constraint grammar change
- [x] Package export change (new `@0xhoneyjar/loa-hounfour/memory` barrel candidate)
- [ ] CONTRACT_VERSION change (NOT proposed in this draft)
- [ ] MIN_SUPPORTED_VERSION change

My initial guess:

```
MINOR — candidate v8.4.0 (or bundle into v9.0.0; see Q4)
```

Full analysis: `compatibility-and-semver.md`.

## Security/economic sensitivity

- [x] Identity (`AgentIdentity` reuse)
- [x] Permissions (`AccessPolicy` reuse for encryption/decryption gating)
- [x] Reputation (memory commitments are evidence inputs for `ReputationEvent`)
- [x] Audit trails (digest domain separation from `ChainBoundHash`)
- [ ] Money / billing / credit / escrow (out of scope for v1; later integration with x402 possible)
- [ ] Governance / sanctions / disputes (no direct touch in v1)
- [x] Model routing or provider boundaries (memory artifacts may be referenced from `model_performance` ReputationEvent in v9.0.0 RFC §1.1)

## Proposed rollout mode

- Phase 0: this packet — research, audit, planning artifacts
- Phase 1: Hounfour additive MINOR (or v9.0.0 bundle) implementation
- Phase 2: Finn shadow-mode producer/consumer; Dixie/Freeside shadow consumers
- Phase 3: enforce after telemetry approval

Full plan: `migration-rollout.md`.

## Non-goals

- Runtime memory distillation (Finn)
- Storage adapter implementations (Finn)
- Chain anchor submission logic (Finn)
- UI/UX for memory transparency (Freeside)
- Oracle/knowledge interpretation (Dixie)
- x402 paid-memory flows (separate proposal)
- On-chain LLM storage (does not exist; the report is explicit)
- Replacing `ChainBoundHash` (intra-audit chaining stays)
- Replacing `BridgeTransferSaga` (cross-chain asset transfer stays)

## Review request

@deep-name please review:

1. Whether this belongs in Hounfour (schema-extraction test, `proposal.md` §2).
2. Whether the existing-surface audit is correct (`existing-surface-audit.md`).
3. The variant-vs-separate-schema decision for memory kinds (Q1).
4. Whether `ValidationRecord` is needed at all (Q2).
5. Module placement (Q3).
6. Independent v8.4.0 vs bundle into v9.0.0 (Q4).
7. Evaluator builtin reuse vs. new (Q5).
8. `BridgeTransferSaga` composition (Q6).
9. Q7–Q10 in `open-questions-for-deep-name.md`.
10. Whether to proceed to a `[DRAFT][PROTOCOL PROPOSAL]` PR or stop at this packet.
