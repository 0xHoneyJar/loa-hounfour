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
   */
  reason?: UnverifiedObligationReason;
  /** Human explanation of the consumer obligation. */
  evaluation_note: string;
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
