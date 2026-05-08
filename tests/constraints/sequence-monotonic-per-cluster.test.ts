/**
 * PR-A3.3 (FR-C2) — Tests for `sequence_monotonic_per_cluster` builtin.
 *
 * Acceptance hooks:
 *   - CT-08: cluster_id mismatch fires BEFORE state-map lookup.
 *   - CT-03: string→BigInt parse uses regex pre-validator (no try/catch).
 *
 * @see src/constraints/builtins/sequence-monotonic-per-cluster.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  evaluateSequenceMonotonicPerCluster,
  composeSequenceKey,
  type SequenceClusterState,
} from '../../src/constraints/builtins/sequence-monotonic-per-cluster.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const baseRecord = {
  cluster_id: 'c1',
  signer_id: 's1',
  sequence: '5',
  key_version: '0',
};

function makeState(overrides: Partial<SequenceClusterState> = {}): SequenceClusterState {
  return {
    cluster_id: 'c1',
    highest_key_version: '0',
    last_sequence: new Map<string, string>([
      [composeSequenceKey('s1', '0'), '4'],
      [composeSequenceKey('s2', '0'), '10'],
    ]),
    ...overrides,
  };
}

describe('evaluateSequenceMonotonicPerCluster (standalone)', () => {
  describe('CT-08 cluster-id mismatch precedes state lookup', () => {
    it('fires CLUSTER_ID_MISMATCH when record cluster differs from state cluster', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, cluster_id: 'c2' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState({ cluster_id: 'c1' }),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CLUSTER_ID_MISMATCH');
      expect(result.diagnostic?.cluster_id).toBe('c2');
    });

    it('CT-08 mismatch check fires BEFORE last_sequence Map.get is called', () => {
      const lastSequenceMap = new Map<string, string>();
      const getSpy = vi.spyOn(lastSequenceMap, 'get');
      const state: SequenceClusterState = {
        cluster_id: 'c1',
        highest_key_version: '0',
        last_sequence: lastSequenceMap,
      };
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, cluster_id: 'c2' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        state,
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CLUSTER_ID_MISMATCH');
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe('SEQUENCE_CONTEXT_DEFERRED', () => {
    it('fires when state is undefined; valid stays true', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        undefined,
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic?.code).toBe('SEQUENCE_CONTEXT_DEFERRED');
    });
  });

  describe('CT-03 string→BigInt parsing without try/catch', () => {
    it('rejects non-numeric sequence as SEQUENCE_INVALID_INPUT (no throw)', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: 'not-a-number' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('rejects sequence with leading zero (other than "0")', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '007' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('rejects negative-signed sequence', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '-5' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('accepts "0" sequence (canonical zero)', () => {
      const state = makeState({
        last_sequence: new Map<string, string>(),
      });
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '0' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        state,
      );
      expect(result.valid).toBe(true);
    });

    it('iter-3 F11: CT-03 fires BEFORE state-absent deferral (no deferring on garbage)', () => {
      // Malformed sequence ('007') with NO state. Pre-iter-3 ordering
      // returned SEQUENCE_CONTEXT_DEFERRED with valid:true (deferred on
      // garbage — Postel's-Law trap). Iter-3 reorder fires CT-03 first;
      // SEQUENCE_INVALID_INPUT regardless of state presence.
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '007' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        undefined, // no state
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('iter-3 F11: CT-03 also fires before deferral for malformed key_version', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, key_version: 'not-numeric' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        undefined,
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('accepts very-large BigInt-class sequence', () => {
      const huge = '99999999999999999999999999';
      const state = makeState({
        last_sequence: new Map<string, string>([
          [composeSequenceKey('s1', '0'), '99999999999999999999999998'],
        ]),
      });
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: huge },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        state,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('KEY_VERSION_REGRESSION', () => {
    it('fires when record key_version < state highest_key_version', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, key_version: '2' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState({ highest_key_version: '5' }),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('KEY_VERSION_REGRESSION');
      expect(result.diagnostic?.last_observed).toBe('5');
      expect(result.diagnostic?.asserted).toBe('2');
    });

    it('does NOT fire when key_version equals highest', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState({ highest_key_version: '0' }),
      );
      // sequence 5 > last 4 → valid
      expect(result.valid).toBe(true);
    });

    it('does NOT fire when key_version exceeds highest (forward rotation)', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, key_version: '7' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState({
          highest_key_version: '5',
          last_sequence: new Map<string, string>(),
        }),
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('SEQUENCE_MONOTONIC_VIOLATION', () => {
    it('fires when record sequence equals last-observed', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '4' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_MONOTONIC_VIOLATION');
      expect(result.diagnostic?.last_observed).toBe('4');
      expect(result.diagnostic?.asserted).toBe('4');
    });

    it('fires when record sequence less than last-observed', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, sequence: '3' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_MONOTONIC_VIOLATION');
    });

    it('does NOT fire when record sequence strictly greater', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord, // sequence 5 > last 4
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(true);
    });

    it('key-rotation overlap window: same sequence under newer key_version is allowed', () => {
      // Under key_version 0, last sequence was 4. Under key_version 1 (newer),
      // we're allowed to start a fresh sequence count — same composite key
      // (signer, key_version) is independent.
      const state: SequenceClusterState = {
        cluster_id: 'c1',
        highest_key_version: '1',
        last_sequence: new Map<string, string>([
          [composeSequenceKey('s1', '0'), '4'],
          // No entry for (s1, '1') yet — fresh under new key.
        ]),
      };
      const result = evaluateSequenceMonotonicPerCluster(
        { ...baseRecord, key_version: '1', sequence: '1' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        state,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Runtime shape validation (iter-1 HIGH F-002/F-003 mitigation)', () => {
    it('rejects state.last_sequence as plain object (not Map) → SEQUENCE_INVALID_INPUT', () => {
      const malformedState = {
        cluster_id: 'c1',
        highest_key_version: '0',
        // Plain object, NOT a Map — common deserialization shape.
        last_sequence: { 's1|0': '4' } as unknown as ReadonlyMap<string, string>,
      };
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        malformedState as never,
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
      expect(result.diagnostic?.message).toContain('Map instance');
    });

    it('rejects state.last_sequence as null', () => {
      const malformedState = {
        cluster_id: 'c1',
        highest_key_version: '0',
        last_sequence: null as unknown as ReadonlyMap<string, string>,
      };
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        malformedState as never,
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });
  });

  describe('Composite-key injectivity (iter-1 MEDIUM CVE-class delimiter fix)', () => {
    it('JSON-stringify encoding distinguishes "a|0" signer from "a" signer with "0|0" key_version', () => {
      // Naive `|` delimiter collides: ('a|0', '0') and ('a', '0|0') both
      // produce "a|0|0". Injective JSON encoding distinguishes them:
      // ["a|0","0"] != ["a","0|0"]. (key_version stays numeric per CT-03;
      // signer_id is the field that can carry a `|`.)
      // For this test, since CT-03 forbids non-numeric key_versions, we
      // only exercise injectivity on the signer_id axis.
      const collidingNaiveKey = `a|0|0`;
      const stateA: SequenceClusterState = {
        cluster_id: 'c1',
        highest_key_version: '0',
        last_sequence: new Map<string, string>([
          // Stored under signer "a|0" with key_version "0".
          [composeSequenceKey('a|0', '0'), '99'],
        ]),
      };
      // Lookup with signer "a" — different from "a|0" — should be a
      // distinct composite key under JSON-stringify, so no collision.
      const result = evaluateSequenceMonotonicPerCluster(
        { cluster_id: 'c1', signer_id: 'a', sequence: '1', key_version: '0' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        stateA,
      );
      // With JSON-stringify: lookup key for ('a','0') = '["a","0"]', stored
      // key for ('a|0','0') = '["a|0","0"]' — distinct → no collision →
      // fresh sequence → valid. Naive '|' would have produced 'a|0|0' for
      // BOTH (collision).
      expect(result.valid).toBe(true);
      // Also assert directly on the encoding to prove injectivity:
      expect(composeSequenceKey('a|0', '0')).not.toBe(composeSequenceKey('a', '0|0'));
      // (Notional naive collision proof — the naive encoding 'a|0|0' would
      // have been the same for both.)
      expect(`a|0|0`).toBe(collidingNaiveKey);
    });

    it('composeSequenceKey produces stable JSON-array form', () => {
      expect(composeSequenceKey('a', 'b')).toBe('["a","b"]');
      expect(composeSequenceKey('a|b', 'c')).toBe('["a|b","c"]');
      expect(composeSequenceKey('with"quote', 'ver')).toBe('["with\\"quote","ver"]');
    });
  });

  describe('Invalid input', () => {
    it('rejects null record', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        null,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('rejects record missing required fields', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        { cluster_id: 'c1' },
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });

    it('rejects malformed state.highest_key_version', () => {
      const result = evaluateSequenceMonotonicPerCluster(
        baseRecord,
        'cluster_id',
        'signer_id',
        'sequence',
        'key_version',
        makeState({ highest_key_version: 'bad' }),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SEQUENCE_INVALID_INPUT');
    });
  });
});

describe('sequence_monotonic_per_cluster (constraint-DSL wrapper)', () => {
  it('returns true when state is absent (deferred → DSL passes)', () => {
    const data = { record: baseRecord };
    const result = evaluateConstraint(
      data,
      "sequence_monotonic_per_cluster(record, 'cluster_id', 'signer_id', 'sequence', 'key_version')",
    );
    expect(result).toBe(true);
  });

  it('returns false on cluster mismatch (CT-08)', () => {
    const data = { record: { ...baseRecord, cluster_id: 'c2' } };
    const result = evaluateConstraint(
      data,
      "sequence_monotonic_per_cluster(record, 'cluster_id', 'signer_id', 'sequence', 'key_version')",
      { sequence_state: makeState({ cluster_id: 'c1' }) },
    );
    expect(result).toBe(false);
  });

  it('returns false on sequence violation', () => {
    const data = { record: { ...baseRecord, sequence: '3' } };
    const result = evaluateConstraint(
      data,
      "sequence_monotonic_per_cluster(record, 'cluster_id', 'signer_id', 'sequence', 'key_version')",
      { sequence_state: makeState() },
    );
    expect(result).toBe(false);
  });
});
