/**
 * PR-A3.5 iter-4 F11 — Integration test for LatencyHistogramEnvelope
 * percentile-monotonicity dispatch through `validate()`.
 *
 * The schema description claims LHE-1 (`p50_ms ≤ p95_ms ≤ p99_ms ≤ max_ms`)
 * is library-evaluated, but iter-3 shipped a stub `constraintFileOnlyValidator`
 * — schema description and validator behavior diverged. iter-4 wires the
 * real `evaluatePercentilesMonotonicNondecreasing` invocation into the
 * cross-field validator so `validate(LatencyHistogramEnvelopeSchema, x)`
 * actually enforces the documented invariant.
 *
 * @since v8.6.0 — FR-B7 (PR-A3.5 iter-4 F11)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { LatencyHistogramEnvelopeSchema } from '../../src/operations/latency-histogram-envelope.js';
import { validate } from '../../src/validators/index.js';

function makeEnvelope(measurements: Record<string, unknown>): Record<string, unknown> {
  return {
    envelope_kind: 'latency_histogram',
    contract_version: '8.6.0',
    ts: '2026-05-09T12:00:00Z',
    cluster_id: 'cluster-001',
    phase: 'model_call',
    measurements,
  };
}

describe('LatencyHistogramEnvelope monotonicity dispatch (PR-A3.5 iter-4 F11)', () => {
  it('schema-only validation (Value.Check) ACCEPTS p50 > p95 (constraint-level invariant invisible to schema)', () => {
    const envelope = makeEnvelope({ p50_ms: 999, p95_ms: 1, p99_ms: 1000, max_ms: 2000 });
    expect(Value.Check(LatencyHistogramEnvelopeSchema, envelope)).toBe(true);
  });

  it('integrated validate() REJECTS p50 > p95 via LHE-1 cross-field dispatch', () => {
    const envelope = makeEnvelope({ p50_ms: 999, p95_ms: 1, p99_ms: 1000, max_ms: 2000 });
    const result = validate(LatencyHistogramEnvelopeSchema, envelope);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.includes('LHE-1'))).toBe(true);
    expect(result.errors!.some((e) => e.includes('p50_ms'))).toBe(true);
    expect(result.errors!.some((e) => e.includes('p95_ms'))).toBe(true);
  });

  it('integrated validate() REJECTS p95 > p99', () => {
    const envelope = makeEnvelope({ p50_ms: 10, p95_ms: 500, p99_ms: 100, max_ms: 1000 });
    const result = validate(LatencyHistogramEnvelopeSchema, envelope);
    expect(result.valid).toBe(false);
    expect(result.errors!.some((e) => e.includes('LHE-1'))).toBe(true);
  });

  it('integrated validate() REJECTS p99 > max', () => {
    const envelope = makeEnvelope({ p50_ms: 10, p95_ms: 50, p99_ms: 1000, max_ms: 100 });
    const result = validate(LatencyHistogramEnvelopeSchema, envelope);
    expect(result.valid).toBe(false);
    expect(result.errors!.some((e) => e.includes('LHE-1'))).toBe(true);
  });

  it('integrated validate() ACCEPTS strict ascending percentiles', () => {
    const envelope = makeEnvelope({ p50_ms: 10, p95_ms: 50, p99_ms: 100, max_ms: 200 });
    const result = validate(LatencyHistogramEnvelopeSchema, envelope);
    expect(result.valid).toBe(true);
  });

  it('integrated validate() ACCEPTS all-equal percentiles (≤ inclusive)', () => {
    const envelope = makeEnvelope({ p50_ms: 0, p95_ms: 0, p99_ms: 0, max_ms: 0 });
    const result = validate(LatencyHistogramEnvelopeSchema, envelope);
    expect(result.valid).toBe(true);
  });
});
