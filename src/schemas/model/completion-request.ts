import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../../vocabulary/currency.js';
import { ProviderWireMessageSchema } from './provider-wire-message.js';
import { ToolDefinitionSchema } from './tool-definition.js';

export const CompletionRequestSchema = Type.Object(
  {
    request_id: Type.String({ format: 'uuid' }),
    agent_id: Type.String({ minLength: 1 }),
    tenant_id: Type.String({ minLength: 1 }),
    nft_id: Type.Optional(Type.String({ minLength: 1 })),
    trace_id: Type.Optional(Type.String({ minLength: 1 })),
    session_id: Type.Optional(Type.String({ minLength: 1 })),
    model: Type.String({ minLength: 1 }),
    provider: Type.Optional(Type.String({ minLength: 1 })),
    execution_mode: Type.Optional(
      Type.Union([
        Type.Literal('native_runtime'),
        Type.Literal('remote_model'),
      ]),
    ),
    messages: Type.Array(ProviderWireMessageSchema, { minItems: 1 }),
    tools: Type.Optional(Type.Array(ToolDefinitionSchema)),
    tool_choice: Type.Optional(
      Type.Union([
        Type.Literal('auto'),
        Type.Literal('none'),
        Type.Literal('required'),
        Type.Object({
          type: Type.Literal('function'),
          function: Type.Object({
            name: Type.String({ minLength: 1 }),
          }),
        }),
      ]),
    ),
    temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
    max_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    top_p: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    stop_sequences: Type.Optional(Type.Array(Type.String())),
    thinking: Type.Optional(
      Type.Object({
        enabled: Type.Boolean(),
        budget_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
      }),
    ),
    budget_limit_micro: Type.Optional(MicroUSDUnsigned),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'CompletionRequest',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type CompletionRequest = Static<typeof CompletionRequestSchema>;
