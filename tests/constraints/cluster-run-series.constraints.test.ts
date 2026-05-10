/**
 * PR-A4.1 (FR-G1) — Tests for `ClusterRunSeries.constraints.json` +
 * the LOCAL helpers `arrayFieldDistinct` and
 * `failureModeIffFailedStatus` from
 * `src/constraints/builtins/cluster-run-series-local.ts`.
 *
 * The LOCAL helpers are NOT registered as DSL evaluator builtins per
 * SDD §4.6 — these tests exercise them directly to lock the
 * per-helper contract before promotion to a DSL primitive (planned for
 * cycle-007 follow-up once the fifth use site lands in PR-A4.5).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  arrayFieldDistinct,
  failureModeIffFailedStatus,
} from '../../src/constraints/builtins/cluster-run-series-local.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTRAINT_FILE = join(
  __dirname,
  '..',
  '..',
  'constraints',
  'ClusterRunSeries.constraints.json',
);

describe('arrayFieldDistinct (LOCAL helper, FR-G1)', () => {
  it('returns valid:true on an empty array', () => {
    expect(arrayFieldDistinct([], 'repo_slug')).toEqual({
      valid: true,
      duplicates: [],
    });
  });

  it('returns valid:true when all field values are distinct', () => {
    const arr = [
      { repo_slug: 'owner/a' },
      { repo_slug: 'owner/b' },
      { repo_slug: 'owner/c' },
    ];
    expect(arrayFieldDistinct(arr, 'repo_slug')).toEqual({
      valid: true,
      duplicates: [],
    });
  });

  it('returns valid:false with the duplicate set on a single dup', () => {
    const arr = [
      { repo_slug: 'owner/dup' },
      { repo_slug: 'owner/other' },
      { repo_slug: 'owner/dup' },
    ];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.valid).toBe(false);
    expect(r.duplicates).toEqual([{ value: 'owner/dup', indices: [0, 2] }]);
  });

  it('returns multiple duplicate groups when distinct dup-values exist', () => {
    const arr = [
      { repo_slug: 'owner/a' },
      { repo_slug: 'owner/b' },
      { repo_slug: 'owner/a' },
      { repo_slug: 'owner/b' },
    ];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.valid).toBe(false);
    expect(r.duplicates.length).toBe(2);
    expect(r.duplicates).toContainEqual({
      value: 'owner/a',
      indices: [0, 2],
    });
    expect(r.duplicates).toContainEqual({
      value: 'owner/b',
      indices: [1, 3],
    });
  });

  it('reports all indices for a triple-duplicate', () => {
    const arr = [
      { repo_slug: 'owner/x' },
      { repo_slug: 'owner/x' },
      { repo_slug: 'owner/x' },
    ];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.duplicates).toEqual([
      { value: 'owner/x', indices: [0, 1, 2] },
    ]);
  });

  it('skips null entries (defensive — structural tier handles them)', () => {
    const arr = [null, { repo_slug: 'owner/a' }, null];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.valid).toBe(true);
  });

  it('skips entries missing the named field', () => {
    const arr = [{ other: 'x' }, { repo_slug: 'owner/a' }];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.valid).toBe(true);
  });

  it('skips entries where the field is not a string', () => {
    const arr = [{ repo_slug: 42 }, { repo_slug: 'owner/a' }];
    const r = arrayFieldDistinct(arr, 'repo_slug');
    expect(r.valid).toBe(true);
  });

  it('returns valid:true for non-array input (caller handles structural)', () => {
    expect(arrayFieldDistinct('not-array', 'repo_slug')).toEqual({
      valid: true,
      duplicates: [],
    });
    expect(arrayFieldDistinct(null, 'repo_slug')).toEqual({
      valid: true,
      duplicates: [],
    });
  });

  it('treats string equality strictly (case-sensitive)', () => {
    const arr = [{ repo_slug: 'Owner/Repo' }, { repo_slug: 'owner/repo' }];
    expect(arrayFieldDistinct(arr, 'repo_slug').valid).toBe(true);
  });
});

describe('failureModeIffFailedStatus (LOCAL helper, FR-G1)', () => {
  it('passes when status=failed and failure_mode is non-null', () => {
    expect(failureModeIffFailedStatus('failed', 'phase-D-mismatch')).toEqual({
      valid: true,
    });
  });

  it('passes when status=queued and failure_mode is null', () => {
    expect(failureModeIffFailedStatus('queued', null)).toEqual({ valid: true });
  });

  it('passes when status=running and failure_mode is null', () => {
    expect(failureModeIffFailedStatus('running', null)).toEqual({
      valid: true,
    });
  });

  it('passes when status=completed and failure_mode is null', () => {
    expect(failureModeIffFailedStatus('completed', null)).toEqual({
      valid: true,
    });
  });

  it('fails when status=failed and failure_mode is null', () => {
    const r = failureModeIffFailedStatus('failed', null);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('failed');
    expect(r.reason).toContain('null');
  });

  it('fails when status=completed and failure_mode is non-null', () => {
    const r = failureModeIffFailedStatus('completed', 'spurious');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('completed');
  });

  it('fails when status=running and failure_mode is non-null', () => {
    const r = failureModeIffFailedStatus('running', 'spurious');
    expect(r.valid).toBe(false);
  });

  it('treats undefined failure_mode as the null case', () => {
    expect(failureModeIffFailedStatus('queued', undefined)).toEqual({
      valid: true,
    });
    const r = failureModeIffFailedStatus('failed', undefined);
    expect(r.valid).toBe(false);
  });

  it('treats out-of-vocab status as not-failed (null required)', () => {
    expect(failureModeIffFailedStatus('abandoned', null)).toEqual({
      valid: true,
    });
    const r = failureModeIffFailedStatus('abandoned', 'mode');
    expect(r.valid).toBe(false);
  });

  it('does not throw on non-string status (defensive)', () => {
    expect(() => failureModeIffFailedStatus(42, null)).not.toThrow();
    expect(() => failureModeIffFailedStatus(null, null)).not.toThrow();
    expect(failureModeIffFailedStatus(42, null).valid).toBe(true);
  });
});

describe('ClusterRunSeries.constraints.json — file structure', () => {
  const constraintFile = JSON.parse(
    readFileSync(CONSTRAINT_FILE, 'utf8'),
  ) as {
    schema_id: string;
    contract_version: string;
    expression_version: string;
    constraints: Array<{
      id: string;
      severity: string;
      evaluator: string;
      fields: string[];
    }>;
  };

  it('declares schema_id ClusterRunSeries', () => {
    expect(constraintFile.schema_id).toBe('ClusterRunSeries');
  });

  it('pins contract_version to 8.7.0', () => {
    expect(constraintFile.contract_version).toBe('8.7.0');
  });

  it('publishes exactly the CRS-1..CRS-4 constraint set', () => {
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual(['CRS-1', 'CRS-2', 'CRS-3', 'CRS-4']);
  });

  it('marks CRS-1 as library-evaluable (TypeBox structural tier)', () => {
    const crs1 = constraintFile.constraints.find((c) => c.id === 'CRS-1');
    expect(crs1?.evaluator).toBe('library');
  });

  it('marks CRS-2 + CRS-4 as runtime-deferred (LOCAL helpers, not DSL)', () => {
    const crs2 = constraintFile.constraints.find((c) => c.id === 'CRS-2');
    const crs4 = constraintFile.constraints.find((c) => c.id === 'CRS-4');
    expect(crs2?.evaluator).toBe('runtime-deferred');
    expect(crs4?.evaluator).toBe('runtime-deferred');
  });

  it('marks CRS-3 as runtime-deferred warning (consumer-side cross-runtime)', () => {
    const crs3 = constraintFile.constraints.find((c) => c.id === 'CRS-3');
    expect(crs3?.evaluator).toBe('runtime-deferred');
    expect(crs3?.severity).toBe('warning');
  });
});
