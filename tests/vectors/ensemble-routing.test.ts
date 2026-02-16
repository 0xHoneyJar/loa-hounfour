/**
 * Schema validation tests for ensemble and routing schemas (v5.0.0 Sprint 2).
 */
import { describe, it, expect } from 'vitest';
import { validate, validators } from '../../src/validators/index.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { EnsembleStrategySchema } from '../../src/schemas/model/ensemble/ensemble-strategy.js';
import { AgentRequirementsSchema } from '../../src/schemas/model/routing/agent-requirements.js';
import { BudgetScopeSchema } from '../../src/schemas/model/routing/budget-scope.js';
import { RoutingResolutionSchema } from '../../src/schemas/model/routing/routing-resolution.js';
import { ExecutionModeSchema } from '../../src/schemas/model/routing/execution-mode.js';
import { ProviderTypeSchema } from '../../src/schemas/model/routing/provider-type.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_COMPLETION_REQUEST = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'agent-001',
  tenant_id: 'tenant-001',
  model: 'claude-opus-4-6',
  messages: [{ role: 'user', content: 'Hello' }],
  contract_version: '5.0.0',
};

const VALID_COMPLETION_RESULT = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  model: 'claude-opus-4-6',
  provider: 'anthropic',
  content: 'Hello!',
  finish_reason: 'stop',
  usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18, cost_micro: '150' },
  latency_ms: 1200,
  contract_version: '5.0.0',
};

const VALID_ENSEMBLE_REQUEST = {
  ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
  strategy: 'first_complete',
  models: ['claude-opus-4-6', 'gpt-5.2'],
  request: VALID_COMPLETION_REQUEST,
  contract_version: '5.0.0',
};

const VALID_ENSEMBLE_RESULT = {
  ensemble_id: '550e8400-e29b-41d4-a716-446655440001',
  strategy: 'first_complete',
  selected: VALID_COMPLETION_RESULT,
  candidates: [VALID_COMPLETION_RESULT],
  total_cost_micro: '150',
  total_latency_ms: 1500,
  contract_version: '5.0.0',
};

// ---------------------------------------------------------------------------
// EnsembleStrategy vocabulary
// ---------------------------------------------------------------------------

describe('EnsembleStrategy vocabulary', () => {
  it.each(['first_complete', 'best_of_n', 'consensus'])('accepts "%s"', (strategy) => {
    const result = validate(EnsembleStrategySchema, strategy);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid strategy', () => {
    const result = validate(EnsembleStrategySchema, 'random');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EnsembleRequest
// ---------------------------------------------------------------------------

describe('EnsembleRequest schema', () => {
  it('validates minimal request', () => {
    const result = validate(EnsembleRequestSchema, VALID_ENSEMBLE_REQUEST);
    expect(result.valid).toBe(true);
  });

  it('validates with optional fields', () => {
    const req = {
      ...VALID_ENSEMBLE_REQUEST,
      timeout_ms: 30000,
      task_type: 'code_generation',
      consensus_threshold: 0.8,
    };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('rejects fewer than 2 models', () => {
    const req = { ...VALID_ENSEMBLE_REQUEST, models: ['only-one'] };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid ensemble_id', () => {
    const req = { ...VALID_ENSEMBLE_REQUEST, ensemble_id: 'not-uuid' };
    const result = validate(EnsembleRequestSchema, req);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EnsembleResult
// ---------------------------------------------------------------------------

describe('EnsembleResult schema', () => {
  it('validates minimal result', () => {
    const result = validate(EnsembleResultSchema, VALID_ENSEMBLE_RESULT);
    expect(result.valid).toBe(true);
  });

  it('validates with consensus_score', () => {
    const res = { ...VALID_ENSEMBLE_RESULT, strategy: 'consensus', consensus_score: 0.95 };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(true);
  });

  it('rejects consensus_score > 1', () => {
    const res = { ...VALID_ENSEMBLE_RESULT, consensus_score: 1.5 };
    const result = validate(EnsembleResultSchema, res);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ExecutionMode + ProviderType vocabularies
// ---------------------------------------------------------------------------

describe('ExecutionMode vocabulary', () => {
  it.each(['native_runtime', 'remote_model'])('accepts "%s"', (mode) => {
    const result = validate(ExecutionModeSchema, mode);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid mode', () => {
    const result = validate(ExecutionModeSchema, 'hybrid');
    expect(result.valid).toBe(false);
  });
});

describe('ProviderType vocabulary', () => {
  it.each(['claude-code', 'openai', 'openai-compatible', 'anthropic', 'google', 'custom'])('accepts "%s"', (provider) => {
    const result = validate(ProviderTypeSchema, provider);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid provider', () => {
    const result = validate(ProviderTypeSchema, 'aws');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AgentRequirements
// ---------------------------------------------------------------------------

describe('AgentRequirements schema', () => {
  it('validates minimal requirements', () => {
    const req = { agent_id: 'agent-001', contract_version: '5.0.0' };
    const result = validate(AgentRequirementsSchema, req);
    expect(result.valid).toBe(true);
  });

  it('validates full requirements', () => {
    const req = {
      agent_id: 'agent-001',
      requires_native_runtime: true,
      requires_tool_calling: true,
      requires_thinking_traces: false,
      requires_vision: false,
      preferred_models: ['claude-opus-4-6', 'gpt-5.2'],
      min_context_tokens: 100000,
      contract_version: '5.0.0',
    };
    const result = validate(AgentRequirementsSchema, req);
    expect(result.valid).toBe(true);
  });

  it('rejects empty agent_id', () => {
    const result = validate(AgentRequirementsSchema, { agent_id: '', contract_version: '5.0.0' });
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BudgetScope
// ---------------------------------------------------------------------------

describe('BudgetScope schema', () => {
  it('validates complete budget scope', () => {
    const scope = {
      scope: 'project',
      scope_id: 'proj-001',
      limit_micro: '10000000',
      spent_micro: '5000000',
      action_on_exceed: 'warn',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, scope);
    expect(result.valid).toBe(true);
  });

  it.each(['project', 'sprint', 'phase', 'conversation'])('accepts scope "%s"', (scope) => {
    const doc = {
      scope,
      scope_id: 'id-1',
      limit_micro: '1000',
      spent_micro: '0',
      action_on_exceed: 'block',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid scope', () => {
    const doc = {
      scope: 'global',
      scope_id: 'id-1',
      limit_micro: '1000',
      spent_micro: '0',
      action_on_exceed: 'block',
      contract_version: '5.0.0',
    };
    const result = validate(BudgetScopeSchema, doc);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RoutingResolution
// ---------------------------------------------------------------------------

describe('RoutingResolution schema', () => {
  it('validates complete resolution', () => {
    const res = {
      resolved_model: 'gpt-5.2',
      original_request_model: 'claude-opus-4-6',
      resolution_type: 'fallback',
      reason: 'Primary model unavailable',
      latency_ms: 50,
      contract_version: '5.0.0',
    };
    const result = validate(RoutingResolutionSchema, res);
    expect(result.valid).toBe(true);
  });

  it.each(['exact', 'fallback', 'budget_downgrade', 'capability_match'])('accepts resolution_type "%s"', (type) => {
    const res = {
      resolved_model: 'model-a',
      original_request_model: 'model-b',
      resolution_type: type,
      reason: 'test',
      latency_ms: 0,
      contract_version: '5.0.0',
    };
    const result = validate(RoutingResolutionSchema, res);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validator registry
// ---------------------------------------------------------------------------

describe('Sprint 2 validator registry entries', () => {
  it('exposes ensembleRequest', () => {
    expect(validators.ensembleRequest).toBeDefined();
  });
  it('exposes ensembleResult', () => {
    expect(validators.ensembleResult).toBeDefined();
  });
  it('exposes agentRequirements', () => {
    expect(validators.agentRequirements).toBeDefined();
  });
  it('exposes budgetScope', () => {
    expect(validators.budgetScope).toBeDefined();
  });
  it('exposes routingResolution', () => {
    expect(validators.routingResolution).toBeDefined();
  });
});
