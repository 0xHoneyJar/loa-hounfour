/**
 * Collection Governance Configuration — per-community Bayesian parameters.
 *
 * Makes the reputation system's conservatism parameter (pseudo_count k),
 * state transition thresholds, and temporal decay policy configurable
 * per collection, governable via GovernanceProposal.
 *
 * In the Web4 framing, pseudo_count is the community's "interest rate for trust":
 * high k = conservative (new members must prove themselves extensively),
 * low k = permissive (quick trust establishment).
 *
 * @see DR-S5 — Governable pseudo_count as community risk appetite
 * @see DR-S6 — Temporal state demotion (the missing clock)
 * @since v7.6.0
 */
import { Type } from '@sinclair/typebox';
import { ReputationStateSchema } from './reputation-aggregate.js';
// ---------------------------------------------------------------------------
// Demotion Rule — per-state inactivity rules
// ---------------------------------------------------------------------------
/**
 * A single demotion rule for temporal state decay.
 *
 * Defines when a reputation state should be demoted due to inactivity.
 * Only backward transitions are valid (authoritative→established,
 * established→warming, warming→cold).
 *
 * @since v7.6.0 — DR-S6
 */
export const DemotionRuleSchema = Type.Object({
    from_state: ReputationStateSchema,
    to_state: ReputationStateSchema,
    inactivity_days: Type.Integer({
        minimum: 1,
        description: 'Demote after this many days without quality events.',
    }),
    require_decayed_below: Type.Optional(Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Also require decayed personal weight below this threshold. '
            + 'Prevents demotion of agents whose decayed scores are still strong.',
    })),
}, {
    $id: 'DemotionRule',
    additionalProperties: false,
    description: 'Rule for time-based reputation state demotion due to inactivity.',
});
// ---------------------------------------------------------------------------
// Reputation Decay Policy
// ---------------------------------------------------------------------------
/**
 * Temporal decay policy for reputation within a collection.
 *
 * Controls how reputation decays over time when agents are inactive.
 * The half_life_days parameter feeds into computeDecayedSampleCount().
 * Demotion rules add clock-based state transitions on top of statistical decay.
 *
 * @since v7.6.0 — DR-S6
 */
export const ReputationDecayPolicySchema = Type.Object({
    half_life_days: Type.Integer({
        minimum: 1,
        default: 30,
        description: 'Exponential decay half-life in days. '
            + 'After half_life_days of inactivity, effective sample count is halved.',
    }),
    demotion_rules: Type.Array(DemotionRuleSchema, {
        description: 'Per-state inactivity demotion rules. '
            + 'Each rule defines when a specific state should be demoted.',
    }),
    enable_auto_demotion: Type.Boolean({
        default: false,
        description: 'Whether demotion rules are automatically enforced. '
            + 'When false, demotion rules are advisory only. '
            + 'When true, requires an event subscription trigger (DR-S1).',
    }),
}, {
    $id: 'ReputationDecayPolicy',
    additionalProperties: false,
    description: 'Temporal decay and demotion policy for collection reputation.',
});
// ---------------------------------------------------------------------------
// Collection Governance Configuration
// ---------------------------------------------------------------------------
/**
 * Per-collection governance configuration.
 *
 * Captures the governable parameters that control the Bayesian reputation
 * system for a specific collection. Each field can be updated via
 * GovernanceProposal with change_type 'parameter_update'.
 *
 * @see FAANG parallel: Airbnb's trust system evolved from global to market-specific thresholds
 * @since v7.6.0 — DR-S5
 */
export const CollectionGovernanceConfigSchema = Type.Object({
    config_id: Type.String({ format: 'uuid' }),
    collection_id: Type.String({
        minLength: 1,
        description: 'The collection this configuration applies to.',
    }),
    // Bayesian blend parameters
    pseudo_count: Type.Integer({
        minimum: 1,
        default: 3,
        description: 'Bayesian conservatism parameter (k). '
            + 'Higher values require more observations before personal score dominates. '
            + 'k=3 (default) requires ~27 observations for authoritative status.',
    }),
    // State machine thresholds
    state_thresholds: Type.Object({
        warming_min_events: Type.Integer({
            minimum: 1,
            default: 1,
            description: 'Minimum quality events to transition cold → warming.',
        }),
        established_min_samples: Type.Integer({
            minimum: 1,
            default: 5,
            description: 'Minimum sample count for warming → established.',
        }),
        authoritative_min_weight: Type.Number({
            minimum: 0,
            maximum: 1,
            default: 0.9,
            description: 'Minimum personal weight for established → authoritative. '
                + 'With k=3, this requires ~27 observations.',
        }),
    }, {
        additionalProperties: false,
        description: 'Thresholds for reputation state machine transitions.',
    }),
    // Temporal decay
    decay_policy: ReputationDecayPolicySchema,
    // Metadata
    updated_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'CollectionGovernanceConfig',
    additionalProperties: false,
    description: 'Per-collection governance configuration for the Bayesian reputation system.',
});
// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------
/**
 * Sensible defaults matching current hardcoded behavior.
 *
 * Provides backward compatibility: if no CollectionGovernanceConfig exists,
 * the system behaves exactly as before v7.6.0.
 */
export const DEFAULT_DEMOTION_RULES = [
    {
        from_state: 'authoritative',
        to_state: 'established',
        inactivity_days: 90,
        require_decayed_below: 0.7,
    },
    {
        from_state: 'established',
        to_state: 'warming',
        inactivity_days: 180,
    },
];
//# sourceMappingURL=collection-governance-config.js.map