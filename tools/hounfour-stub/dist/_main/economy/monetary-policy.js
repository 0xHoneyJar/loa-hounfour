/**
 * Monetary Policy — coupling token creation to conservation invariants.
 *
 * Defines the policy regime for minting within a registry, including
 * collateral ratios, conservation ceilings, and review triggers.
 *
 * @see SDD §2.4 — MonetaryPolicy Schema
 * @since v7.0.0
 */
import { Type } from '@sinclair/typebox';
// ReviewTrigger
export const ReviewTriggerSchema = Type.Object({
    trigger_type: Type.Union([
        Type.Literal('epoch_boundary'),
        Type.Literal('supply_threshold'),
        Type.Literal('manual'),
        Type.Literal('governance_vote'),
    ], { description: 'What condition triggers a policy review.' }),
    threshold_pct: Type.Optional(Type.Number({
        minimum: 0,
        maximum: 100,
        description: 'Percentage threshold that triggers review (for supply_threshold).',
    })),
    epoch_interval: Type.Optional(Type.Integer({
        minimum: 1,
        description: 'Number of epochs between automatic reviews.',
    })),
}, {
    $id: 'ReviewTrigger',
    additionalProperties: false,
    description: 'Condition that triggers a monetary policy review.',
});
// MonetaryPolicy
export const MonetaryPolicySchema = Type.Object({
    policy_id: Type.String({ format: 'uuid' }),
    registry_id: Type.String({ format: 'uuid' }),
    minting_policy_id: Type.String({
        minLength: 1,
        description: 'References MintingPolicyConfig.policy_id.',
    }),
    conservation_ceiling: Type.String({
        pattern: '^[0-9]+$',
        description: 'Maximum total supply (string-encoded BigInt).',
    }),
    coupling_invariant: Type.String({
        minLength: 1,
        description: 'Constraint expression that must hold for minting to proceed.',
    }),
    collateral_ratio_bps: Type.Integer({
        minimum: 0,
        description: 'Collateral ratio in basis points (10000 = 100%).',
    }),
    review_trigger: ReviewTriggerSchema,
    last_reviewed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
        description: 'When the policy was last reviewed, or null if never reviewed.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'MonetaryPolicy',
    additionalProperties: false,
    description: 'Monetary policy regime coupling minting to conservation invariants.',
});
//# sourceMappingURL=monetary-policy.js.map