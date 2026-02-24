/**
 * Tests for ScoringPathLog and ScoringPath schemas (T3.7).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ScoringPathSchema,
  ScoringPathLogSchema,
  type ScoringPath,
  type ScoringPathLog,
} from '../../src/governance/scoring-path-log.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('ScoringPath', () => {
  it.each(['task_cohort', 'aggregate', 'tier_default'] satisfies ScoringPath[])(
    'accepts "%s"',
    (value) => {
      expect(Value.Check(ScoringPathSchema, value)).toBe(true);
    },
  );

  it('rejects unknown path', () => {
    expect(Value.Check(ScoringPathSchema, 'unknown')).toBe(false);
  });

  it('has $id "ScoringPath"', () => {
    expect(ScoringPathSchema.$id).toBe('ScoringPath');
  });
});

describe('ScoringPathLog', () => {
  describe('valid instances', () => {
    it('accepts full log with all fields', () => {
      const log: ScoringPathLog = {
        path: 'task_cohort',
        model_id: 'native',
        task_type: 'code_review',
        reason: 'Task cohort data available',
      };
      expect(Value.Check(ScoringPathLogSchema, log)).toBe(true);
    });

    it('accepts minimal log (path only)', () => {
      expect(Value.Check(ScoringPathLogSchema, { path: 'tier_default' })).toBe(true);
    });

    it('accepts aggregate path with model_id', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'aggregate',
        model_id: 'gpt-4o',
      })).toBe(true);
    });

    // v7.11.0 — Hash chain fields (Bridgebuilder Meditation III)
    it('accepts log with hash chain fields', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'task_cohort',
        model_id: 'native',
        task_type: 'code_review',
        scored_at: '2026-02-24T15:00:00Z',
        entry_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        previous_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      })).toBe(true);
    });

    it('accepts log without hash chain fields (backward compatible)', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'aggregate',
        model_id: 'gpt-4o',
        reason: 'No task cohort data',
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects invalid path', () => {
      expect(Value.Check(ScoringPathLogSchema, { path: 'unknown' })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(ScoringPathLogSchema, { path: 'aggregate', extra: true })).toBe(false);
    });

    it('rejects reason over 500 chars', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'tier_default',
        reason: 'x'.repeat(501),
      })).toBe(false);
    });

    it('rejects entry_hash without sha256: prefix', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'aggregate',
        model_id: 'gpt-4o',
        scored_at: '2026-02-24T15:00:00Z',
        entry_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        previous_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      })).toBe(false);
    });

    it('rejects entry_hash with wrong length', () => {
      expect(Value.Check(ScoringPathLogSchema, {
        path: 'aggregate',
        model_id: 'gpt-4o',
        scored_at: '2026-02-24T15:00:00Z',
        entry_hash: 'sha256:abc123',
        previous_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "ScoringPathLog"', () => {
      expect(ScoringPathLogSchema.$id).toBe('ScoringPathLog');
    });

    it('has additionalProperties false', () => {
      expect(ScoringPathLogSchema.additionalProperties).toBe(false);
    });
  });

  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/scoring-path-log');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 6 vectors', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(6);
    });

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(ScoringPathLogSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
