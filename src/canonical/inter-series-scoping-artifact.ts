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
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
import { arrayFieldDistinct } from '../constraints/builtins/cluster-run-series-local.js';
import { merkleProofCompositionWellFormed } from '../constraints/builtins/inter-series-scoping-artifact-local.js';

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
export const MerkleProofStepSchema = Type.Object(
  {
    sibling_hash: Type.String({
      pattern: SHA256_HEX_PATTERN,
      description:
        'SHA-256 digest of the sibling node, in canonical ' +
        '`sha256:<64-hex>` form. Decoded to 32 raw bytes for ' +
        'composition per the SDD §3.4 ISSA-3 lock.',
    }),
    position: Type.Union(
      [Type.Literal('left'), Type.Literal('right')],
      {
        description:
          'Position discriminator pinning which side of the ' +
          'concatenation the sibling occupies. Avoids the ' +
          'lexicographic-sort trap that collides for matching twins. ' +
          'ISSA-3 mandates explicit per-step position; ISSA-5 enforces ' +
          'the locked enum membership.',
      },
    ),
  },
  {
    $id: 'MerkleProofStep',
    additionalProperties: false,
    description:
      'One per-step entry within a Merkle proof path. Composition ' +
      'is shape-level only per ISSA-3; semantic root verification ' +
      'is consumer-state per ADR-010.',
  },
);
export type MerkleProofStep = Static<typeof MerkleProofStepSchema>;

/**
 * `ProposedSeriesGoalSchema` — one proposed goal entry within an
 * `InterSeriesScopingArtifact.proposed_series_goals` array. Hoisted
 * so cross-runner conformance suites can validate per-element shape
 * independently of the parent envelope.
 *
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
export const ProposedSeriesGoalSchema = Type.Object(
  {
    id: Type.String({
      minLength: 1,
      description:
        'Stable opaque goal identifier within the artifact. Per-' +
        'array distinctness is ISSA-2; consumers select goals by id ' +
        'from the artifact-scoped namespace.',
    }),
    description: Type.String({
      minLength: 1,
      maxLength: 4096,
      description:
        'Free-form goal description. 4 KiB upper bound matches the ' +
        'consumer-side display surface; longer rationale belongs in ' +
        'the consumer-side decision log.',
    }),
    conformance_impact_pct: Type.Number({
      minimum: -100,
      maximum: 100,
      description:
        'Estimated conformance percentage delta if this goal lands. ' +
        'Library-clamped to the closed interval [-100, 100] per ' +
        'ISSA-4; consumers compute meaning per ADR-010 — the schema ' +
        'does NOT freeze the conformance-scoring algorithm at this ' +
        'layer.',
    }),
  },
  {
    $id: 'ProposedSeriesGoal',
    additionalProperties: false,
    description:
      'One per-goal entry within an InterSeriesScopingArtifact. ' +
      'Cross-element invariants — id distinctness within the array — ' +
      'are enforced at the cross-field tier per ISSA-2.',
  },
);
export type ProposedSeriesGoal = Static<typeof ProposedSeriesGoalSchema>;

export const InterSeriesScopingArtifactSchema = Type.Object(
  {
    envelope_kind: Type.Literal('inter_series_scoping_artifact', {
      description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.7.0', {
      description:
        'Hounfour contract version. Pinned to "8.7.0" for the cycle-007 ship line.',
    }),
    ts: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which this scoping artifact was ' +
        'authored, with mandatory Z suffix. Uses the shared ' +
        'ISO8601_UTC_PATTERN; cross-runner byte-identity for ts is ' +
        'consumer-state per ADR-010 and verified on the FR-A2 harness.',
    }),
    cluster_id: Type.String({
      minLength: 1,
      description: 'Consumer-shaped cluster identifier.',
    }),
    parent_series_id: Type.String({
      minLength: 1,
      description:
        'Lazy-link to ClusterRunSeries.run_id (FR-G1) of the parent ' +
        'series this scoping artifact applies to. Resolution is ' +
        'consumer-state per ADR-010 — hounfour does not bundle a ' +
        'registry implementation.',
    }),
    signoff_envelope_id: Type.Union(
      [Type.String({ minLength: 1 }), Type.Null()],
      {
        description:
          'Optional lazy-link to a PlanSignoffEnvelopeSchema record ' +
          '(FR-B9, v8.6.0) for the inter-series scoping signoff. ' +
          'Null when no signoff envelope has been emitted; ' +
          'resolution is consumer-state per ADR-010.',
      },
    ),
    proposed_series_goals: Type.Array(ProposedSeriesGoalSchema, {
      minItems: 1,
      maxItems: 64,
      description:
        'Non-empty array of proposed goals for the scoped series. ' +
        'Per-array id distinctness is ISSA-2; per-element shape is ' +
        'ProposedSeriesGoal. Upper bound 64 matches the consumer-' +
        'side practical ceiling for per-artifact goal counts.',
    }),
    constitutional_hash_proof: Type.Object(
      {
        soul_hash: Type.String({
          pattern: SHA256_HEX_PATTERN,
          description:
            'Leaf hash — typically the canonical-form hash of the ' +
            "parent series's constitutional reference. Composition " +
            'starts here; see SDD §3.4 ISSA-3 raw-byte rule.',
        }),
        proof_path: Type.Array(MerkleProofStepSchema, {
          minItems: 0,
          maxItems: 64,
          description:
            'Ordered sequence of Merkle proof steps from leaf to ' +
            'root. Empty array is admissible — a one-leaf tree where ' +
            'soul_hash is also the root. The 2 to the 64th leaf ' +
            'ceiling is practically unbounded for any real ledger. ' +
            'Per-step position is mandatory per ISSA-3.',
        }),
      },
      {
        $id: 'ConstitutionalHashProof',
        additionalProperties: false,
        description:
          'Merkle proof anchoring the parent series to a consumer-' +
          'published constitutional-root. Shape-level only; semantic ' +
          'root verification is consumer-state per ADR-010.',
      },
    ),
    conformance_chain: Type.Array(
      Type.String({ pattern: SHA256_HEX_PATTERN }),
      {
        minItems: 0,
        maxItems: 1024,
        description:
          'Ordered sequence of conformance-evaluation hashes; ' +
          'consumer-shaped. Each entry is a sha256 digest in ' +
          'canonical hex form. Empty array is admissible. Upper ' +
          'bound 1024 matches the consumer-side practical ceiling ' +
          'for per-artifact evaluation counts.',
      },
    ),
  },
  {
    $id: 'InterSeriesScopingArtifact',
    additionalProperties: false,
    description:
      'Cross-EPIC scoping artifact. Merkle proof composition is ' +
      'library-evaluable for shape-level well-formedness only per ' +
      'ISSA-3; cluster constitutional-root resolution is consumer-' +
      'state per ADR-010. NOT crypto-bearing; NOT chain-bearing — ' +
      'records a scoping decision over a parent ClusterRunSeries ' +
      'record (FR-G1) and an optional PlanSignoffEnvelope (FR-B9). ' +
      'Round-trip parse and re-serialize bit-identical: every well-' +
      'formed payload satisfies JSON.stringify(JSON.parse(s)) equals ' +
      's when s is itself the JSON-stringified canonical form.',
  },
);
export type InterSeriesScopingArtifact = Static<
  typeof InterSeriesScopingArtifactSchema
>;

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
export function validateInterSeriesScopingArtifact(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        `ISSA: structural shape precondition failed — input must be a non-null object (InterSeriesScopingArtifact record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
      ],
      warnings: [],
    };
  }

  // ISSA-2: proposed_series_goals[*].id distinct within the array.
  const goals = (data as { proposed_series_goals?: unknown }).proposed_series_goals;
  if (!Array.isArray(goals)) {
    errors.push(
      'ISSA: structural shape precondition failed — proposed_series_goals must be a non-null array; the cross-field validator requires the structural tier to have passed first.',
    );
  } else {
    const distinct = arrayFieldDistinct(goals, 'id');
    if (!distinct.valid) {
      for (const dup of distinct.duplicates) {
        errors.push(
          `ISSA-2: proposed_series_goals[*].id "${dup.value}" appears at indices ${dup.indices.join(', ')} — id MUST be distinct within an artifact.`,
        );
      }
    }
  }

  // ISSA-3: Merkle proof composition well-formedness — each step has
  // a valid position discriminator AND a sha256-hex sibling_hash.
  const proof = (data as { constitutional_hash_proof?: unknown }).constitutional_hash_proof;
  if (proof === null || typeof proof !== 'object' || Array.isArray(proof)) {
    errors.push(
      'ISSA: structural shape precondition failed — constitutional_hash_proof must be a non-null object; the cross-field validator requires the structural tier to have rejected this envelope first.',
    );
  } else {
    const proofPath = (proof as { proof_path?: unknown }).proof_path;
    const wellFormed = merkleProofCompositionWellFormed(proofPath);
    if (!wellFormed.valid) {
      for (const issue of wellFormed.issues) {
        errors.push(`ISSA-3: ${issue}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
