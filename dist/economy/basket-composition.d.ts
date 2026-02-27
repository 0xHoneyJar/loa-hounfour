/**
 * Basket Composition — point-in-time snapshot of the SDR basket.
 *
 * Records the weight distribution across models at a moment in time.
 * Like the IMF's SDR basket, the composition changes as the system
 * learns from its own decisions via performance feedback.
 *
 * @see DR-F2 — Static routing weights (no rebalancing event)
 * @see FAANG parallel: Netflix CDN traffic steering proportions
 * @since v7.8.0 (Sprint 3)
 */
import { type Static } from '@sinclair/typebox';
export declare const BasketCompositionEntrySchema: import("@sinclair/typebox").TObject<{
    model_id: import("@sinclair/typebox").TString;
    weight: import("@sinclair/typebox").TNumber;
    quality_yield: import("@sinclair/typebox").TNumber;
    sample_count: import("@sinclair/typebox").TInteger;
}>;
export type BasketCompositionEntry = Static<typeof BasketCompositionEntrySchema>;
export declare const BasketCompositionSchema: import("@sinclair/typebox").TObject<{
    composition_id: import("@sinclair/typebox").TString;
    entries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        model_id: import("@sinclair/typebox").TString;
        weight: import("@sinclair/typebox").TNumber;
        quality_yield: import("@sinclair/typebox").TNumber;
        sample_count: import("@sinclair/typebox").TInteger;
    }>>;
    total_models: import("@sinclair/typebox").TInteger;
    computed_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type BasketComposition = Static<typeof BasketCompositionSchema>;
//# sourceMappingURL=basket-composition.d.ts.map