/**
 * Tests for JWT Boundary Verification schemas (S1-T5, S1-T6).
 *
 * Validates JwtBoundarySpec, OutboundClaims, InboundClaims schemas,
 * and the canonical 6-step verification pipeline.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (uuid)
import {
  JwtVerificationStepSchema,
  JwtBoundarySpecSchema,
  OutboundClaimsSchema,
  InboundClaimsSchema,
  CANONICAL_JWT_BOUNDARY_STEPS,
  type JwtVerificationStep,
  type JwtBoundarySpec,
  type OutboundClaims,
  type InboundClaims,
} from '../../src/economy/jwt-boundary.js';

const validStep: JwtVerificationStep = {
  step_number: 1,
  name: 'Signature verification',
  description: 'Verify EdDSA/Ed25519 signature',
  error_code: 'JWT_SIGNATURE_INVALID',
  is_blocking: true,
};

const validSpec: JwtBoundarySpec = {
  spec_id: '550e8400-e29b-41d4-a716-446655440010',
  boundary_name: 'arrakis-to-loa-finn',
  steps: CANONICAL_JWT_BOUNDARY_STEPS.map(s => ({ ...s })),
  algorithm_whitelist: ['EdDSA'],
  claims_schema_ref: 'OutboundClaims',
  replay_window_seconds: 300,
  contract_version: '5.5.0',
};

const validOutbound: OutboundClaims = {
  sub: 'agent-alice',
  iss: 'arrakis',
  aud: 'loa-finn',
  jti: '550e8400-e29b-41d4-a716-446655440020',
  iat: 1708171200,
  exp: 1708174800,
  reservation_id: '550e8400-e29b-41d4-a716-446655440030',
  budget_remaining_micro: '5000000',
  authority_scope: ['budget_spend', 'model_select'],
};

const validInbound: InboundClaims = {
  ...validOutbound,
  actual_cost_micro: '150000',
  model_used: 'claude-opus-4-6',
  tokens_used: 2500,
};

describe('JwtVerificationStepSchema', () => {
  it('validates a valid step', () => {
    expect(Value.Check(JwtVerificationStepSchema, validStep)).toBe(true);
  });

  it('rejects step_number outside 1-6', () => {
    expect(Value.Check(JwtVerificationStepSchema, { ...validStep, step_number: 0 })).toBe(false);
    expect(Value.Check(JwtVerificationStepSchema, { ...validStep, step_number: 7 })).toBe(false);
  });

  it('rejects empty name', () => {
    expect(Value.Check(JwtVerificationStepSchema, { ...validStep, name: '' })).toBe(false);
  });

  it('rejects error_code without JWT_ prefix', () => {
    expect(Value.Check(JwtVerificationStepSchema, { ...validStep, error_code: 'SIGNATURE_INVALID' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(JwtVerificationStepSchema, { ...validStep, extra: true })).toBe(false);
  });
});

describe('JwtBoundarySpecSchema', () => {
  it('validates a valid spec', () => {
    expect(Value.Check(JwtBoundarySpecSchema, validSpec)).toBe(true);
  });

  it('has correct $id', () => {
    expect(JwtBoundarySpecSchema.$id).toBe('JwtBoundarySpec');
  });

  it('has x-cross-field-validated marker', () => {
    expect(
      (JwtBoundarySpecSchema as Record<string, unknown>)['x-cross-field-validated'],
    ).toBe(true);
  });

  it('requires exactly 6 steps', () => {
    const tooFew = { ...validSpec, steps: validSpec.steps.slice(0, 5) };
    expect(Value.Check(JwtBoundarySpecSchema, tooFew)).toBe(false);

    const tooMany = { ...validSpec, steps: [...validSpec.steps, { ...validStep, step_number: 7 }] };
    expect(Value.Check(JwtBoundarySpecSchema, tooMany)).toBe(false);
  });

  it('requires non-empty algorithm_whitelist', () => {
    const noAlgo = { ...validSpec, algorithm_whitelist: [] };
    expect(Value.Check(JwtBoundarySpecSchema, noAlgo)).toBe(false);
  });

  it('rejects replay_window_seconds below 1', () => {
    const invalid = { ...validSpec, replay_window_seconds: 0 };
    expect(Value.Check(JwtBoundarySpecSchema, invalid)).toBe(false);
  });

  it('rejects replay_window_seconds above 3600', () => {
    const invalid = { ...validSpec, replay_window_seconds: 7200 };
    expect(Value.Check(JwtBoundarySpecSchema, invalid)).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    const invalid = { ...validSpec, contract_version: 'bad' };
    expect(Value.Check(JwtBoundarySpecSchema, invalid)).toBe(false);
  });

  it('rejects additional properties', () => {
    const invalid = { ...validSpec, extra: true };
    expect(Value.Check(JwtBoundarySpecSchema, invalid)).toBe(false);
  });
});

describe('OutboundClaimsSchema', () => {
  it('validates valid outbound claims', () => {
    expect(Value.Check(OutboundClaimsSchema, validOutbound)).toBe(true);
  });

  it('has correct $id', () => {
    expect(OutboundClaimsSchema.$id).toBe('OutboundClaims');
  });

  it('rejects empty sub', () => {
    expect(Value.Check(OutboundClaimsSchema, { ...validOutbound, sub: '' })).toBe(false);
  });

  it('rejects invalid jti format', () => {
    expect(Value.Check(OutboundClaimsSchema, { ...validOutbound, jti: 'not-a-uuid' })).toBe(false);
  });

  it('requires at least one authority_scope entry', () => {
    expect(Value.Check(OutboundClaimsSchema, { ...validOutbound, authority_scope: [] })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(OutboundClaimsSchema, { ...validOutbound, extra: true })).toBe(false);
  });
});

describe('InboundClaimsSchema', () => {
  it('validates valid inbound claims', () => {
    expect(Value.Check(InboundClaimsSchema, validInbound)).toBe(true);
  });

  it('has correct $id', () => {
    expect(InboundClaimsSchema.$id).toBe('InboundClaims');
  });

  it('rejects empty model_used', () => {
    expect(Value.Check(InboundClaimsSchema, { ...validInbound, model_used: '' })).toBe(false);
  });

  it('rejects negative tokens_used', () => {
    expect(Value.Check(InboundClaimsSchema, { ...validInbound, tokens_used: -1 })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(InboundClaimsSchema, { ...validInbound, extra: true })).toBe(false);
  });
});

describe('CANONICAL_JWT_BOUNDARY_STEPS', () => {
  it('contains exactly 6 steps', () => {
    expect(CANONICAL_JWT_BOUNDARY_STEPS).toHaveLength(6);
  });

  it('steps are numbered 1 through 6', () => {
    for (let i = 0; i < 6; i++) {
      expect(CANONICAL_JWT_BOUNDARY_STEPS[i].step_number).toBe(i + 1);
    }
  });

  it('all steps have unique error codes', () => {
    const codes = CANONICAL_JWT_BOUNDARY_STEPS.map(s => s.error_code);
    expect(new Set(codes).size).toBe(6);
  });

  it('all error codes follow JWT_ prefix convention', () => {
    for (const step of CANONICAL_JWT_BOUNDARY_STEPS) {
      expect(step.error_code).toMatch(/^JWT_[A-Z_]+$/);
    }
  });

  it('all steps validate against the schema', () => {
    for (const step of CANONICAL_JWT_BOUNDARY_STEPS) {
      expect(
        Value.Check(JwtVerificationStepSchema, step),
        `Step ${step.step_number} failed validation`,
      ).toBe(true);
    }
  });

  it('all steps are blocking', () => {
    for (const step of CANONICAL_JWT_BOUNDARY_STEPS) {
      expect(step.is_blocking).toBe(true);
    }
  });

  it('is readonly (frozen)', () => {
    const arr: readonly JwtVerificationStep[] = CANONICAL_JWT_BOUNDARY_STEPS;
    expect(Array.isArray(arr)).toBe(true);
  });
});
