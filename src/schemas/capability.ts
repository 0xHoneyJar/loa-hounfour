/**
 * Capability negotiation schemas for multi-model architecture.
 *
 * AgentDescriptor describes what an agent *has*; capability schemas
 * describe what an agent *can do at what quality*. This enables
 * runtime capability queries — the HTTP Accept header equivalent
 * for agent collaboration.
 *
 * @see BB-V3-005 — Capability negotiation schema
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * A single capability an agent can provide.
 */
export const CapabilitySchema = Type.Object({
  skill_id: Type.String({ minLength: 1, description: 'Skill or capability identifier' }),
  description: Type.Optional(Type.String({ description: 'Human-readable capability description' })),
  input_modes: Type.Optional(Type.Array(Type.String(), {
    description: 'Accepted input types (e.g. "text", "image", "audio")',
  })),
  output_modes: Type.Optional(Type.Array(Type.String(), {
    description: 'Produced output types (e.g. "text", "code", "image")',
  })),
  models: Type.Optional(Type.Array(Type.String(), {
    description: 'Model IDs that can execute this capability',
  })),
  max_latency_ms: Type.Optional(Type.Integer({
    minimum: 0,
    description: 'Maximum acceptable latency in milliseconds',
  })),
}, {
  $id: 'Capability',
  additionalProperties: false,
  description: 'A single capability an agent can provide',
});

export type Capability = Static<typeof CapabilitySchema>;

/**
 * Query to discover agents with specific capabilities.
 *
 * `additionalProperties: true` enables future query parameters
 * without schema changes.
 */
export const CapabilityQuerySchema = Type.Object({
  required_skills: Type.Optional(Type.Array(Type.String(), {
    description: 'Skills the agent must provide',
  })),
  preferred_models: Type.Optional(Type.Array(Type.String(), {
    description: 'Preferred model IDs (best-effort matching)',
  })),
  max_latency_ms: Type.Optional(Type.Integer({
    minimum: 0,
    description: 'Maximum acceptable response latency',
  })),
  min_context_tokens: Type.Optional(Type.Integer({
    minimum: 0,
    description: 'Minimum context window size in tokens',
  })),
}, {
  $id: 'CapabilityQuery',
  additionalProperties: true,
  description: 'Query to discover agents with specific capabilities',
});

export type CapabilityQuery = Static<typeof CapabilityQuerySchema>;

/**
 * Response to a capability query, describing an agent's abilities.
 */
export const CapabilityResponseSchema = Type.Object({
  agent_id: Type.String({ minLength: 1, description: 'Agent providing these capabilities' }),
  capabilities: Type.Array(CapabilitySchema, {
    description: 'List of capabilities this agent provides',
  }),
  available: Type.Boolean({
    description: 'Whether the agent can currently accept work',
  }),
  contract_version: Type.String({
    pattern: '^\\d+\\.\\d+\\.\\d+$',
    description: 'Protocol version this agent supports',
  }),
  responded_at: Type.Optional(Type.String({
    format: 'date-time',
    description: 'When the response was generated (for cache freshness)',
  })),
}, {
  $id: 'CapabilityResponse',
  additionalProperties: false,
  description: 'Response to a capability query',
});

export type CapabilityResponse = Static<typeof CapabilityResponseSchema>;
