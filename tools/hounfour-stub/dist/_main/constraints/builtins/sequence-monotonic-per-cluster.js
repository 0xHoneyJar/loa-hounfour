/**
 * `sequence_monotonic_per_cluster` constraint builtin (FR-C2, v8.6.0).
 *
 * State-bearing per-cluster monotonicity check. Asserts that for a given
 * cluster and key-version, the validating record's `sequence` is strictly
 * greater than the last-observed sequence, and that the `key_version`
 * itself never regresses across the cluster's history.
 *
 * **Precedence ladder.** The check order inside this builtin is fixed
 * and load-bearing — each step is a documented gate that must run before
 * the next can be trusted:
 *
 *   1. Record shape validation (record is non-null, non-array object).
 *   2. Field type validation (signer_id, sequence, key_version etc.
 *      resolve to strings on the record).
 *   3. State runtime-shape validation (`state.last_sequence` is a `Map`
 *      instance; required because TypeScript type erasure can't enforce
 *      runtime shape across consumer trust boundaries — iter-1 HIGH
 *      F-002/F-003 mitigation).
 *   4. **CT-08 cluster-id mismatch** (record cluster_id ≠ state
 *      cluster_id). Fires BEFORE any state-map `.get` lookup so a
 *      cross-cluster lookup cannot silently succeed.
 *   5. **CT-03 numeric-regex pre-validation** (rejects malformed
 *      string-encoded BigInts before invoking `BigInt()`). Fires BEFORE
 *      the state-absent branch — iter-3 MEDIUM F11 mitigation —
 *      because deferring on malformed input is the wrong-failure-mode
 *      trap (Postel's Law walk-back per Google AIP-210). A '007'
 *      sequence is a data-shape error regardless of state presence;
 *      surfacing SEQUENCE_INVALID_INPUT immediately gives operators the
 *      actionable diagnostic.
 *   6. State-absent (deferred) branch (returns `valid: true` +
 *      `SEQUENCE_CONTEXT_DEFERRED` diagnostic when the consumer didn't
 *      supply state).
 *   7. Key-version monotonicity (`KEY_VERSION_REGRESSION` if record's
 *      key_version < state's highest_key_version).
 *   8. Sequence monotonicity (`SEQUENCE_MONOTONIC_VIOLATION` if record's
 *      sequence ≤ last-observed sequence for the
 *      `(signer_id, key_version)` composite key).
 *
 * Reordering these steps would break load-bearing invariants: shape
 * validation gates type-safe access; runtime-shape validation gates
 * `.get` calls; CT-08 gates the state-map lookup; CT-03 gates `BigInt()`
 * construction. The CT-08 spy-test (`'CT-08 mismatch check fires BEFORE
 * last_sequence Map.get is called'`) locks the cluster-id-precedes-lookup
 * ordering structurally — moving CT-08 below the state lookup would fail
 * the test.
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
/**
 * Compose the `(signer_id, key_version)` key used for the per-cluster
 * `last_sequence` map.
 *
 * Uses **`JSON.stringify` injective serialization** rather than a delimiter
 * character. A naive delimiter (e.g. `${signerId}|${keyVersion}`) is
 * forgeable when either component admits the delimiter character — e.g.
 * `('a|b', 'c')` and `('a', 'b|c')` would collide on `"a|b|c"`, producing
 * a cross-signer state-collision in a security-relevant map. Iter-1
 * bridge consensus (HIGH F-CVE-class) flagged this as the same bug class
 * behind CVE-2020-1971 (OpenSSL) and SAML signature-wrapping attacks.
 *
 * `JSON.stringify([signerId, keyVersion])` produces an injective encoding
 * for any string content: the JSON array form preserves ordinal
 * separation via length-prefixed structure (each string is bracketed by
 * `"..."` with internal special characters escaped) and the array shape
 * itself is unambiguous.
 *
 * **Cross-runner scope clarification (iter-2 LOW F6).** The composite
 * key is **runner-local** — it is used as a JS Map key inside this
 * builtin and is never serialized across the wire. Cross-language
 * runners reimplementing this check use whatever injective composite-key
 * encoding their language idiomatically supports (Go: `[2]string`-keyed
 * map; Python: tuple-keyed dict; Rust: `(String, String)`-keyed `HashMap`)
 * — the contract is *injectivity within the runner*, not byte-stability
 * across runners. If a future cycle moves composite keys onto the wire
 * (e.g. for cross-runner state-replay vectors), the canonical
 * serialization SHOULD be RFC 8785 JCS rather than this `JSON.stringify`
 * call (which uses ECMAScript JSON rules — not JCS — for whitespace and
 * Unicode handling). For v8.6.0 scope, the within-runner injectivity is
 * sufficient.
 *
 * @see iter-1 bridge finding "Composite key uses a potentially unsafe delimiter"
 */
export function composeSequenceKey(signerId, keyVersion) {
    return JSON.stringify([signerId, keyVersion]);
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
export function evaluateSequenceMonotonicPerCluster(record, clusterIdField, signerIdField, sequenceField, keyVersionField, state) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return {
            valid: false,
            diagnostic: {
                code: 'SEQUENCE_INVALID_INPUT',
                message: 'sequence_monotonic_per_cluster: record argument must be a non-array object',
            },
        };
    }
    const rec = record;
    const clusterId = rec[clusterIdField];
    const signerId = rec[signerIdField];
    const sequence = rec[sequenceField];
    const keyVersion = rec[keyVersionField];
    if (typeof clusterId !== 'string' ||
        typeof signerId !== 'string' ||
        typeof sequence !== 'string' ||
        typeof keyVersion !== 'string') {
        return {
            valid: false,
            diagnostic: {
                code: 'SEQUENCE_INVALID_INPUT',
                message: 'sequence_monotonic_per_cluster: ' +
                    `${clusterIdField}, ${signerIdField}, ${sequenceField}, and ${keyVersionField} ` +
                    'must all resolve to string values on the record (iter-3 LOW 8e36 — ' +
                    'dynamic field names mirror sibling builtins).',
            },
        };
    }
    // F-002/F-003 mitigation (iter-1 HIGH): runtime shape validation for
    // state. TypeScript's structural type "ReadonlyMap" evaporates at runtime;
    // a consumer passing a plain object, a deserialized JSON shape, or null
    // would invoke `.get` on a non-Map and throw an uncaught TypeError at a
    // security boundary. Validate the shape explicitly before any field
    // access, returning the structured SEQUENCE_INVALID_INPUT diagnostic on
    // mismatch.
    if (state !== undefined && !(state.last_sequence instanceof Map)) {
        return {
            valid: false,
            diagnostic: {
                code: 'SEQUENCE_INVALID_INPUT',
                message: 'sequence_monotonic_per_cluster: state.last_sequence must be a Map ' +
                    'instance. Consumer-supplied state crosses a trust boundary; the ' +
                    'library validates the runtime shape rather than relying on ' +
                    'TypeScript type erasure.',
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
                message: `sequence_monotonic_per_cluster: record cluster_id "${clusterId}" does not ` +
                    `match state cluster_id "${state.cluster_id}". The state lookup MUST NOT ` +
                    'cross clusters — fix the consumer call site to dispatch to the correct ' +
                    'cluster\'s state, or treat this as a misrouted record.',
                cluster_id: clusterId,
            },
        };
    }
    // Iter-3 MEDIUM F11 mitigation: CT-03 numeric-regex pre-validation runs
    // BEFORE the state-absent deferral check. Rationale: deferring on
    // malformed input is the wrong-failure-mode trap (Postel's Law walk-back
    // per Google AIP-210 / HTTP/2 working group). A record with sequence
    // '007' is a data-shape error regardless of whether the consumer
    // supplied state — surfacing SEQUENCE_INVALID_INPUT immediately gives
    // operators the actionable diagnostic; deferring would silently pass
    // garbage upstream. The deferred branch (state-absent) covers
    // protocol-level state obligations, not data-shape obligations.
    if (!NUMERIC_STRING_RE.test(sequence) || !NUMERIC_STRING_RE.test(keyVersion)) {
        return {
            valid: false,
            diagnostic: {
                code: 'SEQUENCE_INVALID_INPUT',
                message: 'sequence_monotonic_per_cluster: sequence and key_version MUST be ' +
                    'decimal-numeric strings with no leading zero (except "0") and no sign. ' +
                    'See CT-03 string-encoded-BigInt contract.',
            },
        };
    }
    if (state === undefined) {
        return {
            valid: true,
            diagnostic: {
                code: 'SEQUENCE_CONTEXT_DEFERRED',
                message: 'sequence_monotonic_per_cluster: per-cluster sequence state was not ' +
                    'supplied via validate() options.sequenceState. The obligation is ' +
                    'deferred to consumer-side evaluation; the consumer MUST maintain ' +
                    'highest_key_version + last_sequence per cluster and reject records ' +
                    'that regress either counter.',
                cluster_id: clusterId,
                signer_id: signerId,
            },
        };
    }
    if (!NUMERIC_STRING_RE.test(state.highest_key_version)) {
        return {
            valid: false,
            diagnostic: {
                code: 'SEQUENCE_INVALID_INPUT',
                message: 'sequence_monotonic_per_cluster: state.highest_key_version is malformed ' +
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
                message: `sequence_monotonic_per_cluster: record key_version "${keyVersion}" is ` +
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
                    message: `sequence_monotonic_per_cluster: state last_sequence value for ` +
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
                    message: `sequence_monotonic_per_cluster: record sequence "${sequence}" is ` +
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
//# sourceMappingURL=sequence-monotonic-per-cluster.js.map