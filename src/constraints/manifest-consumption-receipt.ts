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
import { Type, type Static } from '@sinclair/typebox';
import { arrayFieldDistinct } from './builtins/cluster-run-series-local.js';
import type { UnverifiedObligationsManifest } from './unverified-obligations.js';

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
const ManifestConsumptionDecisionKindSchema = Type.Union(
  [
    Type.Literal('verified_externally'),
    Type.Literal('accepted_risk'),
    Type.Literal('rejected'),
    Type.Literal('escalated'),
  ],
  { description: 'Consumer decision for one manifest rule (SDD §3).' },
);
export type ManifestConsumptionDecisionKind = Static<typeof ManifestConsumptionDecisionKindSchema>;

const ManifestConsumptionDecisionSchema = Type.Object(
  {
    rule_id: Type.String({
      minLength: 1,
      description: 'rule_id of the manifest entry (or entries) this decision covers.',
    }),
    reason: Type.Optional(
      Type.String({
        pattern: '^[a-z][a-z0-9_]*$',
        description:
          'The manifest entry reason this decision answers. Not checked against the reason union (MCR-N2).',
      }),
    ),
    decision: ManifestConsumptionDecisionKindSchema,
    judgement: Type.String({
      minLength: 1,
      maxLength: 1024,
      description:
        "The approver's answer to the contract row's judgement_requested question, with any rationale. Never graded by the library (MCR-N1).",
    }),
    decided_by: Type.String({
      minLength: 1,
      description: 'Opaque identifier of the approver (MCR-N3).',
    }),
    decided_at: Type.String({ format: 'date-time' }),
    evidence_ref: Type.Optional(
      Type.String({
        description: 'Opaque pointer to evidence supporting the decision (URI, hash, ticket id).',
      }),
    ),
  },
  { additionalProperties: false },
);
export type ManifestConsumptionDecision = Static<typeof ManifestConsumptionDecisionSchema>;

export const ManifestConsumptionReceiptSchema = Type.Object(
  {
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
  },
  {
    $id: 'ManifestConsumptionReceipt',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description:
      'Consumer record of one decision per rule of an UnverifiedObligationsManifest, each with a human judgement. ' +
      'Shape only: the library does not grade judgements or decide authority (ADR-010). See SDD §3 and MC-1.',
  },
);
export type ManifestConsumptionReceipt = Static<typeof ManifestConsumptionReceiptSchema>;

/**
 * Cross-field validator for ManifestConsumptionReceipt. Enforces MCR-1
 * (distinct `decisions[*].rule_id`). Expects the structural tier to have
 * passed; a non-object or non-array `decisions` fails with a precondition
 * error.
 *
 * @since v8.8.0 (SDD §3, FR-C4)
 */
export function validateManifestConsumptionReceipt(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: ['MCR: structural shape precondition failed — input must be a non-null object (ManifestConsumptionReceipt record).'],
      warnings: [],
    };
  }
  const decisions = (data as { decisions?: unknown }).decisions;
  if (!Array.isArray(decisions)) {
    return {
      valid: false,
      errors: ['MCR: structural shape precondition failed — decisions must be an array.'],
      warnings: [],
    };
  }
  const errors: string[] = [];
  const distinct = arrayFieldDistinct(decisions, 'rule_id');
  for (const dup of distinct.duplicates) {
    errors.push(
      `MCR-1: decisions[*].rule_id "${dup.value}" appears at indices ${dup.indices.join(', ')} — each manifest rule gets exactly one decision.`,
    );
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

/** Header fields that tie a receipt to one manifest. */
export type ReceiptManifestHeaderField = 'schema_id' | 'contract_version' | 'manifest_emitted_at';

/**
 * Result of joining a receipt to the manifest it answers (MCR-3). All
 * rule-id lists are sorted and de-duplicated.
 */
export interface ReceiptManifestJoinResult {
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
  /** MCR-3: no header mismatch, no undecided rule, no unknown rule, no reason mismatch. */
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

function sortedUnique(values: Iterable<string>): string[] {
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
export function joinReceiptToManifest(
  manifest: UnverifiedObligationsManifest,
  receipt: ManifestConsumptionReceipt,
): ReceiptManifestJoinResult {
  const header_mismatches: ReceiptManifestHeaderField[] = [];
  for (const field of ['schema_id', 'contract_version', 'manifest_emitted_at'] as const) {
    if (manifest[field] !== receipt[field]) header_mismatches.push(field);
  }

  const reasonsByRule = new Map<string, Set<string>>();
  for (const entry of manifest.unverified_rules) {
    let set = reasonsByRule.get(entry.rule_id);
    if (set === undefined) {
      set = new Set();
      reasonsByRule.set(entry.rule_id, set);
    }
    if (entry.reason !== undefined) set.add(entry.reason);
  }

  const decided = new Set(receipt.decisions.map((d) => d.rule_id));
  const undecided_rule_ids = sortedUnique([...reasonsByRule.keys()].filter((id) => !decided.has(id)));
  const unknown_rule_ids = sortedUnique([...decided].filter((id) => !reasonsByRule.has(id)));
  const reason_mismatch_rule_ids = sortedUnique(
    receipt.decisions
      .filter((d) => d.reason !== undefined && reasonsByRule.has(d.rule_id) && !reasonsByRule.get(d.rule_id)!.has(d.reason))
      .map((d) => d.rule_id),
  );
  const rejected_rule_ids = sortedUnique(receipt.decisions.filter((d) => d.decision === 'rejected').map((d) => d.rule_id));
  const escalated_rule_ids = sortedUnique(receipt.decisions.filter((d) => d.decision === 'escalated').map((d) => d.rule_id));

  const complete =
    header_mismatches.length === 0
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
