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
  type ReputationEvent,
  type QualitySignalEvent,
  type TaskCompletedEvent,
  type CredentialUpdateEvent,
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
    });
  });

  // -------------------------------------------------------------------------
  // Conformance vectors
  // -------------------------------------------------------------------------
  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/reputation-event');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 7 vectors', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(7);
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
