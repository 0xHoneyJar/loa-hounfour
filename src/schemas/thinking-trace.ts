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
import { Type, type Static } from '@sinclair/typebox';

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
export const ThinkingTraceSchema = Type.Object({
  content: Type.String({
    description: 'Normalized thinking/reasoning content',
  }),
  model_id: Type.String({
    minLength: 1,
    description: 'Model that produced this trace',
  }),
  provider: Type.String({
    minLength: 1,
    description: 'Provider identifier (e.g., "anthropic", "openai", "kimi")',
  }),
  tokens: Type.Optional(Type.Integer({
    minimum: 0,
    description: 'Token count for the thinking trace (if available)',
  })),
  redacted: Type.Boolean({
    description: 'Whether the trace content has been redacted for privacy/safety',
  }),
  trace_id: Type.Optional(Type.String({
    minLength: 1,
    description: 'Correlation ID linking to the parent request trace',
  })),
}, {
  $id: 'ThinkingTrace',
  additionalProperties: false,
  description: 'Normalized thinking/reasoning trace from a model provider',
});

export type ThinkingTrace = Static<typeof ThinkingTraceSchema>;
