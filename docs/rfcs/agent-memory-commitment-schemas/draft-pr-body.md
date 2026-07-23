# Draft PR Body — `[DRAFT][PROTOCOL PROPOSAL] Agent memory & commitment schemas`

This is the body for the eventual `[DRAFT][PROTOCOL PROPOSAL]` PR that will wrap the planning artifacts in `docs/rfcs/agent-memory-commitment-schemas/`. Per playbook §11. Use this body when the time comes to open the PR — only after @deep-name signals that PR-level review is preferred over issue-level review (Q10).

---

# [DRAFT][PROTOCOL PROPOSAL] Agent memory & chain-agnostic commitment schemas

## Status

Draft only. Do not merge. No schema/code changes are approved yet.

This PR contains planning artifacts for a possible Hounfour protocol change. It does not modify any TypeScript source, generated JSON Schema, constraints, vectors, dist output, package metadata, lockfiles, version files, changelog, migration docs, or release integrity. It does not commit `JANI_STYLE_HOUNFOUR_PLAYBOOK.md` or `agent_memory_decentralized_storage_loa_context_report.md` (kept locally as temporary source material).

## Summary

Adds a documentation-only RFC packet under `docs/rfcs/agent-memory-commitment-schemas/` proposing four new shared schemas (`MemoryArtifact`, `StoragePointer`, `ChainCommitment`, `MemoryCommitment`) that envelope agent memory artifacts, off-chain storage pointers, and chain-agnostic commitments — derived from the parent product-context report in loa-dixie and the runtime RFC/PR work in loa-finn.

The packet includes:

- An existing-surface audit identifying that **6 of the report's 11 candidate schemas already exist** in Hounfour and must be reused, not redefined.
- Hypothetical (non-implemented) schema shapes for the genuinely new surface.
- Full cross-repo impact map across loa-finn, loa-dixie, loa-freeside, loa-main.
- First-pass MINOR semver analysis (candidate v8.4.0; not proposed).
- Legacy → shadow → enforce migration plan.
- Ten open questions blocking implementation, addressed to @deep-name.

## Related issues

- Tracking: 0xHoneyJar/loa-hounfour#57
- Parent product/context proposal: 0xHoneyJar/loa-dixie#89
- Downstream:
  - Finn RFC: 0xHoneyJar/loa-finn#155
  - Finn PR: 0xHoneyJar/loa-finn#156
  - Freeside: (no issue yet)
  - Loa-main: (no issue yet — open only if eval coupling is desired)

## What changed

Planning artifacts only:

- `docs/rfcs/agent-memory-commitment-schemas/README.md`
- `docs/rfcs/agent-memory-commitment-schemas/proposal.md`
- `docs/rfcs/agent-memory-commitment-schemas/existing-surface-audit.md`
- `docs/rfcs/agent-memory-commitment-schemas/candidate-schemas.md`
- `docs/rfcs/agent-memory-commitment-schemas/cross-repo-impact.md`
- `docs/rfcs/agent-memory-commitment-schemas/compatibility-and-semver.md`
- `docs/rfcs/agent-memory-commitment-schemas/migration-rollout.md`
- `docs/rfcs/agent-memory-commitment-schemas/open-questions-for-deep-name.md`
- `docs/rfcs/agent-memory-commitment-schemas/draft-issue-body.md`
- `docs/rfcs/agent-memory-commitment-schemas/draft-pr-body.md`

## What did not change

- No `src/` schema changes
- No `constraints/` changes
- No generated `schemas/` changes
- No `vectors/` changes
- No `dist/` changes
- No `tests/` changes
- No `package.json` / lockfile changes
- No `src/version.ts` change
- No `CONTRACT_VERSION` / `MIN_SUPPORTED_VERSION` change
- No `SCHEMA-CHANGELOG.md` changes
- No `MIGRATION.md` changes
- No `RELEASE-INTEGRITY.json` changes
- No `.claude/` changes
- `JANI_STYLE_HOUNFOUR_PLAYBOOK.md` and `agent_memory_decentralized_storage_loa_context_report.md` are NOT committed (kept locally as temporary source material for this draft pass)

## Protocol question

Should this become:

- [x] New Hounfour schemas (4 candidates: MemoryArtifact, StoragePointer, ChainCommitment, MemoryCommitment)
- [ ] New optional fields on existing schemas
- [x] New constraint files (4 candidates)
- [ ] New constraint builtins (TBD per Q5)
- [ ] New event envelope
- [ ] Downstream-only feature, no Hounfour change
- [x] RFC only at this stage
- [ ] Not now

## Cross-repo impact

| Repo | Impact | Open issue |
|---|---|---|
| loa-finn | Producer (memory distiller, storage adapter, chain anchor); consumer for replay/audit | #155, #156 |
| loa-freeside | Memory transparency UI; AccessPolicy gating | (to open) |
| loa-dixie | Knowledge/oracle ingestion of public memory artifacts; research-memory producer | #89 |
| loa-main | Eval harness consumer (optional) | (open only if needed) |

## Tests

Not run because this is planning-only.

If approved, expected tests/checks:

- `npm run typecheck`
- `npm run test`
- `npm run schema:generate`
- `npm run schema:check`
- `npm run semver:check`
- `npm run vectors:check`
- `npm run check:migration`
- `npm run schemas:validate`
- `npm run check:constraints`
- `npm run check:all`
- `npm run build`

## Review request

@deep-name please review:

1. Repo ownership boundary (does this belong in Hounfour at all? — `proposal.md` §2).
2. Schema duplication risk — especially the audit's claim that six of the eleven candidates already exist (`existing-surface-audit.md`).
3. Compatibility/versioning risk — first-pass MINOR or bundle into v9.0.0? (`compatibility-and-semver.md`, Q4).
4. Downstream issue map — do Freeside and Loa-main issues need to exist before any implementation?
5. The ten open questions in `open-questions-for-deep-name.md`.
6. Whether implementation should proceed, revise, or stop.
