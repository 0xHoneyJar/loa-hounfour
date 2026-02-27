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
import { type Static } from '@sinclair/typebox';
export declare const CostPerTokenSchema: import("@sinclair/typebox").TObject<{
    input: import("@sinclair/typebox").TString;
    output: import("@sinclair/typebox").TString;
}>;
export type CostPerToken = Static<typeof CostPerTokenSchema>;
/**
 * Per-model economic profile for the SDR routing basket.
 *
 * @since v7.7.0 — DR-S10
 */
export declare const ModelEconomicProfileSchema: import("@sinclair/typebox").TObject<{
    profile_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    cost_per_token: import("@sinclair/typebox").TObject<{
        input: import("@sinclair/typebox").TString;
        output: import("@sinclair/typebox").TString;
    }>;
    quality_yield: import("@sinclair/typebox").TNumber;
    routing_weight: import("@sinclair/typebox").TNumber;
    sample_count: import("@sinclair/typebox").TInteger;
    effective_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ModelEconomicProfile = Static<typeof ModelEconomicProfileSchema>;
//# sourceMappingURL=model-economic-profile.d.ts.map