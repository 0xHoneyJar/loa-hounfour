import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../../vocabulary/currency.js';

export const CompletionResultSchema = Type.Object(
  {
    request_id: Type.String({ format: 'uuid' }),
    model: Type.String({ minLength: 1 }),
    provider: Type.String({ minLength: 1 }),
    content: Type.Optional(Type.String()),
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
    finish_reason: Type.Union([
      Type.Literal('stop'),
      Type.Literal('tool_calls'),
      Type.Literal('length'),
      Type.Literal('content_filter'),
    ]),
    usage: Type.Object({
      prompt_tokens: Type.Integer({ minimum: 0 }),
      completion_tokens: Type.Integer({ minimum: 0 }),
      reasoning_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
      total_tokens: Type.Integer({ minimum: 0 }),
      cost_micro: MicroUSDUnsigned,
    }),
    latency_ms: Type.Integer({ minimum: 0 }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'CompletionResult',
    $comment: 'Financial amounts (cost_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. 1 USD = 1,000,000 micro-USD. See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type CompletionResult = Static<typeof CompletionResultSchema>;
