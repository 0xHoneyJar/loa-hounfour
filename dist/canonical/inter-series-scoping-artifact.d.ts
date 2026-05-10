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
 * Bitcoin Merkle / RFC 6962.
 *
 * **Shape-level vs consumer-state boundary**: the
 * `merkle_proof_composition_well_formed` LOCAL helper checks step
 * shapes only (each step has valid `position` discriminator + sha256-
 * hex sibling). Semantic root verification — composing all steps
 * from `soul_hash` and comparing against a consumer-published
 * constitutional-root — stays consumer-state per ADR-010. Manifest
 * emits `INTER_SERIES_MERKLE_ROOT_VERIFICATION_CONTEXT_DEFERRED`.
 *
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid payload returns a string equal to `s` when `s` is the
 * canonical-shaped form. NOT a cross-runtime byte-identity claim;
 * cross-runtime byte-identity is FR-A2 cross-language-harness's
 * domain via RFC 8785 JCS.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/InterSeriesScopingArtifact.constraints.json` —
 * ISSA-1..ISSA-5):
 *   - ISSA-1: `proposed_series_goals` non-empty (TypeBox minItems).
 *   - ISSA-2: `proposed_series_goals[*].id` distinct (LOCAL
 *     `array_field_distinct`).
 *   - ISSA-3: Merkle proof composition well-formedness (LOCAL
 *     `merkle_proof_composition_well_formed`); root verification
 *     consumer-side per ADR-010.
 *   - ISSA-4: `conformance_impact_pct ∈ [-100, 100]` (TypeBox).
 *   - ISSA-5: `proof_path[].position ∈ {'left', 'right'}` (TypeBox).
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.2
 * @see ADR-010 — class-vs-policy boundary.
 * @see RFC 6962 — Certificate Transparency (Merkle composition reference).
 * @since v8.7.0 — FR-G2.
 */
import { type Static } from '@sinclair/typebox';
/**
 * @internal
 * Stub placeholder — replaced with full schema body in PR-A4.2.
 * Validating any payload against this returns `false`.
 */
export declare const InterSeriesScopingArtifactSchema: import("@sinclair/typebox").TNever;
export type InterSeriesScopingArtifact = Static<typeof InterSeriesScopingArtifactSchema>;
//# sourceMappingURL=inter-series-scoping-artifact.d.ts.map