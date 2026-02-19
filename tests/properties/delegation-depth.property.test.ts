/**
 * Property-based tests for DelegationChain depth invariant (S1-T4).
 *
 * Uses fast-check to verify:
 * - links.length <= max_depth always holds for valid chains
 * - Temporal ordering holds (timestamps non-decreasing)
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import { DelegationChainSchema } from '../../src/schemas/model/routing/delegation-chain.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// FL-SPRINT-003: MicroUSD generator — non-negative BigInt as string, no leading zeros (except "0")
const microUSDArb = fc
  .bigInt({ min: 0n, max: (1n << 60n) - 1n })
  .map((n) => String(n));

const outcomeArb = fc.constantFrom('pending', 'completed', 'failed', 're-delegated');

const authorityScopes = ['budget_spend', 'model_select', 'review_approve', 'audit_read', 'deploy'];

const delegationLinkArb = (delegator: string, delegatee: string, scope: string[], ts: string) =>
  fc.record({
    delegator: fc.constant(delegator),
    delegatee: fc.constant(delegatee),
    task_type: fc.constantFrom('inference', 'review', 'transfer'),
    authority_scope: fc.constant(scope),
    budget_allocated_micro: fc.option(microUSDArb, { nil: undefined }),
    timestamp: fc.constant(ts),
    outcome: outcomeArb,
  });

/**
 * Generate a valid delegation chain with 1-10 links.
 */
const validChainArb = fc.integer({ min: 1, max: 10 }).chain((numLinks) => {
  const maxDepth = fc.integer({ min: numLinks, max: 10 });
  const agents = Array.from({ length: numLinks + 1 }, (_, i) => `agent-${i}`);
  const baseScope = fc.subarray(authorityScopes, { minLength: 1 });

  return fc.tuple(maxDepth, baseScope).chain(([md, scope]) => {
    const links = agents.slice(0, numLinks).map((agent, i) => {
      const subScope = scope.slice(0, Math.max(1, scope.length - i));
      const ts = new Date(Date.UTC(2026, 1, 17, 10, i, 0)).toISOString();
      return delegationLinkArb(agent, agents[i + 1], subScope, ts);
    });

    return fc.tuple(fc.uuid(), fc.constant(md), ...links).map(([uuid, depth, ...generatedLinks]) => ({
      chain_id: uuid,
      root_delegator: agents[0],
      links: generatedLinks,
      max_depth: depth,
      authority_conservation: true,
      status: 'active' as const,
      contract_version: '5.4.0',
    }));
  });
});

describe('DelegationChain property tests', () => {
  it('valid chains always satisfy links.length <= max_depth', () => {
    fc.assert(
      fc.property(validChainArb, (chain) => {
        return chain.links.length <= chain.max_depth;
      }),
      { numRuns: 100 },
    );
  });

  it('valid chains always pass schema validation', () => {
    fc.assert(
      fc.property(validChainArb, (chain) => {
        return Value.Check(DelegationChainSchema, chain);
      }),
      { numRuns: 100 },
    );
  });

  it('valid chains always have temporally ordered links', () => {
    fc.assert(
      fc.property(validChainArb, (chain) => {
        return evaluateConstraint(chain as unknown as Record<string, unknown>, 'links_temporally_ordered(links)');
      }),
      { numRuns: 100 },
    );
  });

  it('valid chains always have link continuity', () => {
    fc.assert(
      fc.property(validChainArb, (chain) => {
        return evaluateConstraint(chain as unknown as Record<string, unknown>, 'links_form_chain(links)');
      }),
      { numRuns: 100 },
    );
  });
});
