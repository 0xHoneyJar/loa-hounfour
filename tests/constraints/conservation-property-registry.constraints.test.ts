/**
 * Tests for ConservationPropertyRegistry constraint file (S1-T7).
 *
 * Validates all 3 constraints against valid and invalid inputs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'ConservationPropertyRegistry.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validRegistry = {
  total_count: 3,
  properties: [
    {
      invariant_id: 'I-1',
      name: 'Budget Conservation',
      ltl_formula: 'G(budget_post == budget_pre - cost)',
      description: 'Budget must decrease by exactly the cost',
      universe: 'economic',
      enforcement: 'runtime_reject',
      error_codes: ['BUDGET_EXCEEDED'],
      severity: 'critical',
    },
    {
      invariant_id: 'I-2',
      name: 'Escrow Atomicity',
      ltl_formula: 'G(escrow_lock -> F(escrow_release | escrow_refund))',
      description: 'Every escrow lock must resolve',
      universe: 'economic',
      enforcement: 'runtime_reject',
      error_codes: ['ESCROW_STUCK'],
      severity: 'critical',
    },
    {
      invariant_id: 'I-3',
      name: 'Authority Non-Escalation',
      ltl_formula: 'G(delegated_scope ⊆ parent_scope)',
      description: 'Authority can never exceed delegator',
      universe: 'governance',
      enforcement: 'compile_time',
      error_codes: ['AUTHORITY_ESCALATION'],
      severity: 'critical',
    },
  ],
  contract_version: '5.5.0',
};

describe('ConservationPropertyRegistry constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('ConservationPropertyRegistry');
  });

  it('has contract_version 7.0.0', () => {
    expect(constraintFile.contract_version).toBe('7.0.0');
  });

  it('has 7 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(7);
  });

  describe('conservation-registry-count-matches', () => {
    const c = findConstraint('conservation-registry-count-matches');

    it('passes when total_count equals properties length', () => {
      expect(evaluateConstraint(validRegistry, c.expression)).toBe(true);
    });

    it('fails when total_count exceeds properties length', () => {
      const invalid = { ...validRegistry, total_count: 5 };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('fails when total_count is less than properties length', () => {
      const invalid = { ...validRegistry, total_count: 1 };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('passes for empty registry with total_count 0', () => {
      const empty = { total_count: 0, properties: [], contract_version: '5.5.0' };
      expect(evaluateConstraint(empty, c.expression)).toBe(true);
    });
  });

  describe('conservation-property-unique-ids', () => {
    const c = findConstraint('conservation-property-unique-ids');

    it('passes when all invariant_ids are unique', () => {
      expect(evaluateConstraint(validRegistry, c.expression)).toBe(true);
    });

    it('fails when duplicate invariant_ids exist', () => {
      const invalid = {
        ...validRegistry,
        properties: [
          validRegistry.properties[0],
          { ...validRegistry.properties[1], invariant_id: 'I-1' },
          validRegistry.properties[2],
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('passes for empty properties array', () => {
      const empty = { total_count: 0, properties: [], contract_version: '5.5.0' };
      expect(evaluateConstraint(empty, c.expression)).toBe(true);
    });
  });

  describe('conservation-property-ltl-non-empty', () => {
    const c = findConstraint('conservation-property-ltl-non-empty');

    it('passes when all LTL formulas are non-empty', () => {
      expect(evaluateConstraint(validRegistry, c.expression)).toBe(true);
    });

    it('fails when any LTL formula is empty', () => {
      const invalid = {
        ...validRegistry,
        properties: [
          validRegistry.properties[0],
          { ...validRegistry.properties[1], ltl_formula: '' },
          validRegistry.properties[2],
        ],
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('passes for empty properties array', () => {
      const empty = { total_count: 0, properties: [], contract_version: '5.5.0' };
      expect(evaluateConstraint(empty, c.expression)).toBe(true);
    });
  });

  describe('conservation-registry-liveness-count-matches (v6.0.0)', () => {
    const c = findConstraint('conservation-registry-liveness-count-matches');

    it('passes when liveness_count equals liveness_properties length', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [
          { liveness_id: 'L-1', ltl_formula: 'G(x => F_t(3600, y))' },
        ],
        liveness_count: 1,
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(true);
    });

    it('fails when liveness_count mismatches liveness_properties length', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [
          { liveness_id: 'L-1', ltl_formula: 'G(x => F_t(3600, y))' },
        ],
        liveness_count: 0,
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(false);
    });

    it('passes for empty liveness with count 0', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [],
        liveness_count: 0,
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(true);
    });
  });

  describe('conservation-liveness-unique-ids (v6.0.0)', () => {
    const c = findConstraint('conservation-liveness-unique-ids');

    it('passes when all liveness_ids are unique', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [
          { liveness_id: 'L-1', ltl_formula: 'G(x => F_t(3600, y))' },
          { liveness_id: 'L-2', ltl_formula: 'G(a => F_t(7200, b))' },
        ],
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(true);
    });

    it('fails when duplicate liveness_ids exist', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [
          { liveness_id: 'L-1', ltl_formula: 'G(x => F_t(3600, y))' },
          { liveness_id: 'L-1', ltl_formula: 'G(a => F_t(7200, b))' },
        ],
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(false);
    });

    it('passes for empty liveness_properties', () => {
      const registry = {
        ...validRegistry,
        liveness_properties: [],
      };
      expect(evaluateConstraint(registry, c.expression)).toBe(true);
    });
  });
});
