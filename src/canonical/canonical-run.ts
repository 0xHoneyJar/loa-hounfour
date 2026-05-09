/**
 * `CanonicalRunSchema` — required-phases-per-EPIC source-of-truth
 * for conformance evaluation (FR-B1, v8.6.0).
 *
 * A `CanonicalRun` defines, for a given `epic_kind`, the ordered
 * sequence of phases a producer must complete. Consumers compare
 * incoming `PhaseCompletionEnvelope` records (FR-B2) against the
 * `CanonicalRun` for the EPIC's `epic_kind` to compute conformance
 * percentages — hounfour ships only the **shape**; conformance
 * computation is consumer-side per ADR-010.
 *
 * **Round-trip bit-identity contract**: `JSON.stringify(JSON.parse(s))`
 * over a valid `CanonicalRun` payload `s` returns a string equal to
 * `s` byte-for-byte when `s` is itself the JSON form produced by
 * `JSON.stringify(payload)` from the canonical-shaped object. This
 * is the cross-language conformance pre-condition: every runner
 * MUST produce identical canonical bytes for identical input
 * objects so conformance scoring across runners is deterministic.
 *
 * **NOT crypto-bearing, NOT chain-bearing**: a `CanonicalRun` is a
 * deterministic shape definition with no signature, nonce, or
 * `prev_envelope_hash`. It is referenced by other schemas (FR-B2,
 * FR-B8, FR-E1) via the lazy-link `canonical_run_id` string —
 * resolution is consumer-state per ADR-010 and is NOT manifested by
 * hounfour.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/CanonicalRun.constraints.json` — CR-1..CR-3):
 *   - `required_phases[*].ordered_index` is a 0-based contiguous
 *     monotonic sequence (no gaps, no duplicates) — CR-1, library-
 *     evaluable.
 *   - `canonical_run_id` is unique within a `cluster_id` — CR-2,
 *     consumer-state (registry); manifest emits
 *     `CANONICAL_RUN_ID_UNIQUENESS_CONTEXT_DEFERRED` when the
 *     consumer has not supplied registry context.
 *   - Cross-language conformance (TS + Python at minimum, all four
 *     runners if FR-A2 lands) — CR-3, consumer per ADR-010.
 *     Hounfour ships the schema; consumers compute conformance %.
 *
 * @see SDD §3.3 — full FR-B1 spec.
 * @see PRD §9.2 — rename ledger (renamed from coord master-plan
 *      name per pollution-invariant compliance).
 * @since v8.6.0 — FR-B1 (PR-A3.8).
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { PhaseKindSchema } from './phase-kinds.js';

/**
 * `RequiredPhaseSchema` — one entry in
 * `CanonicalRunSchema.required_phases`. Hoisted for clarity and so
 * the cross-runner conformance suite can validate per-element
 * shape independently of the parent envelope.
 */
export const RequiredPhaseSchema = Type.Object(
  {
    phase_id: Type.String({
      minLength: 1,
      description:
        'Stable opaque identifier for the phase (consumer-shaped — ' +
        'hounfour does not freeze the namespace). Pairs with ' +
        '`PhaseCompletionEnvelope.ingested_emission.payload.phase` ' +
        'on the consumer side for conformance scoring.',
    }),
    phase_kind: PhaseKindSchema,
    required_gates: Type.Array(
      Type.String({
        minLength: 1,
        description:
          'Stable identifier for a gate the phase must satisfy ' +
          'before ship-eligibility. Consumer-shaped namespace.',
      }),
      {
        minItems: 0,
        description:
          'Ordered list of gate identifiers that must be satisfied ' +
          'within this phase. Empty array is admissible (a phase ' +
          'with no gates is well-formed; per-EPIC policy decides ' +
          'whether that is acceptable).',
      },
    ),
    ordered_index: Type.Integer({
      minimum: 0,
      description:
        'Position of this phase in the canonical sequence — 0-based, ' +
        'contiguous, monotonic per CR-1. The schema enforces ' +
        '≥0 integer; CR-1 enforces the cross-element invariants.',
    }),
  },
  {
    $id: 'RequiredPhase',
    additionalProperties: false,
    description:
      'One required-phase entry within a CanonicalRun. ' +
      'Cross-element ordering invariants live in CR-1.',
  },
);
export type RequiredPhase = Static<typeof RequiredPhaseSchema>;

export const CanonicalRunSchema = Type.Object(
  {
    canonical_run_id: Type.String({
      minLength: 1,
      description:
        'Stable opaque identifier for this canonical-run definition. ' +
        'Referenced by `PhaseCompletionEnvelope` (FR-B2), ' +
        '`EpicCheckpoint` (FR-B8), and `ClusterRunSeries` (FR-E1, ' +
        'v8.7.0) via lazy-link string equality. Uniqueness within a ' +
        'cluster_id is CR-2 (consumer-state).',
    }),
    canonical_run_version: Type.String({
      pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
      description:
        'Semver MAJOR.MINOR.PATCH for this canonical-run definition. ' +
        'Strict-additive widenings (adding required_gates, adding ' +
        'phases at the tail) bump MINOR; required-field changes or ' +
        'reordering bump MAJOR. Consumers MAY use this to detect ' +
        'drift between the canonical-run version they pinned and ' +
        'the one currently published.',
    }),
    contract_version: Type.Literal('8.6.0', {
      description:
        'Hounfour contract version. Pinned to "8.6.0" for the ' +
        'cycle-005 ship line.',
    }),
    epic_kind: Type.String({
      minLength: 1,
      description:
        'EPIC classification this canonical-run shapes — consumer- ' +
        'shaped namespace. Multiple `CanonicalRun` records may exist ' +
        'for the same `epic_kind` across versions; consumers select ' +
        'by (epic_kind, canonical_run_version) per their pinning ' +
        'policy.',
    }),
    required_phases: Type.Array(RequiredPhaseSchema, {
      minItems: 1,
      description:
        'Ordered sequence of phases. The schema enforces ≥1 entry; ' +
        'CR-1 enforces 0-based contiguous monotonic ordered_index.',
    }),
    ts_authored: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which this canonical-run ' +
        'definition was authored (Z suffix). Consumers SHOULD treat ' +
        'ts_authored as monotonic-nondecreasing across successive ' +
        '(epic_kind, canonical_run_id) versions — the obligation owner ' +
        'is the consumer-side registry, NOT the schema. The schema ' +
        'admits any well-formed UTC timestamp; registry implementations ' +
        'wanting strict monotonic ordering enforce it at insert time ' +
        'per ADR-010 (cf. EpicCheckpoint EC-3 ts ordering as a ' +
        'companion runtime-deferred contract).',
    }),
  },
  {
    $id: 'CanonicalRun',
    additionalProperties: false,
    description:
      'Required-phases-per-EPIC definition consumed as the conformance ' +
      'source-of-truth by `PhaseCompletionEnvelope` (FR-B2), ' +
      '`EpicCheckpoint` (FR-B8), and `ClusterRunSeries` (FR-E1). ' +
      'Hounfour ships shape; consumers compute conformance % per ' +
      'ADR-010. Round-trip parse + re-serialize bit-identical: ' +
      "every well-formed payload `s` satisfies " +
      '`JSON.stringify(JSON.parse(s)) === s` when `s` is itself the ' +
      'JSON-stringified canonical form. NOT crypto-bearing; NOT ' +
      'chain-bearing.',
  },
);
export type CanonicalRun = Static<typeof CanonicalRunSchema>;
