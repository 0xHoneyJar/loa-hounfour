/**
 * `PlanAmendmentRequestSchema` — plan-amendment proposal envelope
 * (FR-B10, v8.6.0).
 *
 * An amendment request proposes a delta against a previously
 * signed-off plan (identified by `parent_plan_hash`). Distinct
 * from `PlanSignoffEnvelope`: an amendment is a PROPOSAL that may
 * be accepted, rejected, or modified; a signoff is the
 * authoritative seal.
 *
 * Unlike `PlanSignoffEnvelope`, the amendment request is
 * **NOT crypto-bearing** at the schema level — amendments are
 * authored under the cluster's existing trust context and need
 * not carry an additional signature beyond the cluster's
 * envelope-level integrity (which the chained
 * `prev_envelope_hash` provides). The schema is `x-chain-bearing`
 * for chain continuity but omits `x-crypto-bearing` and the
 * `signature` field.
 *
 * **Schema-level invariants**:
 *   - `severity` enum is exhaustive at `{minor, major}`.
 *   - `trigger_class` enum is exhaustive at four members:
 *     `schema_drift`, `ambiguity`, `out_of_scope_dep`,
 *     `observed_failure`.
 *   - **Severity correction is consumer-side policy** per
 *     [`prd.md:289`]: the schema does NOT force
 *     `trigger_class=observed_failure → severity=major`. The
 *     schema admits the looser combination so consumers can
 *     surface the discrepancy explicitly rather than have it
 *     silently rewritten at the structural layer.
 *   - `recommended_paths` `minItems: 1` — an amendment MUST
 *     propose at least one path. Each path object requires
 *     `id`, `summary`, `tradeoff` (no optional fields).
 *   - `jury_recommendation` is nullable. `null` = no jury
 *     consulted; non-null = consulted, the string carries the
 *     recommendation text.
 *   - `parent_plan_hash` content-addresses the plan being
 *     amended; FR-C4 may also be invoked against this field if
 *     the consumer wants to validate that the parent plan is
 *     still on file.
 *
 * @see SDD §3.12 — FR-B10 schema spec
 * @see SDD §4.5 — FR-C4 builtin spec (also applies to
 *      parent_plan_hash if the consumer chooses to bind it)
 * @since v8.6.0 — FR-B10 (PR-A3.6)
 */
import { Type } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
/**
 * Severity of a proposed plan amendment.
 *
 * `minor` = small editorial / scoping deltas; `major` = scope
 * changes, conservation-property tweaks, security-relevant
 * shifts. Consumer-side severity-correction policy (e.g.
 * "observed_failure ⇒ major") lives in the consumer's
 * acceptance gate per ADR-010, NOT in the schema.
 */
export const AmendmentSeveritySchema = Type.Union([Type.Literal('minor'), Type.Literal('major')], {
    $id: 'AmendmentSeverity',
    description: 'Two-member exhaustive severity enum for plan amendments. ' +
        'Severity-correction (e.g. forcing observed_failure → major) ' +
        'is consumer-side policy per prd.md:289 / ADR-010; the schema ' +
        'admits the looser combination.',
});
/**
 * What triggered the amendment proposal.
 *
 * Four exhaustive members:
 *   - `schema_drift` — wire payload doesn't match expected schema
 *   - `ambiguity` — the plan is unclear; clarification proposed
 *   - `out_of_scope_dep` — execution depends on something the plan
 *     doesn't authorize
 *   - `observed_failure` — execution attempted and failed; root
 *     cause requires plan revision
 */
export const AmendmentTriggerClassSchema = Type.Union([
    Type.Literal('schema_drift'),
    Type.Literal('ambiguity'),
    Type.Literal('out_of_scope_dep'),
    Type.Literal('observed_failure'),
], {
    $id: 'AmendmentTriggerClass',
    description: 'Four-member exhaustive enum for what triggered the amendment. ' +
        'Schema enforces enum membership only; severity-correction ' +
        'mapping (e.g. observed_failure → major) is consumer-side.',
});
export const PlanAmendmentRequestSchema = Type.Object({
    envelope_kind: Type.Literal('plan_amendment_request', {
        description: 'Discriminator literal pinning the plan-amendment-request ' +
            'shape. Distinguishes from `plan_signoff` (FR-B9) and ' +
            'other envelope kinds.',
    }),
    contract_version: Type.Literal('8.6.0', {
        description: 'Hounfour contract version. Pinned to "8.6.0" for the ' +
            'cycle-005 ship line.',
    }),
    ts: Type.String({
        pattern: ISO8601_UTC_PATTERN,
        description: 'ISO 8601 UTC timestamp at amendment-request emission.',
    }),
    cluster_id: Type.String({
        minLength: 1,
        description: 'Stable cluster identifier (consumer-shaped). Identifies ' +
            'the cluster the amendment is scoped to.',
    }),
    actor_id: Type.String({
        minLength: 1,
        description: 'Stable identifier for the actor proposing the amendment ' +
            '(consumer-shaped).',
    }),
    parent_signoff_id: Type.String({
        minLength: 1,
        description: 'Identifier of the signoff this amendment is proposed ' +
            'against. Consumer-side resolution joins this to a ' +
            'PlanSignoffEnvelope record in their ledger.',
    }),
    parent_plan_hash: Type.String({
        pattern: SHA256_HEX_PATTERN,
        description: 'sha256:<64-hex> content hash of the plan being amended. ' +
            'FR-C4 may be invoked against this field if the consumer ' +
            'wants to validate the parent plan is still on file.',
    }),
    proposed_delta: Type.String({
        minLength: 1,
        maxLength: 65536,
        description: 'Free-text amendment proposal. Capped at 64 KB code ' +
            'points; the canonical-JSON byte length is bounded by ' +
            'the cluster\'s envelope-cap policy (consumer-side). ' +
            'Format is consumer-shaped (markdown, structured diff, ' +
            'natural-language proposal); the schema only checks ' +
            'non-emptiness and the size cap.',
    }),
    severity: AmendmentSeveritySchema,
    trigger_class: AmendmentTriggerClassSchema,
    rationale: Type.String({
        minLength: 1,
        maxLength: 8192,
        description: 'Free-text rationale explaining why the amendment is ' +
            'needed. Capped at 8 KB code points.',
    }),
    recommended_paths: Type.Array(Type.Object({
        id: Type.String({
            minLength: 1,
            description: 'Stable identifier for this recommended path.',
        }),
        summary: Type.String({
            minLength: 1,
            description: 'Short summary of what this path proposes.',
        }),
        tradeoff: Type.String({
            minLength: 1,
            description: 'Explicit tradeoff statement — what this path costs ' +
                'or risks, so the deciding consumer can compare paths ' +
                'on a shared axis. minLength: 1 forces authors to ' +
                'state the tradeoff (even "none" is a tradeoff ' +
                'declaration); empty strings are rejected.',
        }),
    }, {
        additionalProperties: false,
        description: 'A single recommended-path object. All three fields ' +
            '(id, summary, tradeoff) are required; no optional ' +
            'fields.',
    }), {
        minItems: 1,
        description: 'Non-empty array of recommended paths. An amendment MUST ' +
            'propose at least one concrete path; "do nothing" should ' +
            'be expressed explicitly as a path entry, not as an ' +
            'empty array.',
    }),
    jury_recommendation: Type.Union([Type.String(), Type.Null()], {
        description: 'Jury recommendation text, or null if no jury was ' +
            'consulted. Consumer-shaped — the schema does not ' +
            'enforce length or format.',
    }),
    chain_refs: Type.Object({
        prev_envelope_hash: Type.String({
            pattern: SHA256_HEX_PATTERN,
            description: 'sha256:<64-hex> hash of the previous envelope\'s ' +
                'canonical-JSON form. Genesis position uses the ' +
                'all-zero anchor.',
        }),
    }, {
        additionalProperties: false,
        description: 'Chain reference for envelope-level continuity. Unlike ' +
            'PlanSignoffEnvelope, no parent_signoff_hash here — the ' +
            'amendment\'s lineage to a signoff is captured by ' +
            'parent_signoff_id at the top level.',
    }),
}, {
    $id: 'PlanAmendmentRequest',
    additionalProperties: false,
    'x-chain-bearing': true,
    description: 'Plan-amendment proposal envelope. Chain-bearing (carries ' +
        'prev_envelope_hash) but NOT crypto-bearing — amendments ' +
        'inherit the cluster\'s trust context. Severity-correction ' +
        '(e.g. observed_failure → major) is consumer-side per ' +
        'prd.md:289 / ADR-010; the schema admits looser combinations ' +
        'so the discrepancy can be surfaced explicitly.',
});
//# sourceMappingURL=plan-amendment-request.js.map