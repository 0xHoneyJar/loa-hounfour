/**
 * `ChallengeTypeSchema` and `ChallengeRequestedEffectSchema` — the
 * two enum vocabularies that classify a `Challenge` envelope
 * (FR-A1, v8.6.0).
 *
 * `ChallengeType` (9 members) names *what kind of challenge* is
 * being raised against the target `Assertion`: a factual, policy,
 * competence, procedural, drift, replay, chain, class, or other
 * dispute. The classification informs which v8.5.0 substrate
 * resolves the challenge (e.g. `factual_dispute` weighs against
 * `Assertion.provenance[]`; `policy_dispute` re-evaluates the
 * `PolicyDecisionOutcome` chain; `competence_dispute` audits the
 * `SignerCompetenceRule` binding).
 *
 * `ChallengeRequestedEffect` (6 members) names *what the
 * challenger asks the system to do*: void, reverse, amend,
 * escalate-to-panel, escalate-to-operator, or annotate-only. The
 * effect is a request — the dispositioning authority decides
 * whether to grant it. Schema admits all (type, effect) pairings;
 * acceptance-gate policy that constrains which effects are
 * available for which types is consumer-side per ADR-010.
 *
 * Both enums are exhaustive at the v8.6.0 ship line. Widening
 * either is strict-additive — existing consumers continue to
 * validate older payloads against the narrower enum (the new
 * label is a no-match → invalid), and new consumers see the
 * widened set.
 *
 * @since v8.6.0 — FR-A1 (PR-A3.7)
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * What kind of challenge is being raised against the target
 * `Assertion`. Nine exhaustive members.
 *
 *   - `factual_dispute` — the assertion's body is wrong on the facts.
 *   - `policy_dispute` — the facts are right; the policy decision is wrong.
 *   - `competence_dispute` — the signer lacked authority over this class.
 *   - `procedural_dispute` — required process artifacts (jury, panel,
 *     deliberation window) were missing or invalid.
 *   - `drift_assertion` — the assertion contradicts a prior signed
 *     assertion that has not been superseded.
 *   - `signature_replay` — the carried signature has been seen before.
 *   - `chain_corruption` — the audit-chain `prev_envelope_hash` linkage
 *     is broken.
 *   - `class_violation` — the asserted `assertion_class` does not match
 *     the body's actual illocutionary force.
 *   - `other` — explicit catch-all; preferred over silent default.
 *
 */
export const ChallengeTypeSchema = Type.Union(
  [
    Type.Literal('factual_dispute'),
    Type.Literal('policy_dispute'),
    Type.Literal('competence_dispute'),
    Type.Literal('procedural_dispute'),
    Type.Literal('drift_assertion'),
    Type.Literal('signature_replay'),
    Type.Literal('chain_corruption'),
    Type.Literal('class_violation'),
    Type.Literal('other'),
  ],
  {
    $id: 'ChallengeType',
    description:
      'Exhaustive 9-member enum classifying a Challenge envelope. ' +
      'Composes with v8.5.0 Assertion lifecycle and signer-competence ' +
      'substrate; widening is strict-additive.',
  },
);
export type ChallengeType = Static<typeof ChallengeTypeSchema>;

/**
 * What the challenger asks the dispositioning authority to do.
 * Six exhaustive members.
 *
 *   - `void` — remove the assertion from the active record.
 *   - `reverse` — invert the conclusion, preserve history.
 *   - `amend` — partial modification (not full reversal).
 *   - `escalate_panel` — request jury-panel review.
 *   - `escalate_operator` — request human-operator review.
 *   - `annotate_only` — attach the challenge to the audit trail
 *     without further state change.
 *
 * Schema admits all (challenge_type, requested_effect)
 * combinations. Acceptance-gate policy constraining which
 * effects are available for which types is consumer-side per
 * ADR-010.
 */
export const ChallengeRequestedEffectSchema = Type.Union(
  [
    Type.Literal('void'),
    Type.Literal('reverse'),
    Type.Literal('amend'),
    Type.Literal('escalate_panel'),
    Type.Literal('escalate_operator'),
    Type.Literal('annotate_only'),
  ],
  {
    $id: 'ChallengeRequestedEffect',
    description:
      'Exhaustive 6-member enum naming the disposition the ' +
      'challenger requests. Schema admits all (type, effect) ' +
      'pairings; per-pair acceptance is consumer-side policy.',
  },
);
export type ChallengeRequestedEffect = Static<
  typeof ChallengeRequestedEffectSchema
>;
