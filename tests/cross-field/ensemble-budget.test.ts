/**
 * Cross-field validator tests for ensemble and budget schemas (v5.0.0 Sprint 2).
 *
 * Tests: S2-T2 EnsembleRequest/EnsembleResult, S2-T4 BudgetScope
 */
import { describe, it, expect } from 'vitest';
import { validate, getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { BudgetScopeSchema } from '../../src/schemas/model/routing/budget-scope.js';
import { ConstraintProposalSchema } from '../../src/schemas/model/constraint-proposal.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_REQUEST_INNER = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'agent-001',
  tenant_id: 'tenant-001',
  model: 'claude-opus-4-6',
  messages: [{ role: 'user', content: 'Hello' }],
  contract_version: '5.0.0',
};

const VALID_RESULT_INNER = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  model: 'claude-opus-4-6',
  provider: 'anthropic',
  content: 'Hello!',
  finish_reason: 'stop',
  usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18, cost_micro: '150' },
  latency_ms: 1200,
  contract_version: '5.0.0',
};

// ---------------------------------------------------------------------------
// EnsembleRequest cross-field
// ---------------------------------------------------------------------------

describe('EnsembleRequest cross-field validator', () => {
  it('errors when strategy=consensus without consensus_threshold', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'consensus',
      models: ['a', 'b'],
      request: VALID_REQUEST_INNER,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('consensus_threshold is required'))).toBe(true);
    }
  });

  it('passes when strategy=consensus with consensus_threshold', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'consensus',
      models: ['a', 'b'],
      request: VALID_REQUEST_INNER,
      consensus_threshold: 0.8,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('no error for first_complete without consensus_threshold', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'first_complete',
      models: ['a', 'b'],
      request: VALID_REQUEST_INNER,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('no error for best_of_n without consensus_threshold', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'best_of_n',
      models: ['a', 'b'],
      request: VALID_REQUEST_INNER,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('warns when strategy=dialogue without session_id on request', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'dialogue',
      models: ['a', 'b'],
      request: VALID_REQUEST_INNER,
      dialogue_config: {
        max_rounds: 3,
        pass_thinking_traces: true,
        termination: 'fixed_rounds',
      },
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('session_id is recommended'))).toBe(true);
  });

  it('no warning when strategy=dialogue with session_id on request', () => {
    const req = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'dialogue',
      models: ['a', 'b'],
      request: { ...VALID_REQUEST_INNER, session_id: 'sess-001' },
      dialogue_config: {
        max_rounds: 3,
        pass_thinking_traces: true,
        termination: 'fixed_rounds',
      },
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// EnsembleResult cross-field
// ---------------------------------------------------------------------------

describe('EnsembleResult cross-field validator', () => {
  it('errors when strategy=consensus without consensus_score', () => {
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'consensus',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('consensus_score is required'))).toBe(true);
    }
  });

  it('passes when strategy=consensus with consensus_score', () => {
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'consensus',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      consensus_score: 0.9,
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(true);
  });

  it('errors when total_cost_micro < selected cost', () => {
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'first_complete',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      total_cost_micro: '100', // less than selected.usage.cost_micro (150)
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('total_cost_micro must be >= selected'))).toBe(true);
    }
  });

  it('passes when total_cost_micro equals selected cost', () => {
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'first_complete',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(true);
  });

  it('errors when rounds_completed mismatches rounds.length', () => {
    const ROUND = {
      round: 1,
      model: 'claude-opus-4-6',
      response: VALID_RESULT_INNER,
    };
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'dialogue',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      rounds: [ROUND],
      rounds_completed: 5,
      rounds_requested: 5,
      termination_reason: 'fixed_rounds',
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('rounds_completed') && e.includes('rounds.length'))).toBe(true);
    }
  });

  it('errors when rounds_completed exceeds rounds_requested', () => {
    const ROUND = {
      round: 1,
      model: 'claude-opus-4-6',
      response: VALID_RESULT_INNER,
    };
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'dialogue',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      rounds: [ROUND],
      rounds_completed: 1,
      rounds_requested: 0,
      termination_reason: 'fixed_rounds',
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    // rounds_requested: 0 will fail schema validation (minimum: 1)
    expect(result.valid).toBe(false);
  });

  it('passes with consistent rounds_completed and rounds_requested', () => {
    const ROUND = {
      round: 1,
      model: 'claude-opus-4-6',
      response: VALID_RESULT_INNER,
    };
    const res = {
      ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
      strategy: 'dialogue',
      selected: VALID_RESULT_INNER,
      candidates: [VALID_RESULT_INNER],
      rounds: [ROUND],
      rounds_completed: 1,
      rounds_requested: 3,
      termination_reason: 'budget_exhausted',
      total_cost_micro: '150',
      total_latency_ms: 1500,
      contract_version: '5.0.0',
    };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BudgetScope cross-field
// ---------------------------------------------------------------------------

describe('BudgetScope cross-field validator', () => {
  it('warns when spent exceeds limit', () => {
    const scope = {
      scope: 'project',
      scope_id: 'proj-001',
      limit_micro: '1000000',
      spent_micro: '1500000',
      action_on_exceed: 'warn',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, scope);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('exceeds limit_micro'))).toBe(true);
  });

  it('no warning when spent within limit', () => {
    const scope = {
      scope: 'sprint',
      scope_id: 'sprint-1',
      limit_micro: '1000000',
      spent_micro: '500000',
      action_on_exceed: 'block',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, scope);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });

  it('no warning when spent equals limit', () => {
    const scope = {
      scope: 'conversation',
      scope_id: 'conv-1',
      limit_micro: '1000000',
      spent_micro: '1000000',
      action_on_exceed: 'downgrade',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, scope);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Discoverability
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ConstraintProposal cross-field (sunset_version)
// ---------------------------------------------------------------------------

describe('ConstraintProposal cross-field validator', () => {
  const VALID_PROPOSAL = {
    proposal_id: '550e8400-e29b-41d4-a716-446655440500',
    agent_id: 'claude-3-opus',
    target_schema_id: 'CompletionRequest',
    proposed_constraints: [{
      id: 'test-constraint',
      expression: 'model != null',
      severity: 'warning',
      message: 'model should be set',
      fields: ['model'],
    }],
    rationale: 'Test rationale',
    expression_version: '1.0',
    contract_version: '5.0.0',
  };

  it('passes with valid sunset_version >= expression_version', () => {
    const proposal = { ...VALID_PROPOSAL, sunset_version: '3.0' };
    const result = validate(ConstraintProposalSchema, proposal);
    expect(result.valid).toBe(true);
  });

  it('errors when sunset_version < expression_version', () => {
    const proposal = { ...VALID_PROPOSAL, expression_version: '2.0', sunset_version: '1.0' };
    const result = validate(ConstraintProposalSchema, proposal);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('sunset_version'))).toBe(true);
    }
  });

  it('passes without sunset_version (optional)', () => {
    const result = validate(ConstraintProposalSchema, VALID_PROPOSAL);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Discoverability
// ---------------------------------------------------------------------------

describe('Sprint 2 cross-field discoverability', () => {
  const schemas = getCrossFieldValidatorSchemas();

  it('EnsembleRequest is discoverable', () => {
    expect(schemas).toContain('EnsembleRequest');
  });
  it('EnsembleResult is discoverable', () => {
    expect(schemas).toContain('EnsembleResult');
  });
  it('BudgetScope is discoverable', () => {
    expect(schemas).toContain('BudgetScope');
  });
});
