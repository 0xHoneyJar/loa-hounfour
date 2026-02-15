import { Type, type Static } from '@sinclair/typebox';

/**
 * Routing resolution schema for model selection outcomes.
 * Records how a model request was resolved and why.
 */
export const RoutingResolutionSchema = Type.Object(
  {
    resolved_model: Type.String({ minLength: 1 }),
    original_request_model: Type.String({ minLength: 1 }),
    resolution_type: Type.Union([
      Type.Literal('exact'),
      Type.Literal('fallback'),
      Type.Literal('budget_downgrade'),
      Type.Literal('capability_match'),
    ]),
    reason: Type.String({ minLength: 1 }),
    latency_ms: Type.Integer({ minimum: 0 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'RoutingResolution', additionalProperties: false }
);

export type RoutingResolution = Static<typeof RoutingResolutionSchema>;
