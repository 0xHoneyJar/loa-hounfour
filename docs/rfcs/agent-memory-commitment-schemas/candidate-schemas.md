# Candidate Schema Shapes — Agent Memory & Commitment

**Status:** DRAFT — illustrative only. No TypeBox source is being added in this pass.
**Date:** 2026-04-27

These are *hypothetical* shapes for @deep-name review. They are written in pseudo-TypeScript to communicate intent. They are **not** TypeBox, **not** runnable, and **must not** be copy-pasted into `src/`. Any real implementation requires @deep-name approval and follows the playbook §7.1 checklist.

All four candidates assume `additionalProperties: false` (playbook §9.1).

---

## 1. `MemoryArtifact`

The base envelope for a single distilled memory record. Carries metadata only — content lives off-chain at the `StoragePointer`.

```ts
// HYPOTHETICAL — DO NOT IMPLEMENT
{
  $id: 'MemoryArtifact',
  agent_id: AgentIdentity.agent_id,         // reuse, do not redefine
  kind: 'episodic_summary'
      | 'reflection'
      | 'skill'
      | 'policy'
      | 'profile'
      | 'observation_log',
  visibility: 'public'
            | 'private'
            | 'public_pointer_private_content'
            | 'holder_gated'
            | 'dao_gated',
  source_event_refs: string[],              // opaque IDs into Finn WAL / Dixie ingestion / Freeside event log
  produced_at: string,                      // ISO-8601 (reuse AuditTimestamp pattern)
  schema_version: string,                   // semver of the artifact's internal schema
  payload_digest: string,                   // ^sha256:[a-f0-9]{64}$
  retention_hint?: 'ephemeral' | 'durable' | 'permanent',
}
```

**Open:** is `kind: 'skill'` enough, or does it need a separate `MemorySkill` schema with procedural-memory fields (signature, runtime, dependencies)? See [`open-questions-for-deep-name.md`](./open-questions-for-deep-name.md) Q1.

**Constraints (cross-field):**
- `payload_digest` MUST match `^sha256:[a-f0-9]{64}$`.
- `source_event_refs` MUST be non-empty when `kind != 'profile'`.

---

## 2. `StoragePointer`

A scheme-tagged off-chain content address. One pointer per artifact location; an artifact may have multiple commitments referencing different pointers (e.g., private encrypted IPFS + public manifest IPFS).

```ts
// HYPOTHETICAL — DO NOT IMPLEMENT
{
  $id: 'StoragePointer',
  scheme: 'ipfs'
        | 'arweave'
        | 'filecoin'
        | 'ceramic'
        | 'tableland'
        | 'private_db'
        | 'vector_db',
  uri: string,                              // scheme-specific format, validated per-scheme
  size_bytes: number,                       // integer, >= 0
  content_type: string,                     // RFC 6838 media type
  retention_policy: 'ephemeral' | 'durable' | 'permanent',
  encryption?: {
    algorithm: 'aes-256-gcm' | 'chacha20-poly1305' | 'lit-protocol' | 'custom',
    key_policy_ref: AccessPolicy.id,        // reuse existing AccessPolicy
  },
}
```

**Constraints (cross-field):**
- `scheme === 'private_db'` ⇒ `encryption` SHOULD be present.
- `scheme === 'vector_db'` ⇒ `retention_policy === 'ephemeral' | 'durable'` (not `permanent`).
- `scheme === 'arweave'` ⇒ `retention_policy === 'permanent'`.
- `uri` syntactic validation per scheme:
  - `ipfs` → `^ipfs://(bafy|Qm)[a-zA-Z0-9]{44,}$` (CIDv1 or v0)
  - `arweave` → `^ar://[A-Za-z0-9_-]{43}$`
  - `ceramic` → `^ceramic://k[a-z0-9]+$`
  - others: scheme-specific.

**New evaluator builtin candidate:** `validateStorageUri(scheme, uri)` — single builtin, switch by scheme. Avoids 7 separate per-scheme builtins. Open for @deep-name (Q5).

---

## 3. `ChainCommitment`

A chain-agnostic external anchor. **Distinct** from `ChainBoundHash` (which is intra-audit hash chaining).

```ts
// HYPOTHETICAL — DO NOT IMPLEMENT
{
  $id: 'ChainCommitment',
  chain_id: string,                         // CAIP-2 format, e.g. 'eip155:1', 'eip155:8453', 'solana:mainnet', 'cosmos:cosmoshub-4'
  commitment_kind: 'tx_log'
                 | 'account_data'
                 | 'calldata'
                 | 'state_root_input',
  tx_ref: string,                           // chain-native tx reference (0x... for EVM, base58 for Solana, etc.)
  block_height?: number,                    // optional — some chains have no block height
  committed_at: string,                     // ISO-8601 wall-clock at submit time
  committer: AgentIdentity.agent_id,        // reuse
  payload_digest: string,                   // ^sha256:[a-f0-9]{64}$ — MUST match the artifact this anchors
}
```

**Constraints (cross-field):**
- `chain_id` MUST match CAIP-2 syntax (`namespace:reference`, lowercase, hyphens allowed).
- `tx_ref` syntactic validation per `chain_id` namespace.
- `payload_digest` referential integrity is enforced at the `MemoryCommitment` level, not here.
- `committed_at` MUST NOT be future-dated relative to validation time.

**New evaluator builtin candidate:** `validateCAIP2(chain_id)`. @deep-name to confirm this does not already exist (Q5).

**Naming:** `ChainCommitment` vs `ExternalChainAnchor` vs `OnChainAnchor` — open for @deep-name. The audit (`existing-surface-audit.md`) flags risk of confusion with `ChainBoundHash`.

---

## 4. `MemoryCommitment`

The binding object that ties artifact + storage + optional anchor + access policy. This is the canonical wire object Finn writes and Dixie/Freeside read.

```ts
// HYPOTHETICAL — DO NOT IMPLEMENT
{
  $id: 'MemoryCommitment',
  commitment_id: string,                    // ULID or UUIDv7
  artifact: MemoryArtifact,
  storage: StoragePointer,
  anchor?: ChainCommitment,                 // optional — public proof
  access_policy: AccessPolicy,              // reuse — gates decryption / read
  signed_intent?: {                         // optional EIP-712-style envelope
    domain: { name: string; version: string; chainId?: number },
    primary_type: string,
    signature: string,                      // 0x-hex
    signer: AgentIdentity.agent_id,
  },
  created_at: string,                       // ISO-8601
  superseded_by?: string,                   // commitment_id of a newer version (for memory updates)
}
```

**Constraints (cross-field, cross-object — these need the constraint DSL):**
- `artifact.payload_digest === anchor.payload_digest` when `anchor` is present.
- `artifact.produced_at <= anchor.committed_at` when `anchor` is present.
- `artifact.visibility === 'public'` ⇒ `storage.encryption` MUST NOT be present.
- `artifact.visibility !== 'public'` ⇒ `storage.encryption` MUST be present OR `storage.scheme === 'private_db'`.
- `superseded_by`, when present, MUST reference an existing commitment by `commitment_id`.
- `signed_intent.signer === artifact.agent_id` when `signed_intent` is present.

---

## Variant question (the most important shape decision)

The report names `MemorySummary`, `MemoryReflection`, and procedural skills as separate concepts. There are two ways to model them:

**Option A — discriminator variants of `MemoryArtifact`:**
- One top-level schema `MemoryArtifact` with `kind` discriminator.
- `kind`-specific optional fields validated by a constraint that switches on `kind`.
- Pros: smaller surface, fewer schemas to evolve, single envelope for storage layer.
- Cons: type narrowing in TypeScript is less ergonomic; some `kind`-specific fields would be optional at the schema level.

**Option B — separate top-level schemas:**
- `MemorySummary`, `MemoryReflection`, `MemorySkill`, `MemoryPolicy`, `MemoryProfile`.
- Each `extends` a shared `MemoryArtifactBase`.
- Pros: precise typing per kind; each schema can have `additionalProperties: false` strict.
- Cons: 5+ new top-level schemas instead of 1; constraint files multiply; storage layer needs a union type to dispatch.

**This packet recommends Option A** for v1, with the option to split in a later MINOR if specific kinds grow distinct invariant sets. @deep-name has final say (Q1).

---

## Module placement candidates

| Option | Path | Rationale |
|---|---|---|
| A | `src/memory/` (new module barrel) | Clean separation; matches the proposal's name. New export path `@0xhoneyjar/loa-hounfour/memory`. |
| B | `src/integrity/` | Memory commitments ARE integrity primitives (digests, anchors). Existing `integrity/` already houses `consumer-contract`, `req-hash`, `liveness-properties`. |
| C | `src/core/` | Memory is core agent state. But `core/` is currently small (only `agent-identity` and `personality-assignment`). |
| D | `src/commons/` | `commons/` houses `chain-bound-hash`, `audit-trail`, `governed-reputation`. Memory commitments are adjacent. |

@deep-name to choose (Q3).
