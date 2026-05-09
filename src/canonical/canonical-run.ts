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
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid `CanonicalRun` payload `s` returns a string equal to
 * `s` when `s` is the JSON form `JSON.stringify` produced from the
 * canonical-shaped object. This is a determinism pin on V8's
 * stable property-order behaviour, NOT a cross-runtime byte-identity
 * claim.
 *
 * **Cross-runtime byte-identity** (Go / Python / Rust producers
 * agreeing with TS) is the FR-A2 cross-language harness's domain per
 * AT-1 (PR-A3.9 follow-up). Producers MUST emit `required_phases[*]`
 * field order matching the schema's authored sequence (phase_id,
 * phase_kind, required_gates, ordered_index) and `ts_authored`
 * fractional-second precision per their consumer's
 * conformance-scoring contract — see CR-3 and the constraint file's
 * evaluation_note for the per-runtime canonical-emission obligations.
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
import { PhaseKindSchema } from './phase-kinds.js';

/**
 * Stricter local pattern for `ts_authored` — Z-only second-precision
 * (iter-4 F4 / iter-5 mitigation). The shared
 * `ISO8601_UTC_PATTERN` admits 0–9 fractional digits; CanonicalRun
 * pins second-precision so producers across runtimes (TS / Go /
 * Python / Rust per FR-A2) emit `2026-05-09T00:00:00Z` byte-
 * identical without negotiating a per-deployment fractional-digit
 * count. This is the BIP-0066 / Protobuf Timestamp lesson: when
 * multiple implementations must produce identical bytes, "permissive
 * accept, strict emit" requires a shared canonicalizer — pinning
 * the wire format at the schema closes the gap.
 *
 * **Scope**: local to `CanonicalRun.ts_authored`. The shared
 * `ISO8601_UTC_PATTERN` (e.g., used by FR-B2 envelope timestamps)
 * remains unchanged because envelope ts fields carry consumer-shaped
 * fractional precision expectations (NTP / monotonic-clock-emit
 * cadence). CanonicalRun is the conformance source-of-truth — no
 * sub-second authoring cadence is meaningful at this layer.
 *
 * @since v8.6.0 — FR-B1 (PR-A3.8 iter-5).
 */
const TS_AUTHORED_Z_ONLY_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$';

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
      pattern: TS_AUTHORED_Z_ONLY_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which this canonical-run ' +
        'definition was authored (Z suffix). **Fractional-second ' +
        'precision is NOT admitted** (iter-4 F4 / iter-5 mitigation): ' +
        'the wire format is locked to second precision via a local ' +
        'TS_AUTHORED_Z_ONLY_PATTERN so cross-runner byte-identity ' +
        '(CR-3) holds without per-deployment fractional-digit ' +
        'negotiation — the BIP-0066 / Protobuf Timestamp lesson ' +
        'applied to the conformance-scoring source-of-truth. ' +
        'Consumers SHOULD treat ts_authored as monotonic-' +
        'nondecreasing across successive (epic_kind, ' +
        'canonical_run_id) versions — the obligation owner is the ' +
        'consumer-side registry, NOT the schema. The schema admits ' +
        'any well-formed second-precision UTC timestamp; registry ' +
        'implementations wanting strict monotonic ordering enforce ' +
        'it at insert time per ADR-010 (cf. EpicCheckpoint EC-3 ts ' +
        'ordering as a companion runtime-deferred contract).',
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

/**
 * `validateCanonicalRunCR1` — pure-function evaluator for the CR-1
 * cross-field invariant: `required_phases[*].ordered_index` forms a
 * 0-based contiguous monotonic sequence with no duplicates and no gaps.
 *
 * **Source of truth** for CR-1. Registered into the global cross-field
 * validator registry by `src/validators/index.ts`; exported here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier (the iter-2 F2+F7
 *     accumulated-error-preservation contract verification path);
 *   - cross-language reference implementations (FR-A2 / PR-A3.9 Go /
 *     Python / Rust runners) have a single TS function to mirror per
 *     AT-1 (reference-TS-implementation-is-the-golden-corpus).
 *
 * **Accumulated-error preservation contract** (iter-2 F2+F7
 * mitigation): if a per-element shape guard trips mid-iteration, the
 * function MUST NOT discard CR-1 errors already accumulated against
 * earlier well-shaped phases. The malformed element's structural
 * failure surfaces via TypeBox / Value.Check; the cross-field tier
 * reports whatever CR-1 violations it actually observed before
 * reaching the bad element. Pattern parallel: AWS IAM policy
 * evaluator (2019 incident) — partial evaluators must preserve
 * accumulated state, not return clean from a truncated pass.
 *
 * **Defensive-guard contract** (iter-3 F-001 mitigation): per-element
 * type guards are nested rather than collapsed into a single
 * short-circuit chain. Symbol-typed `ordered_index` would not throw
 * under the JS `||` short-circuit (the `typeof !== 'number'` clause
 * fires first), but the nested form makes the protection explicit so
 * future refactors that reorder or merge the guards do not silently
 * lose defense-in-depth.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input (non-array `required_phases`, non-object phase
 *   entries, non-integer `ordered_index`) without throwing.
 * @returns `{ valid, errors, warnings }` — `errors` carries CR-1-tagged
 *   strings naming the offending index for actionability.
 *
 * @since v8.6.0 — FR-B1 (PR-A3.8); refactored from inline-validator
 *   form per iter-3 F1 + F-002 + F11 (Hyrum's-Law footprint reduction).
 */
export function validateCanonicalRunCR1(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const phases = (data as { required_phases?: unknown }).required_phases;
  if (!Array.isArray(phases)) {
    // **Structural precondition** (iter-4 F1 + F-002 mitigation): the
    // pure-function form is now publicly exported and may be invoked
    // in isolation, bypassing Value.Check. Direct callers MUST be told
    // explicitly when their input fails the structural precondition —
    // returning valid:true would let a consumer wire this into a
    // cross-language reference path and silently miss every payload
    // whose `required_phases` is missing/null/non-array. The return is
    // valid:false with a clearly-tagged precondition error so the
    // failure mode IS the product per the S3-NoSuchKey-vs-AccessDenied
    // distinction. Under the standard `validate(...)` pipeline this
    // path is unreachable — Value.Check rejects non-array
    // required_phases at the structural tier before cross-field runs.
    return {
      valid: false,
      errors: [
        'CR-1: structural shape precondition failed — required_phases must be a non-null array; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
      ],
      warnings: [],
    };
  }
  // Track well-shaped (post-guard) element count separately from
  // phases.length. iter-4 F-002 mitigation: gap detection compares
  // seenIndices against the COUNT OF WELL-SHAPED ELEMENTS, not
  // phases.length — so a payload with 3 valid phases (indices {0, 2,
  // 3}) and 1 malformed phase still surfaces the missing-index-1 gap.
  // Without this, malformed elements would mask gap detection on the
  // well-shaped subset, hiding real CR-1 violations from direct
  // callers (the standard validate() pipeline catches malformed shape
  // at Value.Check before this code runs, but the pure-function form
  // must defend against direct invocation).
  let wellShapedCount = 0;
  const seenIndices = new Set<number>();
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i];
    // Defense-in-depth nested guards (iter-3 F-001 mitigation): the
    // null-check, typeof-check, and integer-check fire independently
    // so a future refactor that reorders or merges them does not
    // silently weaken the protection. Each guard is annotated with
    // the exception class it prevents.
    if (phase === null) {
      // null guards `phase.<property>` access (would throw TypeError).
      // iter-6 F-001 mitigation: emit a per-element structural-
      // precondition error so direct callers see the malformed index
      // rather than silently skipping it. Under standard validate(...)
      // this path is unreachable (Value.Check rejects null elements at
      // the structural tier first); the error is purely defensive.
      errors.push(
        `CR-1: required_phases[${i}] is null — cross-field validator requires the structural tier (Value.Check) to have rejected this element first.`,
      );
      continue;
    }
    if (typeof phase !== 'object') {
      errors.push(
        `CR-1: required_phases[${i}] is ${typeof phase}, not an object — cross-field validator requires the structural tier (Value.Check) to have rejected this element first.`,
      );
      continue;
    }
    const idx = (phase as { ordered_index?: unknown }).ordered_index;
    if (typeof idx !== 'number') {
      errors.push(
        `CR-1: required_phases[${i}].ordered_index is ${typeof idx}, not a number — cross-field validator requires the structural tier (Value.Check) to have rejected this element first.`,
      );
      continue;
    }
    if (!Number.isInteger(idx)) {
      errors.push(
        `CR-1: required_phases[${i}].ordered_index=${idx} is not an integer (NaN/Infinity/float) — cross-field validator requires the structural tier (Value.Check) to have rejected this element first.`,
      );
      continue;
    }
    // Reaching here means the element is well-shaped at the cross-
    // field tier. Count it for the gap check.
    wellShapedCount += 1;
    if (seenIndices.has(idx)) {
      errors.push(
        `CR-1: required_phases[${i}].ordered_index=${idx} duplicates a prior phase's ordered_index; the sequence must be unique.`,
      );
    }
    seenIndices.add(idx);
  }
  // The iter-5 all-malformed precondition is now subsumed: per-
  // element structural-precondition errors emitted inline during
  // iteration cover the all-malformed case (every element fires
  // its own error) AND the mixed-payload case (iter-6 F-001 — well-
  // shaped + malformed elements no longer silently pass with the
  // malformed slots invisibly skipped).
  //
  // Contiguous + 0-based check: among the well-shaped subset, the
  // ordered_index set MUST be exactly {0, 1, ..., wellShapedCount-1}.
  //
  // Progressive-disclosure UX choice (iter-1 F1 disposition): when
  // duplicates are present `seenIndices.size < wellShapedCount`, so
  // this branch is skipped and only the duplicate error fires. A
  // producer fixing the duplicate then re-submits to discover any
  // remaining contiguity gap. Trade-off: surfaces one error class per
  // pass (cleaner output, more iteration cycles) instead of all
  // classes at once (more output, fewer cycles). The cycle-005 cycle
  // pattern matches per-element shape validators in PR-A3.6 (FR-C4
  // plan-content-hash builtin) — single-class error reporting per pass.
  if (seenIndices.size === wellShapedCount && wellShapedCount > 0) {
    for (let i = 0; i < wellShapedCount; i += 1) {
      if (!seenIndices.has(i)) {
        errors.push(
          `CR-1: required_phases ordered_index sequence has a gap — expected ${i} but it is missing; the sequence must be 0-based contiguous (0..${wellShapedCount - 1}).`,
        );
        break;
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}
