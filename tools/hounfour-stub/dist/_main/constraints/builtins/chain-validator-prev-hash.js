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
export const DEFAULT_LEDGER_GENESIS_SENTINEL = 'genesis:cluster-ledger';
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
export function evaluateChainValidatorPrevHash(chain, entryHashField, previousHashField, state) {
    if (!Array.isArray(chain)) {
        return {
            valid: false,
            diagnostic: {
                code: 'CHAIN_INVALID_INPUT',
                message: 'chain_validator_prev_hash: chain argument must be an array',
            },
        };
    }
    // F-002 mitigation (iter-1 HIGH): runtime shape validation for state.
    // TypeScript's "ReadonlyMap" type evaporates at runtime; a consumer
    // passing a plain object or null would throw on `.get` and bypass the
    // structured CHAIN_INVALID_INPUT diagnostic. Validate the shape before
    // any field access.
    if (state !== undefined && !(state.expected_prior_hash instanceof Map)) {
        return {
            valid: false,
            diagnostic: {
                code: 'CHAIN_INVALID_INPUT',
                message: 'chain_validator_prev_hash: state.expected_prior_hash must be a Map ' +
                    'instance. Consumer-supplied state crosses a trust boundary; the ' +
                    'library validates the runtime shape rather than relying on ' +
                    'TypeScript type erasure.',
            },
        };
    }
    if (state === undefined) {
        return {
            valid: true,
            diagnostic: {
                code: 'CHAIN_CONTEXT_DEFERRED',
                message: 'chain_validator_prev_hash: audit-ledger state was not supplied via ' +
                    'validate() options.chainLedger. The obligation is deferred to ' +
                    'consumer-side evaluation; the consumer MUST cross-check each ' +
                    'record\'s previous_hash against (a) the predecessor\'s entry_hash ' +
                    'and (b) their persistent audit-ledger\'s expected_prior_hash.',
            },
        };
    }
    // Empty chain: nothing to validate.
    if (chain.length === 0) {
        return { valid: true };
    }
    const genesisSentinel = state.genesis_hash ?? DEFAULT_LEDGER_GENESIS_SENTINEL;
    for (let i = 0; i < chain.length; i++) {
        const record = chain[i];
        if (record === null || typeof record !== 'object' || Array.isArray(record)) {
            return {
                valid: false,
                diagnostic: {
                    code: 'CHAIN_INVALID_INPUT',
                    message: `chain_validator_prev_hash: chain[${i}] must be a non-array object`,
                    chain_index: i,
                },
            };
        }
        const rec = record;
        const entryHash = rec[entryHashField];
        const previousHash = rec[previousHashField];
        if (typeof entryHash !== 'string' || typeof previousHash !== 'string') {
            return {
                valid: false,
                diagnostic: {
                    code: 'CHAIN_INVALID_INPUT',
                    message: `chain_validator_prev_hash: chain[${i}] must carry string-typed ` +
                        `${entryHashField} and ${previousHashField} values`,
                    chain_index: i,
                },
            };
        }
        // Genesis position (first record).
        if (i === 0) {
            if (previousHash !== genesisSentinel) {
                return {
                    valid: false,
                    diagnostic: {
                        code: 'CHAIN_GENESIS_VIOLATION',
                        message: `chain_validator_prev_hash: chain[0].${previousHashField} = ` +
                            `"${previousHash}" but genesis sentinel is "${genesisSentinel}". ` +
                            'The first record in a cluster-event ledger chain MUST anchor at ' +
                            'the configured genesis sentinel.',
                        chain_index: 0,
                        chain_value: previousHash,
                        expected_value: genesisSentinel,
                    },
                };
            }
        }
        else {
            // Successor position: previous_hash must equal predecessor's entry_hash.
            const predecessor = chain[i - 1];
            const predecessorEntryHash = predecessor[entryHashField];
            if (previousHash !== predecessorEntryHash) {
                return {
                    valid: false,
                    diagnostic: {
                        code: 'CHAIN_PREV_HASH_MISMATCH',
                        message: `chain_validator_prev_hash: chain[${i}].${previousHashField} = ` +
                            `"${previousHash}" but chain[${i - 1}].${entryHashField} = ` +
                            `"${predecessorEntryHash}". The chain link is broken — the record ` +
                            'has been tampered or the chain has been assembled wrong.',
                        chain_index: i,
                        chain_value: previousHash,
                        expected_value: predecessorEntryHash,
                    },
                };
            }
        }
        // NA-1 audit-ledger cross-check: the consumer's expected_prior_hash for
        // this index MUST match the chain's on-payload previous_hash. When the
        // ledger has no entry for this index, no cross-check fires (the
        // consumer hasn't recorded an expectation yet).
        //
        // Ordering rationale (iter-1 LOW F5): chain-internal checks
        // (CHAIN_PREV_HASH_MISMATCH, CHAIN_GENESIS_VIOLATION) fire BEFORE the
        // NA-1 cross-check. Rationale: if the chain itself is internally
        // inconsistent, the on-payload `previous_hash` is already untrustworthy
        // and comparing it against the audit ledger would produce a misleading
        // `CHAIN_LEDGER_MISMATCH` (the chain might "match" the ledger by
        // coincidence even though it's broken). Surfacing the structural break
        // first gives operators the right signal: "this chain is malformed"
        // rather than "this chain disagrees with the ledger." Forensic triage
        // for tampering signals can still be reached by re-running with the
        // chain-internal break repaired; the NA-1 path then surfaces the
        // remaining ledger divergence.
        const expectedPriorHash = state.expected_prior_hash.get(i);
        if (expectedPriorHash !== undefined && expectedPriorHash !== previousHash) {
            return {
                valid: false,
                diagnostic: {
                    code: 'CHAIN_LEDGER_MISMATCH',
                    message: `chain_validator_prev_hash: chain[${i}].${previousHashField} = ` +
                        `"${previousHash}" but the audit ledger expected ` +
                        `"${expectedPriorHash}" at this index. The chain payload diverges ` +
                        'from the consumer\'s persistent ledger record (NA-1 cross-check).',
                    chain_index: i,
                    chain_value: previousHash,
                    expected_value: expectedPriorHash,
                },
            };
        }
    }
    return { valid: true };
}
//# sourceMappingURL=chain-validator-prev-hash.js.map