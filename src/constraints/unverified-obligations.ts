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

import type { Constraint, ConstraintFile } from './types.js';

/**
 * One entry per runtime-deferred rule. The shape is normative across runners
 * — TS / Go / Python / Rust must all emit byte-identical entries for the
 * cross-runner conformance harness to pass.
 *
 * `consumer_acknowledgment_required` is pinned to `true` to keep the wire
 * shape uniform; the literal type prevents accidental opt-out by setting it
 * to `false` at the type level.
 *
 * **v8.5.0 widening (PR-A2.3)**: `evaluator` now carries `'runtime-deferred'`
 * | `'consumer'` | `'library'`, and an optional controlled-vocabulary
 * `reason` field surfaces *why* the rule is in the manifest. This widens
 * the v8.4.0 contract strict-additively — pre-v8.5.0 entries continue to
 * appear with `evaluator: 'runtime-deferred'`; new entries (notably the
 * ORD-3 context-absent manifest promotion + the `CRYPTO_DEFERRED` /
 * `INTEGRITY_DEFERRED` paths) populate the new values.
 */
export type UnverifiedObligationReason =
  | 'canonical_size_cap_exceeded'
  | 'chain_context_provided'
  | 'chain_ledger_mismatch'
  | 'chain_prev_hash_mismatch'
  | 'cluster_id_mismatch'
  | 'context_absent'
  | 'crypto_deferred'
  | 'integrity_deferred'
  | 'key_version_regression'
  | 'ledger_context_deferred'
  | 'nonce_context_deferred'
  | 'nonce_replay_detected'
  | 'pattern_matching'
  | 'percentiles_monotonic_violation'
  | 'scope_inheritance_violation'
  | 'scope_parent_context_deferred'
  | 'sequence_context_deferred'
  | 'sequence_monotonic_violation'
  | 'signer_key_id_mismatch'
  | 'signoff_plan_hash_mismatch'
  | 'signoff_ttl_observed'
  | 'utf8_byte_length_exceeded'
  | 'vocabulary_drift';

export interface UnverifiedObligationEntry {
  /** Stable rule identifier (e.g., `"ORD-1"`, `"ORD-2"`, `"ORD-3"`, `"CRYPTO_DEFERRED"`). */
  rule_id: string;
  /** Verbatim rule text from the constraint file (narrative or DSL). */
  rule: string;
  /**
   * Class-of-evaluator carrying this rule. `'runtime-deferred'` is the v8.4.0
   * default for cross-record / temporal obligations; `'consumer'` is the
   * v8.5.0 addition for context-absent or crypto-deferred obligations the
   * library *could* in principle verify but explicitly does not by ADR-010
   * boundary; `'library'` is the v8.5.0 transparency entry for rules the
   * library DID evaluate (currently only emitted in soft-warning mode).
   */
  evaluator: 'runtime-deferred' | 'consumer' | 'library';
  /**
   * Optional controlled-vocabulary explainer for the entry's *cause*.
   * `context_absent` — the consumer didn't supply auxiliary validation
   * context (e.g., granted_by_chain_records for ORD-3).
   * `crypto_deferred` — the schema is `x-crypto-bearing` and the consumer
   * opted in to shape-only validation.
   * `integrity_deferred` — the schema carries a content-addressed hash
   * (subject_hash / pack_hash / etc.) the library does not recompute.
   * `pattern_matching` — pattern-matched obligation (reserved for future
   * pattern-DSL rules).
   * `vocabulary_drift` — value lies outside a canonical vocabulary
   * (currently ORD-5 capability_scope; surfaced at validate() time in
   * v8.6.0 per FR-A3).
   * `chain_context_provided` — FR-A4 (v8.6.0) opt-in acknowledgment that
   * the consumer supplied `chainContext.granted_by_chain_records` and
   * accepts the v9.0.0 fail-closed semantics ahead of the default flip.
   *
   * The following members were added in PR-A3.3 (v8.6.0, FR-C1/C2/C3) for
   * the new state-bearing constraint builtins. Each maps one-to-one to a
   * structured diagnostic code emitted by the corresponding builtin in
   * `src/constraints/builtins/*.ts`.
   *
   * **TODO(PR-A3.4): emission-site integration** — these 8 members are
   * present on the union (so consumers' TypeScript discriminated-union
   * checks compile) but are NOT yet emitted by `validate()` directly.
   * The standalone evaluators (`evaluateNonceUniquePerSignerWindow`
   * etc.) emit them as the `code` field on their structured diagnostic
   * surfaces; `validate()` will surface them as manifest entries via
   * the metadata-flag dispatch pattern (`'x-nonce-bearing'` /
   * `'x-sequence-bearing'` / `'x-chain-validator-bearing'`) when the
   * FR-B2 PhaseCompletionEnvelopeSchema lands in PR-A3.4. The bridge
   * iter-3 review (F-001) flagged this as a "dead-enum risk" surface
   * — the breadcrumb here documents the integration path so future
   * reviewers don't conclude the union members are orphaned.
   *
   * `nonce_replay_detected` — FR-C1: a `(signer_id, nonce)` pair within the
   *   sliding-window range was already observed for this signer; the second
   *   appearance is a replay candidate. Cross-record state-bearing.
   * `nonce_context_deferred` — FR-C1: nonce-window state was not supplied
   *   to validate(); the obligation is surfaced for consumer-side
   *   evaluation (mirrors the ORD-3 `context_absent` pattern).
   * `sequence_monotonic_violation` — FR-C2: the parsed sequence number
   *   was less than or equal to the last-observed sequence for this
   *   `(cluster_id, signer_id, key_version)` triple; the chain has
   *   regressed.
   * `sequence_context_deferred` — FR-C2: the per-cluster sequence state
   *   was not supplied to validate(); deferred to consumer.
   * `key_version_regression` — FR-C2: the parsed `key_version` was less
   *   than the last-observed key_version for this cluster; key-rotation
   *   went backward (which the protocol forbids).
   * `chain_ledger_mismatch` — FR-C3: the audit-ledger's
   *   `expected_prior_hash` for the validating record differs from the
   *   `previous_hash` value the chain itself records — a divergence
   *   between the consumer's persistent ledger and the chain payload
   *   (NA-1: the field MUST be cross-checked, not just declared).
   * `chain_prev_hash_mismatch` — FR-C3: within the supplied chain, a
   *   record's `previous_hash` does not equal its predecessor's
   *   `entry_hash`; the chain has been tampered or assembled wrong.
   * `cluster_id_mismatch` — FR-C2 / shared: the validating record's
   *   `cluster_id` does not match the cluster declared by the supplied
   *   state (CT-08: this check fires BEFORE any state-map lookup so a
   *   cross-cluster lookup cannot succeed silently).
   *
   * The following 3 members were added in PR-A3.6 (v8.6.0, FR-C4) for
   * the `plan_content_hash_unchanged_since_signoff` builtin. Unlike the
   * FR-C1/C2/C3 builtins where the manifest entry only fires on
   * deferral or violation, FR-C4 also emits a manifest entry on the
   * PASS path (NA-3 / RC2 SKP-006) so consumers cannot accidentally
   * validate plan-hash without seeing the TTL inputs the signoff
   * ledger carries.
   *
   * `ledger_context_deferred` — FR-C4: the consumer did not supply a
   *   signoff ledger snapshot via validate() options; the obligation
   *   is surfaced for consumer-side evaluation (mirrors the
   *   `chain_context_provided` deferral pattern).
   * `signoff_plan_hash_mismatch` — FR-C4: the supplied snapshot exists
   *   but does not contain a signoff matching the validating record's
   *   `plan_content_hash`. The plan content has changed since signoff
   *   or the signoff was never recorded.
   * `signoff_ttl_observed` — FR-C4: the validating `plan_content_hash`
   *   matched a signoff in the ledger; the manifest entry surfaces
   *   `ts_emit + ttl_until_ms` so the consumer can evaluate signoff
   *   expiry deliberately (NA-3). Hounfour does NOT decide what
   *   "expired" means (ADR-010); the entry fires on hash-match
   *   regardless of age.
   *
   * The following 2 members were added in v8.8.0 (SDD §1, FR-C1) for the
   * ScopeOfAutonomy inheritance check:
   *
   * `scope_parent_context_deferred` — the scope names a `parent_scope_id`
   *   but the resolved parent scope was not supplied; the consumer MUST
   *   run the inheritance check against the resolved parent.
   * `scope_inheritance_violation` — the child scope grants more than its
   *   parent scope (a sub-goal, budget, tool, data-access mode or time
   *   bound outside the parent's).
   *
   * Every member has a row in `UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT`
   * (v8.8.0, SDD §3) telling the consumer what to do with the entry.
   */
  reason?: UnverifiedObligationReason;
  /** Human explanation of the consumer obligation. */
  evaluation_note: string;
  /**
   * One yes/no question a human approver answers for this entry, copied
   * from `UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason]`. Present exactly
   * when `reason` is present; entries without a `reason` carry no
   * judgement. Optional and additive (v8.8.0, SDD §3).
   */
  judgement_requested?: string;
  /**
   * `'MUST'` or `'SHOULD'`, copied from the contract row for `reason`.
   * Present exactly when `reason` is present. Optional and additive
   * (v8.8.0, SDD §3).
   */
  consumer_obligation_level?: ConsumerObligationLevel;
  /** Always `true` — pinned to keep the wire shape uniform. */
  consumer_acknowledgment_required: true;
}

/**
 * Manifest emitted by the library at validation time when at least one
 * runtime-deferred rule applies to the schema being validated.
 *
 * When NO runtime-deferred rules apply, the manifest field is OMITTED from
 * the validation result entirely (not `null`, not `undefined` via key) — see
 * SDD section 5.8 pass-3-followup. Consumers derive "no obligations" from
 * absence (`'unverified_obligations' in result` or `if (result.unverified_obligations)`).
 */
export interface UnverifiedObligationsManifest {
  /** `$id` of the schema these obligations apply to. */
  schema_id: string;
  /** Protocol contract version the manifest was emitted under (e.g., `"8.4.0"`). */
  contract_version: string;
  /** One entry per runtime-deferred rule found in the schema's constraint file. */
  unverified_rules: UnverifiedObligationEntry[];
  /** ISO 8601 timestamp at which this manifest was emitted. */
  manifest_emitted_at: string;
}

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
export function buildUnverifiedObligationsManifest(
  file: ConstraintFile,
  emittedAt?: string,
): UnverifiedObligationsManifest | undefined {
  const runtimeDeferred = file.constraints.filter(
    (c): c is Constraint & { evaluator: 'runtime-deferred' } =>
      c.evaluator === 'runtime-deferred',
  );

  if (runtimeDeferred.length === 0) return undefined;

  return {
    schema_id: file.schema_id,
    contract_version: file.contract_version,
    unverified_rules: runtimeDeferred.map((rule): UnverifiedObligationEntry => ({
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
export function hasUnverifiedObligations<
  T extends { unverified_obligations?: UnverifiedObligationsManifest },
>(result: T): result is T & { unverified_obligations: UnverifiedObligationsManifest } {
  return (
    result.unverified_obligations !== undefined
    && result.unverified_obligations.unverified_rules.length > 0
  );
}

// ---------------------------------------------------------------------------
// Consumer-obligation contract (v8.8.0, SDD §3 — FR-C4)
// ---------------------------------------------------------------------------

/**
 * Strength of a consumer obligation, in RFC 2119 terms. `'MUST'` means a
 * conforming consumer does not treat the record as authoritative until the
 * obligation is discharged; `'SHOULD'` means the consumer may proceed with a
 * recorded reason for deviating.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export type ConsumerObligationLevel = 'MUST' | 'SHOULD';

/**
 * What a consumer does with a manifest entry carrying a given `reason`.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export interface ConsumerObligation {
  /** RFC 2119 strength of the obligation. */
  level: ConsumerObligationLevel;
  /** What the consumer does with an entry carrying this reason. */
  action: string;
  /**
   * ONE sentence a human approver can answer yes/no. Always ends with a
   * question mark and is at most 200 characters (tested).
   */
  judgement_requested: string;
  /**
   * `true` when the planned v9.0.0 flip of the `x-chain-bearing` default
   * (`failClosed` becoming the default, so absent chain context is rejected
   * instead of surfaced) changes the `validate()` outcome for records whose
   * entries carry this reason.
   *
   * Current semantics, stated precisely: `x-crypto-bearing` schemas ALREADY
   * fail closed by default (`CRYPTO_DEFERRED` error unless the caller passes
   * `acceptDeferred: true`), so the flip does not affect `crypto_deferred` or
   * `integrity_deferred`. `x-chain-bearing` schemas are fail-open by default
   * until v9.0.0: absent chain context yields `valid: true` plus an ORD-3
   * entry with `reason: 'context_absent'`. After the flip that same record
   * yields `valid: false`, so only `context_absent` is marked `true`.
   *
   * Decision (SDD §3 ambiguity): `pattern_matching` is marked `false`. After
   * the flip a chain-bearing record WITH chain context still validates; the
   * entry's reason becomes `chain_context_provided` but the outcome does not
   * change.
   */
  affected_by_fail_closed_flip: boolean;
}

/**
 * Contract version at which the `x-chain-bearing` default flips to fail
 * closed. Planning target only; see MIGRATION.md "Planned v9.0.0 fail-closed
 * default flip".
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export const FAIL_CLOSED_DEFAULT_FLIP_VERSION = '9.0.0' as const;

function row(
  level: ConsumerObligationLevel,
  action: string,
  judgement_requested: string,
  affected_by_fail_closed_flip = false,
): Readonly<ConsumerObligation> {
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
export const UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT: Readonly<
  Record<UnverifiedObligationReason, Readonly<ConsumerObligation>>
> = Object.freeze({
  canonical_size_cap_exceeded: row(
    'MUST',
    'Reject the record or have the producer split it. Its canonical JSON form exceeds the byte cap the schema declares, so hash and storage bounds no longer hold.',
    'Is there an approved reason to accept this record although its canonical form exceeds the declared size cap?',
  ),
  chain_context_provided: row(
    'MUST',
    'Run the delegation-chain check over the supplied chain: acyclic, terminated at the genesis sentinel, depth at most 20. validate() records the fail-closed opt-in but does not evaluate the chain.',
    'Has the supplied delegation chain been checked to be acyclic, rooted at the genesis sentinel, and at most 20 deep?',
  ),
  chain_ledger_mismatch: row(
    'MUST',
    "Reject the record and investigate. The persistent ledger's expected prior hash differs from the previous_hash the chain payload records.",
    "Is there an approved explanation for why the audit ledger and the chain disagree on this record's prior hash?",
  ),
  chain_prev_hash_mismatch: row(
    'MUST',
    "Reject the chain. A record's previous_hash does not equal its predecessor's entry_hash, so the chain was altered or assembled out of order.",
    "Has the chain been reassembled so that every record's previous_hash equals its predecessor's entry_hash?",
  ),
  cluster_id_mismatch: row(
    'MUST',
    "Reject the record. Its cluster_id differs from the cluster of the supplied state, so no state lookup applies to it.",
    "Has this record been re-checked against state from its own cluster rather than another cluster's state?",
  ),
  context_absent: row(
    'MUST',
    'Assemble the delegation chain back to the genesis sentinel and either pass it to validate() as chainContext or run the chain check yourself. From v9.0.0 this record is rejected without chain context.',
    'Has the delegation chain for this record been assembled and verified back to the genesis sentinel?',
    true,
  ),
  crypto_deferred: row(
    'MUST',
    'Verify the signature against the public key of the signer entry that produced it before treating the record as authoritative. validate() checked shape only.',
    "Has the signature been verified against the signer's registered public key?",
  ),
  integrity_deferred: row(
    'MUST',
    'Recompute the content hash over the canonical JSON payload and reject the record on mismatch before treating it as integrity-verified.',
    'Has the content hash been recomputed over the canonical payload and found to match?',
  ),
  key_version_regression: row(
    'MUST',
    'Reject the record. Its key_version is lower than the last version observed for the cluster, and key rotation must not go backward.',
    'Is there an approved reason to accept a record signed with an older key version than one already observed?',
  ),
  ledger_context_deferred: row(
    'MUST',
    'Look up plan_content_hash in your persistent signoff ledger and evaluate signoff expiry from the matched ts_emit and recorded TTL.',
    'Has the plan hash been matched to an unexpired signoff in the signoff ledger?',
  ),
  nonce_context_deferred: row(
    'MUST',
    "Check, using your nonce state, that the (signer_id, nonce) pair has not been seen within the signer's window.",
    "Has the nonce been checked against the signer's recent nonces and found unused?",
  ),
  nonce_replay_detected: row(
    'MUST',
    'Reject the record as a replay candidate. The (signer_id, nonce) pair was already observed within the window.',
    'Is there an approved reason to accept this record although the same signer already used its nonce?',
  ),
  pattern_matching: row(
    'MUST',
    "Evaluate the pattern-matched obligation with your own pattern engine; the library surfaced it without evaluating it. Today validate() emits this reason only for ORD-3 when chain context is supplied, where it means running the delegation-chain check yourself.",
    'Has the pattern-matched obligation been evaluated and satisfied for this record?',
  ),
  percentiles_monotonic_violation: row(
    'MUST',
    'Reject the histogram. Its percentile values decrease somewhere, which no latency distribution can produce.',
    'Is there an approved reason to accept latency percentiles that are not non-decreasing?',
  ),
  scope_inheritance_violation: row(
    'MUST',
    'Reject the child scope. It grants more than its parent scope permits; the violation codes name each excess.',
    'Is there an approved reason to let this child scope exceed what its parent scope grants?',
  ),
  scope_parent_context_deferred: row(
    'MUST',
    'Resolve the parent scope named by parent_scope_id and run the scope-inheritance check against it. Treat the scope as unusable until the check passes.',
    'Has this scope been checked against its resolved parent scope and found to stay within it?',
  ),
  sequence_context_deferred: row(
    'MUST',
    'Check, using your sequence state, that the sequence number exceeds the last one observed for this (cluster_id, signer_id, key_version).',
    'Has the sequence number been checked to be higher than the last one seen for this signer and key version?',
  ),
  sequence_monotonic_violation: row(
    'MUST',
    'Reject the record. Its sequence number does not exceed the last one observed for its (cluster_id, signer_id, key_version).',
    'Is there an approved reason to accept a record whose sequence number does not advance past the last one seen?',
  ),
  signer_key_id_mismatch: row(
    'MUST',
    'Reject the record. signer_key_id does not equal the hash derived from signer_cluster_id and signer_key_version.',
    'Is there an approved reason to accept a signer_key_id that does not match its derivation from cluster and key version?',
  ),
  signoff_plan_hash_mismatch: row(
    'MUST',
    'Refuse to authorize the plan. No signoff in the supplied ledger matches its plan_content_hash, so the plan changed after signoff or was never signed off.',
    'Has a new signoff been recorded for the current plan content hash?',
  ),
  signoff_ttl_observed: row(
    'MUST',
    'Compare ttl_until_ms against the snapshot time or your clock. An expired signoff must not authorize plan execution; the library does not decide expiry.',
    'Is the matched signoff still within its TTL at the time the plan will execute?',
  ),
  utf8_byte_length_exceeded: row(
    'MUST',
    "Reject the record. A field's UTF-8 encoding exceeds its declared byte limit, even if its character count is within bounds.",
    'Is there an approved reason to accept a field whose UTF-8 encoding exceeds its declared byte limit?',
  ),
  vocabulary_drift: row(
    'SHOULD',
    'Treat the non-canonical capability_scope key as default trust and coordinate with the vocabulary maintainer before relying on it in policy.',
    'Has the vocabulary maintainer confirmed that this non-canonical capability_scope key may be relied on in policy?',
  ),
});

/**
 * Every `UnverifiedObligationReason`, sorted. Derived from the contract
 * table, which the `Record` type forces to be complete.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export const UNVERIFIED_OBLIGATION_REASONS: ReadonlyArray<UnverifiedObligationReason> =
  Object.freeze(
    (Object.keys(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT) as UnverifiedObligationReason[]).sort(),
  );

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
export function describeConsumerObligation(
  reason: UnverifiedObligationReason,
): ConsumerObligation {
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
 * The library applies it at exactly one layer: the `validate()` manifest
 * aggregation. Emitters (validate()'s own obligation sites and standalone
 * builtins such as `evaluatePlanContentHashUnchangedSinceSignoff`) produce
 * unannotated entries. Consumers that surface builtin entries or attach their
 * own (for example a `*_CONTEXT_DEFERRED` entry from a validate wrapper) pass
 * them through this helper.
 *
 * Idempotent: an entry that already carries the contract row's values is
 * returned as-is (same reference), so annotating twice is byte-identical to
 * annotating once. Values that differ from the row are replaced by the
 * row's values; the contract table, not the caller, is authoritative.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function withConsumerObligation(entry: UnverifiedObligationEntry): UnverifiedObligationEntry {
  if (entry.reason === undefined) return entry;
  const obligation = describeConsumerObligation(entry.reason);
  if (
    entry.judgement_requested === obligation.judgement_requested
    && entry.consumer_obligation_level === obligation.level
  ) {
    return entry;
  }
  return {
    ...entry,
    judgement_requested: obligation.judgement_requested,
    consumer_obligation_level: obligation.level,
  };
}
