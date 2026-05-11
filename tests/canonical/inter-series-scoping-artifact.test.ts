/**
 * PR-A4.2 (FR-G2) — Schema-shape unit tests for
 * `InterSeriesScopingArtifactSchema`, `MerkleProofStepSchema`,
 * `ProposedSeriesGoalSchema`, and the inline cross-field validator
 * covering ISSA-2 (proposed_series_goals[*].id distinct) and ISSA-3
 * (Merkle proof step well-formedness).
 *
 * The vector runner at
 * `tests/vectors/inter-series-scoping-artifact-vectors.test.ts`
 * walks `vectors/InterSeriesScopingArtifact/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and exercises the two-layer validation contract per the cycle-005 +
 * PR-A4.1 vector-runner discipline. This file pins the schema
 * membership, the required-field set, and the in-memory shapes that
 * exercise ISSA-2 + ISSA-3 well-formedness at validate() time.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  InterSeriesScopingArtifactSchema,
  MerkleProofStepSchema,
  ProposedSeriesGoalSchema,
  validateInterSeriesScopingArtifact,
} from '../../src/canonical/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const ZERO_HASH =
  'sha256:0000000000000000000000000000000000000000000000000000000000000000';
const ONE_HASH =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const TWO_HASH =
  'sha256:2222222222222222222222222222222222222222222222222222222222222222';

function baseGoal(id: string, impact = 0): {
  id: string;
  description: string;
  conformance_impact_pct: number;
} {
  return {
    id,
    description: `Goal ${id} description.`,
    conformance_impact_pct: impact,
  };
}

function baseEnvelope(
  goals: ReadonlyArray<unknown> = [baseGoal('goal-001')],
  proofPath: ReadonlyArray<unknown> = [],
): Record<string, unknown> {
  return {
    envelope_kind: 'inter_series_scoping_artifact',
    contract_version: '8.7.0',
    ts: '2026-05-09T00:00:00Z',
    cluster_id: 'cluster-test',
    parent_series_id: 'cluster-run-test',
    signoff_envelope_id: null,
    proposed_series_goals: goals,
    constitutional_hash_proof: {
      soul_hash: ZERO_HASH,
      proof_path: proofPath,
    },
    conformance_chain: [],
  };
}

describe('MerkleProofStepSchema (FR-G2)', () => {
  it('admits a left-position step with canonical sha256 sibling', () => {
    expect(
      Value.Check(MerkleProofStepSchema, {
        sibling_hash: ONE_HASH,
        position: 'left',
      }),
    ).toBe(true);
  });

  it('admits a right-position step with canonical sha256 sibling', () => {
    expect(
      Value.Check(MerkleProofStepSchema, {
        sibling_hash: ONE_HASH,
        position: 'right',
      }),
    ).toBe(true);
  });

  it('rejects out-of-vocab position (ISSA-5)', () => {
    expect(
      Value.Check(MerkleProofStepSchema, {
        sibling_hash: ONE_HASH,
        position: 'middle',
      }),
    ).toBe(false);
  });

  it('rejects sibling_hash missing sha256: prefix', () => {
    expect(
      Value.Check(MerkleProofStepSchema, {
        sibling_hash:
          '1111111111111111111111111111111111111111111111111111111111111111',
        position: 'left',
      }),
    ).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(
      Value.Check(MerkleProofStepSchema, {
        sibling_hash: ONE_HASH,
        position: 'left',
        extra: 'no',
      }),
    ).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(MerkleProofStepSchema.$id).toBe('MerkleProofStep');
  });
});

describe('ProposedSeriesGoalSchema (FR-G2)', () => {
  it('admits a minimal well-formed goal', () => {
    expect(Value.Check(ProposedSeriesGoalSchema, baseGoal('goal-001'))).toBe(
      true,
    );
  });

  it('rejects empty id (minLength: 1)', () => {
    const g = baseGoal('');
    expect(Value.Check(ProposedSeriesGoalSchema, g)).toBe(false);
  });

  it('rejects empty description (minLength: 1)', () => {
    const g = baseGoal('goal-001');
    g.description = '';
    expect(Value.Check(ProposedSeriesGoalSchema, g)).toBe(false);
  });

  it('rejects description longer than 4096 chars', () => {
    const g = baseGoal('goal-001');
    g.description = 'X'.repeat(4097);
    expect(Value.Check(ProposedSeriesGoalSchema, g)).toBe(false);
  });

  it('admits description at exactly 4096 chars (boundary)', () => {
    const g = baseGoal('goal-001');
    g.description = 'X'.repeat(4096);
    expect(Value.Check(ProposedSeriesGoalSchema, g)).toBe(true);
  });

  it('admits conformance_impact_pct at the ISSA-4 boundaries', () => {
    expect(Value.Check(ProposedSeriesGoalSchema, baseGoal('a', -100))).toBe(
      true,
    );
    expect(Value.Check(ProposedSeriesGoalSchema, baseGoal('b', 100))).toBe(
      true,
    );
  });

  it('rejects conformance_impact_pct below -100 (ISSA-4)', () => {
    expect(Value.Check(ProposedSeriesGoalSchema, baseGoal('a', -100.0001))).toBe(
      false,
    );
  });

  it('rejects conformance_impact_pct above +100 (ISSA-4)', () => {
    expect(Value.Check(ProposedSeriesGoalSchema, baseGoal('a', 100.0001))).toBe(
      false,
    );
  });

  it('rejects additional properties', () => {
    const g = { ...baseGoal('goal-001'), extra: 'no' } as unknown;
    expect(Value.Check(ProposedSeriesGoalSchema, g)).toBe(false);
  });
});

describe('InterSeriesScopingArtifactSchema structural (FR-G2)', () => {
  it('admits a minimal envelope (single goal, empty proof_path)', () => {
    expect(Value.Check(InterSeriesScopingArtifactSchema, baseEnvelope())).toBe(
      true,
    );
  });

  it('rejects empty proposed_series_goals (ISSA-1 minItems 1)', () => {
    expect(
      Value.Check(InterSeriesScopingArtifactSchema, baseEnvelope([])),
    ).toBe(false);
  });

  it('rejects ts with non-Z offset', () => {
    const env = baseEnvelope();
    env.ts = '2026-05-09T00:00:00+02:00';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('rejects contract_version mismatch (literal pin)', () => {
    const env = baseEnvelope();
    env.contract_version = '8.6.0';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('rejects envelope_kind mismatch (literal pin)', () => {
    const env = baseEnvelope();
    env.envelope_kind = 'cluster_run_series';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('rejects additional properties on the envelope', () => {
    const env = { ...baseEnvelope(), extra: 'no' };
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('rejects empty parent_series_id (minLength: 1)', () => {
    const env = baseEnvelope();
    env.parent_series_id = '';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('admits null signoff_envelope_id', () => {
    const env = baseEnvelope();
    env.signoff_envelope_id = null;
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('admits a non-empty string signoff_envelope_id', () => {
    const env = baseEnvelope();
    env.signoff_envelope_id = 'plan-signoff-001';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('rejects empty-string signoff_envelope_id (the canonical "no signoff" is null)', () => {
    const env = baseEnvelope();
    env.signoff_envelope_id = '';
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('rejects malformed soul_hash (missing sha256: prefix)', () => {
    const env = baseEnvelope();
    (env.constitutional_hash_proof as { soul_hash: string }).soul_hash =
      '0'.repeat(64);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('admits proof_path at exactly 64 steps (maxItems boundary)', () => {
    const path = Array.from({ length: 64 }, (_, i) => ({
      sibling_hash: ONE_HASH,
      position: i % 2 === 0 ? 'left' : 'right',
    }));
    const env = baseEnvelope([baseGoal('goal-001')], path);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('rejects proof_path with 65 steps (maxItems exceeded)', () => {
    const path = Array.from({ length: 65 }, () => ({
      sibling_hash: ONE_HASH,
      position: 'left',
    }));
    const env = baseEnvelope([baseGoal('goal-001')], path);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('admits a populated conformance_chain', () => {
    const env = baseEnvelope();
    env.conformance_chain = [ONE_HASH, TWO_HASH];
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('rejects conformance_chain with non-sha256 entries', () => {
    const env = baseEnvelope();
    env.conformance_chain = ['not-a-sha256'];
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('admits conformance_chain at exactly 1024 entries (maxItems boundary)', () => {
    const env = baseEnvelope();
    env.conformance_chain = Array.from({ length: 1024 }, () => ONE_HASH);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('rejects conformance_chain with 1025 entries (maxItems exceeded)', () => {
    const env = baseEnvelope();
    env.conformance_chain = Array.from({ length: 1025 }, () => ONE_HASH);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('admits proposed_series_goals at exactly 64 entries (maxItems boundary)', () => {
    const goals = Array.from({ length: 64 }, (_, i) => baseGoal(`goal-${i}`));
    const env = baseEnvelope(goals);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(true);
  });

  it('rejects proposed_series_goals with 65 entries (maxItems exceeded)', () => {
    const goals = Array.from({ length: 65 }, (_, i) => baseGoal(`goal-${i}`));
    const env = baseEnvelope(goals);
    expect(Value.Check(InterSeriesScopingArtifactSchema, env)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(InterSeriesScopingArtifactSchema.$id).toBe(
      'InterSeriesScopingArtifact',
    );
  });
});

describe('InterSeriesScopingArtifact published JSON Schema $id contract (iter-2 LOW mitigation)', () => {
  it('the published JSON Schema $id is the canonical versioned URI (not the TypeBox short token)', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'inter-series-scoping-artifact.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
      $id: string;
    };
    expect(generated.$id).toBe(
      'https://schemas.0xhoneyjar.com/loa-hounfour/8.7.0/inter-series-scoping-artifact',
    );
  });

  it('the published JSON Schema carries zero $ref values (no Type.Ref drift, mirrors CanonicalRun precedent)', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'inter-series-scoping-artifact.schema.json',
    );
    const raw = readFileSync(schemaPath, 'utf8');
    expect(raw).not.toContain('"$ref"');
  });
});

describe('validateInterSeriesScopingArtifact — cross-field tier (FR-G2)', () => {
  it('passes a structurally and cross-field-valid envelope', () => {
    const result = validate(
      InterSeriesScopingArtifactSchema,
      baseEnvelope([baseGoal('goal-001'), baseGoal('goal-002')]),
    );
    expect(result.valid).toBe(true);
  });

  it('flags ISSA-2 when two proposed goals share the same id', () => {
    const env = baseEnvelope([
      baseGoal('shared'),
      baseGoal('shared'),
    ]);
    const result = validate(InterSeriesScopingArtifactSchema, env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ISSA-2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('"shared"'))).toBe(true);
  });

  it('flags ISSA-2 with all offending indices when three goals share an id', () => {
    const env = baseEnvelope([
      baseGoal('shared'),
      baseGoal('shared'),
      baseGoal('shared'),
    ]);
    const result = validate(InterSeriesScopingArtifactSchema, env);
    expect(result.valid).toBe(false);
    const issa2 = result.errors.find((e) => e.includes('ISSA-2'));
    expect(issa2).toBeDefined();
    expect(issa2).toContain('0, 1, 2');
  });

  it('passes the matching-twins fixture (position discriminator disambiguates)', () => {
    const env = baseEnvelope(
      [baseGoal('goal-001')],
      [
        { sibling_hash: ONE_HASH, position: 'left' },
        { sibling_hash: ONE_HASH, position: 'right' },
      ],
    );
    const result = validate(InterSeriesScopingArtifactSchema, env);
    expect(result.valid).toBe(true);
  });
});

describe('validateInterSeriesScopingArtifact — defensive contract (FR-G2)', () => {
  it('does not throw on null input', () => {
    const result = validateInterSeriesScopingArtifact(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('structural shape precondition');
  });

  it('does not throw on undefined input', () => {
    const result = validateInterSeriesScopingArtifact(undefined);
    expect(result.valid).toBe(false);
  });

  it('does not throw on array input', () => {
    const result = validateInterSeriesScopingArtifact([1, 2, 3]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('got array');
  });

  it('does not throw on string input', () => {
    const result = validateInterSeriesScopingArtifact('not-an-object');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('got string');
  });

  it('does not throw when proposed_series_goals is missing', () => {
    const result = validateInterSeriesScopingArtifact({});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('proposed_series_goals'))).toBe(
      true,
    );
  });

  it('does not throw when constitutional_hash_proof is missing', () => {
    const result = validateInterSeriesScopingArtifact({
      proposed_series_goals: [baseGoal('goal-001')],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('constitutional_hash_proof')),
    ).toBe(true);
  });

  it('surfaces a structural-precondition error when proof_path is missing (iter-1 MEDIUM #1 mitigation)', () => {
    const result = validateInterSeriesScopingArtifact({
      proposed_series_goals: [baseGoal('goal-001')],
      constitutional_hash_proof: {
        soul_hash: ZERO_HASH,
      },
    });
    expect(result.valid).toBe(false);
    const preconditionError = result.errors.find((e) =>
      e.includes('proof_path must be a non-null array'),
    );
    expect(preconditionError).toBeDefined();
    expect(preconditionError).toContain('undefined');
  });

  it('surfaces a structural-precondition error when proof_path is non-array (iter-1 MEDIUM #1 mitigation)', () => {
    const result = validateInterSeriesScopingArtifact({
      proposed_series_goals: [baseGoal('goal-001')],
      constitutional_hash_proof: {
        soul_hash: ZERO_HASH,
        proof_path: 'not-an-array',
      },
    });
    expect(result.valid).toBe(false);
    const preconditionError = result.errors.find((e) =>
      e.includes('proof_path must be a non-null array'),
    );
    expect(preconditionError).toBeDefined();
    expect(preconditionError).toContain('string');
  });

  it('accumulates ISSA-2 + ISSA-3 errors in a single pass when both fail', () => {
    const result = validateInterSeriesScopingArtifact({
      proposed_series_goals: [baseGoal('shared'), baseGoal('shared')],
      constitutional_hash_proof: {
        soul_hash: ZERO_HASH,
        proof_path: [{ sibling_hash: 'not-sha256', position: 'left' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ISSA-2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('ISSA-3'))).toBe(true);
  });
});
