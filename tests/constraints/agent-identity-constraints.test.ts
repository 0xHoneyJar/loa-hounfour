/**
 * Tests for AgentIdentity constraint file (S3-T4, S3-T6).
 *
 * Validates constraint evaluation and conformance vectors.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import type { AgentIdentity } from '../../src/schemas/agent-identity.js';

const constraintPath = resolve('constraints/AgentIdentity.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const validSovereign: AgentIdentity = {
  agent_id: 'sovereign-alice',
  display_name: 'Alice (Sovereign)',
  agent_type: 'human',
  capabilities: ['governance', 'delegation', 'budget-management'],
  trust_level: 'sovereign',
  delegation_authority: ['invoke', 'budget-read', 'governance-vote'],
  max_delegation_depth: 3,
  governance_weight: 1.0,
  contract_version: '5.5.0',
};

const untrustedWithDelegation: AgentIdentity = {
  agent_id: 'untrusted-bob',
  display_name: 'Bob (Untrusted)',
  agent_type: 'model',
  capabilities: ['text-generation'],
  trust_level: 'untrusted',
  delegation_authority: ['invoke'],
  max_delegation_depth: 0,
  governance_weight: 0,
  contract_version: '5.5.0',
};

const serviceNoDelegation: AgentIdentity = {
  agent_id: 'svc-billing',
  display_name: 'Billing Service',
  agent_type: 'service',
  capabilities: ['billing', 'invoicing'],
  trust_level: 'basic',
  delegation_authority: [],
  max_delegation_depth: 0,
  governance_weight: 0,
  contract_version: '5.5.0',
};

function getConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

describe('AgentIdentity constraint file structure', () => {
  it('has schema_id = AgentIdentity', () => {
    expect(constraintFile.schema_id).toBe('AgentIdentity');
  });

  it('has contract_version = 5.5.0', () => {
    expect(constraintFile.contract_version).toBe('5.5.0');
  });

  it('has 3 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(3);
  });
});

describe('agent-identity-delegation-requires-trust', () => {
  const constraint = getConstraint('agent-identity-delegation-requires-trust');

  it('passes for sovereign with delegation', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('passes for trusted with delegation', () => {
    const trusted = { ...validSovereign, trust_level: 'trusted' };
    expect(evaluateConstraint(trusted as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('passes for verified with delegation', () => {
    const verified = { ...validSovereign, trust_level: 'verified' };
    expect(evaluateConstraint(verified as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails for untrusted with delegation', () => {
    expect(evaluateConstraint(untrustedWithDelegation as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('fails for basic with delegation', () => {
    const basic = { ...untrustedWithDelegation, trust_level: 'basic' };
    expect(evaluateConstraint(basic as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('passes for untrusted with empty delegation', () => {
    const noDelegation = { ...untrustedWithDelegation, delegation_authority: [] };
    expect(evaluateConstraint(noDelegation as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });
});

describe('agent-identity-sovereign-max-depth', () => {
  const constraint = getConstraint('agent-identity-sovereign-max-depth');

  it('passes for sovereign with depth >= 1', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails for sovereign with depth 0', () => {
    const zeroDepth = { ...validSovereign, max_delegation_depth: 0 };
    expect(evaluateConstraint(zeroDepth as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('passes for non-sovereign with any depth', () => {
    expect(evaluateConstraint(serviceNoDelegation as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });
});

describe('agent-identity-capabilities-non-empty', () => {
  const constraint = getConstraint('agent-identity-capabilities-non-empty');

  it('passes when capabilities has items', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails when capabilities is empty', () => {
    const empty = { ...validSovereign, capabilities: [] };
    expect(evaluateConstraint(empty as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });
});

describe('Conformance vector: sovereign-full-authority', () => {
  const vectorPath = resolve('vectors/conformance/agent-identity/sovereign-full-authority.json');
  const vector = JSON.parse(readFileSync(vectorPath, 'utf-8'));

  it('passes all constraints', () => {
    for (const constraint of constraintFile.constraints) {
      expect(evaluateConstraint(vector.input as Record<string, unknown>, constraint.expression)).toBe(true);
    }
  });
});

describe('Conformance vector: untrusted-with-delegation', () => {
  const vectorPath = resolve('vectors/conformance/agent-identity/untrusted-with-delegation.json');
  const vector = JSON.parse(readFileSync(vectorPath, 'utf-8'));

  it('fails delegation-requires-trust constraint', () => {
    const delegationConstraint = getConstraint('agent-identity-delegation-requires-trust');
    expect(evaluateConstraint(vector.input as Record<string, unknown>, delegationConstraint.expression)).toBe(false);
  });

  it('expected_valid is false', () => {
    expect(vector.expected_valid).toBe(false);
  });
});

describe('Conformance vector: service-zero-depth', () => {
  const vectorPath = resolve('vectors/conformance/agent-identity/service-zero-depth.json');
  const vector = JSON.parse(readFileSync(vectorPath, 'utf-8'));

  it('passes all constraints', () => {
    for (const constraint of constraintFile.constraints) {
      expect(evaluateConstraint(vector.input as Record<string, unknown>, constraint.expression)).toBe(true);
    }
  });
});
