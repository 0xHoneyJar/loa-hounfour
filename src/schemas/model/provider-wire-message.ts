import { Type, type Static } from '@sinclair/typebox';

export const ProviderWireMessageSchema = Type.Object(
  {
    role: Type.Union([
      Type.Literal('system'),
      Type.Literal('user'),
      Type.Literal('assistant'),
      Type.Literal('tool'),
    ]),
    content: Type.Optional(
      Type.Union([
        Type.String(),
        Type.Array(
          Type.Object({
            type: Type.String({ minLength: 1 }),
            text: Type.Optional(Type.String()),
            source: Type.Optional(Type.Unknown()),
          }),
        ),
      ]),
    ),
    thinking: Type.Optional(Type.String()),
    tool_calls: Type.Optional(
      Type.Array(
        Type.Object({
          id: Type.String({ minLength: 1 }),
          type: Type.Literal('function'),
          function: Type.Object({
            name: Type.String({ minLength: 1 }),
            arguments: Type.String(),
          }),
        }),
      ),
    ),
    tool_call_id: Type.Optional(Type.String({ minLength: 1 })),
  },
  {
    $id: 'ProviderWireMessage',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type ProviderWireMessage = Static<typeof ProviderWireMessageSchema>;
