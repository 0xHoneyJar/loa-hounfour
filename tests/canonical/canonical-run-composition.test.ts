/**
 * PR-A3.8 (FR-B1) — Composition tests for `CanonicalRunSchema` in
 * relation to its referencing schemas.
 *
 * `CanonicalRunSchema` is referenced by `EpicCheckpointSchema`
 * (FR-B8) via the lazy-link string `canonical_run_id`. Both records
 * validate independently; the linkage is the string equality
 * `EpicCheckpoint.canonical_run_id === CanonicalRun.canonical_run_id`.
 * Hounfour does NOT emit a manifest entry for a missing
 * canonical_run referent — the lookup is consumer-state per
 * ADR-010 (mirrors the FR-A1 Challenge → Assertion lazy-link
 * pattern from PR-A3.7 CHL-2).
 *
 * This test pins:
 *   1. A round-trip CanonicalRun + EpicCheckpoint pair sharing a
 *      canonical_run_id BOTH validate independently.
 *   2. The CanonicalRun referenced by an EpicCheckpoint is unique
 *      to the (cluster, canonical_run_id) composite key (CR-2 +
 *      EC-2 cooperate) — but the linkage itself is the consumer's
 *      registry-resolution responsibility, NOT a structural cross-
 *      schema invariant.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { CanonicalRunSchema } from '../../src/canonical/canonical-run.js';
import { EpicCheckpointSchema } from '../../src/operations/epic-checkpoint.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

describe('CanonicalRun ↔ EpicCheckpoint composition (FR-B1 ↔ FR-B8)', () => {
  const sharedRunId = 'canonical-run-composition-001';

  const canonicalRun = {
    canonical_run_id: sharedRunId,
    canonical_run_version: '1.0.0',
    contract_version: '8.6.0',
    epic_kind: 'feature-delivery',
    required_phases: [
      {
        phase_id: 'phase-discovery',
        phase_kind: 'discovery',
        required_gates: ['gate-spec-read'],
        ordered_index: 0,
      },
      {
        phase_id: 'phase-implement',
        phase_kind: 'implement',
        required_gates: ['gate-tests-green'],
        ordered_index: 1,
      },
      {
        phase_id: 'phase-ship',
        phase_kind: 'ship',
        required_gates: ['gate-merge-clean'],
        ordered_index: 2,
      },
    ],
    ts_authored: '2026-05-09T00:00:00Z',
  };

  const epicCheckpoint = {
    envelope_kind: 'epic_checkpoint',
    contract_version: '8.6.0',
    ts: '2026-05-09T01:00:00Z',
    cluster_id: 'cluster-thj-prime',
    epic_id: 'epic-test-001',
    canonical_run_id: sharedRunId,
    current_phase: 'phase-implement',
    last_completed_gate: 'gate-spec-read',
    in_progress_tool_call: {
      tool_id: 'tool-vitest',
      input_hash: 'a'.repeat(64),
      start_ts: '2026-05-09T01:00:00Z',
    },
    retry_count: 0,
  };

  it('CanonicalRun validates structurally (Value.Check)', () => {
    expect(Value.Check(CanonicalRunSchema, canonicalRun)).toBe(true);
  });

  it('EpicCheckpoint validates structurally (Value.Check)', () => {
    expect(Value.Check(EpicCheckpointSchema, epicCheckpoint)).toBe(true);
  });

  it('CanonicalRun validates cross-field (CR-1 well-ordered phases)', () => {
    const result = validate(CanonicalRunSchema, canonicalRun);
    expect(result.valid).toBe(true);
  });

  it('EpicCheckpoint.canonical_run_id matches CanonicalRun.canonical_run_id (lazy-link)', () => {
    // Lazy-link string equality is the cross-record reconciliation join.
    // Hounfour does NOT verify referent presence — that's consumer-state
    // per ADR-010 / EC-1 / CR-2.
    expect(epicCheckpoint.canonical_run_id).toBe(canonicalRun.canonical_run_id);
  });

  it('Both records validate independently — neither pulls the other into its schema', () => {
    // The structural import surface stays clean: EpicCheckpointSchema
    // does NOT import CanonicalRunSchema (canonical_run_id is a string,
    // not a $ref). This isolation is what makes the lazy-link pattern
    // a class-vs-policy boundary discipline (ADR-010).
    const runResult = validate(CanonicalRunSchema, canonicalRun);
    const checkpointResult = validate(EpicCheckpointSchema, epicCheckpoint);
    expect(runResult.valid).toBe(true);
    expect(checkpointResult.valid).toBe(true);
  });

  it('A second EpicCheckpoint sharing the same canonical_run_id continues to validate (chain emission)', () => {
    const checkpoint2 = {
      ...epicCheckpoint,
      ts: '2026-05-09T02:00:00Z',
      current_phase: 'phase-ship',
      last_completed_gate: 'gate-tests-green',
      in_progress_tool_call: {
        tool_id: 'tool-deploy',
        input_hash: 'b'.repeat(64),
        start_ts: '2026-05-09T02:00:00Z',
      },
      retry_count: 0,
    };
    expect(Value.Check(EpicCheckpointSchema, checkpoint2)).toBe(true);
    expect(checkpoint2.canonical_run_id).toBe(canonicalRun.canonical_run_id);
  });
});
