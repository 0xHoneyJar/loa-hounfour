/**
 * Invoke response and usage report schemas.
 *
 * All cost fields use string-typed micro-USD (integer as string)
 * to avoid floating-point precision issues across languages.
 *
 * @see SDD 4.3 — Budget System
 */
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/** Token usage breakdown. */
export const UsageSchema = Type.Object({
  prompt_tokens: Type.Integer({ minimum: 0 }),
  completion_tokens: Type.Integer({ minimum: 0 }),
  reasoning_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
}, { $id: 'Usage', additionalProperties: false });

export type Usage = Static<typeof UsageSchema>;

/** Invoke response returned to the client. */
export const InvokeResponseSchema = Type.Object({
  id: Type.String({ description: 'Request trace ID' }),
  model: Type.String({ description: 'Model that served the request' }),
  provider: Type.String({ description: 'Provider that served the request' }),
  pool_id: Type.String({ description: 'Pool the request was routed to' }),
  content: Type.String({ description: 'Model response content' }),
  tool_calls: Type.Optional(Type.Array(Type.Object({
    id: Type.String(),
    function: Type.Object({
      name: Type.String(),
      arguments: Type.String(),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }))),
  usage: UsageSchema,
  billing_entry_id: Type.String({
    minLength: 1,
    description: 'References BillingEntry.id (ULID)',
  }),
  billing_method: Type.Union([
    Type.Literal('provider_reported'),
    Type.Literal('observed_chunks_overcount'),
    Type.Literal('prompt_only'),
  ], { description: 'How cost was determined' }),
  latency_ms: Type.Integer({ minimum: 0 }),
  contract_version: Type.String({ description: 'Protocol version' }),
}, {
  $id: 'InvokeResponse',
  additionalProperties: false,
});

export type InvokeResponse = Static<typeof InvokeResponseSchema>;

/**
 * Usage report posted to arrakis for reconciliation.
 * Signed as JWS for tamper resistance.
 */
export const UsageReportSchema = Type.Object({
  trace_id: Type.String(),
  tenant_id: Type.String(),
  provider: Type.String(),
  model: Type.String(),
  pool_id: Type.String(),
  usage: UsageSchema,
  billing_entry_id: Type.String({
    minLength: 1,
    description: 'References BillingEntry.id (ULID)',
  }),
  billing_method: Type.Union([
    Type.Literal('provider_reported'),
    Type.Literal('observed_chunks_overcount'),
    Type.Literal('prompt_only'),
  ]),
  idempotency_key: Type.String({ description: 'Derived via deriveIdempotencyKey()' }),
  timestamp: Type.String({ format: 'date-time' }),
  contract_version: Type.String(),
  nft_id: Type.Optional(Type.String()),
  ensemble_id: Type.Optional(Type.String()),
}, {
  $id: 'UsageReport',
  additionalProperties: false,
});

export type UsageReport = Static<typeof UsageReportSchema>;
