import { Type } from '@sinclair/typebox';
export const ToolResultSchema = Type.Object({
    role: Type.Literal('tool'),
    tool_call_id: Type.String({ minLength: 1 }),
    content: Type.String(),
}, { $id: 'ToolResult', additionalProperties: false });
//# sourceMappingURL=tool-result.js.map