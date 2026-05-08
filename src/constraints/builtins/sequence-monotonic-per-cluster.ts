/**
 * `sequence_monotonic_per_cluster` constraint builtin (FR-C2, v8.6.0).
 *
 * State-bearing per-cluster monotonicity check. Asserts that for a given
 * cluster and key-version, the validating record's `sequence` is strictly
 * greater than the last-observed sequence, and that the `key_version`
 * itself never regresses across the cluster's history.
 *
 * **CT-08 hardening (cluster-id mismatch precedes state lookup).** The
 * very first check this builtin performs is whether the validating
 * record's `cluster_id` matches the `cluster_id` declared on the supplied
 * state. A mismatch returns `CLUSTER_ID_MISMATCH` BEFORE any state-map
 * lookup. This prevents a class of bug where a cross-cluster lookup
 * succeeds silently — e.g., consumer calls validate() with state for
 * cluster A but the record's `cluster_id` is cluster B, and the
 * per-cluster Map happens to contain B's history under the same key. The
 * mismatch check is the load-bearing trust boundary.
 *
 * **CT-03 string→BigInt parsing.** `sequence` and `key_version` are
 * declared as string-encoded BigInt on the wire (per the cycle-005 RC2
 * patch covering arbitrarily-large coordinator counters). Comparison
 * happens at the BigInt boundary using a deterministic parser that
 * rejects non-numeric strings with `SEQUENCE_INVALID_INPUT` rather than
 * throwing — `BigInt()` throws on malformed input which would surface as
 * an uncaught exception inside the evaluator. The parser-without-throw
 * pattern follows the sprint-A3.3 AC clause "no try/catch" by
 * pre-validating the string against a numeric regex before invoking
 * `BigInt()`.
 *
 * **NA-1 expected_prior_hash usage.** This builtin does NOT consume the
 * `expected_prior_hash` field — that's FR-C3 territory. NA-1 only
 * applies to `chain_validator_prev_hash`.
 *
 * **Three failure modes:**
 *   - `CLUSTER_ID_MISMATCH` — record's cluster_id ≠ state's cluster_id
 *     (CT-08 precedence).
 *   - `KEY_VERSION_REGRESSION` — record's key_version < last-observed
 *     key_version for this cluster.
 *   - `SEQUENCE_MONOTONIC_VIOLATION` — record's sequence ≤ last-observed
 *     sequence for this `(cluster_id, signer_id, key_version)` triple.
 *
 * **One deferred mode:**
 *   - `SEQUENCE_CONTEXT_DEFERRED` — state not supplied; obligation
 *     deferred to consumer.
 *
 * @see SDD section 5.5.3 — Per-cluster sequence monotonicity (NORMATIVE)
 * @see PR-A3.2 §FR-A3 — companion vocabulary-drift dispatch pattern
 * @since v8.6.0 — FR-C2 (with CT-08 + CT-03)
 */

/**
 * Numeric-string regex (decimal, no sign, no leading zero except for "0"
 * itself). Pre-validates string-encoded BigInts so `BigInt()` doesn't
 * throw on malformed input — keeps the evaluator's no-try/catch
 * invariant.
 */
const NUMERIC_STRING_RE = /^(0|[1-9][0-9]*)$/;

export type SequenceBuiltinErrorCode =
  | 'CLUSTER_ID_MISMATCH'
  | 'KEY_VERSION_REGRESSION'
  | 'SEQUENCE_MONOTONIC_VIOLATION'
  | 'SEQUENCE_CONTEXT_DEFERRED'
  | 'SEQUENCE_INVALID_INPUT';

export interface SequenceBuiltinDiagnostic {
  code: SequenceBuiltinErrorCode;
  message: string;
  /** The cluster_id the violation applied to (when relevant). */
  cluster_id?: string;
  /** The signer_id the violation applied to (when relevant). */
  signer_id?: string;
  /** Last-observed value (sequence or key_version) on the violation path. */
  last_observed?: string;
  /** Asserted value (sequence or key_version) on the violation path. */
  asserted?: string;
}

/**
 * Per-cluster sequence-monotonicity state. Each cluster's history is keyed
 * by `(signer_id, key_version)` so a key-rotation overlap window does not
 * regress the sequence counter.
 */
export interface SequenceClusterState {
  /** Cluster identifier this state applies to. CT-08 mismatch check uses this. */
  cluster_id: string;
  /** Highest key_version ever observed for this cluster. Set even on key rotation. */
  highest_key_version: string;
  /** Per-(signer_id, key_version) last-observed sequence values. */
  last_sequence: ReadonlyMap<string, string>;
}

export interface EvaluateSequenceMonotonicResult {
  valid: boolean;
  diagnostic?: SequenceBuiltinDiagnostic;
}

/**
 * Compose the `(signer_id, key_version)` key used for the per-cluster
 * `last_sequence` map. Keeping this as a single concatenation function
 * makes the cross-runner contract explicit: the format is stable.
 */
export function composeSequenceKey(signerId: string, keyVersion: string): string {
  return `${signerId}|${keyVersion}`;
}

/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseSequenceMonotonicPerCluster()`
 * returns a boolean; direct callers wanting the structured diagnostic
 * should use this entry point.
 *
 * Argument shape:
 *   `sequence_monotonic_per_cluster(record, cluster_id_field, signer_id_field, sequence_field, key_version_field, state?)`
 */
export function evaluateSequenceMonotonicPerCluster(
  record: unknown,
  clusterIdField: string,
  signerIdField: string,
  sequenceField: string,
  keyVersionField: string,
  state: SequenceClusterState | undefined,
): EvaluateSequenceMonotonicResult {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return {
      valid: false,
      diagnostic: {
        code: 'SEQUENCE_INVALID_INPUT',
        message: 'sequence_monotonic_per_cluster: record argument must be a non-array object',
      },
    };
  }
  const rec = record as Record<string, unknown>;
  const clusterId = rec[clusterIdField];
  const signerId = rec[signerIdField];
  const sequence = rec[sequenceField];
  const keyVersion = rec[keyVersionField];

  if (
    typeof clusterId !== 'string' ||
    typeof signerId !== 'string' ||
    typeof sequence !== 'string' ||
    typeof keyVersion !== 'string'
  ) {
    return {
      valid: false,
      diagnostic: {
        code: 'SEQUENCE_INVALID_INPUT',
        message:
          'sequence_monotonic_per_cluster: cluster_id, signer_id, sequence, and ' +
          'key_version must all resolve to string values on the record',
      },
    };
  }

  // CT-08: cluster-id mismatch FIRST, before any state lookup. The mismatch
  // check is the load-bearing trust boundary — a state lookup that crosses
  // clusters could silently succeed because the per-cluster Map happens to
  // contain the other cluster's history under the same composite key.
  if (state !== undefined && state.cluster_id !== clusterId) {
    return {
      valid: false,
      diagnostic: {
        code: 'CLUSTER_ID_MISMATCH',
        message:
          `sequence_monotonic_per_cluster: record cluster_id "${clusterId}" does not ` +
          `match state cluster_id "${state.cluster_id}". The state lookup MUST NOT ` +
          'cross clusters — fix the consumer call site to dispatch to the correct ' +
          'cluster\'s state, or treat this as a misrouted record.',
        cluster_id: clusterId,
      },
    };
  }

  if (state === undefined) {
    return {
      valid: true,
      diagnostic: {
        code: 'SEQUENCE_CONTEXT_DEFERRED',
        message:
          'sequence_monotonic_per_cluster: per-cluster sequence state was not ' +
          'supplied via validate() options.sequenceState. The obligation is ' +
          'deferred to consumer-side evaluation; the consumer MUST maintain ' +
          'highest_key_version + last_sequence per cluster and reject records ' +
          'that regress either counter.',
        cluster_id: clusterId,
        signer_id: signerId,
      },
    };
  }

  // CT-03 boundary: parse sequence + key_version as BigInt without try/catch.
  // Pre-validate via numeric regex; reject malformed input as
  // SEQUENCE_INVALID_INPUT.
  if (!NUMERIC_STRING_RE.test(sequence) || !NUMERIC_STRING_RE.test(keyVersion)) {
    return {
      valid: false,
      diagnostic: {
        code: 'SEQUENCE_INVALID_INPUT',
        message:
          'sequence_monotonic_per_cluster: sequence and key_version MUST be ' +
          'decimal-numeric strings with no leading zero (except "0") and no sign. ' +
          'See CT-03 string-encoded-BigInt contract.',
      },
    };
  }
  if (!NUMERIC_STRING_RE.test(state.highest_key_version)) {
    return {
      valid: false,
      diagnostic: {
        code: 'SEQUENCE_INVALID_INPUT',
        message:
          'sequence_monotonic_per_cluster: state.highest_key_version is malformed ' +
          '(must match the same CT-03 numeric-string contract).',
      },
    };
  }

  const recordKeyVersion = BigInt(keyVersion);
  const stateHighestKeyVersion = BigInt(state.highest_key_version);

  // Key-version monotonicity: record's key_version may equal or exceed the
  // highest-observed key_version, but it MUST NOT regress.
  if (recordKeyVersion < stateHighestKeyVersion) {
    return {
      valid: false,
      diagnostic: {
        code: 'KEY_VERSION_REGRESSION',
        message:
          `sequence_monotonic_per_cluster: record key_version "${keyVersion}" is ` +
          `less than the highest-observed key_version "${state.highest_key_version}" ` +
          'for this cluster. Key rotation is monotonic; a regression indicates ' +
          'replay or producer misconfiguration.',
        cluster_id: clusterId,
        signer_id: signerId,
        last_observed: state.highest_key_version,
        asserted: keyVersion,
      },
    };
  }

  // Sequence monotonicity within (signer_id, key_version) window.
  const compositeKey = composeSequenceKey(signerId, keyVersion);
  const lastSequenceStr = state.last_sequence.get(compositeKey);
  if (lastSequenceStr !== undefined) {
    if (!NUMERIC_STRING_RE.test(lastSequenceStr)) {
      return {
        valid: false,
        diagnostic: {
          code: 'SEQUENCE_INVALID_INPUT',
          message:
            `sequence_monotonic_per_cluster: state last_sequence value for ` +
            `"${compositeKey}" is malformed.`,
        },
      };
    }
    const recordSequence = BigInt(sequence);
    const lastSequence = BigInt(lastSequenceStr);
    if (recordSequence <= lastSequence) {
      return {
        valid: false,
        diagnostic: {
          code: 'SEQUENCE_MONOTONIC_VIOLATION',
          message:
            `sequence_monotonic_per_cluster: record sequence "${sequence}" is ` +
            `not strictly greater than last-observed "${lastSequenceStr}" for ` +
            `(signer "${signerId}", key_version "${keyVersion}"). Sequence ` +
            'must increase strictly per (signer, key_version) tuple.',
          cluster_id: clusterId,
          signer_id: signerId,
          last_observed: lastSequenceStr,
          asserted: sequence,
        },
      };
    }
  }

  return { valid: true };
}
