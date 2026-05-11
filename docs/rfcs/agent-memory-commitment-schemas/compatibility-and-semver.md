# Compatibility & Semver Analysis — Agent Memory & Commitment Schemas

**Status:** DRAFT — first-pass guess, not authoritative. @deep-name has final authority on versioning per playbook §0.5.
**Date:** 2026-04-27

This document applies the playbook §9 compatibility decision guide to the proposed surface. It does **not** propose a `CONTRACT_VERSION` change — that is explicitly forbidden in this draft pass.

## Per-change classification

| Change | Class | Likely version impact |
|---|---|---|
| Add `MemoryArtifact` schema | New schema, additive | MINOR |
| Add `StoragePointer` schema | New schema, additive | MINOR |
| Add `ChainCommitment` schema | New schema, additive | MINOR |
| Add `MemoryCommitment` schema | New schema, additive | MINOR |
| Add new evaluator builtin `validateCAIP2(chain_id)` (if not already present) | New builtin, no grammar change | MINOR |
| Add new evaluator builtin `validateStorageUri(scheme, uri)` (single dispatch) | New builtin, no grammar change | MINOR |
| Add 4 new constraint files in `constraints/` | Additive | MINOR |
| Add new module barrel `src/memory/` and export path `@0xhoneyjar/loa-hounfour/memory` | New export | MINOR |
| Add golden vectors under `vectors/memory-commitment/` | Additive | None / PATCH |
| **No change to** `AgentIdentity`, `AccessPolicy`, `ReputationEvent`, `ReputationCredential`, `ChainBoundHash`, `AuditTrail`, `BridgeTransferSaga` | — | None |
| **No change to** `CONTRACT_VERSION`, `MIN_SUPPORTED_VERSION`, `package.json version`, `src/version.ts` | — | None (DRAFT) |

**Aggregate first-pass guess:** `v8.3.1 → v8.4.0` (MINOR). Not proposed in this draft. @deep-name has final authority.

## Why this is MINOR, not MAJOR

Per playbook §9 compatibility table:

- New optional field → MINOR
- New schema → MINOR
- No required field added to existing schema
- No field renamed or removed
- No constraint tightened on existing payloads
- No package export removed
- No grammar change to the constraint DSL

The only path to MAJOR would be if @deep-name decides:

- `MemoryCommitment` should be a required field on an existing schema (e.g., `ReputationEvent.evidence: MemoryCommitment`). Today it would be optional.
- Existing `ChainBoundHash` should be deprecated/renamed in favor of new naming. The audit (`existing-surface-audit.md`) recommends keeping `ChainBoundHash` as-is.
- The new memory module forces a re-organization of existing modules.

If any of those become true, the work bundles into v9.0.0 (Q4 in `open-questions-for-deep-name.md`).

## Forward-compatibility considerations

### Event envelope extensibility

Per playbook §9.2, the `MemoryArtifact.kind` enum is the most likely extensibility hotspot. Two options:

**Option A — closed enum:** `kind: 'episodic_summary' | 'reflection' | 'skill' | 'policy' | 'profile' | 'observation_log'`. Adding a new kind in the future is a MINOR. Old consumers reject unknown kinds at validation time.

**Option B — open string with documented well-known values:** `kind: string` with documentation listing the well-known values. Old consumers ignore unknown kinds. New kinds can ship in a PATCH.

This RFC recommends **Option A** for v1 (strictness > forward compatibility for security-sensitive surfaces; playbook §9.1). @deep-name to confirm.

### CAIP-2 chain-id namespace evolution

CAIP-2 already supports unknown namespaces by design (`namespace:reference` syntax). New chains can be supported without a Hounfour change, as long as the validator builtin accepts any well-formed CAIP-2 string. This is intentional and documented in `candidate-schemas.md`.

### Storage scheme enum

`StoragePointer.scheme` is also a closed enum. Adding `iroh`, `bittorrent`, `web5/dwn`, or other future protocols is a MINOR. @deep-name to confirm enum strictness vs. open-string.

## Migration check (`npm run check:migration`)

When the implementation lands:

- The migration check will see net-new schemas, no deletions, no renames. Expected to pass cleanly.
- `MIGRATION.md` will need a new section documenting the additive nature of v8.4.0 (or v9.0.0 if bundled).
- Downstream consumers do not need to migrate anything — v8.3.x clients continue to work; the new schemas are simply available to those that opt in.

## Semver-check tool expectations

When implementation lands:

- `npm run semver:check` against `v8.3.1` should report MINOR.
- Any constraint that re-validates an existing payload as invalid would force MAJOR — the proposed cross-field constraints are scoped to the new schemas only, so this should not occur.

## Risks to this analysis

1. **Hidden coupling in existing constraints.** Some existing constraint file might inadvertently require `MemoryCommitment` once the schema exists (e.g., a future `ReputationEvent.evidence` field). @deep-name should re-check at implementation time.
2. **Generator output stability.** Adding new schemas changes the JSON Schema 2020-12 output set. The `npm run schema:check` step will flag this as expected; no existing generated schema bytes should change.
3. **Vector regeneration.** No existing vectors should change. Net-new vectors land under `vectors/memory-commitment/`.
4. **Release integrity.** `RELEASE-INTEGRITY.json` will need regeneration. This is part of the approved-implementation flow, not the draft pass.

## Final note

This analysis is the most likely blocker for @deep-name agreement. If the audit (`existing-surface-audit.md`) is wrong about something already existing — or right about something that should be deprecated — the version impact changes. @deep-name verification of the audit comes first; the semver verdict follows.
