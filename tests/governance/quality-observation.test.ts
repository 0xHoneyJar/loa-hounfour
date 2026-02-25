/**
 * Tests for QualityObservation sub-schema.
 *
 * @see Issue #38 — model_performance variant
 * @since v8.2.0
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  QualityObservationSchema,
  type QualityObservation,
} from '../../src/governance/quality-observation.js';

const MINIMAL: QualityObservation = {
  score: 0.82,
};

const FULL: QualityObservation = {
  score: 0.91,
  dimensions: {
    coherence: 0.95,
    safety: 0.99,
    relevance: 0.88,
  },
  latency_ms: 2340,
  evaluated_by: 'dixie-eval-v2',
};

describe('QualityObservation', () => {
  it('has $id "QualityObservation"', () => {
    expect(QualityObservationSchema.$id).toBe('QualityObservation');
  });

  it('has additionalProperties false', () => {
    expect(QualityObservationSchema.additionalProperties).toBe(false);
  });

  it('accepts minimal (score only)', () => {
    expect(Value.Check(QualityObservationSchema, MINIMAL)).toBe(true);
  });

  it('accepts full (all optional fields)', () => {
    expect(Value.Check(QualityObservationSchema, FULL)).toBe(true);
  });

  it('accepts score at boundary 0', () => {
    expect(Value.Check(QualityObservationSchema, { score: 0 })).toBe(true);
  });

  it('accepts score at boundary 1', () => {
    expect(Value.Check(QualityObservationSchema, { score: 1 })).toBe(true);
  });

  it('rejects score above 1', () => {
    expect(Value.Check(QualityObservationSchema, { score: 1.01 })).toBe(false);
  });

  it('rejects negative score', () => {
    expect(Value.Check(QualityObservationSchema, { score: -0.1 })).toBe(false);
  });

  it('rejects missing score', () => {
    expect(Value.Check(QualityObservationSchema, {})).toBe(false);
  });

  describe('dimensions', () => {
    it('accepts valid dimension keys', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: { coherence: 0.9, safety_v2: 0.95 },
      })).toBe(true);
    });

    it('rejects dimension key starting with uppercase', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: { Coherence: 0.9 },
      })).toBe(false);
    });

    it('rejects dimension key starting with digit', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: { '1coherence': 0.9 },
      })).toBe(false);
    });

    it('rejects dimension value above 1', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: { coherence: 1.5 },
      })).toBe(false);
    });

    it('rejects dimension value below 0', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: { coherence: -0.1 },
      })).toBe(false);
    });

    it('rejects more than 20 dimensions', () => {
      const dims: Record<string, number> = {};
      for (let i = 0; i < 21; i++) {
        dims[`dim_${String(i).padStart(2, '0')}`] = 0.5;
      }
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: dims,
      })).toBe(false);
    });

    it('accepts exactly 20 dimensions', () => {
      const dims: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        dims[`dim_${String(i).padStart(2, '0')}`] = 0.5;
      }
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        dimensions: dims,
      })).toBe(true);
    });
  });

  describe('latency_ms', () => {
    it('accepts zero latency', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        latency_ms: 0,
      })).toBe(true);
    });

    it('accepts large latency', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        latency_ms: 60000,
      })).toBe(true);
    });

    it('rejects negative latency', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        latency_ms: -1,
      })).toBe(false);
    });

    it('rejects non-integer latency', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        latency_ms: 1.5,
      })).toBe(false);
    });
  });

  describe('evaluated_by', () => {
    it('accepts non-empty string', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        evaluated_by: 'dixie-eval',
      })).toBe(true);
    });

    it('rejects empty string', () => {
      expect(Value.Check(QualityObservationSchema, {
        score: 0.8,
        evaluated_by: '',
      })).toBe(false);
    });
  });

  it('rejects additional properties', () => {
    expect(Value.Check(QualityObservationSchema, {
      score: 0.8,
      unknown_field: 'should fail',
    })).toBe(false);
  });
});
