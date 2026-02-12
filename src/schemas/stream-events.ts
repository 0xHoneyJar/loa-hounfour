/**
 * SSE stream event schemas — discriminated union.
 *
 * 6 event types with strict ordering invariants:
 * - stream_start MUST be first
 * - stream_end MUST be last (or error)
 * - usage MUST appear before stream_end
 * - chunk events carry delta content
 * - tool_call events carry incremental tool call data
 *
 * @see SDD 6.1 — StreamEventSchema
 */
import { Type, type Static } from '@sinclair/typebox';

/** Stream start event — always first. */
export const StreamStartSchema = Type.Object({
  type: Type.Literal('stream_start'),
  model: Type.String(),
  provider: Type.String(),
  pool_id: Type.String(),
  trace_id: Type.String(),
  contract_version: Type.String(),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamStart' });

/** Content chunk — incremental text delta. */
export const StreamChunkSchema = Type.Object({
  type: Type.Literal('chunk'),
  delta: Type.String({ description: 'Incremental text content' }),
  index: Type.Optional(Type.Integer({ minimum: 0, description: 'Choice index for multi-choice' })),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamChunk' });

/** Tool call — incremental function call data. */
export const StreamToolCallSchema = Type.Object({
  type: Type.Literal('tool_call'),
  index: Type.Integer({ minimum: 0 }),
  id: Type.Optional(Type.String({ description: 'Tool call ID (present on first chunk)' })),
  function: Type.Object({
    name: Type.Optional(Type.String({ description: 'Function name (present on first chunk)' })),
    arguments: Type.String({ description: 'Incremental JSON arguments' }),
  }),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamToolCall' });

/** Usage report — token counts. Must appear before stream_end. */
export const StreamUsageSchema = Type.Object({
  type: Type.Literal('usage'),
  prompt_tokens: Type.Integer({ minimum: 0 }),
  completion_tokens: Type.Integer({ minimum: 0 }),
  reasoning_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamUsage' });

/** Stream end — always last on success. */
export const StreamEndSchema = Type.Object({
  type: Type.Literal('stream_end'),
  finish_reason: Type.Union([
    Type.Literal('stop'),
    Type.Literal('tool_calls'),
    Type.Literal('length'),
    Type.Literal('content_filter'),
  ]),
  billing_method: Type.Union([
    Type.Literal('provider_reported'),
    Type.Literal('observed_chunks_overcount'),
    Type.Literal('prompt_only'),
  ]),
  cost_micro: Type.String({ pattern: '^[0-9]+$' }),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamEnd' });

/** Error event — terminal, replaces stream_end on failure. */
export const StreamErrorSchema = Type.Object({
  type: Type.Literal('error'),
  code: Type.String({ description: 'Error code from HounfourErrorCode' }),
  message: Type.String(),
  retryable: Type.Boolean(),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Monotonic SSE sequence number for reconnection via Last-Event-ID' })),
}, { $id: 'StreamError' });

/**
 * Discriminated union of all stream event types.
 *
 * Ordering invariants:
 * 1. stream_start MUST be the first event
 * 2. chunk and tool_call events may interleave
 * 3. usage MUST appear at least once before stream_end
 * 4. stream_end OR error MUST be the last event (mutually exclusive)
 * 5. No events after stream_end or error
 */
export const StreamEventSchema = Type.Union([
  StreamStartSchema,
  StreamChunkSchema,
  StreamToolCallSchema,
  StreamUsageSchema,
  StreamEndSchema,
  StreamErrorSchema,
], { $id: 'StreamEvent', discriminator: { propertyName: 'type' } });

export type StreamEvent = Static<typeof StreamEventSchema>;
export type StreamStart = Static<typeof StreamStartSchema>;
export type StreamChunk = Static<typeof StreamChunkSchema>;
export type StreamToolCall = Static<typeof StreamToolCallSchema>;
export type StreamUsage = Static<typeof StreamUsageSchema>;
export type StreamEnd = Static<typeof StreamEndSchema>;
export type StreamError = Static<typeof StreamErrorSchema>;

/**
 * Reconnection support via Last-Event-ID.
 *
 * Each event carries an incrementing sequence number as the SSE `id` field.
 * On reconnect, the client sends `Last-Event-ID: <N>` and the server
 * replays events from N+1.
 */
export const STREAM_RECONNECT_HEADER = 'Last-Event-ID' as const;
