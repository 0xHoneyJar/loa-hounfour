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
