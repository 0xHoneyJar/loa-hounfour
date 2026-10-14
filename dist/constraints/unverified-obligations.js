/**
 * Unverified-Obligations Manifest — declarative report of consumer-side
 * obligations the library cannot evaluate.
 *
 * Per SDD section 5.8, when a constraint file contains rules with
 * `evaluator: 'runtime-deferred'`, the library evaluator skips them during
 * validation but emits them as a manifest so the calling consumer can:
 *
 *   1. Discover that the rule exists.
 *   2. Read the `evaluation_note` describing what to enforce.
 *   3. Acknowledge the obligation in its conformance suite (per the
 *      consumer-side `obligations-acked.yaml` contract).
 *
 * The manifest is the right boundary primitive for the library/runtime split:
 * the library STILL doesn't execute Ed25519 verification, append-only ledger
 * checks, or any other consumer concern — it just *reports the obligation*
 * in machine-readable form so the consumer cannot silently miss it.
 *
 * @see SDD section 5.8 — Unverified-Obligations Manifest Emission Contract
 * @see PRD section 5 NF-1c — Library/runtime boundary
 * @since v8.4.0 (FR-C1)
 */
/**
 * Build an `UnverifiedObligationsManifest` from a constraint file by selecting
 * rules tagged `evaluator: 'runtime-deferred'`. Returns `undefined` (NOT an
 * empty manifest, NOT `null`) when no runtime-deferred rules apply, so the
 * caller can omit the field from its result entirely.
 *
 * `evaluation_note` is required by the constraint-rule schema for any
 * runtime-deferred rule (per SDD section 3.6.0); when absent the helper
 * falls back to an empty string so the manifest shape stays well-formed,
 * but downstream linters SHOULD flag this case.
 *
 * @param file - Parsed constraint file (typically loaded from
 *               `constraints/<SchemaName>.constraints.json`).
 * @param emittedAt - Override the manifest timestamp; defaults to the current
 *                    wall-clock ISO 8601. Tests pass a frozen value.
 */
export function buildUnverifiedObligationsManifest(file, emittedAt) {
    const runtimeDeferred = file.constraints.filter((c) => c.evaluator === 'runtime-deferred');
    if (runtimeDeferred.length === 0)
        return undefined;
    return {
        schema_id: file.schema_id,
        contract_version: file.contract_version,
        unverified_rules: runtimeDeferred.map((rule) => ({
            rule_id: rule.id,
            rule: rule.expression,
            evaluator: 'runtime-deferred',
            evaluation_note: rule.evaluation_note ?? '',
            consumer_acknowledgment_required: true,
        })),
        manifest_emitted_at: emittedAt ?? new Date().toISOString(),
    };
}
/**
 * Type guard — returns `true` when a `ValidationResult`-shaped object carries
 * a non-empty `unverified_obligations` manifest. Lets consumers branch on
 * obligation presence without repeating the `'in result'` check.
 */
export function hasUnverifiedObligations(result) {
    return (result.unverified_obligations !== undefined
        && result.unverified_obligations.unverified_rules.length > 0);
}
/**
 * Contract version at which the `x-chain-bearing` default flips to fail
 * closed. Planning target only; see MIGRATION.md "Planned v9.0.0 fail-closed
 * default flip".
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export const FAIL_CLOSED_DEFAULT_FLIP_VERSION = '9.0.0';
function row(level, action, judgement_requested, affected_by_fail_closed_flip = false) {
    return Object.freeze({ level, action, judgement_requested, affected_by_fail_closed_flip });
}
/**
 * The consumer-obligation contract: one row per `UnverifiedObligationReason`.
 * The `Record` key type makes a missing row a compile error; the test suite
 * additionally checks every row's judgement sentence.
 *
 * `docs/conformance/manifest-consumption-level-1.md` renders this table via
 * `scripts/generate-manifest-contract-doc.ts`; a drift test keeps the two
 * byte-identical.
 *
 * Non-constraints (ADR-010):
 * - The table does NOT decide whether a record is authorized. It tells the
 *   consumer which question to ask; the consumer's approver answers it.
 * - The table is NOT exhaustive over consumer policy. A consumer MAY apply a
 *   stricter action than the row states; it MUST NOT apply a weaker one and
 *   still claim MC-1 conformance.
 * - `level` is NOT derived from the constraint rule's `severity`. Severity
 *   describes the rule; `level` describes what a consumer does on seeing the
 *   entry, which can be stricter (a `warning` rule can carry a MUST action).
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export const UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT = Object.freeze({
    canonical_size_cap_exceeded: row('MUST', 'Reject the record or have the producer split it. Its canonical JSON form exceeds the byte cap the schema declares, so hash and storage bounds no longer hold.', 'Is there an approved reason to accept this record although its canonical form exceeds the declared size cap?'),
    chain_context_provided: row('MUST', 'Run the delegation-chain check over the supplied chain: acyclic, terminated at the genesis sentinel, depth at most 20. validate() records the fail-closed opt-in but does not evaluate the chain.', 'Has the supplied delegation chain been checked to be acyclic, rooted at the genesis sentinel, and at most 20 deep?'),
    chain_ledger_mismatch: row('MUST', "Reject the record and investigate. The persistent ledger's expected prior hash differs from the previous_hash the chain payload records.", "Is there an approved explanation for why the audit ledger and the chain disagree on this record's prior hash?"),
    chain_prev_hash_mismatch: row('MUST', "Reject the chain. A record's previous_hash does not equal its predecessor's entry_hash, so the chain was altered or assembled out of order.", "Has the chain been reassembled so that every record's previous_hash equals its predecessor's entry_hash?"),
    cluster_id_mismatch: row('MUST', "Reject the record. Its cluster_id differs from the cluster of the supplied state, so no state lookup applies to it.", "Has this record been re-checked against state from its own cluster rather than another cluster's state?"),
    context_absent: row('MUST', 'Assemble the delegation chain back to the genesis sentinel and either pass it to validate() as chainContext or run the chain check yourself. From v9.0.0 this record is rejected without chain context.', 'Has the delegation chain for this record been assembled and verified back to the genesis sentinel?', true),
    crypto_deferred: row('MUST', 'Verify the signature against the public key of the signer entry that produced it before treating the record as authoritative. validate() checked shape only.', "Has the signature been verified against the signer's registered public key?"),
    integrity_deferred: row('MUST', 'Recompute the content hash over the canonical JSON payload and reject the record on mismatch before treating it as integrity-verified.', 'Has the content hash been recomputed over the canonical payload and found to match?'),
    key_version_regression: row('MUST', 'Reject the record. Its key_version is lower than the last version observed for the cluster, and key rotation must not go backward.', 'Is there an approved reason to accept a record signed with an older key version than one already observed?'),
    ledger_context_deferred: row('MUST', 'Look up plan_content_hash in your persistent signoff ledger and evaluate signoff expiry from the matched ts_emit and recorded TTL.', 'Has the plan hash been matched to an unexpired signoff in the signoff ledger?'),
    nonce_context_deferred: row('MUST', "Check, using your nonce state, that the (signer_id, nonce) pair has not been seen within the signer's window.", "Has the nonce been checked against the signer's recent nonces and found unused?"),
    nonce_replay_detected: row('MUST', 'Reject the record as a replay candidate. The (signer_id, nonce) pair was already observed within the window.', 'Is there an approved reason to accept this record although the same signer already used its nonce?'),
    pattern_matching: row('MUST', "Evaluate the pattern-matched obligation with your own pattern engine; the library surfaced it without evaluating it. Today validate() emits this reason only for ORD-3 when chain context is supplied, where it means running the delegation-chain check yourself.", 'Has the pattern-matched obligation been evaluated and satisfied for this record?'),
    percentiles_monotonic_violation: row('MUST', 'Reject the histogram. Its percentile values decrease somewhere, which no latency distribution can produce.', 'Is there an approved reason to accept latency percentiles that are not non-decreasing?'),
    scope_inheritance_violation: row('MUST', 'Reject the child scope. It grants more than its parent scope permits; the violation codes name each excess.', 'Is there an approved reason to let this child scope exceed what its parent scope grants?'),
    scope_parent_context_deferred: row('MUST', 'Resolve the parent scope named by parent_scope_id and run the scope-inheritance check against it. Treat the scope as unusable until the check passes.', 'Has this scope been checked against its resolved parent scope and found to stay within it?'),
    sequence_context_deferred: row('MUST', 'Check, using your sequence state, that the sequence number exceeds the last one observed for this (cluster_id, signer_id, key_version).', 'Has the sequence number been checked to be higher than the last one seen for this signer and key version?'),
    sequence_monotonic_violation: row('MUST', 'Reject the record. Its sequence number does not exceed the last one observed for its (cluster_id, signer_id, key_version).', 'Is there an approved reason to accept a record whose sequence number does not advance past the last one seen?'),
    signer_key_id_mismatch: row('MUST', 'Reject the record. signer_key_id does not equal the hash derived from signer_cluster_id and signer_key_version.', 'Is there an approved reason to accept a signer_key_id that does not match its derivation from cluster and key version?'),
    signoff_plan_hash_mismatch: row('MUST', 'Refuse to authorize the plan. No signoff in the supplied ledger matches its plan_content_hash, so the plan changed after signoff or was never signed off.', 'Has a new signoff been recorded for the current plan content hash?'),
    signoff_ttl_observed: row('MUST', 'Compare ttl_until_ms against the snapshot time or your clock. An expired signoff must not authorize plan execution; the library does not decide expiry.', 'Is the matched signoff still within its TTL at the time the plan will execute?'),
    utf8_byte_length_exceeded: row('MUST', "Reject the record. A field's UTF-8 encoding exceeds its declared byte limit, even if its character count is within bounds.", 'Is there an approved reason to accept a field whose UTF-8 encoding exceeds its declared byte limit?'),
    vocabulary_drift: row('SHOULD', 'Treat the non-canonical capability_scope key as default trust and coordinate with the vocabulary maintainer before relying on it in policy.', 'Has the vocabulary maintainer confirmed that this non-canonical capability_scope key may be relied on in policy?'),
});
/**
 * Every `UnverifiedObligationReason`, sorted. Derived from the contract
 * table, which the `Record` type forces to be complete.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export const UNVERIFIED_OBLIGATION_REASONS = Object.freeze(Object.keys(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT).sort());
/**
 * Look up the contract row for a reason.
 *
 * Decision (SDD §3 ambiguity): an unknown reason throws `TypeError` rather
 * than returning `undefined`. TypeScript callers cannot reach that branch;
 * JavaScript callers passing an unknown string get a loud failure instead of
 * a silently missing obligation.
 *
 * @throws TypeError when `reason` is not a member of the union.
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function describeConsumerObligation(reason) {
    if (!Object.prototype.hasOwnProperty.call(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT, reason)) {
        throw new TypeError(`describeConsumerObligation: unknown UnverifiedObligationReason ${JSON.stringify(reason)}`);
    }
    return UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason];
}
/**
 * Return `entry` with `judgement_requested` and `consumer_obligation_level`
 * filled from the contract row for its `reason`. Entries without a `reason`
 * are returned unchanged (no judgement). Never mutates its input.
 *
 * Every emission site in the library routes entries through this helper.
 * Consumers that attach their own entries (for example a `*_CONTEXT_DEFERRED`
 * entry from a validate wrapper) can use it too.
 *
 * Idempotent: an entry that already carries the contract row's values is
 * returned as-is (same reference), so annotating twice is byte-identical to
 * annotating once. Values that differ from the row are replaced by the
 * row's values; the contract table, not the caller, is authoritative.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function withConsumerObligation(entry) {
    if (entry.reason === undefined)
        return entry;
    const obligation = describeConsumerObligation(entry.reason);
    if (entry.judgement_requested === obligation.judgement_requested
        && entry.consumer_obligation_level === obligation.level) {
        return entry;
    }
    return {
        ...entry,
        judgement_requested: obligation.judgement_requested,
        consumer_obligation_level: obligation.level,
    };
}
//# sourceMappingURL=unverified-obligations.js.map