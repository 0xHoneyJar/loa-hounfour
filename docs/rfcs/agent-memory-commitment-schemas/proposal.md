# Draft Hounfour Protocol Proposal — Agent Memory & Commitment Schemas

**Status:** DRAFT — pending @deep-name review. Not approved for implementation.
**Date:** 2026-04-27
**Tracking:** loa-hounfour#57 · parent loa-dixie#89 · runtime loa-finn#155 / loa-finn#156

---

## 1. Problem

Loa needs to support agents that:

- Distill raw events into structured memory (episodic summaries, reflections, procedural skills, policies).
- Store those artifacts in heterogeneous off-chain or decentralized layers (vector DB, encrypted DB, IPFS, Arweave, Filecoin, Ceramic, Tableland).
- Commit compact proofs (CID, hash, Merkle root) to **any** suitable chain — not a single hard-coded chain.
- Gate access to private memory while exposing public existence/integrity proofs.
- Let other agents and humans verify memory provenance, ownership, and authorization.

Today, Hounfour does not have a shared envelope for "a piece of distilled agent memory referenced by an off-chain storage pointer and optionally anchored to an external chain." Without one, Finn, Dixie, and Freeside will each invent their own ad-hoc shape — exactly the silent-divergence failure mode the playbook §0.4 warns against.

## 2. Why Hounfour

Applying the playbook §1.3 schema-extraction test to the candidate surface:

| Question | Answer |
|---|---|
| Will two or more repos need to agree on this object? | Yes — Finn produces memory artifacts; Dixie reads them for oracle/knowledge work; Freeside surfaces them in community UIs; loa-main may evaluate them in eval harnesses. |
| Would silent divergence be dangerous? | Yes — divergent CID/storage-pointer formats break cross-repo provenance verification. |
| Does it need cross-language validation? | Yes — eventual Python/Go consumers (Dixie ingestion, validators, third-party agent runtimes) must validate the same envelope. |
| Does it encode money, identity, reputation, permissions, governance, or lifecycle state? | Yes — memory commitments are evidence inputs for reputation; access policies are permission state; chain commitments are payment-adjacent. |
| Does it need semver/migration rules? | Yes — once Finn writes commitments referencing this envelope, breaking changes invalidate historical proofs. |

All five answers are yes. The shared envelope belongs in Hounfour. The runtime distillation pipeline, the storage adapter implementations, and the chain-anchor submission logic all belong in **Finn**, not Hounfour.

## 3. Existing surface audit

See [`existing-surface-audit.md`](./existing-surface-audit.md). Summary:

- **Already exists, must reuse**: `AgentIdentity`, `AccessPolicy`, `ReputationEvent`, `ReputationCredential`, `ReputationAggregate`, `AuditTrail`, `AuditTrailEntry`, `ChainBoundHash` (intra-audit), `BridgeTransferSaga` (cross-chain transfer, distinct purpose), `x402Payment`.
- **Likely new**: `MemoryArtifact`, `StoragePointer`, `ChainCommitment`, `MemoryCommitment`.
- **Open**: whether `MemorySummary` / `MemoryReflection` / `MemorySkill` are top-level schemas or `kind` variants of `MemoryArtifact`; whether `ValidationRecord` is needed at all given existing reputation events.

## 4. Proposed contract shape

See [`candidate-schemas.md`](./candidate-schemas.md). High-level intent (no TypeBox in this draft):

```
MemoryArtifact
  agent_id            → reuse AgentIdentity.agent_id
  kind                → enum { episodic_summary, reflection, skill, policy, profile, observation_log }
  visibility          → enum { public, private, public_pointer_private_content, holder_gated, dao_gated }
  source_event_refs   → array of opaque event IDs (Finn WAL, Dixie ingestion, Freeside event)
  produced_at         → ISO-8601 timestamp (reuse AuditTimestamp pattern)
  schema_version      → string
  payload_digest      → sha256:<hex> of canonicalized content (NOT the content itself)

StoragePointer
  scheme              → enum { ipfs, arweave, filecoin, ceramic, tableland, private_db, vector_db }
  uri                 → scheme-validated URI (cid v1, ar://, ceramic stream id, etc.)
  encryption          → optional { algorithm, key_policy_ref → AccessPolicy }
  size_bytes          → integer
  content_type        → media type
  retention_policy    → enum { ephemeral, durable, permanent }

ChainCommitment
  chain_id            → CAIP-2 string (eip155:1, solana:..., cosmos:..., custom rollup ids)
  commitment_kind     → enum { tx_log, account_data, calldata, state_root_input }
  tx_ref              → chain-native transaction reference
  block_height        → integer (optional for chains without block heights)
  committed_at        → ISO-8601 timestamp
  committer           → reuse AgentIdentity.agent_id
  payload_digest      → sha256:<hex> matching the artifact this anchors

MemoryCommitment
  artifact            → MemoryArtifact
  storage             → StoragePointer (where the bytes live)
  anchor              → optional ChainCommitment (compact public proof)
  access_policy       → reuse AccessPolicy
  signed_intent       → optional EIP-712-style structured signature envelope
```

Constraints (cross-field invariants — not expressible by JSON Schema alone):

- `MemoryCommitment.artifact.payload_digest` MUST equal `MemoryCommitment.anchor.payload_digest` when `anchor` is present.
- `StoragePointer.scheme === 'private_db'` REQUIRES `MemoryArtifact.visibility !== 'public'`.
- `StoragePointer.encryption` REQUIRES `MemoryArtifact.visibility !== 'public'`.
- `ChainCommitment.chain_id` MUST be a syntactically valid CAIP-2 identifier (new evaluator builtin candidate, OR reuse an existing chain-id validator if one already exists — flagged for @deep-name).
- `MemoryArtifact.kind === 'skill'` MAY require additional procedural-memory fields; this drives the "variant vs separate schema" decision.

## 5. Compatibility analysis

See [`compatibility-and-semver.md`](./compatibility-and-semver.md). First-pass guess (not authoritative):

- All candidate schemas are **additive** new schemas. No existing field is renamed, removed, or made required.
- No existing constraint is tightened on existing payloads.
- No existing package export is removed.
- New module barrel candidate: `@0xhoneyjar/loa-hounfour/memory` (open question for @deep-name — could also live under `core` or `integrity`).

First-pass version impact: **MINOR**, candidate v8.4.0. Not proposed in this draft. @deep-name has final authority and may decide the work warrants a different cut (e.g., bundled into the v9.0.0 cross-repo-extraction RFC, since loa-finn#155 ships at the same horizon).

## 6. Constraint analysis

Invariants that JSON Schema 2020-12 alone cannot express:

1. Digest equality across `MemoryArtifact` and `ChainCommitment` (cross-field, multi-object).
2. Visibility ↔ encryption ↔ scheme cross-field rule.
3. CAIP-2 chain-id syntax (could be `pattern` in JSON Schema, but multi-namespace validation is cleaner as an evaluator builtin).
4. Conservation: total memory commitments per agent monotonically non-decreasing within a session boundary (likely belongs to Finn runtime, NOT Hounfour — flagged).
5. Temporal ordering: `MemoryCommitment.anchor.committed_at >= MemoryArtifact.produced_at`.

These map onto the existing constraint DSL pattern (72 constraint files, 42 evaluator builtins). Net new builtins, if any, should be minimized — playbook §7.2 prefers reusing existing builtins.

## 7. Consumer impact

See [`cross-repo-impact.md`](./cross-repo-impact.md). Summary:

| Repo | Role | Required at v1? |
|---|---|---|
| loa-hounfour | Schema & constraint source of truth | Yes |
| loa-finn | Producer (memory distiller, storage adapter, chain anchor); consumer for replay/audit | Yes (issues #155 + #156) |
| loa-dixie | Consumer (oracle/knowledge ingestion of public memory artifacts); producer of research-derived memory | Shadow-mode v1, enforce later |
| loa-freeside | Consumer (community-facing memory transparency UI; access-policy gate UX) | Shadow-mode v1, enforce later |
| loa-main | Consumer (eval harness reads memory artifacts as test inputs) | Optional |

## 8. Security / economic impact

Per playbook §0.5 and §9.1, this surface is high-sensitivity:

- Identity (`AgentIdentity` reuse) — must not weaken existing trust-scope semantics.
- Permissions (`AccessPolicy` reuse) — encryption-key gating is a permission boundary; misconfiguration leaks private memory.
- Reputation (existing `ReputationEvent`) — memory commitments are evidence inputs; reputation events should reference `MemoryCommitment` IDs, not duplicate the envelope.
- Audit / hash chains (`AuditTrail`, `ChainBoundHash`) — `MemoryCommitment` digests should be domain-separated from existing audit-chain hashes; no namespace collisions.
- Money / payments — out of scope for v1 of this RFC, but `MemoryCommitment` may later be referenced from `BillingEntry` or x402 payment metadata for paid memory access. Flagged as an explicit non-goal for v1.

`additionalProperties` should remain strict for all four candidate schemas (playbook §9.1).

## 9. Migration plan

See [`migration-rollout.md`](./migration-rollout.md). Three phases:

1. **Legacy:** Hounfour ships the schemas additively. Finn/Dixie/Freeside continue current behavior.
2. **Shadow:** Finn writes `MemoryCommitment` records in parallel with existing storage; Dixie reads them as a secondary source; Freeside renders them with a "preview" badge.
3. **Enforce:** Only after downstream tests pass and @deep-name approves, the new contract becomes required for new memory writes.

## 10. Tests required if approved

Per playbook §7.1 and §10:

- TypeScript unit tests for each schema and discriminator variant.
- `npm run schema:generate` produces stable JSON Schema 2020-12 output.
- `npm run schemas:validate` passes.
- Constraint evaluator tests for each new cross-field invariant.
- Golden vectors under `vectors/memory-commitment/{valid,invalid}/`.
- `npm run semver:check` against the previous release tag.
- `npm run vectors:check`.
- `npm run check:migration` if any change touches existing schemas.
- `npm run check:all`.
- Downstream compatibility smoke tests (Finn `loa-finn#156`, Dixie ingestion harness).

## 11. Non-goals

This Hounfour proposal will not:

- Implement memory distillation (Finn).
- Implement storage adapters (Finn).
- Implement chain anchoring (Finn).
- Define UI/UX (Freeside).
- Define oracle/knowledge interpretation (Dixie).
- Define x402 paid-memory flows (separate proposal).
- Replace `ChainBoundHash` (intra-audit chaining stays as-is).
- Replace `BridgeTransferSaga` (cross-chain asset transfer stays as-is).

## 12. Open questions for @deep-name

See [`open-questions-for-deep-name.md`](./open-questions-for-deep-name.md). Top-priority questions:

1. Are `MemorySummary` / `MemoryReflection` / `MemorySkill` discriminator variants of `MemoryArtifact`, or separate schemas?
2. Is `ValidationRecord` needed at all, given existing `ReputationEvent` and `proposal-outcome-event`?
3. Should the new module live under `core`, `integrity`, or a new `memory` barrel?
4. Should this bundle into the v9.0.0 cross-repo-extraction RFC, or land independently as v8.4.0?
5. Is there an existing CAIP-2 chain-id validator anywhere in the constraint evaluator builtins?
6. Does `ChainCommitment` need to compose with the existing `BridgeTransferSaga` event timeline?

## 13. Review request

@deep-name please review:

1. Whether this belongs in Hounfour at all (the schema-extraction test in §2).
2. Whether the existing-surface audit in [`existing-surface-audit.md`](./existing-surface-audit.md) is correct — especially the claim that six of the report's eleven candidates already exist.
3. The variant-vs-separate-schema question for memory kinds.
4. The `ValidationRecord` necessity question.
5. Module placement.
6. Versioning strategy (independent v8.4.0 vs bundled into v9.0.0).
7. Whether to proceed to a draft PR with planning artifacts only, or stop here.
