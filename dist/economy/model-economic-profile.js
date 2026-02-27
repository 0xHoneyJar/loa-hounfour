/**
 * Model Economic Profile — the SDR basket for multi-model economics.
 *
 * Each model has a cost structure, quality yield, and routing weight that
 * determines its share in the composite economic basket. This is the
 * "multi-model as multi-currency" insight from Bridgebuilder Part 1 §III
 * made concrete: the routing_weight IS the exchange rate.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @see Part 1 §III: SDR parallel — multi-model as multi-currency
 * @since v7.7.0
 */
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Cost Per Token
// ---------------------------------------------------------------------------
export const CostPerTokenSchema = Type.Object({
    input: Type.String({
        pattern: '^[0-9]+$',
        description: 'Cost per input token in micro-USD.',
    }),
    output: Type.String({
        pattern: '^[0-9]+$',
        description: 'Cost per output token in micro-USD.',
    }),
}, {
    $id: 'CostPerToken',
    additionalProperties: false,
    description: 'Token-level pricing for a model.',
});
// ---------------------------------------------------------------------------
// Model Economic Profile
// ---------------------------------------------------------------------------
/**
 * Per-model economic profile for the SDR routing basket.
 *
 * @since v7.7.0 — DR-S10
 */
export const ModelEconomicProfileSchema = Type.Object({
    profile_id: Type.String({ format: 'uuid' }),
    model_id: Type.String({
        minLength: 1,
        description: 'Model alias (e.g., "native", "gpt-4o").',
    }),
    cost_per_token: CostPerTokenSchema,
    quality_yield: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Average quality score across all personalities for this model.',
    }),
    routing_weight: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Current share in the composite routing basket.',
    }),
    sample_count: Type.Integer({
        minimum: 0,
        description: 'Total observations backing quality_yield.',
    }),
    effective_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'ModelEconomicProfile',
    additionalProperties: false,
    description: 'Per-model economic profile for the SDR routing basket.',
});
//# sourceMappingURL=model-economic-profile.js.map