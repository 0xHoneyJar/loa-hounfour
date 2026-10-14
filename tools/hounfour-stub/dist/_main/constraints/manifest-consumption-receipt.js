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
import { Type } from '@sinclair/typebox';
import { arrayFieldDistinct } from './builtins/cluster-run-series-local.js';
/**
 * What the consumer decided for one manifest rule.
 *
 * - `verified_externally`: the consumer discharged the obligation itself.
 * - `accepted_risk`: the obligation was not discharged and an approver
 *   accepted the risk; the judgement records why.
 * - `rejected`: the record is not acted on. MC-1 requires failing closed.
 * - `escalated`: the decision was handed to a higher authority and is not
 *   yet made. MC-1 treats this as not-yet-proceedable.
 */
const ManifestConsumptionDecisionKindSchema = Type.Union([
    Type.Literal('verified_externally'),
    Type.Literal('accepted_risk'),
    Type.Literal('rejected'),
    Type.Literal('escalated'),
], { description: 'Consumer decision for one manifest rule (SDD §3).' });
const ManifestConsumptionDecisionSchema = Type.Object({
    rule_id: Type.String({
        minLength: 1,
        description: 'rule_id of the manifest entry (or entries) this decision covers.',
    }),
    reason: Type.Optional(Type.String({
        pattern: '^[a-z][a-z0-9_]*$',
        description: 'The manifest entry reason this decision answers. Not checked against the reason union (MCR-N2).',
    })),
    decision: ManifestConsumptionDecisionKindSchema,
    judgement: Type.String({
        minLength: 1,
        maxLength: 1024,
        description: "The approver's answer to the contract row's judgement_requested question, with any rationale. Never graded by the library (MCR-N1).",
    }),
    decided_by: Type.String({
        minLength: 1,
        description: 'Opaque identifier of the approver (MCR-N3).',
    }),
    decided_at: Type.String({ format: 'date-time' }),
    evidence_ref: Type.Optional(Type.String({
        description: 'Opaque pointer to evidence supporting the decision (URI, hash, ticket id).',
    })),
}, { additionalProperties: false });
export const ManifestConsumptionReceiptSchema = Type.Object({
    receipt_id: Type.String({ format: 'uuid' }),
    schema_id: Type.String({
        minLength: 1,
        description: 'schema_id of the manifest this receipt answers.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'contract_version of the manifest this receipt answers.',
    }),
    manifest_emitted_at: Type.String({
        format: 'date-time',
        description: 'manifest_emitted_at of the manifest this receipt answers; together with schema_id it identifies the manifest.',
    }),
    consumer_id: Type.String({ minLength: 1, description: 'Opaque identifier of the consuming system (MCR-N3).' }),
    decisions: Type.Array(ManifestConsumptionDecisionSchema, { minItems: 1, maxItems: 256 }),
    decided_at: Type.String({ format: 'date-time', description: 'When the receipt as a whole was finalized.' }),
}, {
    $id: 'ManifestConsumptionReceipt',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Consumer record of one decision per rule of an UnverifiedObligationsManifest, each with a human judgement. ' +
        'Shape only: the library does not grade judgements or decide authority (ADR-010). See SDD §3 and MC-1.',
});
/**
 * Cross-field validator for ManifestConsumptionReceipt. Enforces MCR-1
 * (distinct `decisions[*].rule_id`). Safe to call directly, without the
 * structural tier: a non-object record, a non-array `decisions`, or any
 * element that is not a plain object with a string `rule_id` returns a
 * tagged `MCR: structural shape precondition failed` error rather than
 * passing.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function validateManifestConsumptionReceipt(data) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        return {
            valid: false,
            errors: ['MCR: structural shape precondition failed — input must be a non-null object (ManifestConsumptionReceipt record).'],
            warnings: [],
        };
    }
    const decisions = data.decisions;
    if (!Array.isArray(decisions)) {
        return {
            valid: false,
            errors: ['MCR: structural shape precondition failed — decisions must be an array.'],
            warnings: [],
        };
    }
    // Direct callers can reach this function without the structural tier, so
    // malformed elements fail loudly instead of being skipped by the
    // distinctness helper (which would let them pass MCR-1 vacuously).
    const shapeErrors = [];
    decisions.forEach((d, i) => {
        if (d === null || typeof d !== 'object' || Array.isArray(d)) {
            shapeErrors.push(`MCR: structural shape precondition failed — decisions[${i}] must be a non-null object; got ${d === null ? 'null' : Array.isArray(d) ? 'array' : typeof d}.`);
        }
        else if (typeof d.rule_id !== 'string') {
            shapeErrors.push(`MCR: structural shape precondition failed — decisions[${i}].rule_id must be a string; got ${typeof d.rule_id}.`);
        }
    });
    if (shapeErrors.length > 0) {
        return { valid: false, errors: shapeErrors, warnings: [] };
    }
    const errors = [];
    const distinct = arrayFieldDistinct(decisions, 'rule_id');
    for (const dup of distinct.duplicates) {
        errors.push(`MCR-1: decisions[*].rule_id "${dup.value}" appears at indices ${dup.indices.join(', ')} — each manifest rule gets exactly one decision.`);
    }
    return { valid: errors.length === 0, errors, warnings: [] };
}
function sortedUnique(values) {
    return [...new Set(values)].sort();
}
/**
 * Join a receipt to its manifest. Pure; no clock; never throws on
 * structurally valid inputs.
 *
 * Algebraic properties (property-tested): the undecided and decided-known
 * rule_id sets partition the manifest's rule_id set; adding a decision for
 * an undecided rule never grows `undecided_rule_ids`; flipping any decision
 * to `rejected` makes `mc1_satisfied` false.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function joinReceiptToManifest(manifest, receipt) {
    const header_mismatches = [];
    for (const field of ['schema_id', 'contract_version', 'manifest_emitted_at']) {
        if (manifest[field] !== receipt[field])
            header_mismatches.push(field);
    }
    const reasonsByRule = new Map();
    for (const entry of manifest.unverified_rules) {
        let set = reasonsByRule.get(entry.rule_id);
        if (set === undefined) {
            set = new Set();
            reasonsByRule.set(entry.rule_id, set);
        }
        if (entry.reason !== undefined)
            set.add(entry.reason);
    }
    const decided = new Set(receipt.decisions.map((d) => d.rule_id));
    const undecided_rule_ids = sortedUnique([...reasonsByRule.keys()].filter((id) => !decided.has(id)));
    const unknown_rule_ids = sortedUnique([...decided].filter((id) => !reasonsByRule.has(id)));
    const reason_mismatch_rule_ids = sortedUnique(receipt.decisions
        .filter((d) => d.reason !== undefined && reasonsByRule.has(d.rule_id) && !reasonsByRule.get(d.rule_id).has(d.reason))
        .map((d) => d.rule_id));
    const rejected_rule_ids = sortedUnique(receipt.decisions.filter((d) => d.decision === 'rejected').map((d) => d.rule_id));
    const escalated_rule_ids = sortedUnique(receipt.decisions.filter((d) => d.decision === 'escalated').map((d) => d.rule_id));
    const complete = header_mismatches.length === 0
        && undecided_rule_ids.length === 0
        && unknown_rule_ids.length === 0
        && reason_mismatch_rule_ids.length === 0;
    return {
        header_mismatches,
        undecided_rule_ids,
        unknown_rule_ids,
        reason_mismatch_rule_ids,
        rejected_rule_ids,
        escalated_rule_ids,
        complete,
        mc1_satisfied: complete && rejected_rule_ids.length === 0 && escalated_rule_ids.length === 0,
    };
}
//# sourceMappingURL=manifest-consumption-receipt.js.map