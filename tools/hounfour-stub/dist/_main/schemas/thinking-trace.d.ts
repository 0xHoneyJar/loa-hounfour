/**
 * Thinking trace schema for normalized reasoning traces across model providers.
 *
 * Different providers expose reasoning/thinking content differently:
 * - Anthropic Claude: `thinking` blocks with explicit content
 * - Kimi-K2: `reasoning_content` field
 * - OpenAI: Hidden chain-of-thought (not exposed)
 *
 * This schema normalizes these into a canonical format for storage,
 * debugging, and multi-model comparison.
 *
 * @see BB-HFR-002 — ThinkingTrace canonical schema
 * @see Hounfour RFC §5.3 — Response normalization
 * @since v3.1.0
 *
 * FAANG Parallel: OpenTelemetry Span status normalization across tracing
 * backends — each backend (Jaeger, Zipkin, X-Ray) has its own trace format,
 * and OTel normalizes them into a canonical representation.
 */
import { type Static } from '@sinclair/typebox';
/**
 * Normalized thinking/reasoning trace from a model provider.
 *
 * @example
 * ```ts
 * const trace: ThinkingTrace = {
 *   content: 'Let me analyze the code structure...',
 *   model_id: 'claude-opus-4-6',
 *   provider: 'anthropic',
 *   tokens: 1250,
 *   redacted: false,
 * };
 * ```
 */
export declare const ThinkingTraceSchema: import("@sinclair/typebox").TObject<{
    content: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    redacted: import("@sinclair/typebox").TBoolean;
    trace_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ThinkingTrace = Static<typeof ThinkingTraceSchema>;
//# sourceMappingURL=thinking-trace.d.ts.map