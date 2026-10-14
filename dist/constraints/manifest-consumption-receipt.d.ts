/**
 * ManifestConsumptionReceipt — the consumer's record of what it decided for
 * each entry of an `UnverifiedObligationsManifest` (v8.8.0, SDD §3, FR-C4).
 *
 * A manifest tells the consumer what the library did NOT check. The
 * consumer-obligation contract (`UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT`)
 * tells it what to do about each entry. This receipt records what it did:
 * one decision per manifest `rule_id`, each with a human judgement, who made
 * it and when. Conformance level MC-1 (docs/conformance/
 * manifest-consumption-level-1.md) requires a consumer to produce one.
 *
 * Constraints (constraints/ManifestConsumptionReceipt.constraints.json):
 * - MCR-1 (library; enforced at validate() by the registered cross-field
 *   validator): `decisions[*].rule_id` values are distinct.
 * - MCR-2 (library; structural): every decision carries a non-empty
 *   judgement, whatever the decision. The schema's `minLength: 1` already
 *   enforces this; the rule restates it so the reading "a `rejected` or
 *   `escalated` decision may omit its reason" is explicitly ruled out.
 * - MCR-3 (runtime-deferred): every rule in the referenced manifest has a
 *   decision. The receipt does not embed the manifest, so the consumer joins
 *   the two; `joinReceiptToManifest` is the pure helper for that join.
 *
 * Explicit non-constraints (ADR-010, shape not authority):
 * - MCR-N1: the library does NOT grade judgements. Any non-empty string up
 *   to 1024 characters is accepted; whether it answers the contract row's
 *   question is the approver's responsibility.
 * - MCR-N2: `reason` is NOT checked against the `UnverifiedObligationReason`
 *   union. It is a `^[a-z][a-z0-9_]*$` string so a receipt written against a
 *   newer manifest still validates under an older library version.
 * - MCR-N3: `decided_by` is NOT resolved against any identity registry, and
 *   `consumer_id` is opaque. Who may decide is consumer policy.
 * - MCR-N4: timestamp ordering (`decided_at` after `manifest_emitted_at`,
 *   per-decision `decided_at` at or before the receipt's `decided_at`) is NOT
 *   enforced. Clock discipline across approvers is consumer policy, and a
 *   pre-approved decision recorded before emission is a legitimate pattern.
 * - MCR-N5: the receipt is NOT signed by this schema. Consumers that need
 *   non-repudiation wrap it in a SignatureEnvelope.
 *
 * Decisions taken where SDD §3 was silent:
 * - `rule_id`, `schema_id` and `decided_by` carry `minLength: 1`, matching
 *   the explicit `consumer_id` bound; an empty identifier cannot be joined.
 * - `reason` uses `^[a-z][a-z0-9_]*$`, not the SDD's `^[a-z_]+$`: the SDD
 *   also requires every union value to be accepted, and
 *   `utf8_byte_length_exceeded` contains a digit. The narrower pattern would
 *   reject a real reason; a test checks every union member against the
 *   pattern.
 * - The decision item is inline (no `$id`), so the schema registry grows by
 *   exactly one entry.
 * - Join granularity is `rule_id`. A manifest can carry several entries with
 *   the same `rule_id` (ORD-5 emits one per drift key); one decision covers
 *   all of them, which is why MCR-1 keys on `rule_id` alone.
 *
 * @see SDD §3 — FR-C4 Manifest-consumption contract
 * @since v8.8.0
 */
import { type Static } from '@sinclair/typebox';
import type { UnverifiedObligationsManifest } from './unverified-obligations.js';
declare const ManifestConsumptionDecisionKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"verified_externally">, import("@sinclair/typebox").TLiteral<"accepted_risk">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"escalated">]>;
export type ManifestConsumptionDecisionKind = Static<typeof ManifestConsumptionDecisionKindSchema>;
declare const ManifestConsumptionDecisionSchema: import("@sinclair/typebox").TObject<{
    rule_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"verified_externally">, import("@sinclair/typebox").TLiteral<"accepted_risk">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"escalated">]>;
    judgement: import("@sinclair/typebox").TString;
    decided_by: import("@sinclair/typebox").TString;
    decided_at: import("@sinclair/typebox").TString;
    evidence_ref: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ManifestConsumptionDecision = Static<typeof ManifestConsumptionDecisionSchema>;
export declare const ManifestConsumptionReceiptSchema: import("@sinclair/typebox").TObject<{
    receipt_id: import("@sinclair/typebox").TString;
    schema_id: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    manifest_emitted_at: import("@sinclair/typebox").TString;
    consumer_id: import("@sinclair/typebox").TString;
    decisions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        rule_id: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"verified_externally">, import("@sinclair/typebox").TLiteral<"accepted_risk">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"escalated">]>;
        judgement: import("@sinclair/typebox").TString;
        decided_by: import("@sinclair/typebox").TString;
        decided_at: import("@sinclair/typebox").TString;
        evidence_ref: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    decided_at: import("@sinclair/typebox").TString;
}>;
export type ManifestConsumptionReceipt = Static<typeof ManifestConsumptionReceiptSchema>;
/**
 * Cross-field validator for ManifestConsumptionReceipt. Enforces MCR-1
 * (distinct `decisions[*].rule_id`). Safe to call directly, without the
 * structural tier: a non-object record, a non-array `decisions`, more than
 * 256 decisions (checked before any iteration), or any element that is not a
 * plain object with a string `rule_id` returns a tagged
 * `MCR: structural shape precondition failed` error rather than passing.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export declare function validateManifestConsumptionReceipt(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/** Header fields that tie a receipt to one manifest. */
export type ReceiptManifestHeaderField = 'schema_id' | 'contract_version' | 'manifest_emitted_at';
/**
 * Result of joining a receipt to the manifest it answers (MCR-3). All
 * rule-id lists are sorted and de-duplicated.
 */
export interface ReceiptManifestJoinResult {
    /**
     * Shape problems with the inputs themselves (tagged
     * `MCR-JOIN: input shape precondition failed — ...`). When non-empty, no
     * join was performed: every list below is empty and `complete` and
     * `mc1_satisfied` are `false`. Always empty for structurally valid inputs.
     */
    input_errors: string[];
    /** Header fields whose values differ between receipt and manifest. */
    header_mismatches: ReceiptManifestHeaderField[];
    /** Manifest rule_ids with no decision in the receipt. */
    undecided_rule_ids: string[];
    /** Receipt rule_ids that do not occur in the manifest. */
    unknown_rule_ids: string[];
    /**
     * Receipt rule_ids whose decision names a `reason` that no manifest entry
     * with that rule_id carries.
     */
    reason_mismatch_rule_ids: string[];
    /** Rule_ids decided `rejected`. */
    rejected_rule_ids: string[];
    /** Rule_ids decided `escalated`. */
    escalated_rule_ids: string[];
    /** MCR-3: no input error, no header mismatch, no undecided rule, no unknown rule, no reason mismatch. */
    complete: boolean;
    /**
     * MC-1 conformance of this receipt against this manifest: `complete`, and
     * no rule `rejected` or `escalated`. This is a mechanical reading of MC-1,
     * NOT an authorization decision (ADR-010): a `false` value means a
     * conforming consumer must not proceed; a `true` value does not mean it
     * may (its own policy still applies).
     */
    mc1_satisfied: boolean;
}
/**
 * Join a receipt to its manifest. Pure; no clock; never throws. Malformed
 * inputs (a non-object manifest or receipt, a non-array `unverified_rules`
 * or `decisions`, more than 256 decisions, or an element without a string
 * `rule_id`) produce a result with `input_errors` set instead of a join.
 *
 * Algebraic properties (property-tested): the undecided and decided-known
 * rule_id sets partition the manifest's rule_id set; adding a decision for
 * an undecided rule never grows `undecided_rule_ids`; flipping any decision
 * to `rejected` makes `mc1_satisfied` false.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export declare function joinReceiptToManifest(manifest: UnverifiedObligationsManifest, receipt: ManifestConsumptionReceipt): ReceiptManifestJoinResult;
export {};
//# sourceMappingURL=manifest-consumption-receipt.d.ts.map