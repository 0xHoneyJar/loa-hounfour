/**
 * ModelPort schema validation tests (v5.0.0 Sprint 1).
 *
 * Tests: S1-T1 ProviderWireMessage, S1-T2 CompletionRequest/Result,
 *        S1-T3 ToolDefinition/ToolResult/ModelCapabilities
 */
import { describe, it, expect } from 'vitest';
import { validate, validators } from '../../src/validators/index.js';
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { ModelCapabilitiesSchema } from '../../src/schemas/model/model-capabilities.js';
import { ProviderWireMessageSchema } from '../../src/schemas/model/provider-wire-message.js';
import { ToolDefinitionSchema } from '../../src/schemas/model/tool-definition.js';
import { ToolResultSchema } from '../../src/schemas/model/tool-result.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_WIRE_MESSAGE = {
  role: 'user' as const,
  content: 'Hello, world',
};

const VALID_TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
      },
    },
  },
};

const VALID_TOOL_RESULT = {
  role: 'tool' as const,
  tool_call_id: 'call_abc123',
  content: '{"temperature": 72}',
};

const VALID_COMPLETION_REQUEST = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'agent-001',
  tenant_id: 'tenant-001',
  model: 'claude-opus-4-6',
  messages: [VALID_WIRE_MESSAGE],
  contract_version: '5.0.0',
};

const VALID_COMPLETION_RESULT = {
  request_id: '550e8400-e29b-41d4-a716-446655440000',
  model: 'claude-opus-4-6',
  provider: 'anthropic',
  content: 'Hello! How can I help?',
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

const VALID_MODEL_CAPABILITIES = {
  model_id: 'claude-opus-4-6',
  provider: 'anthropic',
  capabilities: {
    thinking_traces: true,
    vision: true,
    tool_calling: true,
    streaming: true,
    json_mode: false,
    native_runtime: true,
  },
  limits: {
    max_context_tokens: 200000,
    max_output_tokens: 4096,
    max_thinking_tokens: 32000,
  },
  pricing: {
    input_per_million_micro: '15000000',
    output_per_million_micro: '75000000',
    thinking_per_million_micro: '15000000',
  },
  contract_version: '5.0.0',
};

// ---------------------------------------------------------------------------
// ProviderWireMessage
// ---------------------------------------------------------------------------

describe('ProviderWireMessage schema', () => {
  it('validates minimal user message', () => {
    const result = validate(ProviderWireMessageSchema, VALID_WIRE_MESSAGE);
    expect(result.valid).toBe(true);
  });

  it('validates system message', () => {
    const result = validate(ProviderWireMessageSchema, { role: 'system', content: 'You are helpful.' });
    expect(result.valid).toBe(true);
  });

  it('validates assistant message with tool_calls', () => {
    const msg = {
      role: 'assistant',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"location":"NYC"}' },
        },
      ],
    };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
  });

  it('validates tool message with tool_call_id', () => {
    const msg = { role: 'tool', content: 'result', tool_call_id: 'call_1' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
  });

  it('validates multipart content array', () => {
    const msg = {
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image', source: { url: 'https://example.com/img.png' } },
      ],
    };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
  });

  it('validates thinking field', () => {
    const msg = { role: 'assistant', content: 'Answer', thinking: 'Let me think...' };
    const result = validate(ProviderWireMessageSchema, msg);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = validate(ProviderWireMessageSchema, { role: 'moderator', content: 'hi' });
    expect(result.valid).toBe(false);
  });

  it('rejects additional properties', () => {
    const result = validate(ProviderWireMessageSchema, { ...VALID_WIRE_MESSAGE, extra: true });
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ToolDefinition
// ---------------------------------------------------------------------------

describe('ToolDefinition schema', () => {
  it('validates complete tool definition', () => {
    const result = validate(ToolDefinitionSchema, VALID_TOOL_DEFINITION);
    expect(result.valid).toBe(true);
  });

  it('validates tool without parameters', () => {
    const tool = {
      type: 'function',
      function: { name: 'stop', description: 'Stop execution' },
    };
    const result = validate(ToolDefinitionSchema, tool);
    expect(result.valid).toBe(true);
  });

  it('rejects empty function name', () => {
    const tool = {
      type: 'function',
      function: { name: '', description: 'Invalid' },
    };
    const result = validate(ToolDefinitionSchema, tool);
    expect(result.valid).toBe(false);
  });

  it('rejects function name starting with number', () => {
    const tool = {
      type: 'function',
      function: { name: '123abc', description: 'Invalid name' },
    };
    const result = validate(ToolDefinitionSchema, tool);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ToolResult
// ---------------------------------------------------------------------------

describe('ToolResult schema', () => {
  it('validates complete tool result', () => {
    const result = validate(ToolResultSchema, VALID_TOOL_RESULT);
    expect(result.valid).toBe(true);
  });

  it('rejects missing tool_call_id', () => {
    const result = validate(ToolResultSchema, { role: 'tool', content: 'result' });
    expect(result.valid).toBe(false);
  });

  it('rejects wrong role', () => {
    const result = validate(ToolResultSchema, { role: 'user', tool_call_id: 'call_1', content: 'result' });
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CompletionRequest
// ---------------------------------------------------------------------------

describe('CompletionRequest schema', () => {
  it('validates minimal request', () => {
    const result = validate(CompletionRequestSchema, VALID_COMPLETION_REQUEST);
    expect(result.valid).toBe(true);
  });

  it('validates request with tools and tool_choice', () => {
    const req = {
      ...VALID_COMPLETION_REQUEST,
      tools: [VALID_TOOL_DEFINITION],
      tool_choice: 'auto',
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('validates request with thinking enabled', () => {
    const req = {
      ...VALID_COMPLETION_REQUEST,
      thinking: { enabled: true, budget_tokens: 8000 },
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('validates request with all optional fields', () => {
    const req = {
      ...VALID_COMPLETION_REQUEST,
      nft_id: 'nft-1',
      trace_id: 'trace-1',
      provider: 'anthropic',
      execution_mode: 'remote_model',
      tools: [VALID_TOOL_DEFINITION],
      tool_choice: 'required',
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
      stop_sequences: ['END'],
      thinking: { enabled: false },
      budget_limit_micro: '5000000',
      metadata: { key: 'value' },
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('validates specific tool_choice', () => {
    const req = {
      ...VALID_COMPLETION_REQUEST,
      tools: [VALID_TOOL_DEFINITION],
      tool_choice: { type: 'function', function: { name: 'get_weather' } },
    };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid request_id format', () => {
    const req = { ...VALID_COMPLETION_REQUEST, request_id: 'not-a-uuid' };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
  });

  it('rejects empty messages array', () => {
    const req = { ...VALID_COMPLETION_REQUEST, messages: [] };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
  });

  it('rejects temperature out of range', () => {
    const req = { ...VALID_COMPLETION_REQUEST, temperature: 3.0 };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
  });

  it('rejects additional properties', () => {
    const req = { ...VALID_COMPLETION_REQUEST, unknown_field: true };
    const result = validate(CompletionRequestSchema, req);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CompletionResult
// ---------------------------------------------------------------------------

describe('CompletionResult schema', () => {
  it('validates minimal result', () => {
    const result = validate(CompletionResultSchema, VALID_COMPLETION_RESULT);
    expect(result.valid).toBe(true);
  });

  it('validates result with tool_calls', () => {
    const res = {
      ...VALID_COMPLETION_RESULT,
      content: undefined,
      finish_reason: 'tool_calls',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"location":"NYC"}' },
        },
      ],
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(true);
  });

  it('validates result with thinking and reasoning_tokens', () => {
    const res = {
      ...VALID_COMPLETION_RESULT,
      thinking: 'Let me analyze this...',
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

  it('rejects invalid finish_reason', () => {
    const res = { ...VALID_COMPLETION_RESULT, finish_reason: 'timeout' };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(false);
  });

  it('rejects negative token count', () => {
    const res = {
      ...VALID_COMPLETION_RESULT,
      usage: { ...VALID_COMPLETION_RESULT.usage, prompt_tokens: -1 },
    };
    const result = validate(CompletionResultSchema, res);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ModelCapabilities
// ---------------------------------------------------------------------------

describe('ModelCapabilities schema', () => {
  it('validates complete capabilities', () => {
    const result = validate(ModelCapabilitiesSchema, VALID_MODEL_CAPABILITIES);
    expect(result.valid).toBe(true);
  });

  it('validates without optional pricing', () => {
    const { pricing, ...noPricing } = VALID_MODEL_CAPABILITIES;
    const result = validate(ModelCapabilitiesSchema, noPricing);
    expect(result.valid).toBe(true);
  });

  it('validates without optional max_thinking_tokens', () => {
    const caps = {
      ...VALID_MODEL_CAPABILITIES,
      limits: {
        max_context_tokens: 200000,
        max_output_tokens: 4096,
      },
    };
    const result = validate(ModelCapabilitiesSchema, caps);
    expect(result.valid).toBe(true);
  });

  it('rejects zero max_context_tokens', () => {
    const caps = {
      ...VALID_MODEL_CAPABILITIES,
      limits: { ...VALID_MODEL_CAPABILITIES.limits, max_context_tokens: 0 },
    };
    const result = validate(ModelCapabilitiesSchema, caps);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validator registry entries
// ---------------------------------------------------------------------------

describe('ModelPort validator registry entries', () => {
  it('exposes completionRequest validator', () => {
    expect(validators.completionRequest).toBeDefined();
    const compiled = validators.completionRequest();
    expect(compiled.Check(VALID_COMPLETION_REQUEST)).toBe(true);
  });

  it('exposes completionResult validator', () => {
    expect(validators.completionResult).toBeDefined();
    const compiled = validators.completionResult();
    expect(compiled.Check(VALID_COMPLETION_RESULT)).toBe(true);
  });

  it('exposes modelCapabilities validator', () => {
    expect(validators.modelCapabilities).toBeDefined();
    const compiled = validators.modelCapabilities();
    expect(compiled.Check(VALID_MODEL_CAPABILITIES)).toBe(true);
  });

  it('exposes providerWireMessage validator', () => {
    expect(validators.providerWireMessage).toBeDefined();
    const compiled = validators.providerWireMessage();
    expect(compiled.Check(VALID_WIRE_MESSAGE)).toBe(true);
  });

  it('exposes toolDefinition validator', () => {
    expect(validators.toolDefinition).toBeDefined();
    const compiled = validators.toolDefinition();
    expect(compiled.Check(VALID_TOOL_DEFINITION)).toBe(true);
  });

  it('exposes toolResult validator', () => {
    expect(validators.toolResult).toBeDefined();
    const compiled = validators.toolResult();
    expect(compiled.Check(VALID_TOOL_RESULT)).toBe(true);
  });
});
