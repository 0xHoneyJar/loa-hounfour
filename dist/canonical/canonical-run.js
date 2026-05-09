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
import { Type } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { PhaseKindSchema } from './phase-kinds.js';
/**
 * `RequiredPhaseSchema` — one entry in
 * `CanonicalRunSchema.required_phases`. Hoisted for clarity and so
 * the cross-runner conformance suite can validate per-element
 * shape independently of the parent envelope.
 */
export const RequiredPhaseSchema = Type.Object({
    phase_id: Type.String({
        minLength: 1,
        description: 'Stable opaque identifier for the phase (consumer-shaped — ' +
            'hounfour does not freeze the namespace). Pairs with ' +
            '`PhaseCompletionEnvelope.ingested_emission.payload.phase` ' +
            'on the consumer side for conformance scoring.',
    }),
    phase_kind: PhaseKindSchema,
    required_gates: Type.Array(Type.String({
        minLength: 1,
        description: 'Stable identifier for a gate the phase must satisfy ' +
            'before ship-eligibility. Consumer-shaped namespace.',
    }), {
        minItems: 0,
        description: 'Ordered list of gate identifiers that must be satisfied ' +
            'within this phase. Empty array is admissible (a phase ' +
            'with no gates is well-formed; per-EPIC policy decides ' +
            'whether that is acceptable).',
    }),
    ordered_index: Type.Integer({
        minimum: 0,
        description: 'Position of this phase in the canonical sequence — 0-based, ' +
            'contiguous, monotonic per CR-1. The schema enforces ' +
            '≥0 integer; CR-1 enforces the cross-element invariants.',
    }),
}, {
    $id: 'RequiredPhase',
    additionalProperties: false,
    description: 'One required-phase entry within a CanonicalRun. ' +
        'Cross-element ordering invariants live in CR-1.',
});
export const CanonicalRunSchema = Type.Object({
    canonical_run_id: Type.String({
        minLength: 1,
        description: 'Stable opaque identifier for this canonical-run definition. ' +
            'Referenced by `PhaseCompletionEnvelope` (FR-B2), ' +
            '`EpicCheckpoint` (FR-B8), and `ClusterRunSeries` (FR-E1, ' +
            'v8.7.0) via lazy-link string equality. Uniqueness within a ' +
            'cluster_id is CR-2 (consumer-state).',
    }),
    canonical_run_version: Type.String({
        pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
        description: 'Semver MAJOR.MINOR.PATCH for this canonical-run definition. ' +
            'Strict-additive widenings (adding required_gates, adding ' +
            'phases at the tail) bump MINOR; required-field changes or ' +
            'reordering bump MAJOR. Consumers MAY use this to detect ' +
            'drift between the canonical-run version they pinned and ' +
            'the one currently published.',
    }),
    contract_version: Type.Literal('8.6.0', {
        description: 'Hounfour contract version. Pinned to "8.6.0" for the ' +
            'cycle-005 ship line.',
    }),
    epic_kind: Type.String({
        minLength: 1,
        description: 'EPIC classification this canonical-run shapes — consumer- ' +
            'shaped namespace. Multiple `CanonicalRun` records may exist ' +
            'for the same `epic_kind` across versions; consumers select ' +
            'by (epic_kind, canonical_run_version) per their pinning ' +
            'policy.',
    }),
    required_phases: Type.Array(RequiredPhaseSchema, {
        minItems: 1,
        description: 'Ordered sequence of phases. The schema enforces ≥1 entry; ' +
            'CR-1 enforces 0-based contiguous monotonic ordered_index.',
    }),
    ts_authored: Type.String({
        pattern: ISO8601_UTC_PATTERN,
        description: 'ISO 8601 UTC timestamp at which this canonical-run ' +
            'definition was authored (Z suffix). Consumers SHOULD treat ' +
            'ts_authored as monotonic-nondecreasing across successive ' +
            '(epic_kind, canonical_run_id) versions — the obligation owner ' +
            'is the consumer-side registry, NOT the schema. The schema ' +
            'admits any well-formed UTC timestamp; registry implementations ' +
            'wanting strict monotonic ordering enforce it at insert time ' +
            'per ADR-010 (cf. EpicCheckpoint EC-3 ts ordering as a ' +
            'companion runtime-deferred contract). **Fractional-second ' +
            'precision** (iter-3 F8 disposition): the schema admits 0–9 ' +
            'fractional digits per the cycle-005 ISO8601_UTC_PATTERN; ' +
            'producer-side cross-runner byte-identity (CR-3 / FR-A2 ' +
            'harness) requires a stable per-deployment digit count — ' +
            'the consumer\'s conformance-scoring contract pins the count ' +
            'and runners normalize on read. A schema-level pin to a fixed ' +
            'count (e.g., Protobuf `Timestamp` 0/3/6/9-digit canon) is a ' +
            'v9.0.0-class change scoped against the v8.6.0 backward-' +
            'compatibility surface; documented in v9.0.0 backlog.',
    }),
}, {
    $id: 'CanonicalRun',
    additionalProperties: false,
    description: 'Required-phases-per-EPIC definition consumed as the conformance ' +
        'source-of-truth by `PhaseCompletionEnvelope` (FR-B2), ' +
        '`EpicCheckpoint` (FR-B8), and `ClusterRunSeries` (FR-E1). ' +
        'Hounfour ships shape; consumers compute conformance % per ' +
        'ADR-010. Round-trip parse + re-serialize bit-identical: ' +
        "every well-formed payload `s` satisfies " +
        '`JSON.stringify(JSON.parse(s)) === s` when `s` is itself the ' +
        'JSON-stringified canonical form. NOT crypto-bearing; NOT ' +
        'chain-bearing.',
});
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
export function validateCanonicalRunCR1(data) {
    const errors = [];
    const phases = data.required_phases;
    if (!Array.isArray(phases)) {
        // The whole record is structurally malformed — defer to TypeBox.
        // No CR-1 errors could have been accumulated yet (early termination
        // before iteration begins), so returning valid:true is honest.
        return { valid: true, errors: [], warnings: [] };
    }
    const seenIndices = new Set();
    for (let i = 0; i < phases.length; i += 1) {
        const phase = phases[i];
        // Defense-in-depth nested guards (iter-3 F-001 mitigation): the
        // null-check, typeof-check, and integer-check fire independently
        // so a future refactor that reorders or merges them does not
        // silently weaken the protection. Each guard is annotated with
        // the exception class it prevents.
        if (phase === null) {
            // null guards `phase.<property>` access (would throw TypeError).
            continue;
        }
        if (typeof phase !== 'object') {
            // primitive / Symbol / function guards property access (would
            // either throw or coerce silently). Per the accumulated-error
            // contract, skip rather than return.
            continue;
        }
        const idx = phase.ordered_index;
        if (typeof idx !== 'number') {
            // Symbol-typed ordered_index lands here on the `typeof` clause;
            // string / null / undefined / object / function similarly.
            // Number.isInteger is never invoked on a non-number value.
            continue;
        }
        if (!Number.isInteger(idx)) {
            // NaN / Infinity / floats fall here — Number.isInteger returns
            // false for all of them and never throws.
            continue;
        }
        if (seenIndices.has(idx)) {
            errors.push(`CR-1: required_phases[${i}].ordered_index=${idx} duplicates a prior phase's ordered_index; the sequence must be unique.`);
        }
        seenIndices.add(idx);
    }
    // Contiguous + 0-based check: the set of ordered_index values MUST
    // be exactly {0, 1, ..., N-1} where N = phases.length.
    //
    // Progressive-disclosure UX choice (iter-1 F1 disposition): when
    // duplicates are present `seenIndices.size < phases.length`, so this
    // branch is skipped and only the duplicate error fires. A producer
    // fixing the duplicate then re-submits to discover any remaining
    // contiguity gap. Trade-off: surfaces one error class per pass
    // (cleaner output, more iteration cycles) instead of all classes at
    // once (more output, fewer cycles). The cycle-005 cycle pattern
    // matches per-element shape validators in PR-A3.6 (FR-C4
    // plan-content-hash builtin) — single-class error reporting per pass.
    if (seenIndices.size === phases.length) {
        for (let i = 0; i < phases.length; i += 1) {
            if (!seenIndices.has(i)) {
                errors.push(`CR-1: required_phases ordered_index sequence has a gap — expected ${i} but it is missing; the sequence must be 0-based contiguous (0..${phases.length - 1}).`);
                break;
            }
        }
    }
    return { valid: errors.length === 0, errors, warnings: [] };
}
//# sourceMappingURL=canonical-run.js.map