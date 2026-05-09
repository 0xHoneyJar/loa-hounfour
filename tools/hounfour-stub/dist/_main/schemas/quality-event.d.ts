import { type Static } from '@sinclair/typebox';
/**
 * Quality event — the input signal that feeds the ReputationAggregate.
 *
 * Each quality event captures 3 dimensions of quality assessment:
 * satisfaction, coherence, and safety, plus a composite score.
 *
 * @see SDD §2.4 — QualityEvent Schema (FR-3 support)
 */
export declare const QualityEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    satisfaction: import("@sinclair/typebox").TNumber;
    coherence: import("@sinclair/typebox").TNumber;
    safety: import("@sinclair/typebox").TNumber;
    composite_score: import("@sinclair/typebox").TNumber;
    evaluator_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type QualityEvent = Static<typeof QualityEventSchema>;
//# sourceMappingURL=quality-event.d.ts.map