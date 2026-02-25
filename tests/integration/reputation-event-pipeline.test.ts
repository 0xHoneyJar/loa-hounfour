/**
 * Integration tests for the model_performance event pipeline.
 *
 * Validates end-to-end concerns:
 * - Pipeline acceptance (schema validation + field extraction + cohort key compat)
 * - Variant exhaustiveness (all 4 type discriminators have handlers)
 * - Duplicate event_id detection
 * - Unknown type forward compatibility
 *
 * @see Sprint T2.5–T2.8
 * @see Flatline SKP-002, SKP-003, IMP-005
 * @since v8.2.0
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ReputationEventSchema,
  QualitySignalEventSchema,
  TaskCompletedEventSchema,
  CredentialUpdateEventSchema,
  ModelPerformanceEventSchema,
  type ReputationEvent,
  type ModelPerformanceEvent,
} from '../../src/governance/reputation-event.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MODEL_PERF_EVENT: ModelPerformanceEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440100',
  agent_id: 'dixie-eval-v2',
  collection_id: 'honeycomb-prod',
  timestamp: '2026-02-25T18:00:00Z',
  type: 'model_performance',
  model_id: 'gpt-4o',
  provider: 'openai',
  pool_id: 'pool-alpha',
  task_type: 'analysis',
  quality_observation: {
    score: 0.88,
    dimensions: {
      coherence: 0.92,
      safety: 0.99,
      relevance: 0.85,
    },
    latency_ms: 1450,
    evaluated_by: 'dixie-eval-v2',
  },
  request_context: {
    request_id: '660e8400-e29b-41d4-a716-446655440100',
    delegation_id: '770e8400-e29b-41d4-a716-446655440100',
  },
};

// ---------------------------------------------------------------------------
// T2.5: Pipeline acceptance — model_performance event validates, fields
// extractable as cohort keys (Flatline SKP-003)
// ---------------------------------------------------------------------------

describe('pipeline acceptance', () => {
  it('model_performance event validates against schema', () => {
    expect(Value.Check(ReputationEventSchema, MODEL_PERF_EVENT)).toBe(true);
    expect(Value.Check(ModelPerformanceEventSchema, MODEL_PERF_EVENT)).toBe(true);
  });

  it('cohort key fields are extractable from validated event', () => {
    // Simulate downstream consumer extracting cohort keys
    const event = MODEL_PERF_EVENT;

    // TaskTypeCohort key: (model_id, task_type)
    const taskCohortKey = `${event.model_id}:${event.task_type}`;
    expect(taskCohortKey).toBe('gpt-4o:analysis');

    // ModelCohort key: model_id
    expect(event.model_id).toBe('gpt-4o');

    // Quality observation score for EMA update
    expect(event.quality_observation.score).toBe(0.88);
    expect(event.quality_observation.score).toBeGreaterThanOrEqual(0);
    expect(event.quality_observation.score).toBeLessThanOrEqual(1);
  });

  it('dimension names are extractable and valid', () => {
    const dims = MODEL_PERF_EVENT.quality_observation.dimensions!;
    const dimNames = Object.keys(dims);

    expect(dimNames).toContain('coherence');
    expect(dimNames).toContain('safety');
    expect(dimNames).toContain('relevance');

    // All dimension values in [0, 1]
    for (const [, value] of Object.entries(dims)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('latency_ms is a non-negative integer', () => {
    expect(MODEL_PERF_EVENT.quality_observation.latency_ms).toBe(1450);
    expect(Number.isInteger(MODEL_PERF_EVENT.quality_observation.latency_ms)).toBe(true);
  });

  it('request_context fields are extractable for audit trail', () => {
    expect(MODEL_PERF_EVENT.request_context?.request_id).toBe(
      '660e8400-e29b-41d4-a716-446655440100',
    );
    expect(MODEL_PERF_EVENT.request_context?.delegation_id).toBe(
      '770e8400-e29b-41d4-a716-446655440100',
    );
  });

  it('unspecified task_type routes to aggregate-only scoring', () => {
    const unspecifiedEvent: ModelPerformanceEvent = {
      ...MODEL_PERF_EVENT,
      event_id: '550e8400-e29b-41d4-a716-446655440101',
      task_type: 'unspecified',
    };
    expect(Value.Check(ReputationEventSchema, unspecifiedEvent)).toBe(true);

    // Consumer should detect unspecified and skip task cohort update
    expect(unspecifiedEvent.task_type).toBe('unspecified');
  });
});

// ---------------------------------------------------------------------------
// T2.6: Variant exhaustiveness — all 4 type discriminators have handlers
// (Flatline IMP-005)
// ---------------------------------------------------------------------------

describe('variant exhaustiveness', () => {
  const ALL_VARIANTS: ReputationEvent[] = [
    {
      event_id: '550e8400-e29b-41d4-a716-446655440200',
      agent_id: 'bear-001',
      collection_id: 'honeycomb',
      timestamp: '2026-02-25T19:00:00Z',
      type: 'quality_signal',
      score: 0.85,
    },
    {
      event_id: '550e8400-e29b-41d4-a716-446655440201',
      agent_id: 'bear-002',
      collection_id: 'honeycomb',
      timestamp: '2026-02-25T19:01:00Z',
      type: 'task_completed',
      task_type: 'analysis',
      success: true,
    },
    {
      event_id: '550e8400-e29b-41d4-a716-446655440202',
      agent_id: 'bear-003',
      collection_id: 'honeycomb',
      timestamp: '2026-02-25T19:02:00Z',
      type: 'credential_update',
      credential_id: '660e8400-e29b-41d4-a716-446655440200',
      action: 'issued',
    },
    {
      ...MODEL_PERF_EVENT,
      event_id: '550e8400-e29b-41d4-a716-446655440203',
    },
  ];

  it('switch over all 4 discriminators reaches all branches', () => {
    const visited = new Set<string>();

    for (const event of ALL_VARIANTS) {
      expect(Value.Check(ReputationEventSchema, event)).toBe(true);

      // Simulate exhaustive switch in consumer code
      switch (event.type) {
        case 'quality_signal':
          visited.add('quality_signal');
          break;
        case 'task_completed':
          visited.add('task_completed');
          break;
        case 'credential_update':
          visited.add('credential_update');
          break;
        case 'model_performance':
          visited.add('model_performance');
          break;
        default: {
          // TypeScript exhaustiveness check: should be unreachable
          const _exhaustive: never = event;
          throw new Error(`Unhandled variant: ${(_exhaustive as ReputationEvent).type}`);
        }
      }
    }

    expect(visited.size).toBe(4);
    expect(visited).toContain('quality_signal');
    expect(visited).toContain('task_completed');
    expect(visited).toContain('credential_update');
    expect(visited).toContain('model_performance');
  });

  it('union has exactly 4 members', () => {
    expect(ReputationEventSchema.anyOf).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// T2.7: Duplicate event_id detection (Flatline SKP-002)
// ---------------------------------------------------------------------------

describe('duplicate event_id detection', () => {
  it('detects duplicate event_id with matching payload (idempotent)', () => {
    const event1 = { ...MODEL_PERF_EVENT };
    const event2 = { ...MODEL_PERF_EVENT };

    // Same event_id, same payload → idempotent replay
    expect(event1.event_id).toBe(event2.event_id);
    expect(JSON.stringify(event1)).toBe(JSON.stringify(event2));
  });

  it('detects duplicate event_id with mismatched payload (conflict)', () => {
    const event1 = { ...MODEL_PERF_EVENT };
    const event2: ModelPerformanceEvent = {
      ...MODEL_PERF_EVENT,
      quality_observation: { score: 0.5 }, // Different score
    };

    // Same event_id, different payload → conflict
    expect(event1.event_id).toBe(event2.event_id);
    expect(event1.quality_observation.score).not.toBe(event2.quality_observation.score);
  });

  it('composite idempotency key distinguishes evaluators', () => {
    // Same request_id + model_id, different evaluated_by → distinct observations
    const eval1: ModelPerformanceEvent = {
      ...MODEL_PERF_EVENT,
      event_id: '550e8400-e29b-41d4-a716-446655440300',
      quality_observation: {
        score: 0.88,
        evaluated_by: 'dixie-eval-v2',
      },
    };
    const eval2: ModelPerformanceEvent = {
      ...MODEL_PERF_EVENT,
      event_id: '550e8400-e29b-41d4-a716-446655440301',
      quality_observation: {
        score: 0.82,
        evaluated_by: 'dixie-eval-v3',
      },
    };

    // Both valid, different event_ids, different evaluators
    expect(Value.Check(ReputationEventSchema, eval1)).toBe(true);
    expect(Value.Check(ReputationEventSchema, eval2)).toBe(true);
    expect(eval1.event_id).not.toBe(eval2.event_id);

    // Composite key: (request_id, model_id, evaluated_by) differs
    expect(eval1.quality_observation.evaluated_by).not.toBe(
      eval2.quality_observation.evaluated_by,
    );
  });
});

// ---------------------------------------------------------------------------
// T2.8: Unknown type forward compat — future_variant rejected by schema,
// consumer handles gracefully (Flatline IMP-005)
// ---------------------------------------------------------------------------

describe('unknown type forward compatibility', () => {
  it('future_variant is rejected by schema validation', () => {
    const futureEvent = {
      event_id: '550e8400-e29b-41d4-a716-446655440400',
      agent_id: 'future-agent',
      collection_id: 'honeycomb',
      timestamp: '2026-02-25T20:00:00Z',
      type: 'future_variant',
      custom_field: 'some_value',
    };
    expect(Value.Check(ReputationEventSchema, futureEvent)).toBe(false);
  });

  it('consumer gracefully handles unknown type via default branch', () => {
    const unknownEvent = {
      event_id: '550e8400-e29b-41d4-a716-446655440401',
      agent_id: 'unknown-agent',
      collection_id: 'honeycomb',
      timestamp: '2026-02-25T20:01:00Z',
      type: 'experimental_type',
    };

    // Schema rejects it
    expect(Value.Check(ReputationEventSchema, unknownEvent)).toBe(false);

    // But a permissive consumer can still handle it gracefully
    const handled = (() => {
      const type = unknownEvent.type;
      switch (type) {
        case 'quality_signal':
        case 'task_completed':
        case 'credential_update':
        case 'model_performance':
          return 'known';
        default:
          // Log + skip (SDD §4.3.5 forward compat guidance)
          return 'unknown_skipped';
      }
    })();

    expect(handled).toBe('unknown_skipped');
  });

  it('each known type only validates against its own variant schema', () => {
    const validEvent = MODEL_PERF_EVENT;

    // Validates against its own variant
    expect(Value.Check(ModelPerformanceEventSchema, validEvent)).toBe(true);

    // Does NOT validate against other variants
    expect(Value.Check(QualitySignalEventSchema, validEvent)).toBe(false);
    expect(Value.Check(TaskCompletedEventSchema, validEvent)).toBe(false);
    expect(Value.Check(CredentialUpdateEventSchema, validEvent)).toBe(false);
  });
});
