/**
 * `RevocationListSchema` — revoked signing key list (FR-G4, v8.7.0).
 *
 * The single shape for revoked-signing-key lists. Cluster verifiers
 * MUST consult this list before accepting any envelope signed under
 * a listed key. The list itself is signed and chained to prevent
 * quiet replacement.
 *
 * **Crypto-bearing AND chain-bearing**: full FR-A5 (ed25519 pattern
 * alignment) + FR-C1 (`nonce_unique_per_signer_window`) + FR-C2
 * (`sequence_monotonic_per_cluster`) + FR-C3 (`chain_validator_prev_hash`)
 * discipline applies. Default validation mode is shape-only (manifest
 * emits the `*_CONTEXT_DEFERRED` reasons per RL-2/3/4/6); fail-closed
 * is opt-in via `validate(..., { failClosed: true })` per cycle-005
 * FR-A4. Default-flip is v9.0.0 work.
 *
 * **Signed-payload boundary**: the `signature` field signs the
 * JCS-canonical-form bytes of the envelope payload with the
 * `signature` AND `quorum_signatures` fields OMITTED. Each entry in
 * `quorum_signatures[]` (when non-null) signs the SAME bytes as
 * `signature` does. See `docs/revocation-list-protocol.md` for the
 * step-by-step signing/verification procedure (consumer-implementer
 * guide; non-normative shape supplement).
 *
 * **Signer-compromise recovery (two layers)**:
 *
 * Layer 1 — Quorum signatures (consumer-policy m-of-n): when
 * `quorum_signatures` is non-null, cluster verifiers MUST validate
 * at least m-of-n signatures against the canonical-form payload
 * before trusting the list. Single-signer mode (`quorum_signatures:
 * null`) remains valid for clusters that don't need quorum; multi-
 * signer is opt-in. Hounfour ships the shape; `m` and `n` are
 * consumer-policy values surfaced via the protocol doc.
 *
 * Layer 2 — Root-of-trust binding: when `root_of_trust_id` is
 * non-null, consumer policy specifies a root-of-trust registry that
 * authorizes successor lists. Recovery procedure (consumer-side per
 * ADR-010): operators present compromise evidence; root-of-trust
 * authority publishes a successor list with the compromised
 * `signer_key_id` in `revoked_keys[]` and `prev_envelope_hash`
 * referencing the LAST-KNOWN-GOOD list. Fork reconciliation across
 * divergent chains is consumer policy; fully-shaped fork-
 * reconciliation envelopes are deferred to v8.8.0 (BL-6).
 *
 * **Schema-level invariants** (constraint file
 * `constraints/RevocationList.constraints.json` — RL-1..RL-12, with
 * RL-8 as an explicit non-constraint to prevent finding-rotation
 * per the PR-A3.8 lesson):
 *   - RL-1: `revoked_keys[*].key_id` distinct (LOCAL
 *     `array_field_distinct`; fourth use site after CRS-4, ISSA-2,
 *     SPS-2).
 *   - RL-2: `nonce` monotonic per `cluster_id` (consumer-state;
 *     manifest `REVOCATION_LIST_NONCE_MONOTONICITY_CONTEXT_DEFERRED`).
 *   - RL-3: `prev_envelope_hash` chain integrity (consumer-state;
 *     manifest `REVOCATION_LIST_CHAIN_CONTEXT_DEFERRED`).
 *   - RL-4: `signer_key_id` derives `signature` (consumer-state;
 *     manifest `REVOCATION_LIST_SIGNER_DERIVATION_CONTEXT_DEFERRED`).
 *   - RL-5: `signer_key_id` NOT in `revoked_keys[*].key_id` (LOCAL
 *     `field_not_in_array_field`; self-revocation lock per the
 *     anti-finding-rotation pre-emptive lock).
 *   - RL-6: `nonce` unique per signer window (consumer-state;
 *     manifest `REVOCATION_LIST_NONCE_WINDOW_CONTEXT_DEFERRED`).
 *   - RL-7: `revoked_keys[*].revoked_at` at-or-before `issued_at`
 *     (LOCAL `iso8601_ge_field` reused from PR-A4.3).
 *   - RL-8: NON-CONSTRAINT — empty `revoked_keys` admissible at
 *     non-genesis envelopes (no new revocations since predecessor).
 *     Explicit non-constraint documentation prevents bridge from
 *     surfacing this as a defect per the PR-A3.8 lesson.
 *   - RL-9: `valid_from` at-or-before `valid_until` when both
 *     non-null (LOCAL `iso8601_ge_field`).
 *   - RL-10: `valid_from` at-or-before `issued_at` (LOCAL
 *     `iso8601_ge_field`).
 *   - RL-11: `next_page_hash` chain integrity (consumer-state;
 *     manifest `REVOCATION_LIST_PAGINATION_CONTEXT_DEFERRED`).
 *   - RL-12: when `quorum_signatures` non-null,
 *     `quorum_signatures[*].signer_key_id` distinct AND
 *     `signer_key_id` is one of them (LOCAL `array_field_distinct`
 *     + NEW LOCAL `field_in_array_field`).
 *
 * **Anti-finding-rotation pre-emptive locks** (per PR-A3.8 lesson):
 * RL-8 documented non-constraint; RL-5 self-revocation lock;
 * `revoked_keys` maxItems 4096 (DoS guard); `quorum_signatures`
 * maxItems 32 (DoS guard); `revocation_evidence_hash` optional
 * (consumer policy decides); `valid_until: null` admissible (open-
 * ended validity); `next_page_hash: null` admissible (last page in
 * chain); `root_of_trust_id` optional with bootstrap pattern
 * documented in the protocol doc.
 *
 * **`$id` convention** (mirrors CanonicalRun / PhaseKind /
 * ClusterRunSeries / InterSeriesScopingArtifact /
 * SubscriptionPoolState precedent): the TypeBox-internal `$id`
 * values declared in this file (`'RevocationList'`,
 * `'RevocationReason'`, `'RevocationListEntry'`,
 * `'QuorumSignatureEntry'`) are short tokens used by the TypeBox
 * type system for self-reference within the runtime. They are
 * **overridden at JSON Schema generation time** by
 * `scripts/generate-schemas.ts` (line ~607) to the canonical
 * versioned URI form. Standalone JSON Schema consumers only ever
 * see the URI form. The nested-`$id` values on sub-schemas are
 * stripped by `scripts/schema-postprocess.ts#stripNestedIds`.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.4
 * @see ADR-010 — class-vs-policy boundary (consumer-side
 *      signature/chain verification; hounfour ships shape + manifest
 *      reason codes).
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
import { type Static } from '@sinclair/typebox';
/**
 * `RevocationReasonSchema` — locked 5-member revocation classifier.
 *
 * Promotion to a discriminated union — e.g. `compromise` carries
 * severity, `governance_action` carries proposal_id — is deferred to
 * v8.8.0+ pending consumer-corpus signal. v8.7.0 ships the union of
 * literals.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare const RevocationReasonSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"compromise">, import("@sinclair/typebox").TLiteral<"rotation">, import("@sinclair/typebox").TLiteral<"governance_action">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"manual">]>;
export type RevocationReason = Static<typeof RevocationReasonSchema>;
/**
 * `QuorumSignatureEntrySchema` — one entry in
 * `RevocationListSchema.quorum_signatures`. Each entry signs the
 * SAME bytes as the primary `signature` field (per the signed-
 * payload boundary documented in the file-level JSDoc).
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare const QuorumSignatureEntrySchema: import("@sinclair/typebox").TObject<{
    signer_key_id: import("@sinclair/typebox").TString;
    signature: import("@sinclair/typebox").TString;
}>;
export type QuorumSignatureEntry = Static<typeof QuorumSignatureEntrySchema>;
/**
 * `RevocationListEntrySchema` — one per-key entry in
 * `RevocationListSchema.revoked_keys`. Hoisted so cross-runner
 * conformance suites can validate per-element shape independently
 * of the parent envelope.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare const RevocationListEntrySchema: import("@sinclair/typebox").TObject<{
    key_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"compromise">, import("@sinclair/typebox").TLiteral<"rotation">, import("@sinclair/typebox").TLiteral<"governance_action">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"manual">]>;
    revoked_at: import("@sinclair/typebox").TString;
    revocation_evidence_hash: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type RevocationListEntry = Static<typeof RevocationListEntrySchema>;
export declare const RevocationListSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"revocation_list">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.7.0">;
    cluster_id: import("@sinclair/typebox").TString;
    list_id: import("@sinclair/typebox").TString;
    issued_at: import("@sinclair/typebox").TString;
    valid_from: import("@sinclair/typebox").TString;
    valid_until: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    max_staleness_seconds: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TInteger, import("@sinclair/typebox").TNull]>;
    nonce: import("@sinclair/typebox").TInteger;
    prev_envelope_hash: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    next_page_hash: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    revoked_keys: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        key_id: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"compromise">, import("@sinclair/typebox").TLiteral<"rotation">, import("@sinclair/typebox").TLiteral<"governance_action">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"manual">]>;
        revoked_at: import("@sinclair/typebox").TString;
        revocation_evidence_hash: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
    signer_key_id: import("@sinclair/typebox").TString;
    signature: import("@sinclair/typebox").TString;
    quorum_signatures: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        signer_key_id: import("@sinclair/typebox").TString;
        signature: import("@sinclair/typebox").TString;
    }>>, import("@sinclair/typebox").TNull]>;
    root_of_trust_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type RevocationList = Static<typeof RevocationListSchema>;
/**
 * `validateRevocationList` — pure-function evaluator for the cross-
 * field invariants RL-1 (key_id distinct), RL-5 (signer_key_id NOT
 * in revoked_keys), RL-7 (revoked_at at-or-before issued_at), RL-9
 * (valid_from at-or-before valid_until), RL-10 (valid_from at-or-
 * before issued_at), and RL-12 (quorum-signature consistency).
 *
 * **Source of truth** for the library-evaluable RL-N. Registered
 * into the global cross-field validator registry by
 * `src/validators/index.ts`.
 *
 * **Defensive contract** (mirrors CanonicalRun CR-1 plus
 * ClusterRunSeries plus InterSeriesScopingArtifact plus
 * SubscriptionPoolState precedent): the function MUST NOT throw on
 * malformed input.
 *
 * **NOT enforced here** — these are consumer-state per ADR-010 with
 * manifest reason codes:
 *   - RL-2: `nonce` monotonic per `cluster_id`
 *     (`REVOCATION_LIST_NONCE_MONOTONICITY_CONTEXT_DEFERRED`).
 *   - RL-3: `prev_envelope_hash` chain integrity
 *     (`REVOCATION_LIST_CHAIN_CONTEXT_DEFERRED`).
 *   - RL-4: `signer_key_id` derives `signature`
 *     (`REVOCATION_LIST_SIGNER_DERIVATION_CONTEXT_DEFERRED`).
 *   - RL-6: `nonce` unique per signer window
 *     (`REVOCATION_LIST_NONCE_WINDOW_CONTEXT_DEFERRED`).
 *   - RL-11: `next_page_hash` chain integrity
 *     (`REVOCATION_LIST_PAGINATION_CONTEXT_DEFERRED`).
 *
 * **RL-8 is NOT a constraint** — empty `revoked_keys` is admissible
 * at non-genesis envelopes (continuation page with no new
 * revocations since predecessor). The explicit non-constraint
 * documentation prevents the bridge from surfacing this as a defect
 * via the PR-A3.8 finding-rotation pattern.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors carries RL-N-
 *   tagged strings naming the offending index/value/field for
 *   actionability.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare function validateRevocationList(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=revocation-list.d.ts.map