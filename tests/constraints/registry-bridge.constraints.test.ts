/**
 * Tests for RegistryBridge constraint file (S3-T4).
 *
 * Validates constraints against valid and invalid inputs,
 * and conformance vectors.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'RegistryBridge.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validBridge = {
  bridge_id: '550e8400-e29b-41d4-a716-446655440100',
  source_registry_id: '550e8400-e29b-41d4-a716-446655440101',
  target_registry_id: '550e8400-e29b-41d4-a716-446655440102',
  bridge_invariants: [
    { invariant_id: 'B-1', name: 'Conservation', description: 'test', ltl_formula: 'G(c)', enforcement: 'atomic' },
    { invariant_id: 'B-2', name: 'Idempotency', description: 'test', ltl_formula: 'G(i)', enforcement: 'atomic' },
  ],
  exchange_rate: { rate_type: 'fixed', value: '1.0', governance_proposal_required: false, staleness_threshold_seconds: 3600 },
  settlement: 'immediate',
  contract_version: '6.0.0',
};

describe('RegistryBridge constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('RegistryBridge');
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

describe('registry-bridge-distinct-registries', () => {
  const c = findConstraint('registry-bridge-distinct-registries');

  it('passes when source != target', () => {
    expect(evaluateConstraint(validBridge, c.expression)).toBe(true);
  });

  it('fails when source == target', () => {
    const data = { ...validBridge, target_registry_id: validBridge.source_registry_id };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });
});

describe('registry-bridge-invariant-unique-ids', () => {
  const c = findConstraint('registry-bridge-invariant-unique-ids');

  it('passes with unique invariant IDs', () => {
    expect(evaluateConstraint(validBridge, c.expression)).toBe(true);
  });

  it('fails with duplicate invariant IDs', () => {
    const data = {
      ...validBridge,
      bridge_invariants: [
        { invariant_id: 'B-1', name: 'A', description: 'a', ltl_formula: 'G(a)', enforcement: 'atomic' },
        { invariant_id: 'B-1', name: 'B', description: 'b', ltl_formula: 'G(b)', enforcement: 'atomic' },
      ],
    };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });
});

describe('registry-bridge-fixed-rate-requires-value', () => {
  const c = findConstraint('registry-bridge-fixed-rate-requires-value');

  it('passes when fixed rate has value', () => {
    expect(evaluateConstraint(validBridge, c.expression)).toBe(true);
  });

  it('fails when fixed rate has no value', () => {
    const data = {
      ...validBridge,
      exchange_rate: { rate_type: 'fixed', value: null, governance_proposal_required: false, staleness_threshold_seconds: 3600 },
    };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });

  it('passes when non-fixed rate has no value', () => {
    const data = {
      ...validBridge,
      exchange_rate: { rate_type: 'oracle', oracle_endpoint: 'https://oracle.example', governance_proposal_required: false, staleness_threshold_seconds: 3600 },
    };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });
});

describe('registry-bridge-oracle-rate-requires-endpoint', () => {
  const c = findConstraint('registry-bridge-oracle-rate-requires-endpoint');

  it('passes when oracle rate has endpoint', () => {
    const data = {
      ...validBridge,
      exchange_rate: { rate_type: 'oracle', oracle_endpoint: 'https://oracle.example', governance_proposal_required: false, staleness_threshold_seconds: 3600 },
    };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });

  it('fails when oracle rate has no endpoint', () => {
    const data = {
      ...validBridge,
      exchange_rate: { rate_type: 'oracle', oracle_endpoint: null, governance_proposal_required: false, staleness_threshold_seconds: 3600 },
    };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });

  it('passes when non-oracle rate has no endpoint', () => {
    expect(evaluateConstraint(validBridge, c.expression)).toBe(true);
  });
});

describe('RegistryBridge conformance vectors', () => {
  const vectorDir = join(rootDir, 'vectors', 'conformance', 'registry-bridge');

  it('valid-bridge passes all constraints', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'valid-bridge.json'), 'utf-8'));
    for (const c of constraintFile.constraints) {
      expect(
        evaluateConstraint(vector.input, c.expression),
        `Constraint ${c.id} should pass for valid bridge`,
      ).toBe(true);
    }
  });

  it('same-registry-bridge fails distinct-registries constraint', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'same-registry-bridge.json'), 'utf-8'));
    const c = findConstraint('registry-bridge-distinct-registries');
    expect(evaluateConstraint(vector.input, c.expression)).toBe(false);
  });

  it('duplicate-invariant-ids fails unique-ids constraint', () => {
    const vector = JSON.parse(readFileSync(join(vectorDir, 'duplicate-invariant-ids.json'), 'utf-8'));
    const c = findConstraint('registry-bridge-invariant-unique-ids');
    expect(evaluateConstraint(vector.input, c.expression)).toBe(false);
  });
});
