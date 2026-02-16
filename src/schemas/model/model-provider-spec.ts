import { Type, type Static } from '@sinclair/typebox';
import { ProviderTypeSchema } from './routing/provider-type.js';
import { MicroUSDUnsigned } from '../../vocabulary/currency.js';
import { ConformanceLevelSchema } from './conformance-level.js';

// --- Reusable Sub-Types ---

/**
 * Pricing rates per million tokens. Extracted as a reusable sub-type
 * shared by ModelProviderSpec (here) and BillingEntry (sprint 3).
 */
export const ModelPricingSchema = Type.Object(
  {
    input_per_million_micro: MicroUSDUnsigned,
    output_per_million_micro: MicroUSDUnsigned,
    thinking_per_million_micro: Type.Optional(MicroUSDUnsigned),
  },
  { additionalProperties: false },
);

export type ModelPricing = Static<typeof ModelPricingSchema>;

/** Model status within a provider spec. */
export const ModelStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('deprecated'),
  Type.Literal('preview'),
]);

export type ModelStatus = Static<typeof ModelStatusSchema>;

/** Single model entry within a provider spec. */
export const ModelEntrySchema = Type.Object(
  {
    model_id: Type.String({ minLength: 1 }),
    capabilities: Type.Object(
      {
        thinking_traces: Type.Boolean(),
        vision: Type.Boolean(),
        tool_calling: Type.Boolean(),
        streaming: Type.Boolean(),
        json_mode: Type.Boolean(),
        native_runtime: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    limits: Type.Object(
      {
        max_context_tokens: Type.Integer({ minimum: 1 }),
        max_output_tokens: Type.Integer({ minimum: 1 }),
        max_thinking_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
      },
      { additionalProperties: false },
    ),
    pricing: Type.Optional(ModelPricingSchema),
    status: ModelStatusSchema,
  },
  { additionalProperties: false },
);

export type ModelEntry = Static<typeof ModelEntrySchema>;

/** Provider API endpoints. */
export const ProviderEndpointsSchema = Type.Object(
  {
    completion: Type.String({ format: 'uri' }),
    streaming: Type.Optional(Type.String({ format: 'uri' })),
    health: Type.Optional(Type.String({ format: 'uri' })),
    models: Type.Optional(Type.String({ format: 'uri' })),
  },
  { additionalProperties: false },
);

export type ProviderEndpoints = Static<typeof ProviderEndpointsSchema>;

/** Provider SLA targets. */
export const ProviderSLASchema = Type.Object(
  {
    uptime_target: Type.Number({ minimum: 0, maximum: 1 }),
    p50_latency_ms: Type.Optional(Type.Integer({ minimum: 0 })),
    p99_latency_ms: Type.Optional(Type.Integer({ minimum: 0 })),
    rate_limit_rpm: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

export type ProviderSLA = Static<typeof ProviderSLASchema>;

/** Result of running a conformance vector against the provider. */
export const ConformanceVectorResultSchema = Type.Object(
  {
    vector_id: Type.String({ minLength: 1 }),
    category: Type.String({ minLength: 1 }),
    passed: Type.Boolean(),
    error_message: Type.Optional(Type.String()),
    run_at: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

export type ConformanceVectorResult = Static<typeof ConformanceVectorResultSchema>;

// --- Main Schema ---

/**
 * ModelProviderSpec — The provider registration/identity document.
 *
 * Describes an entire provider: its models, endpoints, SLA, conformance level,
 * and vector results. Lives alongside ModelCapabilities (which describes a single model).
 * Think of it as the "tokenURI for model providers" (Ostrom Principle 1 — Boundaries).
 */
export const ModelProviderSpecSchema = Type.Object(
  {
    spec_id: Type.String({ format: 'uuid' }),
    provider: ProviderTypeSchema,
    display_name: Type.String({ minLength: 1, maxLength: 100 }),
    version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    models: Type.Array(ModelEntrySchema, { minItems: 1 }),
    endpoints: Type.Optional(ProviderEndpointsSchema),
    sla: Type.Optional(ProviderSLASchema),
    conformance_level: ConformanceLevelSchema,
    conformance_vector_results: Type.Optional(
      Type.Array(ConformanceVectorResultSchema),
    ),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    signature: Type.Optional(Type.String()), // Reserved for v5.2.0 JWS
    published_at: Type.String({ format: 'date-time' }),
    expires_at: Type.Optional(Type.String({ format: 'date-time' })),
  },
  {
    $id: 'ModelProviderSpec',
    $comment:
      'Provider registration/identity document. Financial amounts use string-encoded BigInt (MicroUSD). See vocabulary/currency.ts.',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type ModelProviderSpec = Static<typeof ModelProviderSpecSchema>;
