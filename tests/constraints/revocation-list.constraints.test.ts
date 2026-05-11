/**
 * PR-A4.4 (FR-G4) — Tests for `RevocationList.constraints.json` and
 * the NEW LOCAL helpers `fieldNotInArrayField` (RL-5) and
 * `fieldInArrayField` (RL-12) from
 * `src/constraints/builtins/revocation-list-local.ts`.
 *
 * `arrayFieldDistinct` (PR-A4.1) and `iso8601GeField` (PR-A4.3) are
 * reused; their dedicated suites at
 * `tests/constraints/cluster-run-series.constraints.test.ts` and
 * `tests/constraints/subscription-pool-state.constraints.test.ts`
 * cover those helpers — this file does not duplicate.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fieldNotInArrayField,
  fieldInArrayField,
} from '../../src/constraints/builtins/revocation-list-local.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTRAINT_FILE = join(
  __dirname,
  '..',
  '..',
  'constraints',
  'RevocationList.constraints.json',
);

const KEY_A = 'ed25519-pub:' + 'A'.repeat(43);
const KEY_B = 'ed25519-pub:' + 'B'.repeat(43);
const KEY_C = 'ed25519-pub:' + 'C'.repeat(43);

describe('fieldNotInArrayField (LOCAL helper, FR-G4)', () => {
  it('returns valid:true when scalar is not in the array', () => {
    expect(
      fieldNotInArrayField(KEY_A, [{ key_id: KEY_B }, { key_id: KEY_C }], 'key_id'),
    ).toEqual({ valid: true });
  });

  it('returns valid:false with matchedIndex when scalar is in the array', () => {
    const r = fieldNotInArrayField(
      KEY_A,
      [{ key_id: KEY_B }, { key_id: KEY_A }, { key_id: KEY_C }],
      'key_id',
    );
    expect(r.valid).toBe(false);
    expect(r.matchedIndex).toBe(1);
  });

  it('returns valid:false with the FIRST matched index when scalar appears multiple times', () => {
    const r = fieldNotInArrayField(
      KEY_A,
      [{ key_id: KEY_A }, { key_id: KEY_A }, { key_id: KEY_A }],
      'key_id',
    );
    expect(r.valid).toBe(false);
    expect(r.matchedIndex).toBe(0);
  });

  it('returns valid:true on empty array', () => {
    expect(fieldNotInArrayField(KEY_A, [], 'key_id')).toEqual({ valid: true });
  });

  it('returns valid:true on non-string scalar (defensive contract)', () => {
    expect(fieldNotInArrayField(42, [{ key_id: KEY_A }], 'key_id')).toEqual({
      valid: true,
    });
    expect(fieldNotInArrayField(null, [{ key_id: KEY_A }], 'key_id')).toEqual({
      valid: true,
    });
  });

  it('returns valid:true on non-array (defensive contract)', () => {
    expect(fieldNotInArrayField(KEY_A, 'not-an-array', 'key_id')).toEqual({
      valid: true,
    });
    expect(fieldNotInArrayField(KEY_A, null, 'key_id')).toEqual({ valid: true });
    expect(fieldNotInArrayField(KEY_A, {}, 'key_id')).toEqual({ valid: true });
  });

  it('skips malformed array elements (non-object, missing field, non-string field)', () => {
    expect(
      fieldNotInArrayField(
        KEY_A,
        [null, 'string-element', 42, { wrong_field: KEY_A }, { key_id: 999 }],
        'key_id',
      ),
    ).toEqual({ valid: true });
  });

  it('does not throw on adversarial inputs', () => {
    expect(() => fieldNotInArrayField(undefined, undefined, '')).not.toThrow();
    expect(() => fieldNotInArrayField({}, [], 'x')).not.toThrow();
  });
});

describe('fieldInArrayField (LOCAL helper, FR-G4)', () => {
  it('returns valid:true when scalar appears in the array', () => {
    expect(
      fieldInArrayField(
        KEY_A,
        [{ signer_key_id: KEY_B }, { signer_key_id: KEY_A }],
        'signer_key_id',
      ),
    ).toEqual({ valid: true });
  });

  it('returns valid:false when scalar does NOT appear in the array', () => {
    expect(
      fieldInArrayField(
        KEY_A,
        [{ signer_key_id: KEY_B }, { signer_key_id: KEY_C }],
        'signer_key_id',
      ),
    ).toEqual({ valid: false });
  });

  it('returns valid:false on empty array (asymmetric vs fieldNotInArrayField — see helper JSDoc)', () => {
    expect(fieldInArrayField(KEY_A, [], 'signer_key_id')).toEqual({
      valid: false,
    });
  });

  it('returns valid:false on non-string scalar', () => {
    expect(
      fieldInArrayField(42, [{ signer_key_id: KEY_A }], 'signer_key_id'),
    ).toEqual({ valid: false });
  });

  it('returns valid:false on non-array', () => {
    expect(fieldInArrayField(KEY_A, 'not-an-array', 'signer_key_id')).toEqual({
      valid: false,
    });
    expect(fieldInArrayField(KEY_A, null, 'signer_key_id')).toEqual({
      valid: false,
    });
  });

  it('skips malformed array elements (non-object, missing field, non-string field)', () => {
    // Scalar matches the well-formed entry past the malformed ones.
    expect(
      fieldInArrayField(
        KEY_A,
        [null, 42, { wrong_field: KEY_A }, { signer_key_id: KEY_A }],
        'signer_key_id',
      ),
    ).toEqual({ valid: true });
  });

  it('does not throw on adversarial inputs', () => {
    expect(() => fieldInArrayField(undefined, undefined, '')).not.toThrow();
    expect(() => fieldInArrayField({}, [], 'x')).not.toThrow();
  });
});

describe('RevocationList.constraints.json — file structure', () => {
  const constraintFile = JSON.parse(readFileSync(CONSTRAINT_FILE, 'utf8')) as {
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

  it('declares schema_id RevocationList', () => {
    expect(constraintFile.schema_id).toBe('RevocationList');
  });

  it('pins contract_version to 8.7.0', () => {
    expect(constraintFile.contract_version).toBe('8.7.0');
  });

  it('publishes 11 constraints — RL-1..RL-12 with RL-8 explicit non-constraint (omitted)', () => {
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual([
      'RL-1',
      'RL-2',
      'RL-3',
      'RL-4',
      'RL-5',
      'RL-6',
      'RL-7',
      'RL-9',
      'RL-10',
      'RL-11',
      'RL-12',
    ]);
    expect(ids).not.toContain('RL-8');
  });

  it('marks RL-1, RL-5, RL-7, RL-9, RL-10, RL-12 as runtime-deferred (LOCAL helpers, not DSL)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    for (const id of ['RL-1', 'RL-5', 'RL-7', 'RL-9', 'RL-10', 'RL-12']) {
      expect(lookup(id)?.evaluator).toBe('runtime-deferred');
    }
  });

  it('marks RL-2, RL-3, RL-4, RL-6, RL-11 as runtime-deferred warning (consumer-state)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    for (const id of ['RL-2', 'RL-3', 'RL-4', 'RL-6', 'RL-11']) {
      const entry = lookup(id);
      expect(entry?.evaluator).toBe('runtime-deferred');
      expect(entry?.severity).toBe('warning');
    }
  });

  it('marks RL-1, RL-5, RL-7, RL-9, RL-10, RL-12 as severity error (library-evaluable invariants)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    for (const id of ['RL-1', 'RL-5', 'RL-7', 'RL-9', 'RL-10', 'RL-12']) {
      expect(lookup(id)?.severity).toBe('error');
    }
  });
});
