/**
 * `InterSeriesScopingArtifactSchema` — cross-EPIC scoping artifact (FR-G2, v8.7.0).
 *
 * When a single piece of work spans multiple `EpicId`s (e.g. a
 * shared-library refactor affecting three downstream repos), the
 * `InterSeriesScopingArtifact` is the single committed record pinning
 * the inter-EPIC scoping decision. Replaces ad-hoc per-consumer
 * decision logs.
 *
 * **Merkle proof composition** (locked at SDD §3.4 ISSA-3): the
 * `proof_path[]` composition rule operates on RAW BYTES, not
 * hex-string concatenation:
 *
 *   acc = sha256(
 *     position == 'left'
 *       ? bytes_from_hex(sibling) ++ bytes_from_hex(acc)
 *       : bytes_from_hex(acc) ++ bytes_from_hex(sibling)
 *   )
 *
 * The explicit `position` discriminator avoids the lexicographic-sort
 * trap that collides for matching twins. Industry-standard per
 * Bitcoin Merkle / RFC 6962. See `docs/inter-series-merkle-protocol.md`
 * (non-normative shape supplement) for a consumer-side reference
 * verifier in TS pseudocode.
 *
 * **Shape-level vs consumer-state boundary** (OQ-1 lock): the
 * `merkleProofCompositionWellFormed` LOCAL helper checks step shapes
 * only — each step has valid `position` discriminator + sha256-hex
 * sibling. Semantic root verification — composing all steps from
 * `soul_hash` per the raw-byte rule and comparing against a
 * consumer-published constitutional-root — stays consumer-state per
 * ADR-010. Manifest emits
 * `INTER_SERIES_MERKLE_ROOT_VERIFICATION_CONTEXT_DEFERRED`.
 *
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid payload `s` returns a string equal to `s` when `s` is
 * the canonical-shaped form. NOT a cross-runtime byte-identity claim;
 * cross-runtime byte-identity is FR-A2 cross-language harness's
 * domain via RFC 8785 JCS.
 *
 * **NOT crypto-bearing, NOT chain-bearing**: an
 * `InterSeriesScopingArtifact` references a parent `ClusterRunSeries`
 * (FR-G1) via `parent_series_id` and an optional `PlanSignoffEnvelope`
 * (FR-B9, v8.6.0) via `signoff_envelope_id` lazy-link; the per-step
 * Merkle proof is shape-level only. The chain-bearing primitives are
 * v8.6.0 `PhaseCompletionEnvelope` and v8.7.0 `RevocationListSchema`
 * (FR-G4); this artifact records a scoping decision, not chain state.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/InterSeriesScopingArtifact.constraints.json` —
 * ISSA-1..ISSA-5):
 *   - ISSA-1: `proposed_series_goals` non-empty (TypeBox minItems 1
 *     + redundant declaratory record in the constraint file) —
 *     library-evaluable.
 *   - ISSA-2: `proposed_series_goals[*].id` distinct within array —
 *     library-evaluable via LOCAL helper `array_field_distinct`.
 *   - ISSA-3: Merkle proof composition well-formedness —
 *     library-evaluable via LOCAL helper
 *     `merkle_proof_composition_well_formed` (step shape only); root
 *     verification consumer-state per ADR-010.
 *   - ISSA-4: `conformance_impact_pct ∈ [-100, 100]` —
 *     library-evaluable via TypeBox `minimum`/`maximum`.
 *   - ISSA-5: `proof_path[].position ∈ {'left', 'right'}` —
 *     library-evaluable via TypeBox enum.
 *
 * **`$id` convention** (mirrors CanonicalRun / PhaseKind / ClusterRunSeries
 * precedent): the TypeBox-internal `$id` values declared in this file
 * (`'InterSeriesScopingArtifact'`, `'MerkleProofStep'`,
 * `'ProposedSeriesGoal'`, `'ConstitutionalHashProof'`) are short
 * tokens used by the TypeBox type system for self-reference within
 * the runtime. They are **overridden at JSON Schema generation time**
 * by `scripts/generate-schemas.ts` (line ~607) to the canonical
 * versioned URI form:
 * `https://schemas.0xhoneyjar.com/loa-hounfour/<CONTRACT_VERSION>/<name>`.
 * Standalone JSON Schema consumers (Python `jsonschema`, Go
 * `gojsonschema`, Rust `jsonschema`) only ever see the URI form. The
 * nested-`$id` values on sub-schemas are stripped by
 * `scripts/schema-postprocess.ts#stripNestedIds` so the generated
 * artifact carries exactly one unambiguous identifier (the URI).
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.2
 * @see ADR-010 — class-vs-policy boundary (consumers compute
 *      conformance %; hounfour ships shape).
 * @see RFC 6962 — Certificate Transparency (Merkle composition reference).
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
import { type Static } from '@sinclair/typebox';
/**
 * `MerkleProofStepSchema` — one step in a Merkle proof path.
 *
 * `position` is the per-step discriminator (`'left'` | `'right'`)
 * that pins which side of the concatenation the sibling occupies.
 * Without an explicit position, "matching twins" — two leaves with
 * identical sibling hashes — would collapse to the same composition
 * trace under any lexicographic-sort heuristic, breaking root
 * verification. Industry-standard per Bitcoin Merkle / RFC 6962.
 *
 * `sibling_hash` is `sha256:<64 hex chars>` — the canonical hex form
 * for SHA-256 digests across hounfour. Composition is on the raw
 * 32-byte digest; see SDD §3.4 ISSA-3 lock for the byte-decoding rule.
 *
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
export declare const MerkleProofStepSchema: import("@sinclair/typebox").TObject<{
    sibling_hash: import("@sinclair/typebox").TString;
    position: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"left">, import("@sinclair/typebox").TLiteral<"right">]>;
}>;
export type MerkleProofStep = Static<typeof MerkleProofStepSchema>;
/**
 * `ProposedSeriesGoalSchema` — one proposed goal entry within an
 * `InterSeriesScopingArtifact.proposed_series_goals` array. Hoisted
 * so cross-runner conformance suites can validate per-element shape
 * independently of the parent envelope.
 *
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
export declare const ProposedSeriesGoalSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    conformance_impact_pct: import("@sinclair/typebox").TNumber;
}>;
export type ProposedSeriesGoal = Static<typeof ProposedSeriesGoalSchema>;
export declare const InterSeriesScopingArtifactSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"inter_series_scoping_artifact">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.7.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    parent_series_id: import("@sinclair/typebox").TString;
    signoff_envelope_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    proposed_series_goals: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        conformance_impact_pct: import("@sinclair/typebox").TNumber;
    }>>;
    constitutional_hash_proof: import("@sinclair/typebox").TObject<{
        soul_hash: import("@sinclair/typebox").TString;
        proof_path: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            sibling_hash: import("@sinclair/typebox").TString;
            position: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"left">, import("@sinclair/typebox").TLiteral<"right">]>;
        }>>;
    }>;
    conformance_chain: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type InterSeriesScopingArtifact = Static<typeof InterSeriesScopingArtifactSchema>;
/**
 * `validateInterSeriesScopingArtifact` — pure-function evaluator for
 * the cross-field invariants ISSA-2 (proposed_series_goals[*].id
 * distinct) and ISSA-3 (Merkle proof step well-formedness).
 *
 * **Source of truth** for ISSA-2 and ISSA-3 well-formedness.
 * Registered into the global cross-field validator registry by
 * `src/validators/index.ts`; exported here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier;
 *   - cross-language reference implementations (FR-A2 / TS-as-golden-
 *     corpus per AT-1) have a single TS function to mirror.
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 plus
 * ClusterRunSeries precedent): the function MUST NOT throw on
 * malformed input. Direct callers bypassing the structural tier
 * receive a tagged precondition error rather than a TypeError. Under
 * the standard pipeline this defensive path is unreachable — the
 * structural tier rejects non-object envelopes, missing fields, and
 * out-of-vocab position values first.
 *
 * **Accumulated-error preservation**: if a per-element shape guard
 * trips mid-iteration, the function MUST NOT discard cross-field
 * errors already accumulated against earlier well-shaped entries.
 *
 * **ISSA-1, ISSA-4, ISSA-5 are NOT enforced here** — they are
 * structural TypeBox constraints (minItems / minimum-maximum / enum)
 * handled at the structural tier. Their constraint-file entries are
 * declaratory records mirroring the cycle-005 cycle-pattern (per
 * CanonicalRun precedent for documenting library-evaluable
 * invariants in the constraint file).
 *
 * **Merkle root verification is NOT enforced here** — semantic
 * verification (composing all steps from `soul_hash` per the raw-
 * byte rule and comparing against a consumer-published constitutional
 * root) is consumer-state per ADR-010. Manifest emits
 * `INTER_SERIES_MERKLE_ROOT_VERIFICATION_CONTEXT_DEFERRED`.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors carries
 *   ISSA-2 / ISSA-3-tagged strings naming the offending index/value
 *   for actionability.
 *
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
export declare function validateInterSeriesScopingArtifact(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=inter-series-scoping-artifact.d.ts.map