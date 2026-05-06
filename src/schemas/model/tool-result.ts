import { Type, type Static } from '@sinclair/typebox';

export const ToolResultSchema = Type.Object(
  {
    role: Type.Literal('tool'),
    tool_call_id: Type.String({ minLength: 1 }),
    content: Type.String(),
  },
  {
    $id: 'ToolResult',
    additionalProperties: false,
    description: 'Wire envelope for a tool-call result message: role tag, the originating tool_call_id, and the result content string.',
  },
);

export type ToolResult = Static<typeof ToolResultSchema>;
