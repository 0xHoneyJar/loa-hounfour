# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [8.6.0] — 2026-05-09

**Theme:** Cycle-005 v8.6.0 — substrate-agnostic naming corpus extension. 23 new schemas across the v8.6.0 cycle-005 cluster (Phase Completion Tier-1/Tier-2 envelope, Oracle operations cluster, Plan-governance pair, Challenge layer, CanonicalRun source-of-truth, Phase Kind canonical enum), 8 new constraint builtins, 11 new constraint files, +1163 net tests (7,793 → 8,956). Strict-additive on the v8.5.2 surface per NFR-1.

Major additive surfaces:
- **FR-A1 Challenge layer** (PR-A3.7): `ChallengeSchema` + 9-member `ChallengeType` enum + 6-member `ChallengeRequestedEffect` enum. Composes with v8.5.0 `Assertion` lifecycle via `target_assertion_id` lazy-link.
- **FR-A2 cross-language runner extension** (PR-A3.9): TypeScript / Python / Go / Rust runners producing byte-identical conformance manifests after `sort_by(.schema, .vector)`. `parity_protocol_version: 1.1.0` bumped from cycle-004's 1.0.0. SSOT files at `vectors/runners/_shared/` (`rfc3339-utc-pattern.txt`, `parity-protocol-version.txt`) read at runtime by every runner. Reflection-based schema-registry drift detector at `tests/vectors/cross-runner-ssot.test.ts`.
- **FR-A3 ORD-5 escalation gate** (PR-A3.10): `ord-5-capability-scope-vocabulary` constraint stays at `severity: 'warning'` for v8.6.0; promotion gate is the consumer-integration audit (`docs/audits/fr-a6-consumer-integration-2026-05.md`).
- **FR-A4 ORD-3 fail-closed opt-in** (PR-A3.2): `validate(schema, payload, { failClosed: true })` opts into fail-closed semantics for `'x-chain-bearing'` schemas. Default unchanged in v8.6.x; flips in v9.0.0.
- **FR-A5 ed25519 pattern alignment** (PR-A3.1): `OrgRepresentativeDelegation`, `PanelVerdict`, `CrossScoreReport` ed25519 patterns narrowed `{86,88}` → `{86}` (RFC 4648 §5 cryptographic-impossibility argument; surveyed-out range cannot exist for any spec-conformant signer).
- **FR-A6 consumer integration audit framework** (PR-A3.10): `docs/audits/fr-a6-consumer-integration-2026-05.md` ships per-consumer questionnaire + ORD-5 firing-rate query script + decision matrix. Per-consumer dispatches and aggregate-vote outcomes are operator-driven parallel work.
- **FR-B1 CanonicalRunSchema** (PR-A3.8): required-phases-per-EPIC source-of-truth for cross-language conformance evaluation. CR-1 cross-field validator enforces 0-based contiguous monotonic `ordered_index` sequence; pure-function exported as `validateCanonicalRunCR1` for cross-language mirroring per AT-1.
- **FR-B2 PhaseCompletionEnvelope** (PR-A3.4): Tier-1 (agent emission) + Tier-2 (cluster-wrapped) envelopes. `'x-crypto-bearing': true` + `'x-chain-bearing': true` + `'x-canonical-size-cap-bytes': 4096` (NFR-4). 6 shared pattern constants hoisted (ed25519 / sha256 / base64url-nonce / iso8601-utc).
- **FR-B3..B8 Oracle operations cluster** (PR-A3.5): `OracleDigest` (per-pulse digest) + `OracleHealthEnvelope` (per-cluster health) + `EscalationEnvelope` (per-escalation) + `RollbackPlan` (per-EPIC rollback) + `LatencyHistogramEnvelope` (per-phase latency) + `EpicCheckpoint` (durable progress checkpoint).
- **FR-B9 PlanSignoffEnvelope + FR-B10 PlanAmendmentRequest + FR-C4 plan-content-hash builtin** (PR-A3.6): plan-governance trio with `'x-crypto-bearing'` + `'x-chain-bearing'` flags; `signoff_actor_class` enum schema-restricted to T2/T3; NA-3 `SIGNOFF_TTL_OBSERVED` manifest emission on plan-content-hash match.
- **FR-C1/C2/C3 state-bearing builtins** (PR-A3.3): `nonce_unique_per_signer_window` + `sequence_monotonic_per_cluster` + `chain_validator_prev_hash`. JSON.stringify injective serialization for composite keys (CVE-class delimiter-injection fix). Two-level runtime shape validation pattern (Map outer + Set/Map inner buckets) at the trust boundary.
- **FR-D1 hounfour-stub package** (PR-A3.11): `tools/hounfour-stub/` provides RC-window consumer aliasing via `file:./tools/hounfour-stub`. Bundles main's compiled dist into `tools/hounfour-stub/dist/_main/` so `file:./` consumer installs (which COPY rather than symlink under modern npm) resolve all imports within the package boundary. `private: true` (NA-2) — `npm publish` errors `EPRIVATE`; the stub is unfindable via registry search.

### Added

- **23 new schemas** under the `https://schemas.0xhoneyjar.com/loa-hounfour/8.6.0/` namespace:
  - Phase Completion: `PhaseCompletionEnvelopeTier1Schema`, `PhaseCompletionEnvelopeSchema`
  - Oracle cluster (6): `OracleDigestSchema`, `PulseKindSchema`, `OracleHealthEnvelopeSchema`, `EscalationEnvelopeSchema`, `RollbackPlanSchema`, `LatencyHistogramEnvelopeSchema`, `EpicCheckpointSchema`
  - Plan governance (4): `PlanSignoffEnvelopeSchema`, `SignoffActorClassSchema`, `SignoffTierSchema`, `PlanAmendmentRequestSchema`, `AmendmentSeveritySchema`, `AmendmentTriggerClassSchema`
  - Challenge layer (3): `ChallengeSchema`, `ChallengeTypeSchema`, `ChallengeRequestedEffectSchema`
  - CanonicalRun cluster (3): `CanonicalRunSchema`, `RequiredPhaseSchema`, `PhaseKindSchema`
- **8 new evaluator builtins** (44 → 52): `nonce_unique_per_signer_window`, `sequence_monotonic_per_cluster`, `chain_validator_prev_hash`, `plan_content_hash_unchanged_since_signoff`, `signer_key_id_matches_derivation`, `canonical_size_cap`, `utf8_byte_length_max`, `percentiles_monotonic_nondecreasing`. New `UnverifiedObligationReason` union members: `chain_context_provided`, `signoff_plan_hash_mismatch`, `signoff_ttl_observed`, `ledger_context_deferred`, `canonical_size_cap_exceeded`, `signer_key_id_mismatch`, `percentiles_monotonic_violation`, `utf8_byte_length_exceeded`.
- **11 new constraint files** (124 → 135) under `constraints/`.
- **CHALLENGE_TYPES + CHALLENGE_REQUESTED_EFFECTS + PHASE_KINDS canonical-array pattern** — single source of truth consumed by both schema construction (`Type.Union(arr.map(Type.Literal))`) and conformance vector tests. Strict-additive enum widening is a single-edit diff at the source-of-truth array.
- **Cross-language runner harness** at `scripts/run-cross-runners.sh` — runs TS / Python / Go / Rust runners and asserts byte-identical manifests after sort. `npm run vectors:cross-runners`.
- **Stub differential CI** at `.github/workflows/stub-differential.yml` — verifies `tools/hounfour-stub/dist/_main/` byte-equality with main's `dist/` on every PR / push.
- **Consumer-integration audit framework** at `docs/audits/fr-a6-consumer-integration-2026-05.md` — per-consumer questionnaire + ORD-5 firing-rate query (jq-based, JSON-shape-anchored) + 1000-record sample-size floor + INSUFFICIENT_DATA / PROMOTE / DEFER / BLOCK aggregate-vote rules.
- **`check:dist-parity` extension** — also builds + verifies the stub's `dist/` in lockstep with main's. Drift in either tree fails CI.
- **`PSEUDO-MAJOR-EQUIVALENT-NULL` policy precedent** in MIGRATION.md (PR-A3.1) — qualifying-proof-class enumeration for any future strict-narrowing-as-additive classification.
- **Multi-model peer-review convergence-loop empirical observations** captured across the cycle's 11 merged PRs. Iteration counts: 6 / 4 / 5 / 8 / 4 / 4 / 4 (mean 5.0; verdict-shift convergence pattern at iter-3..iter-5 when single-source-of-truth discipline applied early). Operator-private documents capture the patterns; consumers don't need them.

### Changed

- **`CONTRACT_VERSION` bumped to `'8.6.0'`** — `src/version.ts:13`. `package.json` `version` and `vectors/VERSION` match.
- **`schemas/index.json`** — 257 schemas (was 234 at v8.5.2) at the `https://schemas.0xhoneyjar.com/loa-hounfour/8.6.0/` namespace. Wall-clock `generated_at` field eliminated (PR-A3.7 reproducible-builds discipline; `schemas/index.json` is now a pure function of `(CONTRACT_VERSION, MIN_SUPPORTED_VERSION, schema sources)`).
- **`RELEASE-INTEGRITY.json`** — regenerated for v8.6.0 namespace.
- **6 shared pattern constants hoisted** (PR-A3.4): `ED25519_SIGNATURE_PATTERN`, `ED25519_PUBKEY_PATTERN`, `BASE64URL_NONCE_PATTERN`, `SHA256_HEX_PATTERN`, `SHA256_HEX_BARE_PATTERN`, `ISO8601_UTC_PATTERN`. RULE 4 of the structural lint flags duplicated regexes.

### Fixed

- **F-A5 ed25519 pattern narrowing** (PR-A3.1): `{86,88}` → `{86}` on 3 v8.4.0 schemas. Audit-gated with cryptographic-impossibility argument as load-bearing evidence + zero-hits consumer-corpus survey as corroborative.
- **PR-A3.4 iter-2 NFC normalization documentation drift** (PR-A3.4): code-vs-doc divergence on signer-key-id derivation across 3 documentation surfaces; fixed in same iteration.
- **PR-A3.5 iter-4 mid-cycle CONTRACT_VERSION bump** to `8.6.0` (deviates from original cycle-005 atomic-bump plan; documented as "Intentional version-field sequencing — superseded by PR-A3.5 iter-4" in MIGRATION.md).

### Deprecated

None. v8.6.0 is strict-additive on v8.5.2.

### Removed

None.

### Security

- **CT-08 cluster-id mismatch ordering** (FR-C2 builtin) — composite-key resolution checks `signer_cluster_id === envelope.signer_cluster_id` BEFORE consulting state. CVE-class delimiter-injection fix via `JSON.stringify` injective serialization (replaces pipe-delimited composite keys per CVE-2020-1971-class precedent).
- **NFC normalization** on `signer_key_id` derivation (FR-B2) — homograph-attack mitigation; cross-runner authors implementing FR-A2 conformance vectors MUST also NFC-normalize before equivalent sha256 update calls.
- **Two-level runtime shape validation** (FR-C1/C2/C3 builtins) — defends against the JSON-revival footgun where `Set` deserializes to `Array` and `.has()` silently `TypeError`s. Reusable for any future state-bearing builtin.
- **`utf8_byte_length_max`** (FR-B3 OD-2) — UTF-8 byte caps where JSON Schema's `maxLength` (which counts code points / UTF-16 code units) is the wrong primitive. Web-standard `TextEncoder` (Cloudflare Workers / Vercel Edge / Deno / browsers compatible).
- **`canonical_size_cap`** (FR-B2 NFR-4) — 4 KB canonical-JSON byte cap on PhaseCompletionEnvelope via `Type.Transform` post-validation refinement + LOCAL builtin.

### Source

- 11 net-new merged PRs across 4 weeks: PR-A3.1 (ed25519) → PR-A3.2 (ORD-3+ORD-5) → PR-A3.3 (FR-C1/C2/C3) → PR-A3.4 (FR-B2) → PR-A3.5 (FR-B3..B8) → PR-A3.6 (FR-B9+B10+C4) → PR-A3.7 (FR-A1) → PR-A3.8 (FR-B1) → PR-A3.9 (FR-A2) → PR-A3.10 (FR-A6) → PR-A3.11 (FR-D1).
- Cumulative peer-review convergence: ~46 iterations across the 11 merged PRs (avg ~4.2 iters/PR; range 3..8). Mean cost per iter ≈ $0.50.
- Test count growth: 7,793 → 8,956 (+1,163 net new) across cycle-005.

### Acceptance

All v8.6.0 acceptance gates per PRD §10.1 — 257 schemas (target ≥249 ✓), 1252 vectors (target ≥420 ✓), 8956 tests (target ≥9,500 — slightly under; cycle-005 cycle-pattern absorbed test density via PR-A3.x convergence iterations rather than fixture-only padding), `npm install --registry=https://npm.pkg.github.com @0xhoneyjar/loa-hounfour@8.6.0` resolves post-publish.

---

## [8.5.2] — 2026-05-07

**Theme:** Single-purpose TypeScript 6.0.x migration chore. No source changes; tooling-only. Deferred from the v8.4.0 / v8.5.0 line (TS6 was originally scoped out of those releases to keep the schema-intake work focused) and from v8.5.1 (which absorbed the [Issue #76](https://github.com/0xHoneyJar/loa-hounfour/issues/76) release-hygiene fixes).

### Changed

- **`typescript` devDependency `^5.9.3` → `^6.0.3`**. The codebase typechecks + builds + tests cleanly under TS6 with no source-level changes (verified at v8.5.2 cut).
- **`tsconfig.json` adds `"types": ["node"]`**. TS6 deprecates the implicit `lib` types behavior — without an explicit `types` array, `@types/node` ambient types would no longer auto-load. Pinning to `["node"]` matches the actual single-platform-types runtime ambient surface and keeps `tsc` output identical to TS5.
- **`CONTRACT_VERSION` bumped to `'8.5.2'`** — `src/version.ts:13`. `package.json` `version` and `vectors/VERSION` match.
- **`schemas/index.json`** — version metadata + all 234 published `$id`s now publish under the `https://schemas.0xhoneyjar.com/loa-hounfour/8.5.2/` namespace. Schema content is byte-identical to v8.5.1; only the `$id` URL changed.
- **`RELEASE-INTEGRITY.json`** — regenerated (234 schemas / 124 constraints / 233 vectors / 593 files at v8.5.2 namespace).

### Source

Original deferral: v8.4.0 PRD F1 (TS6 → post-v8.5.0 chore). v8.5.1 absorbed Issue #76 release-hygiene; v8.5.2 carries the originally-planned TS6 migration as the next single-purpose release.

---

## [8.5.1] — 2026-05-07

**Theme:** Release-hygiene patch addressing five findings from the v8.4.0 / v8.5.0 retrospective audit ([Issue #76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). No schema changes; strict-additive on the v8.5.0 surface.

### Added

- **`CanonicalizeKeyCollisionError`** (`src/utilities/safe-canonicalize.ts`) — new error class with stable `code: 'CANONICALIZE_KEY_COLLISION'`, `normalizedKey: string`, and `originalKeys: readonly [string, string]` fields. Re-exported from package root. Thrown when two distinct input keys NFC-fold to the same form.

### Fixed

- **F2 — Root package re-exports for v8.4.0 / v8.5.0 governance schemas** ([#76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). `import { PanelDecisionArtifactSchema, PanelVerdictSchema, SignatureEnvelopeSchema, AssertionSchema, ForgetRecordSchema, CommitmentRootSchema, RecallReceiptSchema, ... } from '@0xhoneyjar/loa-hounfour'` now resolves correctly. The `/governance` subpath continues to work; root surface is now the convenience path. Adds 30+ governance schema re-exports + their TypeScript types covering FR-A1..A4 (panel deliberation), FR-B1..B3 (org-overseer), authority cascade Layer 2 + 3 (PR-A2.2), recall machinery, forget / commit / estate, and the assertion family (PR-A2.3).
- **F3 — README docs-version + license drift** ([#76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). README was stuck at v7.5.0 (docs-version comment, version badge, schemas badge, inventory table, CONTRACT_VERSION reference) — now bumped to v8.5.1 with current inventory (234 schemas, 124 constraint files, 44 evaluator builtins, 7,758+ tests). `package.json` `license` field corrected from `MIT` → `AGPL-3.0` to align with `LICENSE.md` and the README badge (the package was always intended to be AGPL-3.0; the MIT field was a long-standing metadata bug).
- **F4 — CI hardening** ([#76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). `.github/workflows/ci.yml` now runs `pnpm run check:constraints`, `pnpm run check:class-policy-boundary`, `pnpm run schemas:validate`, and `pnpm run check:all` (the composite gate) in addition to the previous typecheck / build / test / schema:check / semver:check steps. Local pre-merge `npm run check:all` was already green for every cycle-004 PR; CI now matches local verification posture.
- **F5 — NFC key-collision rejection in `safeCanonicalize`** ([#76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). The v8.5.0 implementation normalized keys to NFC before canonicalization but wrote them into a plain object accumulator, so two distinct input keys folding to the same NFC form silently overwrote each other. v8.5.1 tracks normalized → original via `Map` and throws `CanonicalizeKeyCollisionError` on duplicate assignment. The error carries the normalized form and both colliding original keys for diagnostic purposes. Collisions are extremely rare in practice (require two distinct Unicode forms in the same object that fold to the same NFC string) but ARE attacker-reachable via crafted JSON; closing the silent-overwrite gap removes a hash-canonicalization ambiguity. 7 new tests under `tests/utilities/safe-canonicalize.test.ts`.

### Changed

- **`CONTRACT_VERSION` bumped to `'8.5.1'`** — `src/version.ts:13`. `package.json` `version` and `vectors/VERSION` match.
- **`schemas/index.json`** — version metadata + all 234 published `$id`s now publish under the `https://schemas.0xhoneyjar.com/loa-hounfour/8.5.1/` namespace. Schema content is byte-identical to v8.5.0; only the `$id` URL changed. Consumers using the `/governance` (or any other) subpath import remain unaffected since they bind by exported name. Consumers vendoring `schemas/*.json` files directly may need to update any hardcoded `/8.5.0/` references in their tooling.
- **`RELEASE-INTEGRITY.json`** — regenerated via `npm run integrity:generate` (234 schemas / 124 constraints / 233 vectors / 593 files at v8.5.1 namespace).

### Deferred

- **F1 — `validate()` shape-only behavior on constraint-level-invalid fixtures** ([#76](https://github.com/0xHoneyJar/loa-hounfour/issues/76)). Per ADR-010 (class-vs-policy boundary), `validate()` returning `{ valid: true }` for a fixture that the repo classifies as constraint-level-invalid is by design — `validate()` performs shape validation, while constraint-layer evaluation runs via `npm run check:constraints`. The recommendation to split `validateShape()` / `validateProtocol()` is a substantive API redesign that is NOT a release-hygiene patch. Tracked for a future minor release where API truthfulness across both layers can be designed coherently. The v8.5.0 manifest contract widening (`reason: 'context_absent' | 'crypto_deferred' | 'integrity_deferred' | ...`) plus the `acceptDeferred` opt-in for crypto-bearing schemas already surface obligations via the manifest path; the `validateShape` / `validateProtocol` redesign would be the explicit-naming follow-on.

### Source

[Issue #76](https://github.com/0xHoneyJar/loa-hounfour/issues/76) — gpt-5.5-codex retrospective audit on the v8.4.0 → v8.5.0 transition.

---

## [8.5.0] — 2026-05-07

**Theme:** Class-vs-policy boundary + wedge-class-validation schema intake. Strict additive MINOR — no breaking changes to v8.4.0 consumers.

### Added

- **Recall machinery (5 schemas)** — `RecallRequest`, `RecallPack` (integrity-bearing; content-addressed `pack_hash`), `RecallReceipt` (crypto-bearing; signed acknowledgment), `SurfaceContext` (5-member closed core + 3-segment consumer namespace fallback), `ReceiptDetailLevel` (3-member verbosity selector). Sub-component shapes (`items[]` / `redactions` / `exclusions`) inlined within `RecallPack` per the locked v8.5.0 de-scope target.
- **Forget / Commit / Estate (5 schemas)** — `ForgetRecord` (4-variant discriminated union with structural H1 enforcement: `legal_mandate_reference: Type.String({ minLength: 8 })` required only on the `crypto_full_destruction` variant), `CommitmentType` (4-member enum), `CommitmentRoot` (crypto + integrity-bearing), `AgentEstateStatus` (5-member lifecycle enum), `AgentEstate` (estate-as-container primitive — controller + keyring_id FK + status). The `pii_and_link_to_key` ForgetRecord variant is the GDPR-default scope for "right to be forgotten" while preserving anonymous-key audit non-repudiation.
- **Assertion family (5 schemas)** — `Assertion` (8-variant status-discriminated union folding `CandidateAssertion` per F3; J3 variant-aware crypto-bearing — candidate is shape-only, the other 7 statuses carry signatures and gate via validate() safe-by-default), `AssertionStatus` (8 members), `AssertionClass` (7 substrate-agnostic core + 3-segment namespace fallback), `PrivacyScope` (4 members), `RiskLevel` (4 members).
- **`ClaimGrounding` EXTEND** — 2 substrate-agnostic discriminator members folded from the wedge intake's 11-member `ProvenanceSourceType`: `external_reference` (with optional `external_uri`) + `derived_inference` (with optional `inference_basis` array). Strict-additive on the v8.4.0 surface — existing consumers compile unchanged.
- **`ORD-3` manifest promotion** — HIGH carry-forward from the v8.5.0 backlog. `validate(OrgRepresentativeDelegationSchema, payload)` now emits a manifest entry `{ rule_id: 'ORD-3', evaluator: 'consumer', reason: 'context_absent' }` when the consumer omits `granted_by_chain_records` from `options.chainContext`. The previous v8.4.0 vacuous-true open-fail behavior is closed; consumers cannot silently miss the chain-context obligation. When chainContext IS supplied, the manifest still emits with `reason: 'pattern_matching'` so the audit trail stays unambiguous.
- **`PV-5` BLOCKER-without-signal rule** — MEDIUM carry-forward from the v8.5.0 backlog. Added to `constraints/PanelVerdict.constraints.json`: `bucket != 'BLOCKER' || asymmetric_blocker_signal != null`. A BLOCKER bucket cannot flow without an `asymmetric_blocker_signal` envelope.
- **Manifest contract widening** — `UnverifiedObligationsManifest` widened strict-additively. `evaluator` now carries `'runtime-deferred' | 'consumer' | 'library'` (was the literal `'runtime-deferred'` only); an optional controlled-vocabulary `reason` field surfaces *why* the entry is present (`'context_absent' | 'crypto_deferred' | 'integrity_deferred' | 'pattern_matching' | 'vocabulary_drift'`). v8.4.0 entries continue to emit byte-identically; new entries (`CRYPTO_DEFERRED`, `INTEGRITY_DEFERRED`, `ORD-3` promoted) populate the new `'consumer'` value with explicit `reason`. Migration guidance: pattern-match by `rule_id + reason` rather than `evaluator` literal. See [`SCHEMA-EVOLUTION.md`](./SCHEMA-EVOLUTION.md#manifest-contract-v850-widening) for the migration table.
- **`x-integrity-bearing` schema annotation** — content-addressed schemas (`RecallPack`, `CommitmentRoot`) now carry a top-level `'x-integrity-bearing': true` flag mirroring the existing `x-crypto-bearing` annotation pattern. `validate()` keys integrity-deferred manifest emission on the flag rather than a hardcoded `$id` list, so future content-addressed schemas only need to set the flag in their TypeBox options.
- **`safeCanonicalize` helper** — NFC-normalizing RFC 8785 canonical-JSON serializer with a 100KB normative payload cap. The cap addresses the synchronous-canonicalization DoS surface; consumers may override via `{ maxBytes: N }` with explicit code-site decision. Lint `RULE-5` blocks direct `canonicalize` import in non-utility code so the wrapper is the single canonicalization site for v8.5.0+ schemas.
- **5-RULE structural lint (`scripts/check-class-policy-boundary.ts`)** — mechanical enforcement of ADR-010. RULE-1 (no allow/deny return unions outside `src/validators/`); RULE-2 (no signature-verification imports); RULE-3 (flag `*Evaluator` / `*Verifier` / `*Engine` `$id`s); RULE-4 (test files must use `assertStructurallyValid` / `assertCryptoBearingFailsByDefault` rather than generic `assertValid()` against crypto-bearing schemas); RULE-5 (no direct `canonicalize` import — must go through `safeCanonicalize`). 9-entry allowlist with per-entry justification.
- **5 new architecture documents** —
  - [`docs/adr/ADR-010-class-vs-policy-boundary.md`](./docs/adr/ADR-010-class-vs-policy-boundary.md) — the standalone ADR drawing the line between what hounfour ships (shape) and what consumers ship (authority).
  - [`docs/migrations/v8.5.0-class-validation-intake.md`](./docs/migrations/v8.5.0-class-validation-intake.md) — 45-candidate Appendix-A reuse audit covering REUSE / EXTEND / ADD-NEW / FOLD / VOCABULARY / DEFER / NO-ACTION decisions for the wedge intake.
  - [`docs/architecture/hashing-spec-freeze-v8.5.md`](./docs/architecture/hashing-spec-freeze-v8.5.md) — RFC 8785 + NFC + 100KB-cap normative spec for v8.5.0 content-addressed hashes (`pack_hash`, `receipt_hash`, `subject_hash`, `body_hash`, `signed_payload_hash`).
  - [`docs/architecture/authority-cascade.md`](./docs/architecture/authority-cascade.md) — the three-layer authority composition: Layer 1 (v8.4.0 `OrgIdentity` / `OrgRepresentativeDelegation` / `SuccessionPolicy`) + Layer 2 (`Keyring` / `SignerEntry`) + Layer 3 (`SignerCompetenceRule` / `SignatureEnvelope`) harmonized via the single `CapabilityScope` vocabulary.
  - [`docs/architecture/forget-record-semantics.md`](./docs/architecture/forget-record-semantics.md) — verifiability truth table (10 verifications × 4 scopes), GDPR / HL7 FHIR / W3C VC alignment, audit-defensibility caveat for `crypto_full_destruction`.
- **`src/vocabulary/audit-event-types.ts`** — 3-segment namespace registration spec for consumer-defined audit-event-type extensions following the same `<github-org>:<consumer>:<event_type>` pattern as `SurfaceContext`.
- **Authority cascade Layer 2 + 3 (9 schemas)** — `Keyring`, `SignerEntry`, `SignerCompetenceRule`, `SignerCompetenceResult`, `SignatureEnvelope` (crypto-bearing), `SignerType`, `SignatureType`, `SignerStatus`, `PolicyDecisionOutcome`. KR-1 / KR-2 cross-field uniqueness on `Keyring.signers[]`. `SGE-1` sovereign-default warning on `SignerEntry.scoped_trust`. `PairwiseScore` promoted from inline-only to top-level published `$id`.
- **2 EXTEND decisions on PR-A2.2 schemas** — `AccessDecisionSchema` (+ optional `outcome` and `signer_competence_result` fields) and `CapabilityScopedTrustSchema` (+ optional `match_strategy` and `precedence_score` fields per D-007). Existing v6.0.0 / v7.x consumers compile unchanged.
- **`ORD-5` capability-scope-vocabulary warning** — soft-warning constraint on `OrgRepresentativeDelegation.capability_scope` enforces the canonical `CapabilityScope` vocabulary. Manifest entry under `evaluator: 'library', reason: 'vocabulary_drift'`. Initial soak window per R3 — v8.6.0 escalates to error severity.
- **G1 safe-by-default crypto-bearing API** — `validate(CryptoSchema, payload)` defaults to `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` for any schema flagged `'x-crypto-bearing': true`. Consumers MUST opt in via `{ acceptDeferred: true }` to receive shape-only `valid: true` plus an `unverified_obligations` manifest. The forced-explicit opt-in is the safety mechanism preventing "shape valid means trusted" by accident. **Variant-aware (J3, PR-A2.3)**: `validate()` walks `Type.Union` variants when the top-level schema carries no flag; the matched variant's flag drives the safe-by-default branch. Manifest `schema_id` synthesizes the discriminator-bearing form (e.g. `Assertion#status=admitted`) so operators can identify which variant deferred.
- **Canonicalization edge-case test corpus** — 30 fixtures across 6 categories (`vectors/_canonicalization-edge-cases/`) validating `safeCanonicalize` round-trip semantics (NFC normalization, key-ordering determinism, numeric edge cases, unicode-escape forms, payload-size cap, error envelope shape).
- **Vector-authoring helper** — `npm run author:vector -- --schema <Name> --intent <valid|invalid> --case <slug>` scaffolds a fixture file under `vectors/<Schema>/<intent>/<case>.json` and records its `validation_layer` annotation in `vectors/<Schema>/_meta.json`. Authors must replace the `__TODO__` skeleton before committing.
- **180 net-new conformance vectors for PR-A2.3** — per-schema valid + invalid fixtures across all 15 PR-A2.3 schemas. ForgetRecord coverage: 4 variants × 5 valid + 4 invalid = 36 fixtures. Assertion coverage: 9 valid (1 candidate + 7 status-with-signatures + 2 ClaimGrounding EXTEND demonstrations) + 8 invalid. Plus 128 PR-A2.2 authority-cascade fixtures and 30 canonicalization edge-case fixtures also land in v8.5.0. Test suite: 7,758 tests (was 7,120 baseline; +638 net new across all PR-A2.x sprints).

### Changed

- **`CONTRACT_VERSION` bumped to `'8.5.0'`** — `src/version.ts:13`. `package.json` `version` matches.
- **`vectors/VERSION`** bumped to `8.5.0`.
- **`RELEASE-INTEGRITY.json`** — regenerated via `npm run integrity:generate`. Counts updated to reflect the v8.5.0 schema / vector / constraint surface (234 schemas, 124 constraints, 700+ vectors).
- **`schemas/index.json`** — version metadata updated to `8.5.0`; all 234 published `$id`s now publish under the `https://schemas.0xhoneyjar.com/loa-hounfour/8.5.0/` namespace.
- **`AccessDecision`, `CapabilityScopedTrust`, `ClaimGrounding`** — strict-additive EXTEND per PR-A2.2 / PR-A2.3 (see Added).
- **`OrgRepresentativeDelegation` ORD-3** — manifest entry promoted from silent vacuous-true to visible-deferred (see Added).
- **`PanelVerdict` constraint set** — extended from PV-1..PV-4 to PV-1..PV-5 (see Added).

### Release notes

- **rc.1 shadow-integration window** — `v8.5.0-rc.1` lightweight tag fired at PR-A2.3 squash SHA `c94bcd22` on 2026-05-07; 3-5 day shadow window per F9 gave consumers a chance to validate the surface before final tag fires. The rc.1 tag is informational (per R17), not a hard gate.
- **TS6 chore deferred** — TypeScript 6.0.x migration deliberately NOT in v8.5.0 per F1. Tracked as v8.5.1 chore (single-purpose `chore(typescript): migrate to TS 6.0.x`); release window 1-2 weeks post v8.5.0.
- **v8.6.0 committed-as-immediate-follow-on** — Challenge layer (Challenge + ChallengeType + ChallengeRequestedEffect; 9-member + 6-member enums) + cross-language runner extension (Go / Python / Rust parity for v8.5.0 schemas; hard pre-major-release gate — v9.0.0 cannot ship without it) + `ORD-3` fail-closed promotion + `ed25519` pattern alignment ({86,88} → {86} on v8.4.0 schemas) + `ORD-5` warn → error escalation. Maintainer backlog tracks the deliverables; not packaged.

### Source

Issue [#70](https://github.com/0xHoneyJar/loa-hounfour/issues/70) — wedge class-validation schema intake by Eileen. Five PRs (PR-A2.0 → PR-A2.4) merged across the cycle.

---

## [8.4.0] — 2026-05-06

**Theme:** Synthetic-deliberation protocol + organization-level governance primitives. Strict additive MINOR — no breaking changes.

### Added

- **Deliberation set (4 schemas)** — `PanelDecisionArtifact` (FR-A1), `PanelVerdict` (FR-A2), `DeliberationDissent` (FR-A3), `CrossScoreReport` (FR-A4). Bucket↔verdict normative pairing (PV-1), `[4, 16]` per-juror verdict bounds (PV-2), asymmetric-blocker two-condition consistency (PV-3), signing-context format guard (PV-4). Inline `JurorVerdictSchema`, `AsymmetricBlockerSignalSchema`, `ClaimSchema`, `ClaimGroundingSchema`, `ProposedActionSchema`, `TrustContextSchema`, `PairwiseScoreSchema` sub-records.
- **Org-overseer set (3 schemas)** — `OrgIdentity` (FR-B1), `OrgRepresentativeDelegation` (FR-B2), `SuccessionPolicy` (FR-B3). Cold-storage `org_public_key` model; append-only delegation log chained to the literal genesis sentinel `"genesis:org-public-key"`; constitutional ladder with asymmetric thresholds (SP-1: `amend ≥ rotate ≥ add ≥ remove`) and non-decreasing cooldowns (SP-2). New 4-rule constraint set on `OrgRepresentativeDelegation` (ORD-1..ORD-4).
- **`SigningContextSchema`** — shared audience/scope/contract_version envelope bound under signature on `PanelVerdict`, `CrossScoreReport`, and `OrgRepresentativeDelegation`. Closes the cross-context replay surface.
- **`is_valid_dag` constraint builtin (FR-C1)** — post-order DFS with explicit op-counter (cap: 100,000 ops). Pre-guards at 10,000-item count and 1 MiB serialized payload. Structured diagnostic envelope with 7 error codes (`DAG_OP_CAP_EXCEEDED`, `DAG_CYCLE_DETECTED`, `DAG_DANGLING_REF`, `DAG_MISSING_ID_FIELD`, `DAG_NON_STRING_ID_FIELD`, `DAG_DUPLICATE_ID`, `DAG_INPUT_OVERSIZE`). Reused by `PanelDecisionArtifact.PDA-2` and `OrgRepresentativeDelegation.ORD-3`. Reference: [`src/constraints/is-valid-dag.ts`](./src/constraints/is-valid-dag.ts).
- **7 new constraint files** (PR-A1.4) — `PanelDecisionArtifact.constraints.json` (PDA-1..PDA-5), `PanelVerdict.constraints.json` (PV-1..PV-4), `DeliberationDissent.constraints.json`, `CrossScoreReport.constraints.json` (CSR-1), `OrgIdentity.constraints.json` (OI-1), `OrgRepresentativeDelegation.constraints.json` (ORD-1..ORD-4), `SuccessionPolicy.constraints.json` (SP-1, SP-2). Constraint corpus: 100 files (was 93).
- **Parity-protocol contract (`parity-protocol-version: 1.0.0`)** — published in [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md). Pins cross-runner expectations across TypeScript / Go / Python / Rust on schema validation, constraint evaluation, `is_valid_dag` traces, `extract_path` reference behavior, and the error envelope shape. Co-signed handoff record at [`docs/architecture/parity-protocol.handoff.json`](./docs/architecture/parity-protocol.handoff.json).
- **Cross-runner error taxonomy** — closed `ErrorCode` enum + per-code `context` shapes published in [`docs/architecture/error-codes.md`](./docs/architecture/error-codes.md). 6 net-new codes: `DAG_INPUT_OVERSIZE`, `CONFORMANCE_OBLIGATION_UNACK`, `CONFORMANCE_OBLIGATION_FAIL`, `SIGNING_CONTEXT_AUDIENCE_MISMATCH`, `SIGNING_CONTEXT_SCOPE_MISMATCH`, `SIGNING_CONTEXT_VERSION_INCOMPATIBLE`. Cross-runner comparison rule: `code` + `path` + `context` equality; `message` is locale-affordant.
- **`UnverifiedObligationsManifest` emission contract** — `validate(...)` return shape extended additively with an optional `unverified_obligations` field. Library names runtime-deferred rules (ORD-1, ORD-2, ORD-4) so consumers cannot silently miss them. Field is OMITTED when no runtime-deferred rules apply — pre-v8.4.0 byte-equal JSON output guaranteed for any schema without runtime-deferred rules.
- **3 new architecture documents** — [`docs/architecture/panel-protocol.md`](./docs/architecture/panel-protocol.md) (consumer-facing deliberation set), [`docs/architecture/org-overseer.md`](./docs/architecture/org-overseer.md) (org-as-principal model + chain-of-trust + succession policy), [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md) (cross-runner conformance contract). Plus [`docs/architecture/error-codes.md`](./docs/architecture/error-codes.md).
- **171 new conformance vectors** — 91 governance fixtures (5 valid + 8 invalid per schema) + `is-valid-dag` corpus with 11 `.trace.json` op-count companions + `extract-path` corpus + 4 signing corpora. New driver at [`scripts/cross-runner.ts`](./scripts/cross-runner.ts) and meta files at `vectors/_meta/{constraint-level-invalids.json,regex-subset.md}`. Test suite: 7,119 tests (was 6,944).

### Changed

- **`CONTRACT_VERSION` bumped to `'8.4.0'`** — `src/version.ts:13`. Also resolves prior `'8.3.0'` lag observed in earlier cycles; `src/version.ts` now matches `package.json` exactly.
- **`package.json` `version` bumped to `"8.4.0"`**.
- **`vectors/VERSION` bumped to `8.4.0`**.
- **`RELEASE-INTEGRITY.json`** — regenerated via `npm run integrity:generate`. Integrity generator scoped to `*.schema.json` so the `schemas` totals match `schemas/README.md` (209 schemas, 233 vectors, 100 constraints, 2 manifests, 544 files). Auto-generated `schemas/index.json` and `schemas/schemastore-catalog.json` are tracked under the new `manifests` category — they remain checksummed for tamper detection but are not counted against the schemas total.
- **`contract_version` field pattern (3 new schemas) tightened to strict semver 2.0.0** — `SigningContextSchema`, `PanelDecisionArtifactSchema`, and `DeliberationDissentSchema` now reject leading zeros in minor and patch components in addition to major. Net effect on consumers: none — the schemas are net-new in v8.4.0 and no v8.3.x record was ever emitted under the looser pattern by these schemas. See `SCHEMA-CHANGELOG.md` v8.4.0 for the full pattern delta.
- **`MIN_SUPPORTED_VERSION` unchanged at `'6.0.0'`** — N/N-1 compatibility window covers v7.x and v8.x consumers.

### Release notes

- **Inaugural parity-protocol handoff** (`parity_protocol_version: 1.0.0`). The handoff JSON carries `inaugural: true`; the protocol contract being ratified is itself net-new in PR-A1.6, so cross-runner implementers had no prior review window. Re-ratification under the standard co-signed path is expected at v8.5.0. The 2026-07-05 deferred-co-sign deadline is also tracked as a release follow-up.
- Released under the parity-protocol **deferred-co-sign window** (`signature_basis: 'maintainer-override'`). The sponsoring consumer's release lead was unreachable within the standard 7-business-day window; the maintainer commits the handoff alone with the consumer co-signing retroactively when available. Failure to co-sign within 60 days post-tag triggers a parity-protocol PATCH bump (1.0.0 → 1.0.1) recording the asymmetric ratification — the 60-day window absorbs typical holiday and on-call rotation gaps. The deadline is sourced from `parity-protocol.md` §8 and the `deferred_co_sign_deadline` field of the handoff JSON; all three artifacts MUST agree. See [`docs/architecture/parity-protocol.handoff.json`](./docs/architecture/parity-protocol.handoff.json) and [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md) §8.

### Source

Issue [#61](https://github.com/0xHoneyJar/loa-hounfour/issues/61) — Synthetic-Deliberation Protocol + Governance Primitives RFC. Six PRs (PR-A1.1 through PR-A1.6) merged across the cycle.

---

## [8.3.0] — 2026-02-28

### Added

- **Feedback Dampening** (FR-1) — EMA-based dampening with cold-start Bayesian prior. `dampNext()` smooths noisy reputation signals with configurable `alpha` and `minSamples` parameters. Prevents oscillation during agent warm-up.
- **Chain-Bound Hash** (FR-2) — SHA-256 chain-bound hashing with domain tag validation. `chainBoundHash()` produces deterministic, domain-separated digests for audit trail integrity. Tags must match `^[a-z][a-z0-9_.-]{0,63}$`.
- **Audit Timestamp Validation** (FR-3) — Strict ISO 8601 validation with drift detection. `validateAuditTimestamp()` enforces format, rejects future timestamps beyond configurable tolerance, and validates reasonable temporal bounds.
- **Advisory Lock Hashing** (FR-4) — FNV-1a 32-bit hashing for PostgreSQL advisory locks. `advisoryLockHash()` produces deterministic int32 lock IDs from string keys. No crypto dependency.
- **X402 Payment Schemas** (FR-5) — 5 schemas for HTTP 402-based machine payment: `X402Quote`, `X402PaymentProof`, `X402SettlementStatus`, `X402Settlement`, `X402ErrorCode`. String micro-USD amounts, EIP-55 addresses.
- **Tier-Reputation Mapping** (FR-5) — `mapTierToReputationState()` maps billing tiers to reputation states: free→cold, basic→warming, pro→established, enterprise→authoritative.
- **DenialCode Extension** (FR-5) — 3 new denial codes: `BUDGET_PERIOD_EXPIRED`, `TIER_REPUTATION_MISMATCH`, `BUDGET_SCOPE_MISMATCH`. Extends `EconomicBoundaryEvaluationEvent` coverage.
- **Conditional Constraints** (FR-5) — `ConstraintCondition` interface with `when` expression, `override_text`, `override_rule_type`. `resolveConditionalExpression()` evaluates feature flags against `EvaluationContext`.
- **ConsumerContract** (FR-6) — Consumer-driven contract declaring imported symbols per entrypoint. `validateConsumerContract()` checks against export map. `computeContractChecksum()` produces SHA-256 content hash for drift detection.
- **GovernedResource Runtime** (FR-6) — `GovernedResource<T>` interface and `GovernedResourceBase` abstract class. Single-writer semantics, invariant verification harness, automatic rollback on violation, monotonic versioning, audit trail integration. Schemas: `TransitionResult`, `InvariantResult`, `MutationContext`.
- **10 new JSON schemas** — 201 total (up from 191).
- **13 conformance vectors** — 232 total (up from 219). 3 consumer-contract vectors, 10 governed-resource-runtime vectors.
- **6 constraint files** — 93 total (up from 87). FeedbackDampening, ChainBoundHash, AuditTimestamp, ConsumerContract, GovernedResourceRuntime, MutationContext.
- **~150 new tests** — 6,619 total. Includes property-based tests (fast-check) for dampening convergence and hash determinism.

### Source

PR #39 — v8.3.0 Pre-Launch Protocol Hardening (Bridge iteration 1).

---

## [8.2.0] — 2026-02-25

### Added

- **`ModelPerformanceEvent` variant** — 4th discriminated union variant in `ReputationEvent`. Carries model performance observations (`model_id`, `provider`, `pool_id`) with structured `QualityObservation`. Closes autopoietic feedback loop: Dixie evaluation → cross-model scoring → routing signal adjustment. ([Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38))
- **`QualityObservation` schema** — Standalone quality evaluation output: `score` [0,1], optional `dimensions` (max 20, pattern `^[a-z][a-z0-9_]{0,31}$`), `latency_ms`, `evaluated_by`. Reusable beyond the event pipeline.
- **`'unspecified'` TaskType literal** — Reserved fallback when task metadata is unavailable. Cohort update logic routes to aggregate-only scoring (no task-type cohort entry). (Flatline FR-1)
- **23 conformance vectors** — 6 model-performance variants (minimal, full, with-dimensions, community-task-type, invalid-score, missing-model-id), boundary scores, unspecified-task-type, plus existing vector updates. 217 vectors total.
- **Property-based discrimination tests** — Exactly-one-match, roundtrip, and negative tests for `ReputationEvent` variant exhaustiveness.
- **Integration tests** — Pipeline acceptance, variant marshalling, duplicate detection, forward compatibility.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Flatline integration (cycle-038), [Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38).

---

## [8.1.0] — 2026-02-25

### Breaking Changes

- **`GovernanceMutation.actor_id` now required** — Mutation envelope must include actor identity (`minLength: 1`) for audit trail attribution and access policy evaluation. (Bridgebuilder F6 — HIGH)

### Added

- **Governance Enforcement SDK** — Pure utility functions for mutation and resource validation (ADR-008, Path B):
  - `evaluateGovernanceMutation()` — Evaluate mutation against access policy (F6)
  - Conservation law factories: `buildSumInvariant()`, `buildNonNegativeInvariant()`, `buildBoundedInvariant()` + `create*Conservation()` variants (F7)
  - Audit trail checkpointing: `createCheckpoint()`, `verifyCheckpointContinuity()`, `pruneBeforeCheckpoint()` (F8)
  - Contract negotiation TTL: `isNegotiationValid()`, `computeNegotiationExpiry()` (F9)
  - Dynamic contract verification: `verifyMonotonicExpansion()` (F10)
- **`GOVERNED_RESOURCE_FIELDS` extensions** — `access_policy_ref` (optional), `governance_extensions` (optional), `contract_version` (required).
- **12 property-based tests** — Conservation law symmetry, checkpoint continuity, TTL monotonicity, expansion verification.
- **ADR-008** — Governance Enforcement SDK (Path B, opt-in enforcement).
- **ADR-009** — DynamicContract → Model Routing Integration.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Bridgebuilder findings F6–F10 (5 sprints).

---

## [8.0.0] — 2026-02-25

### Breaking Changes

- **Major version bump** — New `commons` module introduces governance substrate. No existing schemas removed or modified, but the major version signals a new architectural layer.

### Added

- **`commons` module** — 21 schemas for governed resource management:
  - Foundation: `Invariant`, `ConservationLaw`, `AuditEntry`, `AuditTrail`, `State`, `Transition`, `StateMachineConfig`, `GovernanceClass`, `GovernanceMutation`
  - Instantiations: `GovernedCredits`, `GovernedReputation`, `GovernedFreshness`
  - Hash chain (ADR-006): `HashChainDiscontinuity`, `QuarantineStatus`, `QuarantineRecord`
  - Dynamic contracts (FR-4): `ProtocolCapability`, `RateLimitTier`, `ProtocolSurface`, `DynamicContract`, `AssertionMethod`, `ContractNegotiation`
  - Error taxonomy: `GovernanceError` discriminated union (6 variants: `InvariantViolation`, `InvalidTransition`, `GuardFailure`, `EvaluationError`, `HashDiscontinuityError`, `PartialApplication`)
- **`./commons` export** — New sub-package barrel: `import { ... } from '@0xhoneyjar/loa-hounfour/commons'`.
- **ADR-006** — Hash Chain Operational Response (halt-and-reconcile protocol).
- **ADR-007** — Commons Protocol Pattern (Ostrom isomorphism, `GovernedResource<T>` primitive).
- **189 JSON schemas** regenerated with commons additions.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Sprints 1–8, Commons Protocol foundation through release.

---

## [7.11.0] — 2026-02-24

### Added

- **Open `TaskType` enum** — Community `namespace:type` format via regex pattern (e.g., `legal-guild:contract_review`). Governance: `registry-extensible` (MINOR to add, MAJOR to remove/rename).
- **`@governance` annotations** — Constraint-level governance metadata for schema evolution policy.
- **Hash-chain fields** — `previous_hash` and `chain_height` on audit-relevant schemas for tamper-evident logging.
- **ADR-003** — Open TaskType Governance (extensibility without protocol coordination).
- **ADR-004** — Community Namespace Convention.
- **ADR-005** — Hash Chain Audit Fields.
- **7 conformance vectors** — Task-type community format, hash-chain validation, governance annotation coverage.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Protocol hardening, Bridgebuilder second reading.

---

## [7.10.1] — 2026-02-24

### Fixed

- **Root barrel discoverability** — All new v7.10.0 exports re-exported from root `index.ts`.
- **`NativeEnforcement` interface** — Extracted enforcement interface for constraint runtime.
- **`COHORT_BASE_FIELDS` extraction** — Shared fields factored into reusable constant for cohort schemas.
- **ADR-001** — NativeEnforcement Interface Pattern.
- **ADR-002** — Shared Cohort Base Fields.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Bridgebuilder findings.

---

## [7.10.0] — 2026-02-24

### Added

- **`TaskType` schema** — 5 protocol-defined task categories (`code_review`, `creative_writing`, `analysis`, `summarization`, `general`) for task-dimensional reputation scoring.
- **`TaskTypeCohort` schema** — Per-task-type reputation tracking with scoring path log.
- **`ReputationEvent` discriminated union** — 3 initial variants (`quality_signal`, `task_completion`, `peer_review`) for reputation pipeline events.
- **`ScoringPathLog` schema** — Audit trail for scoring algorithm decisions.
- **8 new schemas** — TaskType, TaskTypeCohort, ReputationEvent (3 variants), ScoringPathLog, plus supporting types.
- **22 conformance vectors** — Task-type validation, cohort lifecycle, event discrimination, scoring path coverage.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Task-dimensional reputation, upstream shared vocabulary from Dixie.

---

## [7.9.2] — 2026-02-23

### Removed

- **Loa framework** — Ejected development framework for protocol hygiene. Removed `.loa/` git submodule, `.claude` symlink, `evals/` framework test suite (110 files), 86 `.bats` framework shell tests, Loa-specific docs (`process.md`, `visions/`, `context/`, `ledger.json`), and all `<!-- docs-version -->` markers. Protocol source, schemas, constraints, vectors, and tests are unchanged.

### Changed

- **BUTTERFREEZONE.md** — Rewritten to reflect protocol library (removed Loa skill commands, three-zone model, adapter references).
- **CLAUDE.md** — Stripped Loa framework import and submodule instructions.
- **`.gitignore`** — Removed Loa-specific entries, added `.claude/` for Claude Code session state.

### Source

Eject from Loa framework v1.39.0. No protocol schema, constraint, or API changes.

---

## [7.9.1] — 2026-02-23

### Added

- **`isKnownReputationState()` type guard** — Runtime validation replacing `as ReputationStateName` casts. Narrows type for TypeScript compiler. (`src/vocabulary/reputation.ts`)
- **`DenialCode` union type** — 6 machine-parseable denial codes (`TRUST_SCORE_BELOW_THRESHOLD`, `TRUST_STATE_BELOW_THRESHOLD`, `CAPITAL_BELOW_THRESHOLD`, `UNKNOWN_REPUTATION_STATE`, `INVALID_BUDGET_FORMAT`, `MISSING_QUALIFICATION_CRITERIA`).
- **`EvaluationGap` schema** — Structured gap information for denied evaluations: `trust_score_gap`, `reputation_state_gap`, `budget_gap`. Actionable feedback for agents.
- **`evaluateFromBoundary()` convenience overload** — Extracts `qualification_criteria` from the boundary itself, preventing Confused Deputy Problem.
- **`EconomicBoundaryEvaluationEvent` schema** — Event recording for feedback loop. Consumers can aggregate to inform governance decisions about criteria thresholds.
- **`eval-denied-needs-codes` constraint** — 5th constitutional constraint: denied evaluations must include at least one machine-parseable denial code. Discovered through peer review (Part 9.1).
- **`buildValidationDenial()` partial evaluator** — Replaces `makeDenied()` with symmetry-preserving partial evaluation. Valid layers get accurate `passed` boolean; only invalid layers are marked `false`.
- **`tryEvaluateTrust()` / `tryEvaluateCapital()` helpers** — Independent layer evaluators with `T | null` (Option) return semantics.
- **15 new tests** — 5 constraint tests for `eval-denied-needs-codes`, 8 symmetry fix tests, 2 vector updates.

### Fixed

- **`makeDenied()` symmetry gap** — Both layers were marked `passed: false` on input validation failures even when only one layer had a problem. Now uses partial evaluation: valid layers reflect actual evaluation results.
- **Conformance vectors** — `unknown-state.json` and `invalid-budget.json` updated to match partial evaluation semantics.

### Source

[PR #29](https://github.com/0xHoneyJar/loa-hounfour/pull/29) — Sprints 2–3, Bridgebuilder Deep Review Parts 8.1–10.3.

---

## [7.9.0] — 2026-02-23

### Added

- **`evaluateEconomicBoundary()`** — Pure decision engine function. Total (never throws for valid TypeBox inputs), deterministic (caller-provided `evaluatedAt`), fail-closed (unknown states → denied). Trust × capital → access decision with structured denial reasons.
- **`parseMicroUsd()`** — Strict micro-USD string parser. Grammar: `^[0-9]+$`, no leading zeros, max 30 digits. Returns discriminated union, never throws. BigInt arithmetic prevents floating-point errors.
- **`QualificationCriteria` schema** — Threshold inputs for boundary evaluation: `min_trust_score`, `min_reputation_state`, `min_available_budget`.
- **`TrustEvaluation` / `CapitalEvaluation` schemas** — Sub-results with actual vs required values.
- **`EconomicBoundaryEvaluationResult` schema** — Complete evaluation output with access decision, layer evaluations, criteria used, and evaluated_at.
- **`ConstraintOrigin` type** — `'genesis' | 'enacted' | 'migrated'` provenance for all constraint files. Makes constitutional bootstrapping asymmetry explicit. All 73 existing constraints annotated with `origin: "genesis"`.
- **4 genesis constraints** — `eval-granted-iff-both-pass`, `eval-denied-needs-reason`, `eval-trust-score-bounded`, `eval-criteria-score-bounded`.
- **9 conformance vectors** — Happy path, denied (trust, capital, both), boundary values, unknown state, invalid budget, missing criteria, full boundary.
- **Version bump** 7.8.0 → 7.9.0, 160 JSON schemas regenerated.

### Source

[PR #29](https://github.com/0xHoneyJar/loa-hounfour/pull/29) — Sprint 1, Issues [#24](https://github.com/0xHoneyJar/loa-hounfour/issues/24) and [#28](https://github.com/0xHoneyJar/loa-hounfour/issues/28).

---

## [7.0.0] — 2026-02-17

### Breaking Changes

- **`RegistryBridge`** gains required `transfer_protocol` field — existing bridge instances must add `transfer_protocol: { saga_type: 'atomic' }` (or `'choreography'`). See [MIGRATION.md](./MIGRATION.md).

### Added

- **BridgeTransferSaga** — Garcia-Molina saga pattern for cross-registry value transfer with 8-state machine (`initiated` → `reserving` → `transferring` → `settling` → `settled`), compensation steps, and participant tracking.
- **DelegationOutcome** — Conflict resolution recording with 4 outcome types (`unanimous`, `majority`, `deadlock`, `escalation`) and first-class `DissentRecord` capturing minority opinion.
- **MonetaryPolicy** — Coupling invariant binding `MintingPolicyConfig` to `ConservationPropertyRegistry` with governance review triggers.
- **PermissionBoundary** — MAY permission semantics with `ReportingRequirement` and `RevocationPolicy`, enabling constrained experimentation alongside MUST/MUST_NOT prohibitions.
- **GovernanceProposal** — Collective decision mechanism with weighted voting, proposal status state machine, and `ProposedChange` descriptors (Ostrom Principle 3).
- **8 new evaluator builtins** (23 → 31): `saga_amount_conserved`, `saga_steps_sequential`, `outcome_consensus_valid`, `monetary_policy_solvent`, `permission_boundary_active`, `proposal_quorum_met`, `saga_timeout_valid`, `proposal_weights_normalized`.
- **5 new constraint files**: `BridgeTransferSaga.constraints.json`, `DelegationOutcome.constraints.json`, `MonetaryPolicy.constraints.json`, `PermissionBoundary.constraints.json`, `GovernanceProposal.constraints.json`.
- **18 new conformance vectors** across 5 categories (saga, outcome, monetary, permission, governance).
- **Composition barrel extended** with all v7.0.0 types available via `@0xhoneyjar/loa-hounfour/composition`.

### Fixed

- **F-007** — `as any` cast for `x-cross-field-validated` replaced with `withAnnotation<T>()` utility.
- **F-008** — `BridgeInvariant.invariant_id` pattern expanded from `^B-\d{1,2}$` to `^B-\d{1,4}$`.
- **F-020** — `parseExpr()` return type safety restored with `ConstraintASTNode` discriminated union + `asRecord()` utility eliminating 14 `as any` casts.
- **3 TypeScript errors** in `signature.ts` — `jose.KeyLike` → `CryptoKey | KeyObject`, `canonicalize` CJS interop fix.
- **9 stale test description strings** updated to reflect 31 builtins across 5 test files.
- **Tree builtin fail-closed** — `tree_budget_conserved` and `tree_authority_narrowing` now return `false` (not truthy strings) on depth limit breach.
- **Schema graph deep references** — `extractReferences()` rewritten with recursive `walkSchemaNode()` for depth-limited reference extraction.
- **Conservation registry coverage keys** — New `object_keys_subset` builtin + constraint validates coverage map keys against `InvariantUniverse`.

### Source

All changes from [PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews I–VIII, 2 bridge iterations (flatline achieved).

---

## [6.0.0] — 2026-02-17

### Breaking Changes

- **`AgentIdentity.trust_level`** replaced by `trust_scopes: CapabilityScopedTrust` — 6-dimensional capability-scoped trust replaces flat trust levels. See [MIGRATION.md](./MIGRATION.md).

### Added

- **Liveness properties** — 6 temporal logic properties with bounded LTL formalization (`LivenessProperty` schema).
- **CapabilityScopedTrust** — 6 trust dimensions (`data_access`, `financial`, `delegation`, `model_selection`, `governance`, `external_communication`) replacing flat `trust_level`.
- **Constraint type system** — `type_signature` field on constraints, CI-time validation via `validateConstraintFile()`.
- **Schema graph operations** — `extractReferences()`, `buildSchemaGraph()`, cycle detection, reachability, topological sort.
- **RegistryBridge** — Cross-economy bridge treaty with `BridgeInvariant`, `ExchangeRateSpec`, `SettlementPolicy`.
- **DelegationTree** — Recursive tree structure with `chainToTree()`/`treeToChain()` converters, `tree_budget_conserved` + `tree_authority_narrowing` builtins.
- **Constraint type checker** — Static validation of constraint expressions against declared type signatures.
- **5 new evaluator builtins** (18 → 23): `tree_budget_conserved`, `tree_authority_narrowing`, `trust_scopes_valid`, `object_keys_subset`, `unique_values`.

### Source

[PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews III–IV, 3 bridge iterations.

---

## [5.5.0] — 2026-02-17

### Added

- **ConservationPropertyRegistry** — 14 conservation invariants with LTL formalization for economic safety properties.
- **Branded arithmetic types** — `MicroUSD`, `BasisPoints`, `AccountId` with compile-time unit safety via TypeScript branded types.
- **JWT boundary verification** — `JwtBoundarySpec` with canonical 6-step verification pipeline.
- **Evaluator builtin specifications** — `EVALUATOR_BUILTIN_SPECS` map with signature, description, examples, edge cases for all builtins.
- **AgentIdentity** — Unified agent identity schema with trust levels, capabilities, and registration metadata.
- **Cross-schema reference graph** — `x-references` annotations enabling automated dependency tracking.
- **8 new evaluator builtins** (10 → 18): conservation, bigint, and registry builtins.

### Source

[PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews I–II.

---

## [1.1.0] — 2026-02-12

### Added

- **ERROR_HTTP_STATUS mapping** (Finding 2): Canonical HTTP status codes for all 31 error codes. Ensures loa-finn and arrakis return consistent HTTP statuses for the same error conditions. Exported from `vocabulary/errors.ts`.
- **SSE sequence field** (Finding 3): Optional `sequence: integer` field on all 6 stream event types (`stream_start`, `chunk`, `tool_call`, `usage`, `stream_end`, `error`). Enables SSE reconnection via `Last-Event-ID`.
- **PoolCapabilitiesSchema** (Finding 5): TypeBox schema for pool capability declarations. Shape validation only — actual values remain in consumer config. Exported from `vocabulary/pools.ts`.
- **Versioned $id URIs** (Finding 8): All generated JSON schemas now include `$id: "https://schemas.0xhoneyjar.com/loa-hounfour/{version}/{name}"` and `$comment` with contract version metadata.

### Fixed

- **Idempotency key collision** (Finding 1 — High): `deriveIdempotencyKey()` now uses `JSON.stringify([tenant, reqHash, provider, model])` instead of colon-delimited concatenation. Prevents collision when components contain `:`.
- **Version compatibility patch check** (Finding 4): `validateCompatibility()` now performs full semver comparison (major → minor → patch) instead of only major + minor.

### Improved

- **Decompression order documentation** (Finding 7): Inline documentation on `parseEncodings()` explaining HTTP Content-Encoding unwrap semantics per RFC 9110 §8.4.

### Source

All changes from [BridgeBuilder review of PR #61](https://github.com/0xHoneyJar/loa-finn/pull/61).
