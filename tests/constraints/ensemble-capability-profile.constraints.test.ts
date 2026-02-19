/**
 * Tests for EnsembleCapabilityProfile constraints (S2-T6).
 *
 * v5.4.0 — 4 constraints with 3 new evaluator helpers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'EnsembleCapabilityProfile.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const validProfile = {
  profile_id: '550e8400-e29b-41d4-a716-446655440000',
  ensemble_strategy: 'consensus',
  models: ['claude-opus-4', 'gpt-5'],
  individual_capabilities: {
    'claude-opus-4': ['reasoning', 'code-generation'],
    'gpt-5': ['reasoning', 'creative-writing'],
  },
  emergent_capabilities: ['cross-model-verification'],
  capability_evidence: [
    {
      capability: 'cross-model-verification',
      evidence_type: 'tested',
    },
  ],
  contract_version: '5.4.0',
};

describe('EnsembleCapabilityProfile constraints', () => {
  it('has 4 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(4);
  });

  it('has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  describe('ensemble-capability-models-match', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'ensemble-capability-models-match').expression;

    it('passes for 2+ models', () => {
      expect(evaluateConstraint(validProfile, getExpr())).toBe(true);
    });

    it('fails for 1 model', () => {
      const data = { ...validProfile, models: ['solo'] };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });

    it('fails for empty models', () => {
      const data = { ...validProfile, models: [] };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });
  });

  describe('ensemble-capability-emergent-not-individual', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'ensemble-capability-emergent-not-individual').expression;

    it('passes when emergent is unique', () => {
      expect(evaluateConstraint(validProfile, getExpr())).toBe(true);
    });

    it('fails when emergent appears in individual', () => {
      const data = {
        ...validProfile,
        emergent_capabilities: ['reasoning'],
      };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });

    it('passes with empty emergent', () => {
      const data = { ...validProfile, emergent_capabilities: [] };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });
  });

  describe('ensemble-capability-evidence-required', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'ensemble-capability-evidence-required').expression;

    it('passes when all emergent have evidence', () => {
      expect(evaluateConstraint(validProfile, getExpr())).toBe(true);
    });

    it('fails when emergent lacks evidence', () => {
      const data = {
        ...validProfile,
        emergent_capabilities: ['cross-model-verification', 'synergy'],
      };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });

    it('passes with empty emergent', () => {
      const data = { ...validProfile, emergent_capabilities: [] };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });
  });

  describe('ensemble-capability-individual-keys-match-models', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'ensemble-capability-individual-keys-match-models').expression;

    it('passes when keys match models', () => {
      expect(evaluateConstraint(validProfile, getExpr())).toBe(true);
    });

    it('fails when key not in models', () => {
      const data = {
        ...validProfile,
        individual_capabilities: {
          ...validProfile.individual_capabilities,
          'unknown-model': ['something'],
        },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });

    it('passes with empty individual_capabilities', () => {
      const data = { ...validProfile, individual_capabilities: {} };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });
  });
});
