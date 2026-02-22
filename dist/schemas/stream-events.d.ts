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
import { type Static } from '@sinclair/typebox';
/** Stream start event — always first. */
export declare const StreamStartSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"stream_start">;
    model: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    trace_id: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native">, import("@sinclair/typebox").TLiteral<"remote">]>>;
}>;
/** Content chunk — incremental text delta. */
export declare const StreamChunkSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"chunk">;
    delta: import("@sinclair/typebox").TString;
    index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
/** Tool call — incremental function call data. */
export declare const StreamToolCallSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"tool_call">;
    index: import("@sinclair/typebox").TInteger;
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    function: import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        arguments: import("@sinclair/typebox").TString;
    }>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
/** Usage report — token counts. Must appear before stream_end. */
export declare const StreamUsageSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"usage">;
    prompt_tokens: import("@sinclair/typebox").TInteger;
    completion_tokens: import("@sinclair/typebox").TInteger;
    reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
/** Stream end — always last on success. */
export declare const StreamEndSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"stream_end">;
    finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
    billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
    cost_micro: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
/** Error event — terminal, replaces stream_end on failure. */
export declare const StreamErrorSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"error">;
    code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TBoolean;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
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
export declare const StreamEventSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"stream_start">;
    model: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    trace_id: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native">, import("@sinclair/typebox").TLiteral<"remote">]>>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"chunk">;
    delta: import("@sinclair/typebox").TString;
    index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"tool_call">;
    index: import("@sinclair/typebox").TInteger;
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    function: import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        arguments: import("@sinclair/typebox").TString;
    }>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"usage">;
    prompt_tokens: import("@sinclair/typebox").TInteger;
    completion_tokens: import("@sinclair/typebox").TInteger;
    reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"stream_end">;
    finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
    billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
    cost_micro: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"error">;
    code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TBoolean;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>]>;
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
export declare const STREAM_RECONNECT_HEADER: "Last-Event-ID";
//# sourceMappingURL=stream-events.d.ts.map