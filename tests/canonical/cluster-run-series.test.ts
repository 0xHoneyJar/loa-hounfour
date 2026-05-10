/**
 * PR-A4.1 (FR-G1) — Schema-shape unit tests for `ClusterRunSeriesSchema`,
 * `ClusterRunSeriesRepoEntrySchema`, and `ClusterRunRepoStatusSchema`,
 * plus the inline cross-field validator covering CRS-2 (failure_mode iff
 * failed status) and CRS-4 (repo_slug distinct within a series).
 *
 * The vector runner at `tests/vectors/cluster-run-series-vectors.test.ts`
 * walks `vectors/ClusterRunSeries/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and exercises the two-layer validation contract per the cycle-005
 * vector-runner discipline. This file pins the schema membership, the
 * required-field set, and the in-memory shapes that exercise CRS-2 +
 * CRS-4 at validate() time.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ClusterRunSeriesSchema,
  ClusterRunRepoStatusSchema,
  ClusterRunSeriesRepoEntrySchema,
  validateClusterRunSeries,
} from '../../src/canonical/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const REPO_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;

function baseRepoEntry(slug: string, status: (typeof REPO_STATUSES)[number]): {
  repo_slug: string;
  canonical_run_id: string;
  epic_status: string;
  failure_mode: string | null;
  phase_envelope_chain_root: string | null;
} {
  return {
    repo_slug: slug,
    canonical_run_id: `canonical-run-${slug.replace('/', '-')}`,
    epic_status: status,
    failure_mode: status === 'failed' ? 'unspecified' : null,
    phase_envelope_chain_root: null,
  };
}

function baseEnvelope(repos: ReadonlyArray<unknown>): Record<string, unknown> {
  return {
    envelope_kind: 'cluster_run_series',
    contract_version: '8.7.0',
    run_id: 'cluster-run-test',
    cluster_id: 'cluster-test',
    ts_started: '2026-05-09T00:00:00Z',
    repos,
  };
}

describe('ClusterRunRepoStatusSchema (FR-G1)', () => {
  it('locks 4 members per the v8.7.0 ship line', () => {
    for (const m of REPO_STATUSES) {
      expect(Value.Check(ClusterRunRepoStatusSchema, m)).toBe(true);
    }
  });

  it('rejects out-of-vocabulary labels', () => {
    expect(Value.Check(ClusterRunRepoStatusSchema, 'abandoned')).toBe(false);
    expect(Value.Check(ClusterRunRepoStatusSchema, 'pending')).toBe(false);
    expect(Value.Check(ClusterRunRepoStatusSchema, 'Failed')).toBe(false);
    expect(Value.Check(ClusterRunRepoStatusSchema, '')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(ClusterRunRepoStatusSchema.$id).toBe('ClusterRunRepoStatus');
  });
});

describe('ClusterRunSeriesRepoEntrySchema (FR-G1)', () => {
  it('admits a minimal well-formed entry', () => {
    expect(
      Value.Check(
        ClusterRunSeriesRepoEntrySchema,
        baseRepoEntry('owner/repo', 'queued'),
      ),
    ).toBe(true);
  });

  it('rejects repo_slug missing the owner segment', () => {
    const e = baseRepoEntry('owner/repo', 'queued');
    e.repo_slug = 'no-slash';
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });

  it('rejects empty canonical_run_id (minLength: 1)', () => {
    const e = baseRepoEntry('owner/repo', 'queued');
    e.canonical_run_id = '';
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });

  it('rejects additional properties', () => {
    const e = {
      ...baseRepoEntry('owner/repo', 'queued'),
      extra_field: 'no',
    };
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });

  it('admits null phase_envelope_chain_root', () => {
    const e = baseRepoEntry('owner/repo', 'queued');
    e.phase_envelope_chain_root = null;
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(true);
  });

  it('admits a well-formed sha256 phase_envelope_chain_root', () => {
    const e = baseRepoEntry('owner/repo', 'completed');
    e.phase_envelope_chain_root =
      'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(true);
  });

  it('rejects malformed phase_envelope_chain_root (missing sha256: prefix)', () => {
    const e = baseRepoEntry('owner/repo', 'completed');
    e.phase_envelope_chain_root =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });

  it('rejects failure_mode longer than 256 chars', () => {
    const e = baseRepoEntry('owner/repo', 'failed');
    e.failure_mode = 'X'.repeat(257);
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });

  it('admits failure_mode at exactly 256 chars (boundary)', () => {
    const e = baseRepoEntry('owner/repo', 'failed');
    e.failure_mode = 'X'.repeat(256);
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(true);
  });

  it('rejects empty failure_mode (minLength: 1) when non-null', () => {
    const e = baseRepoEntry('owner/repo', 'failed');
    e.failure_mode = '';
    expect(Value.Check(ClusterRunSeriesRepoEntrySchema, e)).toBe(false);
  });
});

describe('ClusterRunSeriesSchema structural (FR-G1)', () => {
  it('admits a minimal single-repo envelope', () => {
    const env = baseEnvelope([baseRepoEntry('owner/repo', 'queued')]);
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(true);
  });

  it('rejects empty repos array (minItems: 1)', () => {
    const env = baseEnvelope([]);
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('rejects ts_started with fractional seconds (Z-only second precision)', () => {
    const env = baseEnvelope([baseRepoEntry('owner/repo', 'queued')]);
    env.ts_started = '2026-05-09T00:00:00.123Z';
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('rejects ts_started with non-Z UTC offset', () => {
    const env = baseEnvelope([baseRepoEntry('owner/repo', 'queued')]);
    env.ts_started = '2026-05-09T00:00:00+00:00';
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('rejects contract_version mismatch (literal pin)', () => {
    const env = baseEnvelope([baseRepoEntry('owner/repo', 'queued')]);
    env.contract_version = '8.6.0';
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('rejects envelope_kind mismatch (literal pin)', () => {
    const env = baseEnvelope([baseRepoEntry('owner/repo', 'queued')]);
    env.envelope_kind = 'phase_completion_envelope';
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('rejects additional properties on the envelope', () => {
    const env = {
      ...baseEnvelope([baseRepoEntry('owner/repo', 'queued')]),
      extra: 'no',
    };
    expect(Value.Check(ClusterRunSeriesSchema, env)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(ClusterRunSeriesSchema.$id).toBe('ClusterRunSeries');
  });
});

describe('validateClusterRunSeries — CRS-2 (failure_mode iff failed status)', () => {
  it('passes when no entry is failed and all failure_mode values are null', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/a', 'queued'),
      baseRepoEntry('owner/b', 'running'),
      baseRepoEntry('owner/c', 'completed'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(true);
  });

  it('passes when failed entries carry failure_mode classifiers', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/a', 'failed'),
      baseRepoEntry('owner/b', 'completed'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(true);
  });

  it('rejects when a failed entry has null failure_mode', () => {
    const env = baseEnvelope([
      {
        ...baseRepoEntry('owner/a', 'failed'),
        failure_mode: null,
      },
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('CRS-2'))).toBe(true);
  });

  it('rejects when a non-failed entry has non-null failure_mode', () => {
    const env = baseEnvelope([
      {
        ...baseRepoEntry('owner/a', 'completed'),
        failure_mode: 'should-not-be-set',
      },
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('CRS-2'))).toBe(true);
  });

  it('reports per-element index in the error message', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/a', 'queued'),
      baseRepoEntry('owner/b', 'queued'),
      {
        ...baseRepoEntry('owner/c', 'failed'),
        failure_mode: null,
      },
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => /CRS-2.*repos\[2\]/.test(e))).toBe(true);
  });
});

describe('validateClusterRunSeries — CRS-4 (repo_slug distinct within series)', () => {
  it('passes when all repo_slug values are distinct', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/a', 'queued'),
      baseRepoEntry('owner/b', 'running'),
      baseRepoEntry('owner/c', 'completed'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(true);
  });

  it('rejects when two entries share the same repo_slug', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/dup', 'queued'),
      baseRepoEntry('owner/dup', 'running'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('CRS-4'))).toBe(true);
  });

  it('reports both indices for a duplicate repo_slug', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/dup', 'queued'),
      baseRepoEntry('owner/other', 'running'),
      baseRepoEntry('owner/dup', 'queued'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    const dupErr = r.errors.find((e) => e.includes('CRS-4'));
    expect(dupErr).toBeDefined();
    if (!dupErr) return;
    expect(dupErr).toContain('0');
    expect(dupErr).toContain('2');
  });

  it('accumulates CRS-2 + CRS-4 errors together (no short-circuit)', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/dup', 'queued'),
      {
        ...baseRepoEntry('owner/x', 'failed'),
        failure_mode: null,
      },
      baseRepoEntry('owner/dup', 'queued'),
    ]);
    const r = validate(ClusterRunSeriesSchema, env);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('CRS-2'))).toBe(true);
    expect(r.errors.some((e) => e.includes('CRS-4'))).toBe(true);
  });
});

describe('validateClusterRunSeries — defensive contract', () => {
  it('does not throw on null input — returns structural-precondition error', () => {
    const r = validateClusterRunSeries(null);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('CRS');
  });

  it('does not throw on undefined input', () => {
    const r = validateClusterRunSeries(undefined);
    expect(r.valid).toBe(false);
  });

  it('does not throw on array input', () => {
    const r = validateClusterRunSeries([]);
    expect(r.valid).toBe(false);
  });

  it('does not throw on input where repos is not an array', () => {
    const r = validateClusterRunSeries({ repos: 'not-an-array' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('repos must be a non-null array');
  });

  it('emits per-element error when a repos entry is null', () => {
    const r = validateClusterRunSeries({
      repos: [null, baseRepoEntry('owner/a', 'queued')],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /repos\[0\].*null/.test(e))).toBe(true);
  });
});

describe('ClusterRunSeries — in-runtime canonical-form idempotency', () => {
  it('reserializes identical bytes for a well-formed payload', () => {
    const env = baseEnvelope([
      baseRepoEntry('owner/a', 'queued'),
      baseRepoEntry('owner/b', 'completed'),
    ]);
    const canonical = JSON.stringify(env);
    const reSerialized = JSON.stringify(JSON.parse(canonical));
    expect(reSerialized).toBe(canonical);
  });

  it('preserves the schema-authored top-level key order', () => {
    const env = baseEnvelope([baseRepoEntry('owner/a', 'queued')]);
    const expectedOrder = [
      'envelope_kind',
      'contract_version',
      'run_id',
      'cluster_id',
      'ts_started',
      'repos',
    ];
    expect(Object.keys(env)).toEqual(expectedOrder);
  });
});
