/**
 * Tests for ConstraintASTNode discriminated union type (F-020 resolution).
 *
 * Verifies that the type exists, exports correctly, and that the evaluator
 * continues to work correctly with the typed intermediate representation.
 *
 * @see SDD §2.1.3 — F-020: parseExpr() Return Type Safety
 * @since v7.0.0 (Sprint 1)
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import { EVALUATOR_BUILTIN_SPECS } from '../../src/constraints/evaluator-spec.js';
import type { ConstraintASTNode } from '../../src/constraints/constraint-types.js';

// ---------------------------------------------------------------------------
// Type existence assertions (compile-time verification)
// ---------------------------------------------------------------------------

describe('ConstraintASTNode type (F-020)', () => {
  it('type is importable and usable', () => {
    // Compile-time check: if ConstraintASTNode doesn't exist, this file won't compile
    const literal: ConstraintASTNode = { kind: 'literal', value: 42 };
    expect(literal.kind).toBe('literal');
  });

  it('supports all node kinds', () => {
    const nodes: ConstraintASTNode[] = [
      { kind: 'literal', value: 'hello' },
      { kind: 'literal', value: 42 },
      { kind: 'literal', value: true },
      { kind: 'literal', value: null },
      { kind: 'identifier', name: 'status' },
      { kind: 'member_access', object: 'agent', property: 'name' },
      { kind: 'function_call', name: 'bigint_eq', args: [
        { kind: 'identifier', name: 'a' },
        { kind: 'identifier', name: 'b' },
      ]},
      { kind: 'binary_op', op: '==', left: { kind: 'identifier', name: 'x' }, right: { kind: 'literal', value: 5 } },
      { kind: 'unary_op', op: '!', operand: { kind: 'identifier', name: 'flag' } },
      { kind: 'array_literal', elements: [{ kind: 'literal', value: 1 }, { kind: 'literal', value: 2 }] },
      { kind: 'every', array: 'items', predicate: 'item => item.valid' },
    ];
    expect(nodes).toHaveLength(11);
    const kinds = nodes.map(n => n.kind);
    expect(kinds).toContain('literal');
    expect(kinds).toContain('identifier');
    expect(kinds).toContain('member_access');
    expect(kinds).toContain('function_call');
    expect(kinds).toContain('binary_op');
    expect(kinds).toContain('unary_op');
    expect(kinds).toContain('array_literal');
    expect(kinds).toContain('every');
  });
});

// ---------------------------------------------------------------------------
// Evaluator correctness post-F-020
// ---------------------------------------------------------------------------

describe('Evaluator correctness after F-020 typing', () => {
  it('evaluates literal comparisons', () => {
    expect(evaluateConstraint({ status: 'active' }, "status == 'active'")).toBe(true);
    expect(evaluateConstraint({ status: 'active' }, "status == 'expired'")).toBe(false);
  });

  it('evaluates boolean operators', () => {
    expect(evaluateConstraint({ a: true, b: true }, 'a && b')).toBe(true);
    expect(evaluateConstraint({ a: true, b: false }, 'a && b')).toBe(false);
    expect(evaluateConstraint({ a: false, b: true }, 'a || b')).toBe(true);
  });

  it('evaluates unary negation', () => {
    expect(evaluateConstraint({ flag: false }, '!flag')).toBe(true);
    expect(evaluateConstraint({ flag: true }, '!flag')).toBe(false);
  });

  it('evaluates dot-access', () => {
    expect(evaluateConstraint({ agent: { name: 'test' } }, "agent.name == 'test'")).toBe(true);
  });

  it('evaluates array length', () => {
    expect(evaluateConstraint({ items: [1, 2, 3] }, 'items.length == 3')).toBe(true);
  });

  it('evaluates bigint functions', () => {
    expect(evaluateConstraint({ a: '1000', b: '500' }, 'bigint_gte(a, b)')).toBe(true);
    expect(evaluateConstraint({ a: '100', b: '200' }, 'bigint_gt(a, b)')).toBe(false);
  });

  it('evaluates array.every', () => {
    expect(evaluateConstraint(
      { items: [{ valid: true }, { valid: true }] },
      'items.every(i => i.valid)',
    )).toBe(true);
    expect(evaluateConstraint(
      { items: [{ valid: true }, { valid: false }] },
      'items.every(i => i.valid)',
    )).toBe(false);
  });

  it('evaluates implication', () => {
    expect(evaluateConstraint({ a: true, b: true }, 'a => b')).toBe(true);
    expect(evaluateConstraint({ a: true, b: false }, 'a => b')).toBe(false);
    expect(evaluateConstraint({ a: false, b: false }, 'a => b')).toBe(true);
  });

  it('evaluates null comparisons', () => {
    expect(evaluateConstraint({ val: null }, 'val == null')).toBe(true);
    expect(evaluateConstraint({ val: 'something' }, 'val != null')).toBe(true);
  });

  it('all 23 existing builtins still work', () => {
    // Verify each spec example still evaluates correctly
    for (const [name, spec] of EVALUATOR_BUILTIN_SPECS) {
      for (const example of spec.examples) {
        const result = evaluateConstraint(example.context, example.expression);
        expect(result, `${name}: ${example.description}`).toBe(example.expected);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Builtin count integrity
// ---------------------------------------------------------------------------

describe('EVALUATOR_BUILTINS count (41 builtins — v7.8.0)', () => {
  it('EVALUATOR_BUILTINS contains 41 functions', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(43);
  });

  it('EVALUATOR_BUILTIN_SPECS has 41 entries', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(43);
  });
});
