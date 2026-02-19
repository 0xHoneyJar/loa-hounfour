import { Type, type Static } from '@sinclair/typebox';

/**
 * Agent requirements schema for capability-based routing.
 * Declares what an agent needs from a model to function correctly.
 */
export const AgentRequirementsSchema = Type.Object(
  {
    agent_id: Type.String({ minLength: 1 }),
    requires_native_runtime: Type.Optional(Type.Boolean()),
    requires_tool_calling: Type.Optional(Type.Boolean()),
    requires_thinking_traces: Type.Optional(Type.Boolean()),
    requires_vision: Type.Optional(Type.Boolean()),
    preferred_models: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    min_context_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'AgentRequirements', additionalProperties: false }
);

export type AgentRequirements = Static<typeof AgentRequirementsSchema>;
