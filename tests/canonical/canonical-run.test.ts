/**
 * PR-A3.8 (FR-B1) — Schema-shape unit tests for `CanonicalRunSchema`,
 * `RequiredPhaseSchema`, and `PhaseKindSchema`, plus CR-1 inline
 * cross-field validator coverage.
 *
 * The vector runner at `tests/vectors/canonical-run-vectors.test.ts`
 * walks `vectors/CanonicalRun/v8.6.0/{valid,invalid}` and exercises
 * the two-layer validation contract per the PR-A3.5 vector-runner
 * discipline. This file pins the schema membership counts, the
 * required-field set, and the in-memory shapes that exercise CR-1
 * (ordered_index 0-based contiguous monotonic) at validate() time.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  CanonicalRunSchema,
  RequiredPhaseSchema,
  PhaseKindSchema,
  PHASE_KINDS,
  validateCanonicalRunCR1,
} from '../../src/canonical/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const EXPECTED_PHASE_KINDS = [
  'discovery',
  'design',
  'implement',
  'audit',
  'ship',
] as const;

function basePhase(idx: number): {
  phase_id: string;
  phase_kind: string;
  required_gates: string[];
  ordered_index: number;
} {
  return {
    phase_id: `phase-${idx}`,
    phase_kind: 'implement',
    required_gates: [],
    ordered_index: idx,
  };
}

function baseEnvelope(phases: ReadonlyArray<unknown>): Record<string, unknown> {
  return {
    canonical_run_id: 'canonical-run-test',
    canonical_run_version: '1.0.0',
    contract_version: '8.6.0',
    epic_kind: 'feature-delivery',
    required_phases: phases,
    ts_authored: '2026-05-09T00:00:00Z',
  };
}

describe('PhaseKindSchema (FR-B1)', () => {
  it('locks 5 members per the v8.6.0 ship line', () => {
    expect(EXPECTED_PHASE_KINDS.length).toBe(5);
    expect(PHASE_KINDS.length).toBe(5);
    for (const m of EXPECTED_PHASE_KINDS) {
      expect(Value.Check(PhaseKindSchema, m)).toBe(true);
    }
  });

  it('PHASE_KINDS canonical-array matches the schema membership set', () => {
    // Tests consume the canonical-array source-of-truth rather than
    // reverse-engineering schema internals via .anyOf[].const — mirrors
    // the CHALLENGE_TYPES pattern from PR-A3.7 (FR-A1). Strict-additive
    // enum widening is a single-edit diff at the source.
    expect([...PHASE_KINDS]).toEqual([...EXPECTED_PHASE_KINDS]);
  });

  it('rejects out-of-vocabulary labels', () => {
    expect(Value.Check(PhaseKindSchema, 'deploy')).toBe(false);
    expect(Value.Check(PhaseKindSchema, 'review')).toBe(false);
    expect(Value.Check(PhaseKindSchema, '')).toBe(false);
    expect(Value.Check(PhaseKindSchema, 'Discovery')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(PhaseKindSchema.$id).toBe('PhaseKind');
  });
});

describe('RequiredPhaseSchema (FR-B1)', () => {
  it('admits a minimal well-formed entry', () => {
    expect(Value.Check(RequiredPhaseSchema, basePhase(0))).toBe(true);
  });

  it('admits empty required_gates', () => {
    const p = basePhase(0);
    p.required_gates = [];
    expect(Value.Check(RequiredPhaseSchema, p)).toBe(true);
  });

  it('rejects ordered_index < 0 at the structural layer', () => {
    const p = basePhase(0);
    p.ordered_index = -1;
    expect(Value.Check(RequiredPhaseSchema, p)).toBe(false);
  });

  it('rejects empty phase_id', () => {
    const p = basePhase(0);
    p.phase_id = '';
    expect(Value.Check(RequiredPhaseSchema, p)).toBe(false);
  });

  it('rejects empty gate strings within required_gates', () => {
    const p = basePhase(0);
    p.required_gates = [''];
    expect(Value.Check(RequiredPhaseSchema, p)).toBe(false);
  });

  it('rejects unknown extra fields (additionalProperties: false)', () => {
    const p = { ...basePhase(0), description: 'extra' };
    expect(Value.Check(RequiredPhaseSchema, p)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(RequiredPhaseSchema.$id).toBe('RequiredPhase');
  });
});

describe('CanonicalRunSchema (FR-B1)', () => {
  it('admits a minimal well-formed envelope', () => {
    const env = baseEnvelope([basePhase(0)]);
    expect(Value.Check(CanonicalRunSchema, env)).toBe(true);
  });

  it('rejects empty required_phases (minItems: 1)', () => {
    const env = baseEnvelope([]);
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
  });

  it('rejects unknown extra envelope fields (additionalProperties: false)', () => {
    const env = { ...baseEnvelope([basePhase(0)]), extra: 'no' };
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
  });

  it('rejects malformed canonical_run_version', () => {
    const env = baseEnvelope([basePhase(0)]);
    env.canonical_run_version = 'v1.0.0';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
    env.canonical_run_version = '1.0';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
    env.canonical_run_version = '1.0.0-rc1';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
  });

  it('rejects contract_version literal mismatch', () => {
    const env = baseEnvelope([basePhase(0)]);
    env.contract_version = '8.5.0';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
  });

  it('rejects ts_authored without UTC Z suffix', () => {
    const env = baseEnvelope([basePhase(0)]);
    env.ts_authored = '2026-05-09T00:00:00+05:30';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
    env.ts_authored = '2026-05-09T00:00:00';
    expect(Value.Check(CanonicalRunSchema, env)).toBe(false);
  });

  it('admits multiple phases of the same phase_kind (kinds NOT required to be unique)', () => {
    const env = baseEnvelope([
      { ...basePhase(0), phase_kind: 'design' },
      { ...basePhase(1), phase_kind: 'design' },
    ]);
    expect(Value.Check(CanonicalRunSchema, env)).toBe(true);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(CanonicalRunSchema.$id).toBe('CanonicalRun');
  });
});

describe('CanonicalRun CR-1 inline cross-field validator (FR-B1)', () => {
  // CR-1 is intra-record: required_phases[*].ordered_index forms a
  // 0-based contiguous monotonic sequence. The TS reference impl
  // enforces this at validate() time (see src/validators/index.ts);
  // cross-language runners re-implement per AT-1.

  it('passes validate() on a well-ordered single-phase envelope', () => {
    const env = baseEnvelope([basePhase(0)]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(true);
  });

  it('passes validate() on a well-ordered multi-phase envelope', () => {
    const env = baseEnvelope([basePhase(0), basePhase(1), basePhase(2)]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(true);
  });

  it('rejects a duplicate ordered_index', () => {
    const env = baseEnvelope([
      basePhase(0),
      { ...basePhase(1), ordered_index: 0 },
      basePhase(2),
    ]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('rejects a 1-based sequence (missing 0)', () => {
    const env = baseEnvelope([
      { ...basePhase(0), ordered_index: 1 },
      { ...basePhase(1), ordered_index: 2 },
    ]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('gap'))).toBe(true);
  });

  it('rejects a sparse sequence with a gap (skips index 1)', () => {
    const env = baseEnvelope([
      { ...basePhase(0), ordered_index: 0 },
      { ...basePhase(1), ordered_index: 2 },
      { ...basePhase(2), ordered_index: 3 },
    ]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
  });

  it('admits a non-canonical authoring order so long as the index set is contiguous', () => {
    // Authoring order vs. semantic ordering: CR-1 enforces the ordered_index
    // VALUES form a contiguous 0..N-1 set, NOT that they appear in array
    // position order. Producers may emit phases out of authoring order so
    // long as the index set is well-formed (the consumer uses ordered_index
    // to drive position, not array position).
    const env = baseEnvelope([
      { ...basePhase(0), ordered_index: 2 },
      { ...basePhase(1), ordered_index: 0 },
      { ...basePhase(2), ordered_index: 1 },
    ]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(true);
  });

  it('CR-1 error messages quote the offending index for actionability', () => {
    const env = baseEnvelope([
      basePhase(0),
      { ...basePhase(1), ordered_index: 0 },
    ]);
    const result = validate(CanonicalRunSchema, env);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(
      result.errors.some((e) => e.includes('ordered_index=0')),
    ).toBe(true);
  });
});

describe('CanonicalRun CR-1 accumulated-error preservation (iter-2 F2+F7)', () => {
  // The cross-field validator MUST NOT discard CR-1 errors accumulated
  // against earlier well-shaped phases when a later phase has a
  // structurally malformed shape. The standard validate() path rejects
  // the whole record at Value.Check before invoking the cross-field
  // tier, so this defends a future caller invoking the cross-field
  // validator in isolation (e.g., for partial-validation testing).
  // Pattern parallel: AWS IAM 2019 incident — partial evaluators must
  // preserve accumulated state, not return valid:true on truncation.

  // Invoke the cross-field validator directly to exercise the
  // mid-iteration malformed-element path, bypassing Value.Check.
  // The validator is registered by schema $id; access via the
  // cross-field discovery surface (`validators` Map exported from
  // src/validators/index.ts).

  it('preserves duplicate-error when a later phase has non-integer ordered_index', () => {
    // Invoke the pure-function CR-1 evaluator directly (exported from
    // src/canonical/canonical-run.ts as the source-of-truth surface).
    // No registry-internal escape hatch needed.
    const cr1Validator = validateCanonicalRunCR1;
    const malformedRecord = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        { phase_id: 'b', phase_kind: 'design', required_gates: [], ordered_index: 0 },
        { phase_id: 'c', phase_kind: 'audit', required_gates: [], ordered_index: 'bad' },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(malformedRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('preserves duplicate-error when a later phase is non-object', () => {
    // Invoke the pure-function CR-1 evaluator directly (exported from
    // src/canonical/canonical-run.ts as the source-of-truth surface).
    // No registry-internal escape hatch needed.
    const cr1Validator = validateCanonicalRunCR1;
    const malformedRecord = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        { phase_id: 'b', phase_kind: 'design', required_gates: [], ordered_index: 0 },
        null,
        'not-an-object',
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(malformedRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('preserves duplicate-error when later phases have Symbol/string/null/NaN/Infinity ordered_index', () => {
    // iter-3 F-001 mitigation: cover the type-guard ladder explicitly.
    // None of these input types should throw; all should be skipped
    // by the per-element shape guards and accumulated CR-1 state from
    // earlier well-shaped phases must survive.
    const cr1Validator = validateCanonicalRunCR1;
    const malformedRecord = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        { phase_id: 'b', phase_kind: 'design', required_gates: [], ordered_index: 0 },
        { phase_id: 'c', phase_kind: 'audit', required_gates: [], ordered_index: Symbol('s') as unknown as number },
        { phase_id: 'd', phase_kind: 'audit', required_gates: [], ordered_index: 'string' as unknown as number },
        { phase_id: 'e', phase_kind: 'audit', required_gates: [], ordered_index: null as unknown as number },
        { phase_id: 'f', phase_kind: 'audit', required_gates: [], ordered_index: Number.NaN },
        { phase_id: 'g', phase_kind: 'audit', required_gates: [], ordered_index: Number.POSITIVE_INFINITY },
        { phase_id: 'h', phase_kind: 'audit', required_gates: [], ordered_index: 1.5 },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    // Must not throw, must not coerce silently.
    const result = cr1Validator(malformedRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('does not throw and returns valid:false on null/undefined/primitive/array top-level input (iter-7 BLOCKER mitigation)', () => {
    // The JSDoc promised a no-throw contract for malformed input, but
    // the prior implementation read `(data as ...).required_phases`
    // before checking that `data` is an object — null/undefined would
    // throw TypeError. Test the entry-point guard explicitly.
    const cr1Validator = validateCanonicalRunCR1;
    for (const malformed of [
      null,
      undefined,
      42,
      'foo',
      true,
      [],
      [{ phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 }],
    ]) {
      expect(() => cr1Validator(malformed)).not.toThrow();
      const result = cr1Validator(malformed);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('structural shape precondition')),
      ).toBe(true);
    }
  });

  it('returns valid:false with structural-precondition error on non-array required_phases', () => {
    // iter-4 F1 + F-002 mitigation: when invoked in isolation
    // (bypassing Value.Check), the function MUST surface the
    // structural-shape failure so direct callers cannot silently
    // observe valid:true on malformed input.
    const cr1Validator = validateCanonicalRunCR1;
    for (const malformed of [
      { required_phases: 'not-array' },
      { required_phases: null },
      { required_phases: 42 },
      {},
    ]) {
      expect(() => cr1Validator(malformed)).not.toThrow();
      const result = cr1Validator(malformed);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('structural shape precondition')),
      ).toBe(true);
    }
  });

  it('returns valid:false with per-element errors when all phases are malformed (iter-6 F-001 mitigation)', () => {
    // All elements malformed → 4 per-element structural-precondition
    // errors (one per malformed entry), each tagged with the element
    // index for actionability. Direct callers cannot silently observe
    // valid:true on totally malformed payloads.
    const cr1Validator = validateCanonicalRunCR1;
    const allMalformed = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        null,
        'string',
        42,
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 'bad' },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(allMalformed);
    expect(result.valid).toBe(false);
    // Each malformed element emits its own error; expect 4 CR-1 errors.
    expect(result.errors.length).toBe(4);
    expect(result.errors.every((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('required_phases[0]'))).toBe(true);
    expect(result.errors.some((e) => e.includes('required_phases[1]'))).toBe(true);
    expect(result.errors.some((e) => e.includes('required_phases[2]'))).toBe(true);
    expect(result.errors.some((e) => e.includes('required_phases[3]'))).toBe(true);
  });

  it('returns valid:false on mixed payload (well-shaped + malformed) — no silent skip (iter-6 F-001)', () => {
    // Mixed payload: 2 well-shaped + 1 malformed. Even when the
    // well-shaped subset is internally CR-1-clean, the malformed
    // element MUST surface as an error so direct callers see the
    // structural precondition failure rather than valid:true.
    const cr1Validator = validateCanonicalRunCR1;
    const mixed = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        null, // malformed — should emit per-element error
        { phase_id: 'c', phase_kind: 'audit', required_gates: [], ordered_index: 1 },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(mixed);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('required_phases[1]'))).toBe(true);
    expect(result.errors.some((e) => e.includes('null'))).toBe(true);
  });

  it('detects gap among well-shaped indices when malformed elements are interleaved', () => {
    // iter-4 F-002 mitigation: gap detection compares against count
    // of well-shaped elements, not phases.length. With 3 well-shaped
    // indices {0, 2, 3} (expected {0, 1, 2}) plus 1 malformed, the
    // gap at index 1 must surface even though phases.length=4.
    const cr1Validator = validateCanonicalRunCR1;
    const malformedRecord = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        { phase_id: 'b', phase_kind: 'design', required_gates: [], ordered_index: 2 },
        { phase_id: 'c', phase_kind: 'audit', required_gates: [], ordered_index: 3 },
        { phase_id: 'd', phase_kind: 'audit', required_gates: [], ordered_index: 'bad' as unknown as number },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(malformedRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CR-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('gap'))).toBe(true);
  });

  it('returns valid:true when all elements are well-shaped and CR-1-clean', () => {
    const cr1Validator = validateCanonicalRunCR1;
    const cleanRecord = {
      canonical_run_id: 'r',
      canonical_run_version: '1.0.0',
      contract_version: '8.6.0',
      epic_kind: 'k',
      required_phases: [
        { phase_id: 'a', phase_kind: 'discovery', required_gates: [], ordered_index: 0 },
        { phase_id: 'b', phase_kind: 'design', required_gates: [], ordered_index: 1 },
      ],
      ts_authored: '2026-05-09T00:00:00Z',
    };
    const result = cr1Validator(cleanRecord);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
