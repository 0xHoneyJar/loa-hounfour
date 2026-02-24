/**
 * Tests for TaskTypeCohort schema and validateTaskCohortUniqueness (T1.7).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time)
import {
  TaskTypeCohortSchema,
  validateTaskCohortUniqueness,
  type TaskTypeCohort,
} from '../../src/governance/task-type-cohort.js';
import { ModelCohortSchema } from '../../src/governance/reputation-aggregate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const VALID_COHORT: TaskTypeCohort = {
  model_id: 'native',
  personal_score: 0.85,
  sample_count: 42,
  last_updated: '2026-02-24T10:00:00Z',
  task_type: 'code_review',
};

const COLD_COHORT: TaskTypeCohort = {
  model_id: 'gpt-4o',
  personal_score: null,
  sample_count: 0,
  last_updated: '2026-02-24T08:00:00Z',
  task_type: 'analysis',
};

describe('TaskTypeCohort', () => {
  // -------------------------------------------------------------------------
  // Schema validation
  // -------------------------------------------------------------------------
  describe('valid instances', () => {
    it('accepts full cohort', () => {
      expect(Value.Check(TaskTypeCohortSchema, VALID_COHORT)).toBe(true);
    });

    it('accepts cold cohort (null score, zero samples)', () => {
      expect(Value.Check(TaskTypeCohortSchema, COLD_COHORT)).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects missing task_type', () => {
      const { task_type, ...noTaskType } = VALID_COHORT;
      expect(Value.Check(TaskTypeCohortSchema, noTaskType)).toBe(false);
    });

    it('rejects invalid task_type (no namespace)', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, task_type: 'unknown' })).toBe(false);
    });

    it('accepts community-defined task_type', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, task_type: 'legal-guild:contract_review' })).toBe(true);
    });

    it('rejects missing model_id', () => {
      const { model_id, ...noModelId } = VALID_COHORT;
      expect(Value.Check(TaskTypeCohortSchema, noModelId)).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, extra: true })).toBe(false);
    });

    it('rejects score out of range', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, personal_score: 1.5 })).toBe(false);
    });

    it('rejects negative sample_count', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, sample_count: -1 })).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // confidence_threshold (v7.11.0, Bridgebuilder Meditation V Q3)
  // -------------------------------------------------------------------------
  describe('confidence_threshold', () => {
    it('accepts cohort with confidence_threshold', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, confidence_threshold: 30 })).toBe(true);
    });

    it('accepts cohort without confidence_threshold (optional)', () => {
      expect(Value.Check(TaskTypeCohortSchema, VALID_COHORT)).toBe(true);
    });

    it('rejects confidence_threshold of 0', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, confidence_threshold: 0 })).toBe(false);
    });

    it('rejects negative confidence_threshold', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, confidence_threshold: -1 })).toBe(false);
    });

    it('rejects non-integer confidence_threshold', () => {
      expect(Value.Check(TaskTypeCohortSchema, { ...VALID_COHORT, confidence_threshold: 30.5 })).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Superset test (SDD §7.3 — R1 mitigation)
  // -------------------------------------------------------------------------
  describe('superset of ModelCohort', () => {
    it('all ModelCohort property keys are present in TaskTypeCohort', () => {
      const modelCohortKeys = Object.keys(ModelCohortSchema.properties);
      const taskCohortKeys = Object.keys(TaskTypeCohortSchema.properties);

      for (const key of modelCohortKeys) {
        expect(taskCohortKeys).toContain(key);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Schema metadata
  // -------------------------------------------------------------------------
  describe('schema metadata', () => {
    it('has $id "TaskTypeCohort"', () => {
      expect(TaskTypeCohortSchema.$id).toBe('TaskTypeCohort');
    });

    it('has additionalProperties false', () => {
      expect(TaskTypeCohortSchema.additionalProperties).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Flat JSON Schema (Flatline SKP-002)
  // -------------------------------------------------------------------------
  describe('flat JSON Schema output', () => {
    it('has a properties block (not wrapped in allOf)', () => {
      expect(TaskTypeCohortSchema.properties).toBeDefined();
      expect(typeof TaskTypeCohortSchema.properties).toBe('object');
      // If allOf is present, the schema is not flat
      expect((TaskTypeCohortSchema as Record<string, unknown>).allOf).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // validateTaskCohortUniqueness
  // -------------------------------------------------------------------------
  describe('validateTaskCohortUniqueness', () => {
    it('returns empty array for unique pairs', () => {
      const result = validateTaskCohortUniqueness([
        { model_id: 'native', task_type: 'code_review' },
        { model_id: 'native', task_type: 'analysis' },
        { model_id: 'gpt-4o', task_type: 'code_review' },
      ]);
      expect(result).toEqual([]);
    });

    it('detects duplicate (model_id, task_type) pairs', () => {
      const result = validateTaskCohortUniqueness([
        { model_id: 'native', task_type: 'code_review' },
        { model_id: 'gpt-4o', task_type: 'analysis' },
        { model_id: 'native', task_type: 'code_review' },
      ]);
      expect(result).toEqual(['native:code_review']);
    });

    it('detects multiple duplicates', () => {
      const result = validateTaskCohortUniqueness([
        { model_id: 'a', task_type: 'analysis' },
        { model_id: 'b', task_type: 'general' },
        { model_id: 'a', task_type: 'analysis' },
        { model_id: 'b', task_type: 'general' },
      ]);
      expect(result).toHaveLength(2);
      expect(result).toContain('a:analysis');
      expect(result).toContain('b:general');
    });

    it('returns empty for empty input', () => {
      expect(validateTaskCohortUniqueness([])).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Conformance vectors
  // -------------------------------------------------------------------------
  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/task-type-cohort');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 5 vectors', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(5);
    });

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(TaskTypeCohortSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
