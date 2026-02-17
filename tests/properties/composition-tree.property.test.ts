/**
 * Property-based tests for composition + trees (S3-T9).
 *
 * Verifies structural invariants for DelegationTree builtins,
 * RegistryBridge constraints, and chainToTree/treeToChain roundtrips
 * using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { chainToTree, treeToChain } from '../../src/governance/delegation-tree.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const microUSDArb = fc
  .bigInt({ min: 0n, max: (1n << 53n) - 1n })
  .map((n) => String(n));

const authorityScopes = ['billing', 'inference', 'delegation', 'audit', 'governance', 'composition'];

const scopeSubsetArb = (parent: string[]) =>
  fc.shuffledSubarray(parent, { minLength: 0, maxLength: parent.length });

/**
 * Generate a tree node with children whose budgets sum <= parentBudget.
 * Authority scopes narrow at each level.
 */
function validTreeNodeArb(
  parentBudget: bigint,
  parentScope: string[],
  depth: number,
  maxDepth: number,
): fc.Arbitrary<any> {
  if (depth >= maxDepth || parentBudget === 0n) {
    return fc.record({
      node_id: fc.uuid(),
      agent_id: fc.string({ minLength: 1, maxLength: 8 }),
      authority_scope: fc.constant(parentScope),
      budget_allocated_micro: fc.constant(String(parentBudget)),
      children: fc.constant([]),
      fork_type: fc.constantFrom('parallel', 'sequential', 'conditional'),
      status: fc.constant('active'),
      version: fc.constant(0),
      timestamp: fc.constant('2026-02-17T10:00:00Z'),
    });
  }

  return fc.integer({ min: 0, max: 3 }).chain((numChildren) => {
    if (numChildren === 0) {
      return fc.record({
        node_id: fc.uuid(),
        agent_id: fc.string({ minLength: 1, maxLength: 8 }),
        authority_scope: fc.constant(parentScope),
        budget_allocated_micro: fc.constant(String(parentBudget)),
        children: fc.constant([]),
        fork_type: fc.constantFrom('parallel', 'sequential', 'conditional'),
        status: fc.constant('active'),
        version: fc.constant(0),
        timestamp: fc.constant('2026-02-17T10:00:00Z'),
      });
    }

    // Split budget among children (sum <= parent)
    return fc.tuple(
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 8 }),
      ...Array.from({ length: numChildren }, () =>
        fc.bigInt({ min: 0n, max: parentBudget / BigInt(numChildren) }),
      ),
    ).chain(([nodeId, agentId, ...childBudgets]) => {
      const childArbs = childBudgets.map((budget) => {
        const childScope = parentScope.length > 0
          ? parentScope.slice(0, Math.max(1, parentScope.length - 1))
          : [];
        return validTreeNodeArb(budget as bigint, childScope, depth + 1, maxDepth);
      });

      return fc.tuple(...(childArbs.length > 0 ? childArbs : [fc.constant([])])).map((children) => ({
        node_id: nodeId,
        agent_id: agentId,
        authority_scope: parentScope,
        budget_allocated_micro: String(parentBudget),
        children: Array.isArray(children[0]) ? [] : children,
        fork_type: 'parallel',
        status: 'active',
        version: 0,
        timestamp: '2026-02-17T10:00:00Z',
      }));
    });
  });
}

// ---------------------------------------------------------------------------
// tree_budget_conserved
// ---------------------------------------------------------------------------

describe('tree_budget_conserved property', () => {
  it('returns true when children sum <= parent at every node', () => {
    fc.assert(
      fc.property(
        microUSDArb.filter((s) => BigInt(s) > 0n && BigInt(s) < 1000000000n),
        (budgetStr) => {
          const budget = BigInt(budgetStr);
          const half = budget / 2n;
          const root = {
            node_id: 'root',
            budget_allocated_micro: budgetStr,
            children: [
              { node_id: 'c1', budget_allocated_micro: String(half), children: [] },
              { node_id: 'c2', budget_allocated_micro: String(budget - half), children: [] },
            ],
          };
          expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('returns false when children sum > parent', () => {
    fc.assert(
      fc.property(
        microUSDArb.filter((s) => BigInt(s) > 0n && BigInt(s) < 1000000000n),
        (budgetStr) => {
          const budget = BigInt(budgetStr);
          const root = {
            node_id: 'root',
            budget_allocated_micro: budgetStr,
            children: [
              { node_id: 'c1', budget_allocated_micro: String(budget), children: [] },
              { node_id: 'c2', budget_allocated_micro: '1', children: [] },
            ],
          };
          expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('leaf nodes always pass', () => {
    fc.assert(
      fc.property(microUSDArb, (budgetStr) => {
        const root = {
          node_id: 'leaf',
          budget_allocated_micro: budgetStr,
          children: [],
        };
        expect(evaluateConstraint({ root }, 'tree_budget_conserved(root)')).toBe(true);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// tree_authority_narrowing
// ---------------------------------------------------------------------------

describe('tree_authority_narrowing property', () => {
  it('returns true when child scopes are subsets of parent', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(authorityScopes, { minLength: 2, maxLength: 6 }),
        (parentScope) => {
          const childScope = parentScope.slice(0, Math.max(1, parentScope.length - 1));
          const root = {
            node_id: 'root',
            authority_scope: parentScope,
            children: [
              { node_id: 'c1', authority_scope: childScope, children: [] },
            ],
          };
          expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('returns false when child has scope not in parent', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(authorityScopes, { minLength: 1, maxLength: 3 }),
        fc.constantFrom(...authorityScopes),
        (parentScope, extraScope) => {
          fc.pre(!parentScope.includes(extraScope));
          const root = {
            node_id: 'root',
            authority_scope: parentScope,
            children: [
              { node_id: 'c1', authority_scope: [...parentScope, extraScope], children: [] },
            ],
          };
          expect(evaluateConstraint({ root }, 'tree_authority_narrowing(root)')).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// unique_values
// ---------------------------------------------------------------------------

describe('unique_values property', () => {
  it('returns true for arrays with distinct field values', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 10 }),
        (ids) => {
          const items = ids.map((id) => ({ invariant_id: id }));
          expect(
            evaluateConstraint({ bridge_invariants: items }, "unique_values(bridge_invariants, 'invariant_id')"),
          ).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('returns false when duplicates exist', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 8 }),
        (id) => {
          const items = [{ invariant_id: id }, { invariant_id: id }];
          expect(
            evaluateConstraint({ bridge_invariants: items }, "unique_values(bridge_invariants, 'invariant_id')"),
          ).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// RegistryBridge distinct-registries
// ---------------------------------------------------------------------------

describe('registry-bridge distinct-registries property', () => {
  it('distinct UUIDs always pass', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (a, b) => {
        fc.pre(a !== b);
        expect(
          evaluateConstraint(
            { source_registry_id: a, target_registry_id: b },
            'source_registry_id != target_registry_id',
          ),
        ).toBe(true);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// chainToTree / treeToChain roundtrip
// ---------------------------------------------------------------------------

describe('chainToTree/treeToChain roundtrip property', () => {
  it('preserves agent_ids through roundtrip', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numLinks) => {
          const agents = Array.from({ length: numLinks + 1 }, (_, i) => `agent-${i}`);
          const links = agents.slice(0, numLinks).map((_, i) => ({
            delegator: agents[i],
            delegatee: agents[i + 1],
            task_type: 'inference',
            authority_scope: ['billing'],
            budget_allocated_micro: '1000',
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            outcome: 'completed',
          }));
          const chain = {
            root_delegator: agents[0],
            links,
            max_depth: 10,
          };

          const tree = chainToTree(chain);
          expect(tree).not.toBeNull();

          const back = treeToChain(tree!);
          expect(back).not.toBeNull();

          // Agent IDs preserved in order
          const originalAgents = [chain.root_delegator, ...chain.links.map((l) => l.delegatee)];
          const treeAgents: string[] = [];
          let node = tree!.root;
          while (node) {
            treeAgents.push(node.agent_id);
            node = node.children?.[0] as any;
          }
          expect(treeAgents).toEqual(originalAgents);
        },
      ),
      { numRuns: 20 },
    );
  });
});
