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
import { type Static } from '@sinclair/typebox';
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
export declare const CircuitStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"closed">, import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"half_open">]>;
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
export declare const HealthStatusSchema: import("@sinclair/typebox").TObject<{
    healthy: import("@sinclair/typebox").TBoolean;
    latency_ms: import("@sinclair/typebox").TInteger;
    provider: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    checked_at: import("@sinclair/typebox").TString;
    error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    circuit_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"closed">, import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"half_open">]>;
}>;
export type HealthStatus = Static<typeof HealthStatusSchema>;
//# sourceMappingURL=health-status.d.ts.map