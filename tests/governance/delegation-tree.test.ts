/**
 * Tests for DelegationTree schemas and conversion utilities (S3-T5, S3-T7).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ForkTypeSchema,
  TreeNodeStatusSchema,
  TreeStrategySchema,
  BudgetAllocationSchema,
  DelegationTreeNodeSchema,
  DelegationTreeSchema,
  chainToTree,
  treeToChain,
} from '../../src/governance/delegation-tree.js';

describe('ForkTypeSchema', () => {
  it('accepts parallel', () => expect(Value.Check(ForkTypeSchema, 'parallel')).toBe(true));
  it('accepts sequential', () => expect(Value.Check(ForkTypeSchema, 'sequential')).toBe(true));
  it('accepts conditional', () => expect(Value.Check(ForkTypeSchema, 'conditional')).toBe(true));
  it('rejects unknown', () => expect(Value.Check(ForkTypeSchema, 'random')).toBe(false));
});

describe('TreeNodeStatusSchema', () => {
  const statuses = ['pending', 'active', 'completed', 'failed', 'cancelled'];
  for (const s of statuses) {
    it(`accepts ${s}`, () => expect(Value.Check(TreeNodeStatusSchema, s)).toBe(true));
  }
  it('rejects unknown', () => expect(Value.Check(TreeNodeStatusSchema, 'paused')).toBe(false));
});

describe('TreeStrategySchema', () => {
  const strategies = ['first_complete', 'best_of_n', 'consensus', 'pipeline'];
  for (const s of strategies) {
    it(`accepts ${s}`, () => expect(Value.Check(TreeStrategySchema, s)).toBe(true));
  }
  it('rejects unknown', () => expect(Value.Check(TreeStrategySchema, 'random')).toBe(false));
});

describe('BudgetAllocationSchema', () => {
  it('accepts equal_split', () => expect(Value.Check(BudgetAllocationSchema, 'equal_split')).toBe(true));
  it('accepts weighted', () => expect(Value.Check(BudgetAllocationSchema, 'weighted')).toBe(true));
  it('accepts on_demand', () => expect(Value.Check(BudgetAllocationSchema, 'on_demand')).toBe(true));
  it('rejects unknown', () => expect(Value.Check(BudgetAllocationSchema, 'fixed')).toBe(false));
});

const makeNode = (overrides: Partial<any> = {}) => ({
  node_id: '123e4567-e89b-12d3-a456-426614174000',
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

describe('DelegationTreeNodeSchema', () => {
  it('accepts valid leaf node', () => {
    expect(Value.Check(DelegationTreeNodeSchema, makeNode())).toBe(true);
  });

  it('accepts node with children', () => {
    const node = makeNode({
      children: [
        makeNode({ node_id: '123e4567-e89b-12d3-a456-426614174001', agent_id: 'agent-2' }),
      ],
    });
    expect(Value.Check(DelegationTreeNodeSchema, node)).toBe(true);
  });

  it('includes version field for concurrency', () => {
    const node = makeNode({ version: 5 });
    expect(Value.Check(DelegationTreeNodeSchema, node)).toBe(true);
  });
});

const makeTree = (overrides: Partial<any> = {}) => ({
  tree_id: '123e4567-e89b-12d3-a456-426614174999',
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

describe('DelegationTreeSchema', () => {
  it('accepts valid tree', () => {
    expect(Value.Check(DelegationTreeSchema, makeTree())).toBe(true);
  });

  it('rejects max_depth > 10', () => {
    expect(Value.Check(DelegationTreeSchema, makeTree({ max_depth: 11 }))).toBe(false);
  });

  it('rejects max_total_nodes > 1000', () => {
    expect(Value.Check(DelegationTreeSchema, makeTree({ max_total_nodes: 1001 }))).toBe(false);
  });

  it('has correct $id', () => {
    expect(DelegationTreeSchema.$id).toBe('DelegationTree');
  });
});

describe('chainToTree (S3-T7)', () => {
  it('converts empty chain to single-node tree', () => {
    const tree = chainToTree({ root_delegator: 'root-agent', links: [] });
    expect(tree.root.agent_id).toBe('root-agent');
    expect(tree.root.children).toHaveLength(0);
    expect(tree.strategy).toBe('pipeline');
  });

  it('converts 2-link chain to linear tree', () => {
    const tree = chainToTree({
      root_delegator: 'root',
      links: [
        { delegator: 'root', delegatee: 'agent-a', authority_scope: ['billing'], budget_allocated_micro: '500' },
        { delegator: 'agent-a', delegatee: 'agent-b', authority_scope: ['billing'], budget_allocated_micro: '250' },
      ],
    });
    expect(tree.root.agent_id).toBe('root');
    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0].agent_id).toBe('agent-a');
    expect(tree.root.children[0].children).toHaveLength(1);
    expect(tree.root.children[0].children[0].agent_id).toBe('agent-b');
  });
});

describe('treeToChain (S3-T7)', () => {
  it('converts linear tree to chain', () => {
    const tree = chainToTree({
      root_delegator: 'root',
      links: [
        { delegator: 'root', delegatee: 'agent-a', authority_scope: ['billing'] },
      ],
    });
    const chain = treeToChain(tree);
    expect(chain).not.toBeNull();
    expect(chain!.root_delegator).toBe('root');
    expect(chain!.links).toHaveLength(1);
    expect(chain!.links[0].delegatee).toBe('agent-a');
  });

  it('returns null for branching tree', () => {
    const tree = makeTree({
      root: makeNode({
        children: [
          makeNode({ node_id: 'a', agent_id: 'agent-a' }),
          makeNode({ node_id: 'b', agent_id: 'agent-b' }),
        ],
      }),
    });
    expect(treeToChain(tree)).toBeNull();
  });

  it('roundtrip preserves agent_ids', () => {
    const original = {
      root_delegator: 'root',
      links: [
        { delegator: 'root', delegatee: 'a', authority_scope: ['billing'] },
        { delegator: 'a', delegatee: 'b', authority_scope: ['billing'] },
      ],
    };
    const tree = chainToTree(original);
    const chain = treeToChain(tree);
    expect(chain).not.toBeNull();
    expect(chain!.root_delegator).toBe('root');
    expect(chain!.links.map(l => l.delegatee)).toEqual(['a', 'b']);
  });
});
