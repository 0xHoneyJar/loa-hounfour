/**
 * PR-A4.2 (FR-G2) — Tests for `InterSeriesScopingArtifact.constraints.json`
 * + the LOCAL helper `merkleProofCompositionWellFormed` from
 * `src/constraints/builtins/inter-series-scoping-artifact-local.ts`.
 *
 * The LOCAL helper is NOT registered as a DSL evaluator builtin per
 * SDD §4.6 — these tests exercise it directly to lock the per-helper
 * contract before any future promotion to a DSL primitive (gated on
 * consumer-corpus signal).
 *
 * `arrayFieldDistinct` is reused from PR-A4.1 (cluster-run-series-local)
 * and has its own dedicated suite at
 * `tests/constraints/cluster-run-series.constraints.test.ts`; this
 * file does not duplicate that coverage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { merkleProofCompositionWellFormed } from '../../src/constraints/builtins/inter-series-scoping-artifact-local.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTRAINT_FILE = join(
  __dirname,
  '..',
  '..',
  'constraints',
  'InterSeriesScopingArtifact.constraints.json',
);

const ONE_HASH =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const TWO_HASH =
  'sha256:2222222222222222222222222222222222222222222222222222222222222222';

describe('merkleProofCompositionWellFormed (LOCAL helper, FR-G2)', () => {
  it('returns valid:true on an empty array (one-leaf tree)', () => {
    expect(merkleProofCompositionWellFormed([])).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('returns valid:true on a single well-formed left step', () => {
    expect(
      merkleProofCompositionWellFormed([
        { sibling_hash: ONE_HASH, position: 'left' },
      ]),
    ).toEqual({ valid: true, issues: [] });
  });

  it('returns valid:true on a single well-formed right step', () => {
    expect(
      merkleProofCompositionWellFormed([
        { sibling_hash: ONE_HASH, position: 'right' },
      ]),
    ).toEqual({ valid: true, issues: [] });
  });

  it('returns valid:true on alternating-position multi-step path', () => {
    const path = [
      { sibling_hash: ONE_HASH, position: 'left' },
      { sibling_hash: TWO_HASH, position: 'right' },
      { sibling_hash: ONE_HASH, position: 'left' },
    ];
    expect(merkleProofCompositionWellFormed(path)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('returns valid:true on the matching-twins case (position discriminator carries the trace)', () => {
    const path = [
      { sibling_hash: ONE_HASH, position: 'left' },
      { sibling_hash: ONE_HASH, position: 'right' },
    ];
    expect(merkleProofCompositionWellFormed(path)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('flags out-of-vocab position with index pointer', () => {
    const r = merkleProofCompositionWellFormed([
      { sibling_hash: ONE_HASH, position: 'middle' },
    ]);
    expect(r.valid).toBe(false);
    expect(r.issues[0]).toContain('proof_path[0].position');
    expect(r.issues[0]).toContain('"middle"');
  });

  it('flags missing position', () => {
    const r = merkleProofCompositionWellFormed([
      { sibling_hash: ONE_HASH },
    ]);
    expect(r.valid).toBe(false);
    expect(r.issues.some((s) => s.includes('proof_path[0].position'))).toBe(
      true,
    );
  });

  it('flags non-string sibling_hash', () => {
    const r = merkleProofCompositionWellFormed([
      { sibling_hash: 12345, position: 'left' },
    ]);
    expect(r.valid).toBe(false);
    expect(
      r.issues.some((s) => s.includes('proof_path[0].sibling_hash')),
    ).toBe(true);
  });

  it('flags sibling_hash missing the sha256: prefix', () => {
    const r = merkleProofCompositionWellFormed([
      {
        sibling_hash:
          '1111111111111111111111111111111111111111111111111111111111111111',
        position: 'left',
      },
    ]);
    expect(r.valid).toBe(false);
    expect(r.issues[0]).toContain('canonical sha256:<64-hex> form');
  });

  it('flags non-object steps', () => {
    const r = merkleProofCompositionWellFormed([null, 'string-step', 42]);
    expect(r.valid).toBe(false);
    expect(r.issues.length).toBe(3);
    expect(r.issues[0]).toContain('proof_path[0]');
    expect(r.issues[0]).toContain('null');
    expect(r.issues[1]).toContain('string');
    expect(r.issues[2]).toContain('number');
  });

  it('returns valid:true on non-array input (caller-side structural tier handles non-array shape)', () => {
    expect(merkleProofCompositionWellFormed('not-an-array')).toEqual({
      valid: true,
      issues: [],
    });
    expect(merkleProofCompositionWellFormed(null)).toEqual({
      valid: true,
      issues: [],
    });
    expect(merkleProofCompositionWellFormed(undefined)).toEqual({
      valid: true,
      issues: [],
    });
    expect(merkleProofCompositionWellFormed({})).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('does not throw on adversarial shapes (defensive contract)', () => {
    expect(() =>
      merkleProofCompositionWellFormed([
        { sibling_hash: null, position: null },
        Object.create(null),
        { foo: 'bar' },
      ]),
    ).not.toThrow();
  });

  it('accumulates per-step issues across multiple malformed entries', () => {
    const r = merkleProofCompositionWellFormed([
      { sibling_hash: ONE_HASH, position: 'left' },
      { sibling_hash: 'not-sha256', position: 'middle' },
      null,
    ]);
    expect(r.valid).toBe(false);
    // Step 0 is well-formed; step 1 yields two issues; step 2 yields one.
    expect(r.issues.length).toBe(3);
    expect(r.issues.filter((s) => s.includes('proof_path[1]'))).toHaveLength(2);
    expect(r.issues.filter((s) => s.includes('proof_path[2]'))).toHaveLength(1);
  });
});

describe('InterSeriesScopingArtifact.constraints.json — file structure', () => {
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

  it('declares schema_id InterSeriesScopingArtifact', () => {
    expect(constraintFile.schema_id).toBe('InterSeriesScopingArtifact');
  });

  it('pins contract_version to 8.7.0', () => {
    expect(constraintFile.contract_version).toBe('8.7.0');
  });

  it('publishes exactly the ISSA-1..ISSA-5 constraint set', () => {
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual(['ISSA-1', 'ISSA-2', 'ISSA-3', 'ISSA-4', 'ISSA-5']);
  });

  it('marks ISSA-1, ISSA-4, ISSA-5 as library-evaluable (TypeBox structural)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    expect(lookup('ISSA-1')?.evaluator).toBe('library');
    expect(lookup('ISSA-4')?.evaluator).toBe('library');
    expect(lookup('ISSA-5')?.evaluator).toBe('library');
  });

  it('marks ISSA-2 + ISSA-3 as runtime-deferred (LOCAL helpers, not DSL)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    expect(lookup('ISSA-2')?.evaluator).toBe('runtime-deferred');
    expect(lookup('ISSA-3')?.evaluator).toBe('runtime-deferred');
  });

  it('declares severity error on every entry (no warnings at this layer)', () => {
    for (const c of constraintFile.constraints) {
      expect(c.severity).toBe('error');
    }
  });

  it('ISSA-2 fields reference proposed_series_goals', () => {
    const issa2 = constraintFile.constraints.find((c) => c.id === 'ISSA-2');
    expect(issa2?.fields).toEqual(['proposed_series_goals']);
  });

  it('ISSA-3 fields reference constitutional_hash_proof', () => {
    const issa3 = constraintFile.constraints.find((c) => c.id === 'ISSA-3');
    expect(issa3?.fields).toEqual(['constitutional_hash_proof']);
  });
});
