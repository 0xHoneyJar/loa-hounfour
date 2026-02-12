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
import { Type } from '@sinclair/typebox';
/** Stream start event — always first. */
export const StreamStartSchema = Type.Object({
    type: Type.Literal('stream_start'),
    model: Type.String(),
    provider: Type.String(),
    pool_id: Type.String(),
    trace_id: Type.String(),
    contract_version: Type.String(),
}, { $id: 'StreamStart' });
/** Content chunk — incremental text delta. */
export const StreamChunkSchema = Type.Object({
    type: Type.Literal('chunk'),
    delta: Type.String({ description: 'Incremental text content' }),
    index: Type.Optional(Type.Integer({ minimum: 0, description: 'Choice index for multi-choice' })),
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
}, { $id: 'StreamToolCall' });
/** Usage report — token counts. Must appear before stream_end. */
export const StreamUsageSchema = Type.Object({
    type: Type.Literal('usage'),
    prompt_tokens: Type.Integer({ minimum: 0 }),
    completion_tokens: Type.Integer({ minimum: 0 }),
    reasoning_tokens: Type.Optional(Type.Integer({ minimum: 0 })),
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
}, { $id: 'StreamEnd' });
/** Error event — terminal, replaces stream_end on failure. */
export const StreamErrorSchema = Type.Object({
    type: Type.Literal('error'),
    code: Type.String({ description: 'Error code from HounfourErrorCode' }),
    message: Type.String(),
    retryable: Type.Boolean(),
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
/**
 * Reconnection support via Last-Event-ID.
 *
 * Each event carries an incrementing sequence number as the SSE `id` field.
 * On reconnect, the client sends `Last-Event-ID: <N>` and the server
 * replays events from N+1.
 */
export const STREAM_RECONNECT_HEADER = 'Last-Event-ID';
//# sourceMappingURL=stream-events.js.map