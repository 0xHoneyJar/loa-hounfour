/**
 * Tests for DelegationTree constraint file (S3-T8).
 *
 * Validates all 4 constraints against valid and invalid inputs,
 * and conformance vectors.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'DelegationTree.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const makeNode = (overrides: Record<string, unknown> = {}) => ({
  node_id: '550e8400-e29b-41d4-a716-446655440401',
  agent_id: 'agent-1',
  authority_scope: ['billing', 'inference'],
  budget_allocated_micro: '1000000',
  children: [],
  fork_type: 'parallel',
  status: 'active',
  version: 0,
  timestamp: '2026-02-17T10:00:00Z',
  ...overrides,
});

const makeTree = (overrides: Record<string, unknown> = {}) => ({
  tree_id: '550e8400-e29b-41d4-a716-446655440400',
  root: makeNode(),
  strategy: 'first_complete',
  total_budget_micro: '1000000',
  budget_allocation: 'equal_split',
  max_depth: 5,
  max_total_nodes: 50,
  created_at: '2026-02-17T10:00:00Z',
  contract_version: '6.0.0',
  ...overrides,
});

describe('DelegationTree constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('DelegationTree');
  });

  it('has contract_version 6.0.0', () => {
    expect(constraintFile.contract_version).toBe('6.0.0');
  });

  it('has 4 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(4);
  });

  it('all constraints have type_signature', () => {
    for (const c of constraintFile.constraints) {
      expect(c.type_signature, `${c.id} missing type_signature`).toBeDefined();
    }
  });
});

describe('delegation-tree-budget-conservation', () => {
  const c = findConstraint('delegation-tree-budget-conservation');

  it('passes for leaf node tree', () => {
    expect(evaluateConstraint(makeTree(), c.expression)).toBe(true);
  });

  it('passes when children budget <= parent budget', () => {
    const tree = makeTree({
      root: makeNode({
        children: [
          makeNode({ node_id: 'a', budget_allocated_micro: '400000' }),
          makeNode({ node_id: 'b', budget_allocated_micro: '600000' }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(true);
  });

  it('fails when children budget > parent budget', () => {
    const tree = makeTree({
      root: makeNode({
        children: [
          makeNode({ node_id: 'a', budget_allocated_micro: '600000' }),
          makeNode({ node_id: 'b', budget_allocated_micro: '600000' }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(false);
  });
});

describe('delegation-tree-authority-narrowing', () => {
  const c = findConstraint('delegation-tree-authority-narrowing');

  it('passes with narrowing authority', () => {
    const tree = makeTree({
      root: makeNode({
        children: [
          makeNode({ node_id: 'a', authority_scope: ['billing'] }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(true);
  });

  it('fails with widening authority', () => {
    const tree = makeTree({
      root: makeNode({
        authority_scope: ['billing'],
        children: [
          makeNode({ node_id: 'a', authority_scope: ['billing', 'inference'] }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(false);
  });
});

describe('delegation-tree-consensus-minimum', () => {
  const c = findConstraint('delegation-tree-consensus-minimum');

  it('passes for non-consensus strategy', () => {
    expect(evaluateConstraint(makeTree(), c.expression)).toBe(true);
  });

  it('passes for consensus with 3 children', () => {
    const tree = makeTree({
      strategy: 'consensus',
      root: makeNode({
        children: [
          makeNode({ node_id: 'a' }),
          makeNode({ node_id: 'b' }),
          makeNode({ node_id: 'c' }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(true);
  });

  it('fails for consensus with 2 children', () => {
    const tree = makeTree({
      strategy: 'consensus',
      root: makeNode({
        children: [
          makeNode({ node_id: 'a' }),
          makeNode({ node_id: 'b' }),
        ],
      }),
    });
    expect(evaluateConstraint(tree, c.expression)).toBe(false);
  });
});

describe('delegation-tree-root-budget-match', () => {
  const c = findConstraint('delegation-tree-root-budget-match');

  it('passes when root budget matches total', () => {
    expect(evaluateConstraint(makeTree(), c.expression)).toBe(true);
  });

  it('fails when root budget differs from total', () => {
    const tree = makeTree({ total_budget_micro: '2000000' });
    expect(evaluateConstraint(tree, c.expression)).toBe(false);
  });
});

describe('DelegationTree conformance vectors', () => {
  const vectorDir = join(rootDir, 'vectors', 'conformance', 'delegation-tree');

  it('parallel-ensemble passes all constraints', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'parallel-ensemble.json'), 'utf-8'));
    for (const c of constraintFile.constraints) {
      expect(
        evaluateConstraint(vector.input, c.expression),
        `Constraint ${c.id} should pass for valid tree`,
      ).toBe(true);
    }
  });

  it('budget-overflow fails budget-conservation constraint', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'budget-overflow.json'), 'utf-8'));
    const c = findConstraint('delegation-tree-budget-conservation');
    expect(evaluateConstraint(vector.input, c.expression)).toBe(false);
  });

  it('consensus-too-few fails consensus-minimum constraint', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'consensus-too-few.json'), 'utf-8'));
    const c = findConstraint('delegation-tree-consensus-minimum');
    expect(evaluateConstraint(vector.input, c.expression)).toBe(false);
  });
});
