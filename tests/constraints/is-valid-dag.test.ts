/**
 * Tests for the `is_valid_dag` constraint builtin (FR-C1, v8.4.0).
 *
 * Covers the 9 normative cases from SDD section 6.3 plus the 2 pre-guard
 * cases (items_count overrun, byte payload overrun) from SDD section 5.5.1
 * Step 0. Each case asserts:
 *   - The constraint-DSL surface (`evaluateConstraint`) returns the right
 *     boolean, since constraint files use this entry point.
 *   - The structured surface (`evaluateIsValidDag`) returns the right
 *     `valid` + `diagnostic` shape, since cross-language runners and the
 *     unverified-obligations manifest emission consume it.
 *
 * Diagnostic shapes are pinned NORMATIVELY across runners; if a `code` or
 * `path` here changes, the cross-language conformance harness will diverge.
 *
 * @see SDD section 5.5.1 — Op-counting algorithm
 * @see SDD section 6.3 — Structured diagnostic cases
 * @see SDD section 6.5 — Cross-runner ErrorEnvelope shape
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import {
  evaluateIsValidDag,
  extractPath,
  IS_VALID_DAG_OP_CAP,
  IS_VALID_DAG_ITEMS_CAP,
  IS_VALID_DAG_BYTES_CAP,
  EVALUATOR_BUILTINS,
} from '../../src/constraints/index.js';

describe('is_valid_dag — registration', () => {
  it('is registered in EVALUATOR_BUILTINS', () => {
    expect(EVALUATOR_BUILTINS).toContain('is_valid_dag');
  });

  it('exposes the OP_CAP, ITEMS_CAP, and BYTES_CAP constants', () => {
    expect(IS_VALID_DAG_OP_CAP).toBe(100_000);
    expect(IS_VALID_DAG_ITEMS_CAP).toBe(10_000);
    expect(IS_VALID_DAG_BYTES_CAP).toBe(1_048_576);
  });
});

describe('is_valid_dag — SDD section 6.3 normative cases', () => {
  // -- Case 1 --------------------------------------------------------------
  it('empty array → valid (vacuous)', () => {
    const items: unknown[] = [];
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(true);
    expect(direct.diagnostic).toBeNull();

    const dsl = evaluateConstraint(
      { items },
      "is_valid_dag(items, 'id')",
    );
    expect(dsl).toBe(true);
  });

  // -- Case 2 --------------------------------------------------------------
  it('single node, no refs → valid', () => {
    const items = [{ id: 'A' }];
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(true);

    const dsl = evaluateConstraint(
      { items },
      "is_valid_dag(items, 'id')",
    );
    expect(dsl).toBe(true);
  });

  // -- Case 3 --------------------------------------------------------------
  it('single node, self-loop → invalid (cycle)', () => {
    const items = [{ id: 'A', next: 'A' }];
    const direct = evaluateIsValidDag(items, 'id', ['next']);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_CYCLE_DETECTED');
      expect(direct.diagnostic.context.cycle).toEqual(['A', 'A']);
    }

    const dsl = evaluateConstraint(
      { items },
      "is_valid_dag(items, 'id', 'next')",
    );
    expect(dsl).toBe(false);
  });

  // -- Case 4 --------------------------------------------------------------
  it('dangling ref to absent ID → invalid', () => {
    const items = [{ id: 'A', next: 'ZZZ' }];
    const direct = evaluateIsValidDag(items, 'id', ['next']);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_DANGLING_REF');
      expect(direct.diagnostic.context.from).toBe('A');
      expect(direct.diagnostic.context.ref).toBe('ZZZ');
    }
  });

  // -- Case 5 --------------------------------------------------------------
  it('circular reference (A → B → A) → invalid', () => {
    const items = [
      { id: 'A', next: 'B' },
      { id: 'B', next: 'A' },
    ];
    const direct = evaluateIsValidDag(items, 'id', ['next']);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_CYCLE_DETECTED');
      expect(direct.diagnostic.context.cycle).toEqual(['A', 'B', 'A']);
    }
  });

  // -- Case 6 --------------------------------------------------------------
  it('multi-parent DAG (A → B, A → C, B → D, C → D) → valid', () => {
    const items = [
      { id: 'A', left: 'B', right: 'C' },
      { id: 'B', left: 'D' },
      { id: 'C', left: 'D' },
      { id: 'D' },
    ];
    const direct = evaluateIsValidDag(items, 'id', ['left', 'right']);
    expect(direct.valid).toBe(true);
    expect(direct.diagnostic).toBeNull();
  });

  // -- Case 7 --------------------------------------------------------------
  it('missing id_field on any item → DAG_MISSING_ID_FIELD', () => {
    const items = [{ id: 'A' }, { name: 'orphan' }];
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_MISSING_ID_FIELD');
      expect(direct.diagnostic.context.index).toBe(1);
    }
  });

  // -- Case 8 --------------------------------------------------------------
  it('non-string id_field value → DAG_NON_STRING_ID_FIELD', () => {
    const items = [{ id: 'A' }, { id: 42 }];
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_NON_STRING_ID_FIELD');
      expect(direct.diagnostic.context.index).toBe(1);
      expect(direct.diagnostic.context.actual_type).toBe('number');
    }
  });

  // -- Case 9 --------------------------------------------------------------
  it('complexity stress at 10⁵-op cap → DAG_OP_CAP_EXCEEDED', () => {
    // Inflate ops beyond OP_CAP without tripping the ITEMS_CAP (10_000) or
    // BYTES_CAP (1 MiB) pre-guards. Strategy: a small chain of items with
    // many redundant ref_fields. Each ref_field contributes 1 ref-resolve
    // op per node visited, so passing 99 copies of the chain field
    // multiplies the per-node cost ~99×.
    //
    // ops ≈ N (indexing) + N (visit) + N × 99 (ref-resolve) = N × 101.
    // With N = 1_000, ops ≈ 101_000 — clears the 100_000 cap. Item bytes
    // stay tiny (~25 bytes/item × 1000 = ~25 KiB), well under BYTES_CAP.
    const N = 1_000;
    const items: Array<{ id: string; next?: string }> = [];
    for (let i = 0; i < N; i++) {
      items.push({ id: `n${i}`, next: i + 1 < N ? `n${i + 1}` : undefined });
    }
    const refFields = Array.from({ length: 99 }, () => 'next');

    const direct = evaluateIsValidDag(items, 'id', refFields);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      // The cap is hit during ref-resolve (each node with 99 ref-fields
      // far outweighs the indexing + visit ops).
      expect(direct.diagnostic.code).toBe('DAG_OP_CAP_EXCEEDED');
      expect(['dfs', 'ref-resolve']).toContain(direct.diagnostic.context.phase);
      expect(typeof direct.diagnostic.context.ops).toBe('number');
      const opCount = direct.diagnostic.context.ops as number;
      expect(opCount).toBeGreaterThan(IS_VALID_DAG_OP_CAP);
    }
  });
});

describe('is_valid_dag — SDD section 5.5.1 pre-guards', () => {
  it('items array exceeds 10_000 entries → DAG_INPUT_OVERSIZE { kind: "items_count" }', () => {
    const items = Array.from({ length: IS_VALID_DAG_ITEMS_CAP + 1 }, (_, i) => ({ id: `n${i}` }));
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_INPUT_OVERSIZE');
      expect(direct.diagnostic.context.kind).toBe('items_count');
      expect(direct.diagnostic.context.limit).toBe(IS_VALID_DAG_ITEMS_CAP);
      expect(direct.diagnostic.context.actual).toBe(IS_VALID_DAG_ITEMS_CAP + 1);
    }
  });

  it('serialized payload exceeds 1 MiB → DAG_INPUT_OVERSIZE { kind: "bytes" }', () => {
    // Pack each item with a heavy payload so total serialized JSON exceeds
    // BYTES_CAP without exceeding ITEMS_CAP.
    const heavyValue = 'x'.repeat(2_000);
    const items = Array.from({ length: 600 }, (_, i) => ({ id: `n${i}`, payload: heavyValue }));
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_INPUT_OVERSIZE');
      expect(direct.diagnostic.context.kind).toBe('bytes');
      expect(direct.diagnostic.context.limit).toBe(IS_VALID_DAG_BYTES_CAP);
      const actualBytes = direct.diagnostic.context.actual as number;
      expect(actualBytes).toBeGreaterThan(IS_VALID_DAG_BYTES_CAP);
    }
  });
});

describe('is_valid_dag — duplicate ids', () => {
  it('emits DAG_DUPLICATE_ID with all collision indices', () => {
    const items = [
      { id: 'A' },
      { id: 'B' },
      { id: 'A' },
    ];
    const direct = evaluateIsValidDag(items, 'id', []);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_DUPLICATE_ID');
      expect(direct.diagnostic.context.id).toBe('A');
      expect(direct.diagnostic.context.indices).toEqual([0, 2]);
    }
  });
});

describe('is_valid_dag — DSL surface variadic ref_fields', () => {
  it('accepts zero ref_fields', () => {
    expect(
      evaluateConstraint(
        { items: [{ id: 'A' }, { id: 'B' }] },
        "is_valid_dag(items, 'id')",
      ),
    ).toBe(true);
  });

  it('accepts multiple ref_fields and traverses all of them', () => {
    const items = [
      { id: 'A', left: 'B', right: 'C' },
      { id: 'B' },
      { id: 'C' },
    ];
    expect(
      evaluateConstraint(
        { items },
        "is_valid_dag(items, 'id', 'left', 'right')",
      ),
    ).toBe(true);
  });

  it('returns false on the DSL surface when a cycle is present', () => {
    const items = [
      { id: 'A', next: 'B' },
      { id: 'B', next: 'A' },
    ];
    expect(
      evaluateConstraint(
        { items },
        "is_valid_dag(items, 'id', 'next')",
      ),
    ).toBe(false);
  });

  it('returns false on the DSL surface when a ref_field literal is non-string', () => {
    // Honest constraint expressions always use string-literal ref_fields
    // (e.g., 'next', 'grounding.claim_id'). The parser short-circuits to
    // false when a numeric or boolean literal slips in, instead of silently
    // proceeding with a malformed ref_field. This guards the cross-runner
    // contract — a runner that COERCED 42 to '42' would diverge from TS.
    expect(
      evaluateConstraint(
        { items: [{ id: 'A' }] },
        "is_valid_dag(items, 'id', 42)",
      ),
    ).toBe(false);
  });
});

describe('extract_path — SDD section 5.5.1 reference table', () => {
  it('top-level field', () => {
    expect(extractPath({ claim_id: 'c1' }, 'claim_id')).toBe('c1');
  });

  it('nested field via dot-notation', () => {
    expect(extractPath({ grounding: { claim_id: 'c2' } }, 'grounding.claim_id')).toBe('c2');
  });

  it('missing top-level → undefined', () => {
    expect(extractPath({}, 'claim_id')).toBeUndefined();
  });

  it('missing nested intermediate → undefined', () => {
    expect(extractPath({ grounding: null }, 'grounding.claim_id')).toBeUndefined();
  });

  it('wrong type at intermediate (string) → undefined (no traversal-into-string)', () => {
    expect(extractPath({ grounding: 'oops' }, 'grounding.claim_id')).toBeUndefined();
  });

  it('array-index syntax in path is rejected (returns undefined)', () => {
    expect(extractPath({ claims: [{ id: 'x' }] }, 'claims[0].id')).toBeUndefined();
  });

  it('empty path → undefined (rejected as malformed)', () => {
    expect(extractPath({ x: 1 }, '')).toBeUndefined();
  });

  it('path with empty intermediate segment → undefined', () => {
    expect(extractPath({ a: { b: 1 } }, 'a..b')).toBeUndefined();
  });

  it('deep nested traversal', () => {
    expect(extractPath({ a: { b: { c: { d: 'leaf' } } } }, 'a.b.c.d')).toBe('leaf');
  });

  it('does not traverse into arrays via dot path', () => {
    // `claims.0.id` is dot-only but the intermediate is an array; per SDD
    // 5.5.1 the helper does not coerce array indexing, so it falls through
    // to undefined.
    expect(extractPath({ claims: [{ id: 'x' }] }, 'claims.0.id')).toBeUndefined();
  });
});

describe('is_valid_dag — declared-array-order determinism', () => {
  it('cycle detection reports the cycle in the order nodes were first visited', () => {
    // A → B → C → A. Iteration starts from A (declared-order), visits B,
    // visits C, finds the back-edge to A, reports cycle [A, B, C, A].
    const items = [
      { id: 'A', next: 'B' },
      { id: 'B', next: 'C' },
      { id: 'C', next: 'A' },
    ];
    const direct = evaluateIsValidDag(items, 'id', ['next']);
    expect(direct.valid).toBe(false);
    if (direct.valid === false) {
      expect(direct.diagnostic.code).toBe('DAG_CYCLE_DETECTED');
      expect(direct.diagnostic.context.cycle).toEqual(['A', 'B', 'C', 'A']);
    }
  });

  it('does not re-visit nodes already marked visited (memoisation)', () => {
    // Diamond: A → B, A → C, B → D, C → D. D is reached twice; the
    // memoisation in step 2 skips the second visit, so total ops stay
    // bounded by O(nodes + edges) rather than blowing up exponentially.
    const items = [
      { id: 'A', l: 'B', r: 'C' },
      { id: 'B', l: 'D' },
      { id: 'C', l: 'D' },
      { id: 'D' },
    ];
    const direct = evaluateIsValidDag(items, 'id', ['l', 'r']);
    expect(direct.valid).toBe(true);
  });
});
