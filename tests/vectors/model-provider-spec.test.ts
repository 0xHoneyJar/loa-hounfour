import { describe, it, expect } from 'vitest';
import { validate, validators } from '../../src/validators/index.js';
import {
  ModelProviderSpecSchema,
  ModelPricingSchema,
  ModelEntrySchema,
  ProviderEndpointsSchema,
  ProviderSLASchema,
  ConformanceVectorResultSchema,
} from '../../src/schemas/model/model-provider-spec.js';

// --- Test Fixtures ---

const VALID_PRICING = {
  input_per_million_micro: '3000000',
  output_per_million_micro: '15000000',
  thinking_per_million_micro: '3000000',
};

const VALID_MODEL_ENTRY = {
  model_id: 'claude-opus-4-6',
  capabilities: {
    thinking_traces: true,
    vision: true,
    tool_calling: true,
    streaming: true,
    json_mode: true,
    native_runtime: false,
  },
  limits: {
    max_context_tokens: 200000,
    max_output_tokens: 32000,
    max_thinking_tokens: 128000,
  },
  pricing: VALID_PRICING,
  status: 'active' as const,
};

const VALID_ENDPOINTS = {
  completion: 'https://api.anthropic.com/v1/messages',
  streaming: 'https://api.anthropic.com/v1/messages',
  health: 'https://api.anthropic.com/v1/health',
};

const VALID_VECTOR_RESULT = {
  vector_id: 'conformance-normalization-001',
  category: 'provider-normalization',
  passed: true,
  run_at: '2026-02-16T12:00:00Z',
};

const VALID_ANTHROPIC_SPEC = {
  spec_id: '550e8400-e29b-41d4-a716-446655440000',
  provider: 'anthropic',
  display_name: 'Anthropic',
  version: '1.0.0',
  contract_version: '5.1.0',
  models: [VALID_MODEL_ENTRY],
  endpoints: VALID_ENDPOINTS,
  sla: { uptime_target: 0.999, p50_latency_ms: 500, p99_latency_ms: 5000 },
  conformance_level: 'self_declared',
  metadata: { 'x-region': 'us-east-1' },
  published_at: '2026-02-16T12:00:00Z',
};

const VALID_OPENAI_SPEC = {
  spec_id: '660e8400-e29b-41d4-a716-446655440001',
  provider: 'openai',
  display_name: 'OpenAI',
  version: '1.0.0',
  contract_version: '5.1.0',
  models: [
    {
      ...VALID_MODEL_ENTRY,
      model_id: 'gpt-5.2',
      capabilities: {
        ...VALID_MODEL_ENTRY.capabilities,
        thinking_traces: false,
      },
      pricing: {
        input_per_million_micro: '5000000',
        output_per_million_micro: '15000000',
      },
    },
  ],
  conformance_level: 'self_declared',
  published_at: '2026-02-16T12:00:00Z',
};

const VALID_GOOGLE_SPEC = {
  spec_id: '770e8400-e29b-41d4-a716-446655440002',
  provider: 'google',
  display_name: 'Google DeepMind',
  version: '1.0.0',
  contract_version: '5.1.0',
  models: [
    {
      ...VALID_MODEL_ENTRY,
      model_id: 'gemini-2.5-pro',
      capabilities: {
        ...VALID_MODEL_ENTRY.capabilities,
        native_runtime: false,
      },
    },
  ],
  conformance_level: 'self_declared',
  published_at: '2026-02-16T12:00:00Z',
};

// --- Sub-Type Tests ---

describe('ModelPricingSchema', () => {
  it('validates full pricing', () => {
    const result = validate(ModelPricingSchema, VALID_PRICING);
    expect(result.valid).toBe(true);
  });

  it('validates pricing without thinking rate', () => {
    const { thinking_per_million_micro: _, ...pricing } = VALID_PRICING;
    const result = validate(ModelPricingSchema, pricing);
    expect(result.valid).toBe(true);
  });

  it('rejects non-numeric strings', () => {
    const result = validate(ModelPricingSchema, {
      ...VALID_PRICING,
      input_per_million_micro: 'not-a-number',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects additional properties', () => {
    const result = validate(ModelPricingSchema, {
      ...VALID_PRICING,
      extra_field: '100',
    });
    expect(result.valid).toBe(false);
  });
});

describe('ModelEntrySchema', () => {
  it('validates active model', () => {
    const result = validate(ModelEntrySchema, VALID_MODEL_ENTRY);
    expect(result.valid).toBe(true);
  });

  it('validates deprecated model', () => {
    const result = validate(ModelEntrySchema, {
      ...VALID_MODEL_ENTRY,
      status: 'deprecated',
    });
    expect(result.valid).toBe(true);
  });

  it('validates preview model', () => {
    const result = validate(ModelEntrySchema, {
      ...VALID_MODEL_ENTRY,
      status: 'preview',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown status', () => {
    const result = validate(ModelEntrySchema, {
      ...VALID_MODEL_ENTRY,
      status: 'retired',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects empty model_id', () => {
    const result = validate(ModelEntrySchema, {
      ...VALID_MODEL_ENTRY,
      model_id: '',
    });
    expect(result.valid).toBe(false);
  });
});

describe('ProviderEndpointsSchema', () => {
  it('validates full endpoints', () => {
    const result = validate(ProviderEndpointsSchema, VALID_ENDPOINTS);
    expect(result.valid).toBe(true);
  });

  it('validates minimal endpoints (completion only)', () => {
    const result = validate(ProviderEndpointsSchema, {
      completion: 'https://api.example.com/v1/chat',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects non-URI completion', () => {
    const result = validate(ProviderEndpointsSchema, {
      completion: 'not-a-uri',
    });
    expect(result.valid).toBe(false);
  });
});

describe('ProviderSLASchema', () => {
  it('validates SLA within bounds', () => {
    const result = validate(ProviderSLASchema, {
      uptime_target: 0.999,
      p50_latency_ms: 500,
      p99_latency_ms: 5000,
      rate_limit_rpm: 1000,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects uptime > 1', () => {
    const result = validate(ProviderSLASchema, { uptime_target: 1.5 });
    expect(result.valid).toBe(false);
  });

  it('rejects negative latency', () => {
    const result = validate(ProviderSLASchema, {
      uptime_target: 0.99,
      p50_latency_ms: -100,
    });
    expect(result.valid).toBe(false);
  });
});

describe('ConformanceVectorResultSchema', () => {
  it('validates passing result', () => {
    const result = validate(ConformanceVectorResultSchema, VALID_VECTOR_RESULT);
    expect(result.valid).toBe(true);
  });

  it('validates failing result with error', () => {
    const result = validate(ConformanceVectorResultSchema, {
      ...VALID_VECTOR_RESULT,
      passed: false,
      error_message: 'Expected 200, got 500',
    });
    expect(result.valid).toBe(true);
  });
});

// --- Main Schema Tests ---

describe('ModelProviderSpecSchema', () => {
  it('validates Anthropic provider spec', () => {
    const result = validate(ModelProviderSpecSchema, VALID_ANTHROPIC_SPEC);
    expect(result.valid).toBe(true);
  });

  it('validates OpenAI provider spec', () => {
    const result = validate(ModelProviderSpecSchema, VALID_OPENAI_SPEC);
    expect(result.valid).toBe(true);
  });

  it('validates Google provider spec', () => {
    const result = validate(ModelProviderSpecSchema, VALID_GOOGLE_SPEC);
    expect(result.valid).toBe(true);
  });

  it('validates minimal spec (no optional fields)', () => {
    const minimal = {
      spec_id: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'custom',
      display_name: 'My Provider',
      version: '0.1.0',
      contract_version: '5.1.0',
      models: [VALID_MODEL_ENTRY],
      conformance_level: 'self_declared',
      published_at: '2026-02-16T12:00:00Z',
    };
    const result = validate(ModelProviderSpecSchema, minimal);
    expect(result.valid).toBe(true);
  });

  it('rejects missing models', () => {
    const { models: _, ...noModels } = VALID_ANTHROPIC_SPEC;
    const result = validate(ModelProviderSpecSchema, noModels);
    expect(result.valid).toBe(false);
  });

  it('rejects empty models array', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      models: [],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid spec_id (non-UUID)', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      spec_id: 'not-a-uuid',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid contract_version', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      contract_version: 'v5',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects empty display_name', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      display_name: '',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid provider type', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      provider: 'aws',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects additional properties', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      extra_field: 'value',
    });
    expect(result.valid).toBe(false);
  });

  it('has correct $id', () => {
    expect(ModelProviderSpecSchema.$id).toBe('ModelProviderSpec');
  });

  it('has x-cross-field-validated marker', () => {
    expect(
      (ModelProviderSpecSchema as Record<string, unknown>)[
        'x-cross-field-validated'
      ],
    ).toBe(true);
  });
});

// --- Cross-Field Validation Tests ---

describe('ModelProviderSpec cross-field validator', () => {
  it('passes for valid self_declared spec', () => {
    const result = validate(ModelProviderSpecSchema, VALID_ANTHROPIC_SPEC);
    expect(result.valid).toBe(true);
  });

  it('errors: protocol_certified without vector results', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      conformance_level: 'protocol_certified',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        'protocol_certified requires conformance_vector_results',
      );
    }
  });

  it('errors: protocol_certified with failing vectors', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      conformance_level: 'protocol_certified',
      conformance_vector_results: [
        { ...VALID_VECTOR_RESULT, passed: false, error_message: 'fail' },
      ],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        'protocol_certified requires all vectors to pass',
      );
    }
  });

  it('passes: protocol_certified with all passing vectors', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      conformance_level: 'protocol_certified',
      conformance_vector_results: [VALID_VECTOR_RESULT],
    });
    expect(result.valid).toBe(true);
  });

  it('warns: community_verified without vector results', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      conformance_level: 'community_verified',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings).toContain(
        'community_verified should include conformance_vector_results',
      );
    }
  });

  it('errors: no active models', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      models: [{ ...VALID_MODEL_ENTRY, status: 'deprecated' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        'models must include at least one active entry',
      );
    }
  });

  it('errors: metadata exceeds 10KB', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      metadata: { 'x-large': 'a'.repeat(20000) },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('metadata exceeds 10KB limit');
    }
  });

  it('warns: metadata key without x- prefix', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      metadata: { region: 'us-east-1' },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings).toContain(
        "metadata key 'region' should use x-* namespace",
      );
    }
  });

  it('errors: expires_at before published_at', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      expires_at: '2026-02-15T12:00:00Z', // before published_at
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        'expires_at must be after published_at',
      );
    }
  });

  it('errors: non-HTTPS endpoint', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      endpoints: {
        completion: 'http://api.example.com/v1/chat',
      },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        'endpoints.completion must use https:// scheme',
      );
    }
  });
});

// --- Signature Field Tests (v5.2.0) ---

describe('ModelProviderSpec signature field (v5.2.0)', () => {
  it('validates spec without signature (absent)', () => {
    const result = validate(ModelProviderSpecSchema, VALID_ANTHROPIC_SPEC);
    expect(result.valid).toBe(true);
  });

  it('validates valid JWS compact format', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'eyJhbGciOiJFUzI1NiJ9.eyJ0ZXN0IjoxfQ.abc123',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects signature with no dots', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'not-a-jws-token',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects signature with too many dots', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'a.b.c.d',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects signature with empty segment', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'a..c',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects signature with spaces', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'a b.c d.e f',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts signature with base64url characters', () => {
    const result = validate(ModelProviderSpecSchema, {
      ...VALID_ANTHROPIC_SPEC,
      signature: 'eyJhbGciOiJFUzI1NiJ9.eyJ0ZXN0IjoiMSJ9.R_0-4vb3Xz',
    });
    expect(result.valid).toBe(true);
  });

  it('validates spec with empty optional signature removed', () => {
    const spec = { ...VALID_ANTHROPIC_SPEC };
    const result = validate(ModelProviderSpecSchema, spec);
    expect(result.valid).toBe(true);
  });
});

// --- Validator Registry Tests ---

describe('ModelProviderSpec validator registry', () => {
  it('exposes modelProviderSpec validator', () => {
    expect(validators.modelProviderSpec).toBeDefined();
    const compiled = validators.modelProviderSpec();
    expect(compiled.Check(VALID_ANTHROPIC_SPEC)).toBe(true);
  });

  it('exposes conformanceLevel validator', () => {
    expect(validators.conformanceLevel).toBeDefined();
    const compiled = validators.conformanceLevel();
    expect(compiled.Check('self_declared')).toBe(true);
    expect(compiled.Check('invalid')).toBe(false);
  });
});
