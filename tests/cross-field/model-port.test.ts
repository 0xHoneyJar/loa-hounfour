/**
 * Cross-field validator tests for ModelPort schemas (v5.0.0 Sprint 1).
 *
 * Tests: S1-T4 CompletionRequest, CompletionResult, ProviderWireMessage
 */
import { describe, it, expect } from 'vitest';
import { validate, getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { ProviderWireMessageSchema } from '../../src/schemas/model/provider-wire-message.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_REQUEST = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'agent-001',
  tenant_id: 'tenant-001',
  model: 'claude-opus-4-6',
  messages: [{ role: 'user', content: 'Hello' }],
  contract_version: '5.0.0',
};

const VALID_RESULT = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  model: 'claude-opus-4-6',
  provider: 'anthropic',
  content: 'Hello!',
  finish_reason: 'stop' as const,
  usage: {
    prompt_tokens: 10,
    completion_tokens: 8,
    total_tokens: 18,
    cost_micro: '150',
  },
  latency_ms: 1200,
  contract_version: '5.0.0',
};

// ---------------------------------------------------------------------------
// CompletionRequest cross-field
// ---------------------------------------------------------------------------

describe('CompletionRequest cross-field validator', () => {
  it('errors when tools provided without tool_choice', () => {
    const req = {
      ...VALID_REQUEST,
      tools: [
        { type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: {} } },
      ],
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('tool_choice is required'))).toBe(true);
    }
  });

  it('passes when tools and tool_choice both present', () => {
    const req = {
      ...VALID_REQUEST,
      tools: [
        { type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: {} } },
      ],
      tool_choice: 'auto',
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('errors when execution_mode=native_runtime without provider', () => {
    const req = {
      ...VALID_REQUEST,
      execution_mode: 'native_runtime',
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('provider is required'))).toBe(true);
    }
  });

  it('passes when execution_mode=native_runtime with provider and session_id', () => {
    const req = {
      ...VALID_REQUEST,
      execution_mode: 'native_runtime',
      provider: 'anthropic',
      session_id: 'sess-001',
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('warns when budget_limit_micro is zero', () => {
    const req = {
      ...VALID_REQUEST,
      budget_limit_micro: '0',
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('budget_limit_micro is zero'))).toBe(true);
  });

  it('no warnings for normal request', () => {
    const result = validate(CompletionRequestSchema, VALID_REQUEST);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CompletionResult cross-field
// ---------------------------------------------------------------------------

describe('CompletionResult cross-field validator', () => {
  it('errors when finish_reason=tool_calls but tool_calls empty', () => {
    const res = {
      ...VALID_RESULT,
      finish_reason: 'tool_calls',
      tool_calls: [],
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('tool_calls must be non-empty'))).toBe(true);
    }
  });

  it('errors when finish_reason=tool_calls but no tool_calls field', () => {
    const res = {
      ...VALID_RESULT,
      content: undefined,
      finish_reason: 'tool_calls',
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('tool_calls must be non-empty'))).toBe(true);
    }
  });

  it('warns when finish_reason=stop but no content', () => {
    const res = {
      ...VALID_RESULT,
      content: undefined,
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('content is expected when finish_reason is "stop"'))).toBe(true);
  });

  it('errors when total_tokens does not match sum', () => {
    const res = {
      ...VALID_RESULT,
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 100, // should be 18
        cost_micro: '150',
      },
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('total_tokens'))).toBe(true);
    }
  });

  it('validates total_tokens with reasoning_tokens', () => {
    const res = {
      ...VALID_RESULT,
      thinking: 'thinking...',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        reasoning_tokens: 50,
        total_tokens: 68,
        cost_micro: '500',
      },
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(true);
  });

  it('no warnings for normal result', () => {
    const result = validate(CompletionResultSchema, VALID_RESULT);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ProviderWireMessage cross-field
// ---------------------------------------------------------------------------

describe('ProviderWireMessage cross-field validator', () => {
  it('errors when role=tool without tool_call_id', () => {
    const msg = { role: 'tool', content: 'result' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('tool_call_id is required'))).toBe(true);
    }
  });

  it('passes when role=tool with tool_call_id', () => {
    const msg = { role: 'tool', content: 'result', tool_call_id: 'call_1' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
  });

  it('warns when assistant has neither content nor tool_calls', () => {
    const msg = { role: 'assistant' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('assistant message should have content or tool_calls'))).toBe(true);
  });

  it('no warning for assistant with content', () => {
    const msg = { role: 'assistant', content: 'Hello' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });

  it('no warning for assistant with tool_calls', () => {
    const msg = {
      role: 'assistant',
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'fn', arguments: '{}' } }],
    };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Registry discoverability
// ---------------------------------------------------------------------------

describe('ModelPort cross-field discoverability', () => {
  it('CompletionRequest is discoverable', () => {
    const schemas = getCrossFieldValidatorSchemas();
    expect(schemas).toContain('CompletionRequest');
  });

  it('CompletionResult is discoverable', () => {
    const schemas = getCrossFieldValidatorSchemas();
    expect(schemas).toContain('CompletionResult');
  });

  it('ProviderWireMessage is discoverable', () => {
    const schemas = getCrossFieldValidatorSchemas();
    expect(schemas).toContain('ProviderWireMessage');
  });
});
