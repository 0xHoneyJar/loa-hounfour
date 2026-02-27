import { Type } from '@sinclair/typebox';
export const ToolDefinitionSchema = Type.Object({
    type: Type.Literal('function'),
    function: Type.Object({
        name: Type.String({ minLength: 1, pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$' }),
        description: Type.String(),
        parameters: Type.Optional(Type.Unknown()),
    }),
}, { $id: 'ToolDefinition', additionalProperties: false });
//# sourceMappingURL=tool-definition.js.map