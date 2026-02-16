/**
 * Tests for DelegationChain constraint file (S1-T2).
 *
 * Validates all 7 constraints against valid and invalid inputs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'DelegationChain.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validChain = {
  chain_id: '550e8400-e29b-41d4-a716-446655440001',
  root_delegator: 'agent-alice',
  links: [
    {
      delegator: 'agent-alice',
      delegatee: 'agent-bob',
      task_type: 'inference',
      authority_scope: ['budget_spend', 'model_select'],
      budget_allocated_micro: '1000000',
      timestamp: '2026-02-17T10:00:00Z',
      outcome: 'completed',
    },
    {
      delegator: 'agent-bob',
      delegatee: 'provider-openai',
      task_type: 'inference',
      authority_scope: ['model_select'],
      budget_allocated_micro: '500000',
      timestamp: '2026-02-17T10:01:00Z',
      outcome: 'completed',
    },
  ],
  max_depth: 5,
  authority_conservation: true,
  status: 'completed',
  contract_version: '5.4.0',
};

describe('DelegationChain constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('DelegationChain');
  });

  it('has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  it('has 7 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(7);
  });

  describe('depth-limit', () => {
    const c = findConstraint('delegation-chain-depth-limit');

    it('passes for valid chain within depth limit', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when links exceed max_depth', () => {
      const invalid = { ...validChain, max_depth: 1 };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('authority-conservation', () => {
    const c = findConstraint('delegation-chain-authority-conservation');

    it('passes for valid scope subset', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when child scope escalates beyond parent', () => {
      const invalid = {
        ...validChain,
        links: [
          { ...validChain.links[0], authority_scope: ['model_select'] },
          { ...validChain.links[1], authority_scope: ['model_select', 'budget_spend'] },
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('passes when authority_conservation is false (bypass)', () => {
      const bypassed = {
        ...validChain,
        authority_conservation: false,
        links: [
          { ...validChain.links[0], authority_scope: ['model_select'] },
          { ...validChain.links[1], authority_scope: ['model_select', 'budget_spend'] },
        ],
      };
      expect(evaluateConstraint(bypassed, c.expression)).toBe(true);
    });
  });

  describe('budget-conservation', () => {
    const c = findConstraint('delegation-chain-budget-conservation');

    it('passes for valid budget conservation', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when child budget exceeds parent', () => {
      const invalid = {
        ...validChain,
        links: [
          { ...validChain.links[0], budget_allocated_micro: '500000' },
          { ...validChain.links[1], budget_allocated_micro: '1000000' },
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('temporal-ordering', () => {
    const c = findConstraint('delegation-chain-temporal-ordering');

    it('passes for correctly ordered timestamps', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when timestamps are out of order', () => {
      const invalid = {
        ...validChain,
        links: [
          { ...validChain.links[0], timestamp: '2026-02-17T10:05:00Z' },
          { ...validChain.links[1], timestamp: '2026-02-17T10:01:00Z' },
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('root-matches-first', () => {
    const c = findConstraint('delegation-chain-root-matches-first');

    it('passes when root matches first link delegator', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when root does not match first link delegator', () => {
      const invalid = { ...validChain, root_delegator: 'agent-unknown' };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('link-continuity', () => {
    const c = findConstraint('delegation-chain-link-continuity');

    it('passes when links form a chain', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('fails when links are disconnected', () => {
      const invalid = {
        ...validChain,
        links: [
          validChain.links[0],
          { ...validChain.links[1], delegator: 'agent-unknown' },
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('revocation-requires-policy', () => {
    const c = findConstraint('delegation-chain-revocation-requires-policy');

    it('passes for non-revoked chain without policy', () => {
      expect(evaluateConstraint(validChain, c.expression)).toBe(true);
    });

    it('passes for revoked chain with cascade policy', () => {
      const revoked = { ...validChain, status: 'revoked', revocation_policy: 'cascade' };
      expect(evaluateConstraint(revoked, c.expression)).toBe(true);
    });

    it('passes for revoked chain with non_cascade policy', () => {
      const revoked = { ...validChain, status: 'revoked', revocation_policy: 'non_cascade' };
      expect(evaluateConstraint(revoked, c.expression)).toBe(true);
    });

    it('fails for revoked chain without revocation_policy', () => {
      const invalid = { ...validChain, status: 'revoked' };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });
});
