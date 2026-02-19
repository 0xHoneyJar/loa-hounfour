/**
 * Tests for AgentIdentity constraint file (v6.0.0 — scoped trust).
 *
 * Validates constraint evaluation and conformance vectors.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { flatTrustToScoped, type AgentIdentity } from '../../src/schemas/agent-identity.js';

const constraintPath = resolve('constraints/AgentIdentity.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const validSovereign: AgentIdentity = {
  agent_id: 'sovereign-alice',
  display_name: 'Alice (Sovereign)',
  agent_type: 'human',
  capabilities: ['governance', 'delegation', 'budget-management'],
  trust_scopes: flatTrustToScoped('sovereign'),
  delegation_authority: ['invoke', 'budget-read', 'governance-vote'],
  max_delegation_depth: 3,
  governance_weight: 1.0,
  contract_version: '6.0.0',
};

const untrustedWithDelegation: AgentIdentity = {
  agent_id: 'untrusted-bob',
  display_name: 'Bob (Untrusted)',
  agent_type: 'model',
  capabilities: ['text-generation'],
  trust_scopes: flatTrustToScoped('untrusted'),
  delegation_authority: ['invoke'],
  max_delegation_depth: 0,
  governance_weight: 0,
  contract_version: '6.0.0',
};

const serviceNoDelegation: AgentIdentity = {
  agent_id: 'svc-billing',
  display_name: 'Billing Service',
  agent_type: 'service',
  capabilities: ['billing', 'invoicing'],
  trust_scopes: flatTrustToScoped('basic'),
  delegation_authority: [],
  max_delegation_depth: 0,
  governance_weight: 0,
  contract_version: '6.0.0',
};

function getConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

describe('AgentIdentity constraint file structure', () => {
  it('has schema_id = AgentIdentity', () => {
    expect(constraintFile.schema_id).toBe('AgentIdentity');
  });

  it('has contract_version = 6.0.0', () => {
    expect(constraintFile.contract_version).toBe('6.0.0');
  });

  it('has 4 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(4);
  });
});

describe('agent-identity-delegation-requires-trust (scoped)', () => {
  const constraint = getConstraint('agent-identity-delegation-requires-trust');

  it('passes for sovereign delegation scope with delegation', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('passes for trusted delegation scope with delegation', () => {
    const trusted: AgentIdentity = {
      ...validSovereign,
      trust_scopes: flatTrustToScoped('trusted'),
    };
    expect(evaluateConstraint(trusted as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('passes for verified delegation scope with delegation', () => {
    const verified: AgentIdentity = {
      ...validSovereign,
      trust_scopes: flatTrustToScoped('verified'),
    };
    expect(evaluateConstraint(verified as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails for untrusted delegation scope with delegation', () => {
    expect(evaluateConstraint(untrustedWithDelegation as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('fails for basic delegation scope with delegation', () => {
    const basic: AgentIdentity = {
      ...untrustedWithDelegation,
      trust_scopes: flatTrustToScoped('basic'),
    };
    expect(evaluateConstraint(basic as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('passes for untrusted with empty delegation', () => {
    const noDelegation = { ...untrustedWithDelegation, delegation_authority: [] };
    expect(evaluateConstraint(noDelegation as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });
});

describe('agent-identity-sovereign-max-depth (scoped)', () => {
  const constraint = getConstraint('agent-identity-sovereign-max-depth');

  it('passes for sovereign delegation scope with depth >= 1', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails for sovereign delegation scope with depth 0', () => {
    const zeroDepth = { ...validSovereign, max_delegation_depth: 0 };
    expect(evaluateConstraint(zeroDepth as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('passes for non-sovereign delegation scope with any depth', () => {
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

describe('agent-identity-scope-coverage', () => {
  const constraint = getConstraint('agent-identity-scope-coverage');

  it('passes when billing and inference scopes are specified', () => {
    expect(evaluateConstraint(validSovereign as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails when billing scope is missing', () => {
    const missingBilling: AgentIdentity = {
      ...validSovereign,
      trust_scopes: {
        scopes: {
          governance: 'sovereign',
          inference: 'sovereign',
          delegation: 'sovereign',
          audit: 'sovereign',
          composition: 'sovereign',
        } as AgentIdentity['trust_scopes']['scopes'],
        default_level: 'sovereign',
      },
    };
    expect(evaluateConstraint(missingBilling as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
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
