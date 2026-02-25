/**
 * Tests for tree evaluator builtins (S3-T6).
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import { EVALUATOR_BUILTIN_SPECS } from '../../src/constraints/evaluator-spec.js';

describe('tree_budget_conserved', () => {
  it('returns true for valid tree', () => {
    const root = {
      node_id: '1', budget_allocated_micro: '1000',
      children: [
        { node_id: '2', budget_allocated_micro: '500', children: [] },
        { node_id: '3', budget_allocated_micro: '500', children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(true);
  });

  it('returns false for budget overflow', () => {
    const root = {
      node_id: '1', budget_allocated_micro: '1000',
      children: [
        { node_id: '2', budget_allocated_micro: '600', children: [] },
        { node_id: '3', budget_allocated_micro: '600', children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(false);
  });

  it('handles leaf nodes (no children)', () => {
    const root = { node_id: '1', budget_allocated_micro: '1000', children: [] };
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(true);
  });

  it('validates at depth 2', () => {
    const root = {
      node_id: '1', budget_allocated_micro: '1000',
      children: [{
        node_id: '2', budget_allocated_micro: '800',
        children: [
          { node_id: '3', budget_allocated_micro: '500', children: [] },
          { node_id: '4', budget_allocated_micro: '400', children: [] },
        ],
      }],
    };
    // 500 + 400 = 900 > 800 at depth 2 → false
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(false);
  });

  it('handles null root', () => {
    expect(evaluateConstraint({ root: null }, 'tree_budget_conserved(root)')).toBe(true);
  });
});

describe('tree_authority_narrowing', () => {
  it('returns true for valid narrowing', () => {
    const root = {
      node_id: '1', authority_scope: ['billing', 'inference'],
      children: [
        { node_id: '2', authority_scope: ['billing'], children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(true);
  });

  it('returns false for widening authority', () => {
    const root = {
      node_id: '1', authority_scope: ['billing'],
      children: [
        { node_id: '2', authority_scope: ['billing', 'inference'], children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(false);
  });

  it('accepts empty scope at leaf', () => {
    const root = {
      node_id: '1', authority_scope: ['billing'],
      children: [
        { node_id: '2', authority_scope: [], children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(true);
  });

  it('validates at depth 3', () => {
    const root = {
      node_id: '1', authority_scope: ['billing', 'inference', 'delegation'],
      children: [{
        node_id: '2', authority_scope: ['billing', 'inference'],
        children: [{
          node_id: '3', authority_scope: ['billing', 'delegation'], // delegation NOT in parent
          children: [],
        }],
      }],
    };
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(false);
  });

  it('handles case insensitivity', () => {
    const root = {
      node_id: '1', authority_scope: ['Billing', 'INFERENCE'],
      children: [
        { node_id: '2', authority_scope: ['billing'], children: [] },
      ],
    };
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(true);
  });
});

describe('EVALUATOR_BUILTINS and SPECS updated', () => {
  it('EVALUATOR_BUILTINS contains 41 functions', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(43);
  });

  it('includes tree_budget_conserved', () => {
    expect(EVALUATOR_BUILTINS).toContain('tree_budget_conserved');
  });

  it('includes tree_authority_narrowing', () => {
    expect(EVALUATOR_BUILTINS).toContain('tree_authority_narrowing');
  });

  it('EVALUATOR_BUILTIN_SPECS has 41 entries', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(43);
  });

  it('spec examples execute correctly for tree_budget_conserved', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('tree_budget_conserved')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });

  it('spec examples execute correctly for tree_authority_narrowing', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('tree_authority_narrowing')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });
});

describe('tree builtin resource limits', () => {
  function buildDeepTree(depth: number): Record<string, unknown> {
    let node: Record<string, unknown> = {
      node_id: `node-${depth}`,
      agent_id: `agent-${depth}`,
      authority_scope: ['billing'],
      budget_allocated_micro: '100',
      children: [],
    };
    for (let i = depth - 1; i >= 0; i--) {
      node = {
        node_id: `node-${i}`,
        agent_id: `agent-${i}`,
        authority_scope: ['billing'],
        budget_allocated_micro: '100',
        children: [node],
      };
    }
    return node;
  }

  it('tree_budget_conserved returns false for depth > 10', () => {
    const root = buildDeepTree(12);
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(false);
  });

  it('tree_budget_conserved passes for depth <= 10', () => {
    const root = buildDeepTree(9);
    expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(true);
  });

  it('tree_authority_narrowing returns false for depth > 10', () => {
    const root = buildDeepTree(12);
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(false);
  });

  it('tree_authority_narrowing passes for depth <= 10', () => {
    const root = buildDeepTree(9);
    expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(true);
  });
});
