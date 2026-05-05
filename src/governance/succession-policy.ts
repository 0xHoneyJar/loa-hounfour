/**
 * SuccessionPolicy — constitutional thresholds for representative-set actions.
 *
 * Pins the four constitutional actions (`amend`, `rotate`, `add`, `remove`)
 * to per-action `threshold` (quorum fraction in [0, 1]) and `cooldown_seconds`
 * (minimum elapsed time between actions of the same kind). The asymmetric
 * ladder + non-decreasing cooldown invariants are declared in
 * `constraints/SuccessionPolicy.constraints.json` (cross-field, library-evaluated).
 *
 * No `self_removal_allowed` field (OQ4 resolution): the SP-007 minimum-rep
 * invariant on `OrgIdentity.current_representatives.length >= 1` blocks the
 * write that would zero out reps; consumer-side runtime models the
 * `governance.delegation.self_removal_pending` lifecycle.
 *
 * @see SDD section 3.4.3 — SuccessionPolicy required fields, cross-field rules
 * @see Issue #61 — Source RFC, OQ4
 * @since v8.4.0 (FR-B3)
 */
import { Type, type Static } from '@sinclair/typebox';

const SuccessionActionRuleSchema = Type.Object(
  {
    threshold: Type.Number({
      minimum: 0,
      maximum: 1,
      description:
        'Quorum fraction in [0, 1] required to enact this action. Compared across '
        + 'actions by the SP-1 asymmetric-ladder rule.',
    }),
    cooldown_seconds: Type.Integer({
      minimum: 0,
      description:
        'Minimum elapsed seconds between successive actions of this kind. Compared '
        + 'across actions by the SP-2 non-decreasing-cooldown rule.',
    }),
  },
  {
    additionalProperties: false,
    description: 'Per-action threshold + cooldown pair.',
  },
);

export const SuccessionPolicySchema = Type.Object(
  {
    policy_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 identifying this policy.',
    }),
    org_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 of the org this policy is bound to.',
    }),
    amend: SuccessionActionRuleSchema,
    rotate: SuccessionActionRuleSchema,
    add: SuccessionActionRuleSchema,
    remove: SuccessionActionRuleSchema,
    effective_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp from which this policy is in force.',
    }),
  },
  {
    $id: 'SuccessionPolicy',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description:
      'Constitutional thresholds enforcing the asymmetric ladder + non-decreasing '
      + 'cooldown invariants. Cross-field rules SP-1..2 in '
      + 'constraints/SuccessionPolicy.constraints.json.',
  },
);
export type SuccessionPolicy = Static<typeof SuccessionPolicySchema>;
