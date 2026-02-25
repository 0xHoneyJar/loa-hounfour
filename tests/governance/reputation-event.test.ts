/**
 * Tests for ReputationEvent discriminated union (T2.4).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  ReputationEventSchema,
  QualitySignalEventSchema,
  TaskCompletedEventSchema,
  CredentialUpdateEventSchema,
  ModelPerformanceEventSchema,
  type ReputationEvent,
  type QualitySignalEvent,
  type TaskCompletedEvent,
  type CredentialUpdateEvent,
  type ModelPerformanceEvent,
} from '../../src/governance/reputation-event.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const QUALITY_SIGNAL: QualitySignalEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'bear-001',
  collection_id: 'honeycomb',
  timestamp: '2026-02-24T12:00:00Z',
  type: 'quality_signal',
  score: 0.85,
};

const TASK_COMPLETED: TaskCompletedEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440001',
  agent_id: 'bear-002',
  collection_id: 'honeycomb',
  timestamp: '2026-02-24T13:00:00Z',
  type: 'task_completed',
  task_type: 'analysis',
  success: true,
};

const CREDENTIAL_UPDATE: CredentialUpdateEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440002',
  agent_id: 'bear-003',
  collection_id: 'honeycomb',
  timestamp: '2026-02-24T14:00:00Z',
  type: 'credential_update',
  credential_id: '660e8400-e29b-41d4-a716-446655440099',
  action: 'issued',
};

const MODEL_PERFORMANCE: ModelPerformanceEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440010',
  agent_id: 'bear-001',
  collection_id: 'honeycomb',
  timestamp: '2026-02-25T12:00:00Z',
  type: 'model_performance',
  model_id: 'gpt-4o',
  provider: 'openai',
  pool_id: 'pool-alpha',
  task_type: 'analysis',
  quality_observation: {
    score: 0.82,
  },
};

describe('ReputationEvent', () => {
  // -------------------------------------------------------------------------
  // Variant 1: QualitySignalEvent
  // -------------------------------------------------------------------------
  describe('QualitySignalEvent', () => {
    it('accepts minimal quality signal', () => {
      expect(Value.Check(QualitySignalEventSchema, QUALITY_SIGNAL)).toBe(true);
    });

    it('accepts with optional task_type', () => {
      expect(Value.Check(QualitySignalEventSchema, {
        ...QUALITY_SIGNAL,
        task_type: 'code_review',
      })).toBe(true);
    });

    it('accepts with dimensions', () => {
      expect(Value.Check(QualitySignalEventSchema, {
        ...QUALITY_SIGNAL,
        dimensions: { coherence: 0.9, safety: 1.0 },
      })).toBe(true);
    });

    it('accepts with optional sequence', () => {
      expect(Value.Check(QualitySignalEventSchema, {
        ...QUALITY_SIGNAL,
        sequence: 42,
      })).toBe(true);
    });

    it('rejects score out of range', () => {
      expect(Value.Check(QualitySignalEventSchema, {
        ...QUALITY_SIGNAL,
        score: 1.5,
      })).toBe(false);
    });

    it('rejects negative score', () => {
      expect(Value.Check(QualitySignalEventSchema, {
        ...QUALITY_SIGNAL,
        score: -0.1,
      })).toBe(false);
    });

    it('validates against ReputationEventSchema', () => {
      expect(Value.Check(ReputationEventSchema, QUALITY_SIGNAL)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Variant 2: TaskCompletedEvent
  // -------------------------------------------------------------------------
  describe('TaskCompletedEvent', () => {
    it('accepts minimal task completed', () => {
      expect(Value.Check(TaskCompletedEventSchema, TASK_COMPLETED)).toBe(true);
    });

    it('accepts with duration_ms', () => {
      expect(Value.Check(TaskCompletedEventSchema, {
        ...TASK_COMPLETED,
        duration_ms: 120000,
      })).toBe(true);
    });

    it('rejects duration over 3600000', () => {
      expect(Value.Check(TaskCompletedEventSchema, {
        ...TASK_COMPLETED,
        duration_ms: 3600001,
      })).toBe(false);
    });

    it('rejects missing task_type', () => {
      const { task_type, ...noTaskType } = TASK_COMPLETED;
      expect(Value.Check(TaskCompletedEventSchema, noTaskType)).toBe(false);
    });

    it('validates against ReputationEventSchema', () => {
      expect(Value.Check(ReputationEventSchema, TASK_COMPLETED)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Variant 3: CredentialUpdateEvent
  // -------------------------------------------------------------------------
  describe('CredentialUpdateEvent', () => {
    it('accepts valid credential update', () => {
      expect(Value.Check(CredentialUpdateEventSchema, CREDENTIAL_UPDATE)).toBe(true);
    });

    it.each(['issued', 'revoked', 'renewed', 'suspended'] as const)(
      'accepts action "%s"',
      (action) => {
        expect(Value.Check(CredentialUpdateEventSchema, {
          ...CREDENTIAL_UPDATE,
          action,
        })).toBe(true);
      },
    );

    it('rejects unknown action', () => {
      expect(Value.Check(CredentialUpdateEventSchema, {
        ...CREDENTIAL_UPDATE,
        action: 'unknown_action',
      })).toBe(false);
    });

    it('validates against ReputationEventSchema', () => {
      expect(Value.Check(ReputationEventSchema, CREDENTIAL_UPDATE)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Variant 4: ModelPerformanceEvent (v8.2.0, Issue #38)
  // -------------------------------------------------------------------------
  describe('ModelPerformanceEvent', () => {
    it('accepts minimal model performance event', () => {
      expect(Value.Check(ModelPerformanceEventSchema, MODEL_PERFORMANCE)).toBe(true);
    });

    it('accepts with all optional fields', () => {
      const full: ModelPerformanceEvent = {
        ...MODEL_PERFORMANCE,
        sequence: 10,
        quality_observation: {
          score: 0.91,
          dimensions: { coherence: 0.95, safety: 0.99 },
          latency_ms: 2340,
          evaluated_by: 'dixie-eval-v2',
        },
        request_context: {
          request_id: '660e8400-e29b-41d4-a716-446655440020',
          delegation_id: '770e8400-e29b-41d4-a716-446655440030',
        },
      };
      expect(Value.Check(ModelPerformanceEventSchema, full)).toBe(true);
    });

    it('accepts community task_type (namespace:type)', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        task_type: 'legal-guild:contract_review',
      })).toBe(true);
    });

    it('accepts request_context with only request_id', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        request_context: {
          request_id: '660e8400-e29b-41d4-a716-446655440020',
        },
      })).toBe(true);
    });

    it('rejects score out of range', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        quality_observation: { score: 1.5 },
      })).toBe(false);
    });

    it('rejects negative score', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        quality_observation: { score: -0.1 },
      })).toBe(false);
    });

    it('rejects missing model_id', () => {
      const { model_id, ...noModelId } = MODEL_PERFORMANCE;
      expect(Value.Check(ModelPerformanceEventSchema, noModelId)).toBe(false);
    });

    it('rejects missing provider', () => {
      const { provider, ...noProvider } = MODEL_PERFORMANCE;
      expect(Value.Check(ModelPerformanceEventSchema, noProvider)).toBe(false);
    });

    it('rejects missing pool_id', () => {
      const { pool_id, ...noPoolId } = MODEL_PERFORMANCE;
      expect(Value.Check(ModelPerformanceEventSchema, noPoolId)).toBe(false);
    });

    it('rejects missing task_type', () => {
      const { task_type, ...noTaskType } = MODEL_PERFORMANCE;
      expect(Value.Check(ModelPerformanceEventSchema, noTaskType)).toBe(false);
    });

    it('rejects missing quality_observation', () => {
      const { quality_observation, ...noObs } = MODEL_PERFORMANCE;
      expect(Value.Check(ModelPerformanceEventSchema, noObs)).toBe(false);
    });

    it('rejects empty model_id', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        model_id: '',
      })).toBe(false);
    });

    it('rejects model_id exceeding maxLength', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        model_id: 'x'.repeat(256),
      })).toBe(false);
    });

    it('rejects provider exceeding maxLength', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        provider: 'x'.repeat(256),
      })).toBe(false);
    });

    it('rejects pool_id exceeding maxLength', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        pool_id: 'x'.repeat(256),
      })).toBe(false);
    });

    it('accepts empty request_context', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        request_context: {},
      })).toBe(true);
    });

    it('rejects additional top-level property', () => {
      expect(Value.Check(ModelPerformanceEventSchema, {
        ...MODEL_PERFORMANCE,
        unknown_field: 'should_fail',
      })).toBe(false);
    });

    it('validates against ReputationEventSchema', () => {
      expect(Value.Check(ReputationEventSchema, MODEL_PERFORMANCE)).toBe(true);
    });

    it('type narrows correctly via discriminator', () => {
      const event: ReputationEvent = MODEL_PERFORMANCE;
      if (event.type === 'model_performance') {
        // TypeScript should narrow to ModelPerformanceEvent
        expect(event.model_id).toBe('gpt-4o');
        expect(event.provider).toBe('openai');
        expect(event.quality_observation.score).toBe(0.82);
      } else {
        throw new Error('Expected model_performance type');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Cross-variant rejection (Flatline SKP-003)
  // -------------------------------------------------------------------------
  describe('cross-variant rejection', () => {
    it('rejects quality_signal payload on task_completed type', () => {
      const mixed = {
        ...QUALITY_SIGNAL,
        type: 'task_completed',
        // quality_signal has score but task_completed doesn't
      };
      expect(Value.Check(TaskCompletedEventSchema, mixed)).toBe(false);
    });

    it('rejects task_completed payload on quality_signal type', () => {
      const mixed = {
        ...TASK_COMPLETED,
        type: 'quality_signal',
        // task_completed has success but quality_signal doesn't
      };
      expect(Value.Check(QualitySignalEventSchema, mixed)).toBe(false);
    });

    it('rejects credential_update payload on quality_signal type', () => {
      const mixed = {
        ...CREDENTIAL_UPDATE,
        type: 'quality_signal',
      };
      expect(Value.Check(QualitySignalEventSchema, mixed)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Union-level rejection
  // -------------------------------------------------------------------------
  describe('union rejection', () => {
    it('rejects unknown type', () => {
      expect(Value.Check(ReputationEventSchema, {
        ...QUALITY_SIGNAL,
        type: 'future_event',
      })).toBe(false);
    });

    it('rejects missing agent_id', () => {
      const { agent_id, ...noAgent } = QUALITY_SIGNAL;
      expect(Value.Check(ReputationEventSchema, noAgent)).toBe(false);
    });

    it('rejects missing collection_id', () => {
      const { collection_id, ...noColl } = QUALITY_SIGNAL;
      expect(Value.Check(ReputationEventSchema, noColl)).toBe(false);
    });

    it('rejects missing event_id', () => {
      const { event_id, ...noId } = QUALITY_SIGNAL;
      expect(Value.Check(ReputationEventSchema, noId)).toBe(false);
    });

    it('rejects missing timestamp', () => {
      const { timestamp, ...noTs } = QUALITY_SIGNAL;
      expect(Value.Check(ReputationEventSchema, noTs)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Schema metadata
  // -------------------------------------------------------------------------
  describe('schema metadata', () => {
    it('has $id "ReputationEvent"', () => {
      expect(ReputationEventSchema.$id).toBe('ReputationEvent');
    });

    it('each variant has additionalProperties false', () => {
      expect(QualitySignalEventSchema.additionalProperties).toBe(false);
      expect(TaskCompletedEventSchema.additionalProperties).toBe(false);
      expect(CredentialUpdateEventSchema.additionalProperties).toBe(false);
      expect(ModelPerformanceEventSchema.additionalProperties).toBe(false);
    });

    it('union has 4 members', () => {
      expect(ReputationEventSchema.anyOf).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // Conformance vectors
  // -------------------------------------------------------------------------
  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/reputation-event');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 15 vectors', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(15);
    });

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(ReputationEventSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
