/**
 * Delegation Tree — concurrent multi-model orchestration via tree-structured delegation.
 *
 * While DelegationChain represents linear delegation (A → B → C),
 * DelegationTree supports branching: A delegates to B and C concurrently,
 * each with their own sub-delegations.
 *
 * @see SDD §2.6.1-2.6.5 — DelegationTree, Builtins, Conversion
 * @since v6.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Vocabulary Types
// ---------------------------------------------------------------------------

export const ForkTypeSchema = Type.Union(
  [
    Type.Literal('parallel'),
    Type.Literal('sequential'),
    Type.Literal('conditional'),
  ],
  {
    $id: 'ForkType',
    description: 'How child delegations are executed: in parallel, sequentially, or conditionally.',
  },
);
export type ForkType = Static<typeof ForkTypeSchema>;

export const TreeNodeStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('cancelled'),
  ],
  {
    $id: 'TreeNodeStatus',
    description: 'Status of a delegation tree node.',
  },
);
export type TreeNodeStatus = Static<typeof TreeNodeStatusSchema>;

export const TreeStrategySchema = Type.Union(
  [
    Type.Literal('first_complete'),
    Type.Literal('best_of_n'),
    Type.Literal('consensus'),
    Type.Literal('pipeline'),
  ],
  {
    $id: 'TreeStrategy',
    description: 'Strategy for combining results from child delegations.',
  },
);
export type TreeStrategy = Static<typeof TreeStrategySchema>;

export const BudgetAllocationSchema = Type.Union(
  [
    Type.Literal('equal_split'),
    Type.Literal('weighted'),
    Type.Literal('on_demand'),
  ],
  {
    $id: 'BudgetAllocation',
    description: 'How budget is distributed among child delegations.',
  },
);
export type BudgetAllocation = Static<typeof BudgetAllocationSchema>;

// ---------------------------------------------------------------------------
// DelegationTreeNode
// ---------------------------------------------------------------------------

export const DelegationTreeNodeSchema = Type.Recursive(
  (Self) =>
    Type.Object(
      {
        node_id: Type.String({ format: 'uuid' }),
        agent_id: Type.String({ minLength: 1 }),
        authority_scope: Type.Array(Type.String(), {
          description: 'Capability scopes this node is authorized for.',
        }),
        budget_allocated_micro: Type.String({
          pattern: '^\\d+$',
          description: 'Budget allocated to this node (string-encoded BigInt).',
        }),
        children: Type.Array(Self, {
          default: [],
          description: 'Child delegation nodes.',
        }),
        fork_type: ForkTypeSchema,
        join_condition: Type.Optional(Type.String({
          description: 'Condition for joining results from children (optional).',
        })),
        status: TreeNodeStatusSchema,
        version: Type.Integer({
          minimum: 0,
          default: 0,
          description: 'Optimistic concurrency control version.',
        }),
        timestamp: Type.String({ format: 'date-time' }),
      },
      {
        $id: 'DelegationTreeNode',
        additionalProperties: false,
        description: 'A node in the delegation tree representing a single agent delegation.',
      },
    ),
  { $id: 'DelegationTreeNode' },
);
export type DelegationTreeNode = Static<typeof DelegationTreeNodeSchema>;

// ---------------------------------------------------------------------------
// DelegationTree
// ---------------------------------------------------------------------------

export const DelegationTreeSchema = Type.Object(
  {
    tree_id: Type.String({ format: 'uuid' }),
    root: DelegationTreeNodeSchema,
    strategy: TreeStrategySchema,
    total_budget_micro: Type.String({
      pattern: '^\\d+$',
      description: 'Total budget for the entire tree (string-encoded BigInt).',
    }),
    budget_allocation: BudgetAllocationSchema,
    max_depth: Type.Integer({
      minimum: 1,
      maximum: 10,
      default: 10,
      description: 'Maximum depth of the delegation tree.',
    }),
    max_total_nodes: Type.Integer({
      minimum: 1,
      maximum: 1000,
      default: 100,
      description: 'Maximum total nodes in the delegation tree.',
    }),
    created_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'DelegationTree',
    additionalProperties: false,
    description: 'A tree-structured delegation enabling concurrent multi-model orchestration.',
  },
);
export type DelegationTree = Static<typeof DelegationTreeSchema>;

// ---------------------------------------------------------------------------
// Conversion Utilities (S3-T7)
// ---------------------------------------------------------------------------

/**
 * Convert a DelegationChain to a DelegationTree (single-path, strategy: pipeline).
 */
export function chainToTree(chain: {
  root_delegator: string;
  links: Array<{
    delegator: string;
    delegatee: string;
    authority_scope: string[];
    budget_allocated_micro?: string;
    timestamp?: string;
  }>;
  max_depth?: number;
}): DelegationTree {
  const now = new Date().toISOString();
  const uuid = () => crypto.randomUUID();

  // Build nodes from bottom up
  const links = chain.links ?? [];

  if (links.length === 0) {
    const rootNode: DelegationTreeNode = {
      node_id: uuid(),
      agent_id: chain.root_delegator,
      authority_scope: [],
      budget_allocated_micro: '0',
      children: [],
      fork_type: 'sequential',
      status: 'active',
      version: 0,
      timestamp: now,
    };
    return {
      tree_id: uuid(),
      root: rootNode,
      strategy: 'pipeline',
      total_budget_micro: '0',
      budget_allocation: 'equal_split',
      max_depth: chain.max_depth ?? 10,
      max_total_nodes: 100,
      created_at: now,
      contract_version: '6.0.0',
    };
  }

  // Build chain of nodes: last link becomes leaf
  const nodes: DelegationTreeNode[] = [];
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i];
    const child: DelegationTreeNode | undefined = nodes.length > 0 ? nodes[nodes.length - 1] : undefined;
    const node: DelegationTreeNode = {
      node_id: uuid(),
      agent_id: link.delegatee,
      authority_scope: link.authority_scope,
      budget_allocated_micro: link.budget_allocated_micro ?? '0',
      children: child ? [child] : [],
      fork_type: 'sequential',
      status: 'active',
      version: 0,
      timestamp: link.timestamp ?? now,
    };
    nodes.push(node);
  }

  // Root is the last built node (first link's delegator)
  const firstLinkNode = nodes[nodes.length - 1];
  const rootNode: DelegationTreeNode = {
    node_id: uuid(),
    agent_id: chain.root_delegator,
    authority_scope: links[0].authority_scope,
    budget_allocated_micro: firstLinkNode.budget_allocated_micro,
    children: [firstLinkNode],
    fork_type: 'sequential',
    status: 'active',
    version: 0,
    timestamp: now,
  };

  const totalBudget = rootNode.budget_allocated_micro;
  return {
    tree_id: uuid(),
    root: rootNode,
    strategy: 'pipeline',
    total_budget_micro: totalBudget,
    budget_allocation: 'equal_split',
    max_depth: chain.max_depth ?? 10,
    max_total_nodes: 100,
    created_at: now,
    contract_version: '6.0.0',
  };
}

/**
 * Convert a DelegationTree to a DelegationChain if the tree has no branching.
 * Returns null if any node has more than one child.
 */
export function treeToChain(tree: DelegationTree): {
  root_delegator: string;
  links: Array<{
    delegator: string;
    delegatee: string;
    authority_scope: string[];
    budget_allocated_micro: string;
    timestamp: string;
  }>;
  max_depth: number;
} | null {
  const links: Array<{
    delegator: string;
    delegatee: string;
    authority_scope: string[];
    budget_allocated_micro: string;
    timestamp: string;
  }> = [];

  let current: DelegationTreeNode = tree.root;

  while (current.children.length > 0) {
    if (current.children.length > 1) return null; // branching → not a chain
    const child = current.children[0];
    links.push({
      delegator: current.agent_id,
      delegatee: child.agent_id,
      authority_scope: child.authority_scope,
      budget_allocated_micro: child.budget_allocated_micro,
      timestamp: child.timestamp,
    });
    current = child;
  }

  return {
    root_delegator: tree.root.agent_id,
    links,
    max_depth: tree.max_depth,
  };
}
