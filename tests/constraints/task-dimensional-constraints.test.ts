/**
 * Constraint enforcement integration tests for v7.10.0 Task-Dimensional schemas.
 *
 * Validates that all new and modified constraint files:
 * 1. Parse as valid ConstraintFile JSON
 * 2. Have correct schema_id and contract_version
 * 3. Contain expressions that pass grammar validation
 * 4. Have non-empty fields arrays
 * 5. Evaluate correctly against sample data via the evaluator
 *
 * @see T3.7b — Constraint Harness (v7.10.0)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExpression } from '../../src/constraints/grammar.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import type { ConstraintFile, Constraint } from '../../src/constraints/types.js';
import { expressionVersionSupported } from '../../src/constraints/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constraintsDir = join(__dirname, '..', '..', 'constraints');

function loadConstraints(schemaId: string): ConstraintFile {
  const filePath = join(constraintsDir, `${schemaId}.constraints.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as ConstraintFile;
}

function evalById(file: ConstraintFile, id: string, data: Record<string, unknown>): boolean {
  const c = file.constraints.find((c) => c.id === id);
  if (!c) throw new Error(`Constraint ${id} not found in ${file.schema_id}`);
  return evaluateConstraint(data, c.expression);
}

// ─── Structural validation for all v7.10.0 constraint files ─────────────────

const NEW_SCHEMA_IDS = ['TaskType', 'TaskTypeCohort', 'ReputationEvent', 'ScoringPathLog'] as const;

describe('v7.10.0 constraint file structure', () => {
  for (const schemaId of NEW_SCHEMA_IDS) {
    describe(schemaId, () => {
      const file = loadConstraints(schemaId);

      it('has correct $schema', () => {
        expect(file.$schema).toBe('https://loa-hounfour.dev/schemas/constraint-file.json');
      });

      it('has matching schema_id', () => {
        expect(file.schema_id).toBe(schemaId);
      });

      it('has contract_version 7.10.0', () => {
        expect(file.contract_version).toBe('7.10.0');
      });

      it('has supported expression_version', () => {
        expect(expressionVersionSupported(file.expression_version)).toBe(true);
      });

      it('has non-empty constraints array', () => {
        expect(file.constraints.length).toBeGreaterThan(0);
      });

      it('has origin field', () => {
        expect(file.origin).toBe('genesis');
      });

      for (const constraint of file.constraints) {
        describe(`constraint "${constraint.id}"`, () => {
          it('has non-empty fields array', () => {
            expect(constraint.fields.length).toBeGreaterThan(0);
          });

          it('has valid expression grammar', () => {
            const result = validateExpression(constraint.expression);
            expect(result.valid).toBe(true);
          });

          it('has severity error, warning, or info', () => {
            expect(['error', 'warning', 'info']).toContain(constraint.severity);
          });

          it('has non-empty message', () => {
            expect(constraint.message.length).toBeGreaterThan(0);
          });
        });
      }
    });
  }
});

// ─── TaskType constraint evaluation ─────────────────────────────────────────

describe('TaskType constraint evaluation', () => {
  const file = loadConstraints('TaskType');

  it('accepts valid task types', () => {
    for (const value of ['code_review', 'creative_writing', 'analysis', 'summarization', 'general']) {
      expect(evalById(file, 'task-type-closed-set', { value })).toBe(true);
    }
  });

  it('rejects invalid task type', () => {
    expect(evalById(file, 'task-type-closed-set', { value: 'unknown' })).toBe(false);
  });
});

// ─── TaskTypeCohort constraint evaluation ───────────────────────────────────

describe('TaskTypeCohort constraint evaluation', () => {
  const file = loadConstraints('TaskTypeCohort');

  it('accepts valid score', () => {
    expect(evalById(file, 'task-cohort-score-bounds', { personal_score: 0.85 })).toBe(true);
  });

  it('accepts null score', () => {
    expect(evalById(file, 'task-cohort-score-bounds', { personal_score: null })).toBe(true);
  });

  it('rejects score > 1', () => {
    expect(evalById(file, 'task-cohort-score-bounds', { personal_score: 1.5 })).toBe(false);
  });

  it('accepts non-negative sample_count', () => {
    expect(evalById(file, 'task-cohort-sample-nonneg', { sample_count: 0 })).toBe(true);
  });

  it('accepts valid task_type', () => {
    expect(evalById(file, 'task-cohort-task-type-valid', { task_type: 'analysis' })).toBe(true);
  });

  it('rejects invalid task_type', () => {
    expect(evalById(file, 'task-cohort-task-type-valid', { task_type: 'magic' })).toBe(false);
  });
});

// ─── ReputationEvent constraint evaluation ──────────────────────────────────

describe('ReputationEvent constraint evaluation', () => {
  const file = loadConstraints('ReputationEvent');

  it('accepts valid event types', () => {
    for (const type of ['quality_signal', 'task_completed', 'credential_update']) {
      expect(evalById(file, 'reputation-event-type-valid', { type })).toBe(true);
    }
  });

  it('rejects invalid event type', () => {
    expect(evalById(file, 'reputation-event-type-valid', { type: 'unknown' })).toBe(false);
  });

  it('accepts quality_signal with valid score', () => {
    expect(evalById(file, 'reputation-event-score-bounds', { type: 'quality_signal', score: 0.75 })).toBe(true);
  });

  it('rejects quality_signal with score > 1', () => {
    expect(evalById(file, 'reputation-event-score-bounds', { type: 'quality_signal', score: 1.5 })).toBe(false);
  });

  it('skips score check for non-quality_signal', () => {
    expect(evalById(file, 'reputation-event-score-bounds', { type: 'task_completed', score: undefined })).toBe(true);
  });

  it('accepts task_completed with valid duration', () => {
    expect(evalById(file, 'reputation-event-duration-bounds', { type: 'task_completed', duration_ms: 5000 })).toBe(true);
  });

  it('accepts task_completed without duration', () => {
    expect(evalById(file, 'reputation-event-duration-bounds', { type: 'task_completed', duration_ms: undefined })).toBe(true);
  });

  it('rejects task_completed with excessive duration', () => {
    expect(evalById(file, 'reputation-event-duration-bounds', { type: 'task_completed', duration_ms: 4000000 })).toBe(false);
  });

  it('accepts non-negative sequence', () => {
    expect(evalById(file, 'reputation-event-sequence-nonneg', { sequence: 0 })).toBe(true);
  });

  it('accepts undefined sequence', () => {
    expect(evalById(file, 'reputation-event-sequence-nonneg', { sequence: undefined })).toBe(true);
  });
});

// ─── ScoringPathLog constraint evaluation ───────────────────────────────────

describe('ScoringPathLog constraint evaluation', () => {
  const file = loadConstraints('ScoringPathLog');

  it('accepts valid paths', () => {
    for (const path of ['task_cohort', 'aggregate', 'tier_default']) {
      expect(evalById(file, 'scoring-path-valid', { path })).toBe(true);
    }
  });

  it('rejects invalid path', () => {
    expect(evalById(file, 'scoring-path-valid', { path: 'unknown' })).toBe(false);
  });

  it('accepts task_cohort with model_id and task_type', () => {
    expect(evalById(file, 'scoring-path-task-cohort-requires-context', {
      path: 'task_cohort', model_id: 'native', task_type: 'code_review',
    })).toBe(true);
  });

  it('rejects task_cohort without context', () => {
    expect(evalById(file, 'scoring-path-task-cohort-requires-context', {
      path: 'task_cohort', model_id: undefined, task_type: undefined,
    })).toBe(false);
  });

  it('accepts aggregate with model_id', () => {
    expect(evalById(file, 'scoring-path-aggregate-requires-model', {
      path: 'aggregate', model_id: 'gpt-4o',
    })).toBe(true);
  });

  it('rejects aggregate without model_id', () => {
    expect(evalById(file, 'scoring-path-aggregate-requires-model', {
      path: 'aggregate', model_id: undefined,
    })).toBe(false);
  });

  it('tier_default passes context requirements (no requirements)', () => {
    expect(evalById(file, 'scoring-path-task-cohort-requires-context', {
      path: 'tier_default', model_id: undefined, task_type: undefined,
    })).toBe(true);
    expect(evalById(file, 'scoring-path-aggregate-requires-model', {
      path: 'tier_default', model_id: undefined,
    })).toBe(true);
  });
});

// ─── ReputationAggregate task_cohort constraints (added in v7.10.0) ─────────

describe('ReputationAggregate task_cohort constraints', () => {
  const file = loadConstraints('ReputationAggregate');
  const TASK_COHORT_CONSTRAINT_IDS = [
    'reputation-task-cohort-score-bounds',
    'reputation-task-cohort-sample-nonneg',
    'reputation-task-cohort-uniqueness',
    'reputation-task-cohort-max-items',
  ];

  it('all 4 task_cohort constraints exist', () => {
    for (const id of TASK_COHORT_CONSTRAINT_IDS) {
      const found = file.constraints.find((c) => c.id === id);
      expect(found).toBeDefined();
    }
  });

  it('all have valid expression grammar', () => {
    for (const id of TASK_COHORT_CONSTRAINT_IDS) {
      const c = file.constraints.find((c) => c.id === id)!;
      const result = validateExpression(c.expression);
      expect(result.valid).toBe(true);
    }
  });

  it('uniqueness constraint is native-enforcement sentinel (expression: true)', () => {
    // Composite key uniqueness cannot be expressed in DSL v1.0;
    // the constraint uses expression:true with native_enforcement metadata.
    const c = file.constraints.find((c) => c.id === 'reputation-task-cohort-uniqueness')!;
    expect(c.expression).toBe('true');
    expect(c.severity).toBe('error');
    expect(c.message).toContain('unique');
    // v7.10.1: structured native_enforcement metadata replaces verbose message
    expect(c.native_enforcement).toBeDefined();
    expect(c.native_enforcement.strategy).toBe('composite_key_uniqueness');
    expect(c.native_enforcement.fields).toEqual(['model_id', 'task_type']);
    expect(c.native_enforcement.scope).toBe('task_cohorts');
    expect(c.native_enforcement.reference_impl).toBe('validateTaskCohortUniqueness()');
  });

  it('score-bounds passes with undefined task_cohorts', () => {
    expect(evalById(file, 'reputation-task-cohort-score-bounds', { task_cohorts: undefined })).toBe(true);
  });

  it('score-bounds passes with valid scores', () => {
    expect(evalById(file, 'reputation-task-cohort-score-bounds', {
      task_cohorts: [
        { personal_score: 0.8, sample_count: 10, model_id: 'native', task_type: 'analysis' },
        { personal_score: null, sample_count: 0, model_id: 'gpt-4o', task_type: 'code_review' },
      ],
    })).toBe(true);
  });

  it('max-items passes with undefined', () => {
    expect(evalById(file, 'reputation-task-cohort-max-items', { task_cohorts: undefined })).toBe(true);
  });

  it('max-items passes with small array', () => {
    expect(evalById(file, 'reputation-task-cohort-max-items', { task_cohorts: [] })).toBe(true);
  });
});
