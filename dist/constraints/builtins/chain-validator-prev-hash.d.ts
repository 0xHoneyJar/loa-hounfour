/**
 * `chain_validator_prev_hash` constraint builtin (FR-C3, v8.6.0).
 *
 * Ledger-style chain validity check. Asserts (1) the validating record's
 * `previous_hash` field correctly references its predecessor's
 * `entry_hash`, (2) the chain terminates at a genesis-sentinel anchor,
 * AND (3) the audit-ledger's recorded `expected_prior_hash` for this
 * record matches the on-chain `previous_hash` value (NA-1).
 *
 * **Distinct from ORD-3.** ORD-3 (`is_valid_dag`, FR-A4 schema-flagged)
 * validates the *delegation* chain: a directed acyclic graph keyed by
 * `delegation_id` with `granted_by` edges terminating at the literal
 * sentinel `"genesis:org-public-key"`. FR-C3 instead validates a
 * *cluster-event* ledger chain: a linear chain of records each carrying
 * `entry_hash` + `previous_hash`, anchored at a per-cluster genesis
 * sentinel. Different shapes, different sentinels, different invariants.
 *
 * **Genesis sentinel.** The first record in a cluster-event chain
 * carries `previous_hash == "genesis:cluster-ledger"` (or the
 * cluster-specific genesis declared by `state.genesis_hash`). This is a
 * free parameter of the builtin so different cluster types can use
 * different genesis encodings; the default sentinel is documented but
 * not hard-coded.
 *
 * **NA-1 expected_prior_hash usage.** The audit-ledger surface (the
 * consumer's persistent record of what the chain *should* look like)
 * carries an `expected_prior_hash` field per logical chain position.
 * NA-1 (cycle-005 RC2 patch) closed the gap where this field was
 * declared but never cross-checked. This builtin fires
 * `CHAIN_LEDGER_MISMATCH` when the chain's on-payload `previous_hash`
 * differs from the audit-ledger's `expected_prior_hash` — the divergence
 * surfaces a tampered chain or a misaligned audit ledger.
 *
 * **Three failure modes:**
 *   - `CHAIN_PREV_HASH_MISMATCH` — within the supplied chain, a record's
 *     `previous_hash` does not equal its predecessor's `entry_hash`.
 *   - `CHAIN_LEDGER_MISMATCH` — the consumer's audit-ledger expectation
 *     diverges from the chain's actual `previous_hash` (NA-1).
 *   - `CHAIN_GENESIS_VIOLATION` — the chain's first record's
 *     `previous_hash` does not equal the configured genesis sentinel.
 *
 * **One deferred mode:**
 *   - `CHAIN_CONTEXT_DEFERRED` — chain context not supplied; obligation
 *     deferred to consumer (mirrors the ORD-3 deferral via the existing
 *     `'context_absent'` reason; this builtin uses the more specific
 *     `'CHAIN_CONTEXT_DEFERRED'` code in its diagnostic surface).
 *
 * @see SDD section 5.5.4 — Cluster-event ledger chain (NORMATIVE)
 * @see PR-A2.3 §ORD-3 — companion delegation-chain DAG check (different shape)
 * @since v8.6.0 — FR-C3 (with NA-1)
 */
/**
 * Default genesis-sentinel string for cluster-event ledger chains. The
 * sentinel is consumer-overridable via `state.genesis_hash` so different
 * cluster types can use different encodings; the default is documented
 * but not load-bearing. Distinct from the ORD-3 delegation-chain
 * sentinel (`"genesis:org-public-key"`).
 */
export declare const DEFAULT_LEDGER_GENESIS_SENTINEL = "genesis:cluster-ledger";
export type ChainValidatorErrorCode = 'CHAIN_PREV_HASH_MISMATCH' | 'CHAIN_LEDGER_MISMATCH' | 'CHAIN_GENESIS_VIOLATION' | 'CHAIN_CONTEXT_DEFERRED' | 'CHAIN_INVALID_INPUT';
export interface ChainValidatorDiagnostic {
    code: ChainValidatorErrorCode;
    message: string;
    /** Index in the supplied chain where the violation surfaced. */
    chain_index?: number;
    /** Hash value the chain itself recorded. */
    chain_value?: string;
    /** Hash value the audit ledger expected (NA-1 surface). */
    expected_value?: string;
}
/**
 * Cluster-event ledger chain state supplied by the consumer. The chain
 * itself is an array of records; the audit-ledger expected_prior_hash
 * map carries the consumer's persistent expectation per chain index
 * (NA-1 surface).
 */
export interface ChainLedgerState {
    /**
     * Genesis-sentinel value the chain's first record's `previous_hash`
     * MUST equal. Defaults to `DEFAULT_LEDGER_GENESIS_SENTINEL` when
     * unset.
     */
    genesis_hash?: string;
    /**
     * Audit-ledger surface: maps chain_index → expected previous_hash
     * value. NA-1 cross-check fires when this map's value at index `i`
     * differs from the chain's record's `previous_hash` at the same
     * index.
     */
    expected_prior_hash: ReadonlyMap<number, string>;
}
export interface EvaluateChainValidatorPrevHashResult {
    valid: boolean;
    diagnostic?: ChainValidatorDiagnostic;
}
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseChainValidatorPrevHash()` returns
 * a boolean; direct callers wanting the structured diagnostic should
 * use this entry point.
 *
 * Argument shape:
 *   `chain_validator_prev_hash(chain, entry_hash_field, previous_hash_field, state?)`
 *
 * @param chain - Array of cluster-event records, ordered from genesis-
 *                rooted to most-recent. Each record MUST contain string-
 *                typed `entry_hash_field` and `previous_hash_field`
 *                values.
 * @param entryHashField - Field name on each record carrying that
 *                         record's own hash.
 * @param previousHashField - Field name on each record carrying the
 *                            hash of the previous record (or the genesis
 *                            sentinel for the first record).
 * @param state - Audit-ledger state. When `undefined`, the diagnostic is
 *                `CHAIN_CONTEXT_DEFERRED` and `valid: true`.
 */
export declare function evaluateChainValidatorPrevHash(chain: unknown, entryHashField: string, previousHashField: string, state: ChainLedgerState | undefined): EvaluateChainValidatorPrevHashResult;
//# sourceMappingURL=chain-validator-prev-hash.d.ts.map