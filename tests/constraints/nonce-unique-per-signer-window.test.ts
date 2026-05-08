/**
 * PR-A3.3 (FR-C1) — Tests for `nonce_unique_per_signer_window` builtin.
 *
 * Covers both the standalone evaluator (structured diagnostic surface)
 * and the constraint-DSL wrapper (boolean surface).
 *
 * @see src/constraints/builtins/nonce-unique-per-signer-window.ts
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateNonceUniquePerSignerWindow,
  type NonceWindowState,
} from '../../src/constraints/builtins/nonce-unique-per-signer-window.js';
// `makeState` is defined later in this file; the runtime-shape tests use it.
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const baseRecord = { signer_id: 'agent-a', nonce: 'n-001' };

function makeState(overrides: Partial<NonceWindowState> = {}): NonceWindowState {
  return {
    window_seconds: 300,
    per_signer: new Map<string, ReadonlySet<string>>([
      ['agent-a', new Set(['n-001', 'n-002'])],
      ['agent-b', new Set(['m-100'])],
    ]),
    ...overrides,
  };
}

describe('evaluateNonceUniquePerSignerWindow (standalone)', () => {
  describe('NONCE_REPLAY_DETECTED', () => {
    it('fires when nonce already seen for same signer', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        baseRecord,
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_REPLAY_DETECTED');
      expect(result.diagnostic?.signer_id).toBe('agent-a');
      expect(result.diagnostic?.nonce).toBe('n-001');
    });

    it('does NOT fire when same nonce seen for DIFFERENT signer', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { signer_id: 'agent-c', nonce: 'n-001' },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('does NOT fire on fresh nonce for known signer', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { signer_id: 'agent-a', nonce: 'n-999' },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(true);
    });

    it('does NOT fire when signer not in per_signer map at all', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { signer_id: 'agent-z', nonce: 'anything' },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('NONCE_CONTEXT_DEFERRED', () => {
    it('fires when state is undefined; valid stays true (deferred to consumer)', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        baseRecord,
        'signer_id',
        'nonce',
        undefined,
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic?.code).toBe('NONCE_CONTEXT_DEFERRED');
      expect(result.diagnostic?.signer_id).toBe('agent-a');
    });
  });

  describe('NONCE_INVALID_INPUT', () => {
    it('rejects null record', () => {
      const result = evaluateNonceUniquePerSignerWindow(null, 'signer_id', 'nonce', makeState());
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    });

    it('rejects array as record', () => {
      const result = evaluateNonceUniquePerSignerWindow([], 'signer_id', 'nonce', makeState());
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    });

    it('rejects record missing signer_id field', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { nonce: 'n-001' },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    });

    it('rejects non-string signer_id', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { signer_id: 42, nonce: 'n-001' },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    });

    it('rejects non-string nonce', () => {
      const result = evaluateNonceUniquePerSignerWindow(
        { signer_id: 'agent-a', nonce: 42 },
        'signer_id',
        'nonce',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    });
  });
});

describe('Runtime shape validation (iter-2 HIGH F-001 mitigation)', () => {
  it('rejects state.per_signer as plain object → NONCE_INVALID_INPUT', () => {
    const malformedState = {
      window_seconds: 300,
      // JSON-revived state typically deserializes Map → plain object.
      per_signer: { 'agent-a': new Set(['n-001']) } as unknown as ReadonlyMap<string, ReadonlySet<string>>,
    };
    const result = evaluateNonceUniquePerSignerWindow(
      baseRecord,
      'signer_id',
      'nonce',
      malformedState as never,
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    expect(result.diagnostic?.message).toContain('Map instance');
  });

  it('rejects state.per_signer as null', () => {
    const malformedState = {
      window_seconds: 300,
      per_signer: null as unknown as ReadonlyMap<string, ReadonlySet<string>>,
    };
    const result = evaluateNonceUniquePerSignerWindow(
      baseRecord,
      'signer_id',
      'nonce',
      malformedState as never,
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
  });

  it('rejects bucket as Array (JSON-revived Set) → NONCE_INVALID_INPUT', () => {
    const malformedState: NonceWindowState = {
      window_seconds: 300,
      // Outer Map is correct shape; inner bucket got JSON-revived as Array.
      per_signer: new Map<string, ReadonlySet<string>>([
        ['agent-a', ['n-001'] as unknown as ReadonlySet<string>],
      ]),
    };
    const result = evaluateNonceUniquePerSignerWindow(
      baseRecord,
      'signer_id',
      'nonce',
      malformedState,
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
    expect(result.diagnostic?.message).toContain('Set instance');
    expect(result.diagnostic?.signer_id).toBe('agent-a');
  });

  it('rejects bucket as plain object', () => {
    const malformedState: NonceWindowState = {
      window_seconds: 300,
      per_signer: new Map<string, ReadonlySet<string>>([
        ['agent-a', { 'n-001': true } as unknown as ReadonlySet<string>],
      ]),
    };
    const result = evaluateNonceUniquePerSignerWindow(
      baseRecord,
      'signer_id',
      'nonce',
      malformedState,
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostic?.code).toBe('NONCE_INVALID_INPUT');
  });

  it('passes when bucket is undefined (signer not in map)', () => {
    // The undefined-bucket case must NOT trigger the inner-Set guard;
    // it's the legitimate "fresh signer" path.
    const result = evaluateNonceUniquePerSignerWindow(
      { signer_id: 'unknown-signer', nonce: 'n-x' },
      'signer_id',
      'nonce',
      makeState(),
    );
    expect(result.valid).toBe(true);
    expect(result.diagnostic).toBeUndefined();
  });
});

describe('nonce_unique_per_signer_window (constraint-DSL wrapper)', () => {
  it('returns true when window state is absent (deferred → DSL passes)', () => {
    const data = { record: baseRecord };
    const result = evaluateConstraint(
      data,
      "nonce_unique_per_signer_window(record, 'signer_id', 'nonce')",
    );
    expect(result).toBe(true);
  });

  it('returns false when nonce is in window (replay detected)', () => {
    const data = { record: baseRecord };
    const result = evaluateConstraint(
      data,
      "nonce_unique_per_signer_window(record, 'signer_id', 'nonce')",
      { nonce_window: makeState() },
    );
    expect(result).toBe(false);
  });

  it('returns true when nonce is fresh', () => {
    const data = { record: { signer_id: 'agent-a', nonce: 'n-fresh' } };
    const result = evaluateConstraint(
      data,
      "nonce_unique_per_signer_window(record, 'signer_id', 'nonce')",
      { nonce_window: makeState() },
    );
    expect(result).toBe(true);
  });
});
