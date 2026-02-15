/**
 * Canonical tool call schema — extracted from inline MessageSchema.tool_calls.
 *
 * Referenced by both MessageSchema (conversation.ts) and StreamToolCallSchema
 * (stream-events.ts) for a single source of truth on tool call structure.
 *
 * @see BB-HFR-003 — Extract ToolCall canonical schema
 * @see Hounfour RFC §5.3 — Tool calling contract normalization
 * @since v3.1.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * A tool/function call made by a model.
 *
 * Normalizes across provider formats:
 * - OpenAI: `tool_calls[].function.{name, arguments}`
 * - Anthropic: `content[type=tool_use].{name, input}`
 * - Qwen: `tool_calls[].function.{name, arguments}`
 *
 * The `arguments` field is always a JSON string (not parsed object)
 * to preserve provider-specific formatting and avoid double-parse issues.
 */
export const ToolCallSchema = Type.Object({
  id: Type.String({
    description: 'Unique tool call identifier',
  }),
  name: Type.String({
    description: 'Function/tool name',
  }),
  arguments: Type.String({
    description: 'JSON-encoded arguments string',
  }),
  model_source: Type.Optional(Type.String({
    description: 'Model that generated this tool call (for multi-model debugging)',
  })),
}, {
  $id: 'ToolCall',
  additionalProperties: false,
  description: 'Canonical tool/function call made by a model',
});

export type ToolCall = Static<typeof ToolCallSchema>;
