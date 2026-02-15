/**
 * Health status schema for circuit breaker state reporting.
 *
 * The Hounfour router needs a shared health type for provider availability,
 * fallback chain activation, and Arrakis admin dashboards.
 *
 * @see BB-HFR-001 — HealthStatus protocol-level type
 * @see Hounfour RFC §5.2 — Provider health monitoring
 * @since v3.1.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Circuit breaker state for a model provider endpoint.
 *
 * Follows the standard circuit breaker pattern:
 * - `closed`: Normal operation, requests flow through
 * - `open`: Requests blocked, provider considered unavailable
 * - `half_open`: Test requests allowed, evaluating recovery
 *
 * FAANG Parallel: Kubernetes PodStatus as a protocol-level health type.
 * Netflix Hystrix and AWS App Mesh both use this three-state model.
 */
export const CircuitStateSchema = Type.Union([
  Type.Literal('closed'),
  Type.Literal('open'),
  Type.Literal('half_open'),
], { $id: 'CircuitState' });

export type CircuitState = Static<typeof CircuitStateSchema>;

/**
 * Health status report for a model provider endpoint.
 *
 * Used by the Hounfour router for:
 * 1. Provider availability checks (is the endpoint responding?)
 * 2. Fallback chain activation (which alternatives are healthy?)
 * 3. Arrakis admin dashboards (latency and error visibility)
 *
 * @example
 * ```ts
 * const healthy: HealthStatus = {
 *   healthy: true,
 *   latency_ms: 42,
 *   provider: 'anthropic',
 *   model_id: 'claude-opus-4-6',
 *   checked_at: '2026-02-14T12:00:00Z',
 *   circuit_state: 'closed',
 * };
 * ```
 */
export const HealthStatusSchema = Type.Object({
  healthy: Type.Boolean({
    description: 'Whether the provider endpoint is currently healthy',
  }),
  latency_ms: Type.Integer({
    minimum: 0,
    description: 'Last observed latency in milliseconds',
  }),
  provider: Type.String({
    minLength: 1,
    description: 'Provider identifier (e.g., "anthropic", "openai", "qwen")',
  }),
  model_id: Type.String({
    minLength: 1,
    description: 'Model identifier within the provider',
  }),
  checked_at: Type.String({
    format: 'date-time',
    description: 'ISO 8601 timestamp of the last health check',
  }),
  error: Type.Optional(Type.String({
    description: 'Error message when unhealthy (omitted when healthy)',
  })),
  circuit_state: CircuitStateSchema,
}, {
  $id: 'HealthStatus',
  additionalProperties: false,
  description: 'Health status report for a model provider endpoint',
});

export type HealthStatus = Static<typeof HealthStatusSchema>;
