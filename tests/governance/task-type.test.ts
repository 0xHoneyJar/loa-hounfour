/**
 * Tests for TaskType schema and TASK_TYPES array (T1.7).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { TaskTypeSchema, TASK_TYPES, type TaskType } from '../../src/governance/task-type.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('TaskType', () => {
  // -------------------------------------------------------------------------
  // Per-value validation
  // -------------------------------------------------------------------------
  describe('valid values', () => {
    it.each([
      'code_review',
      'creative_writing',
      'analysis',
      'summarization',
      'general',
    ] satisfies TaskType[])('accepts "%s"', (value) => {
      expect(Value.Check(TaskTypeSchema, value)).toBe(true);
    });
  });

  // v7.11.0 — Community-defined types (ADR-003)
  describe('community-defined types (namespace:type)', () => {
    it('accepts "legal-guild:contract_review"', () => {
      expect(Value.Check(TaskTypeSchema, 'legal-guild:contract_review')).toBe(true);
    });

    it('accepts "data-ops:etl_pipeline"', () => {
      expect(Value.Check(TaskTypeSchema, 'data-ops:etl_pipeline')).toBe(true);
    });

    it('rejects uppercase namespace "Legal:review"', () => {
      expect(Value.Check(TaskTypeSchema, 'Legal:review')).toBe(false);
    });

    it('rejects missing namespace "contract_review"', () => {
      expect(Value.Check(TaskTypeSchema, 'contract_review')).toBe(false);
    });

    it('rejects empty namespace ":review"', () => {
      expect(Value.Check(TaskTypeSchema, ':review')).toBe(false);
    });

    it('rejects empty type "guild:"', () => {
      expect(Value.Check(TaskTypeSchema, 'guild:')).toBe(false);
    });
  });

  describe('invalid values', () => {
    it('rejects unknown string "future_type"', () => {
      expect(Value.Check(TaskTypeSchema, 'future_type')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(Value.Check(TaskTypeSchema, '')).toBe(false);
    });

    it('rejects number', () => {
      expect(Value.Check(TaskTypeSchema, 42)).toBe(false);
    });

    it('rejects null', () => {
      expect(Value.Check(TaskTypeSchema, null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(Value.Check(TaskTypeSchema, undefined)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // TASK_TYPES array
  // -------------------------------------------------------------------------
  describe('TASK_TYPES', () => {
    it('has exactly 6 entries', () => {
      expect(TASK_TYPES).toHaveLength(6);
    });

    it('all entries are valid TaskType values', () => {
      for (const t of TASK_TYPES) {
        expect(Value.Check(TaskTypeSchema, t)).toBe(true);
      }
    });

    it('has no duplicates', () => {
      const unique = new Set(TASK_TYPES);
      expect(unique.size).toBe(TASK_TYPES.length);
    });
  });

  // -------------------------------------------------------------------------
  // Schema metadata
  // -------------------------------------------------------------------------
  describe('schema metadata', () => {
    it('has $id "TaskType"', () => {
      expect(TaskTypeSchema.$id).toBe('TaskType');
    });
  });

  // -------------------------------------------------------------------------
  // Conformance vectors
  // -------------------------------------------------------------------------
  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/task-type');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 12 vectors', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(12);
    });

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        // TaskType is a scalar schema; conformance vectors wrap input as { value: ... }
        const input = vector.input.value ?? vector.input;
        const result = Value.Check(TaskTypeSchema, input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
